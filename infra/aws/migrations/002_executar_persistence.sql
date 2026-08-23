create function public.executar_set_context(
  p_organization_id text,
  p_actor_user_id text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_organization_id is null
    or p_actor_user_id is null
    or p_organization_id !~ '^org_[A-Za-z0-9_-]+$'
    or p_actor_user_id !~ '^user_[A-Za-z0-9_-]+$'
  then
    raise exception 'Organização e usuário Clerk autenticados são obrigatórios'
      using errcode = '42501';
  end if;

  perform set_config('executar.organization_id', p_organization_id, true);
  perform set_config('executar.user_id', p_actor_user_id, true);
end;
$$;

-- statement-breakpoint
create function public.executar_carregar_estado(
  p_organization_id text,
  p_actor_user_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_state jsonb;
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  select payload -> 'state'
  into v_state
  from public.executar_events
  where organization_id = p_organization_id
    and jsonb_typeof(payload -> 'state') = 'object'
  order by revision desc
  limit 1;

  return v_state;
end;
$$;

-- statement-breakpoint
create function public.executar_persistir_estado(
  p_organization_id text,
  p_actor_user_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_expected_revision bigint;
  v_current_revision bigint;
  v_revision bigint;
  v_active_project_id text;
  v_state jsonb;
  v_event jsonb;
  v_last_event jsonb;
  v_approved boolean;
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'organization_id' is distinct from p_organization_id
    or p_payload ->> 'actor_user_id' is distinct from p_actor_user_id
    or jsonb_typeof(p_payload -> 'projects') <> 'array'
    or jsonb_typeof(p_payload -> 'deliveries') <> 'array'
    or jsonb_typeof(p_payload -> 'dependencies') <> 'array'
    or jsonb_typeof(p_payload -> 'events') <> 'array'
    or jsonb_typeof(p_payload -> 'state') <> 'object'
  then
    raise exception 'Lote operacional inválido ou pertencente a outra identidade'
      using errcode = '42501';
  end if;

  v_expected_revision := (p_payload ->> 'expected_revision')::bigint;
  v_revision := (p_payload ->> 'revision')::bigint;
  v_active_project_id := p_payload ->> 'active_project_id';
  v_state := p_payload -> 'state';

  if v_expected_revision < -1
    or v_revision < 0
    or v_state ->> 'organizationId' is distinct from p_organization_id
    or v_state ->> 'activeProjectId' is distinct from v_active_project_id
    or (v_state ->> 'revision')::bigint is distinct from v_revision
    or not exists (
      select 1
      from jsonb_array_elements(p_payload -> 'projects') as project(value)
      where project.value ->> 'project_id' = v_active_project_id
    )
  then
    raise exception 'Estado, revisão ou projeto ativo inválido'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'projects') as project(value)
    where project.value ->> 'organization_id' is distinct from p_organization_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_payload -> 'deliveries') as delivery(value)
    where delivery.value ->> 'organization_id' is distinct from p_organization_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_payload -> 'dependencies') as dependency(value)
    where dependency.value ->> 'organization_id' is distinct from p_organization_id
  ) then
    raise exception 'O lote não pode conter recursos de outra organização'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id, 0));

  select coalesce(max(revision), -1)
  into v_current_revision
  from public.executar_events
  where organization_id = p_organization_id;

  if v_current_revision <> v_expected_revision then
    raise exception 'Conflito de revisão: esperada %, encontrada %',
      v_expected_revision, v_current_revision
      using errcode = '40001';
  end if;

  if v_revision < v_current_revision then
    raise exception 'A revisão operacional não pode retroceder'
      using errcode = '22023';
  end if;

  insert into public.executar_organizations (organization_id, display_name)
  values (p_organization_id, p_organization_id)
  on conflict (organization_id) do nothing;

  insert into public.executar_projects (
    organization_id, project_id, name, daily_capacity_minutes
  )
  select item.organization_id, item.project_id, item.name, item.daily_capacity_minutes
  from jsonb_to_recordset(p_payload -> 'projects') as item(
    organization_id text,
    project_id text,
    name text,
    daily_capacity_minutes integer
  )
  on conflict (organization_id, project_id) do update
    set name = excluded.name,
        daily_capacity_minutes = excluded.daily_capacity_minutes,
        updated_at = now();

  insert into public.executar_deliveries (
    organization_id,
    project_id,
    delivery_id,
    title,
    front,
    operational_date,
    estimate_minutes,
    stage,
    definition_of_done,
    status,
    started_steps
  )
  select
    item.organization_id,
    item.project_id,
    item.delivery_id,
    item.title,
    item.front,
    item.operational_date,
    item.estimate_minutes,
    item.stage,
    item.definition_of_done,
    item.status,
    item.started_steps
  from jsonb_to_recordset(p_payload -> 'deliveries') as item(
    organization_id text,
    project_id text,
    delivery_id text,
    title text,
    front text,
    operational_date text,
    estimate_minutes integer,
    stage integer,
    definition_of_done text,
    status text,
    started_steps integer
  )
  on conflict (organization_id, project_id, delivery_id) do update
    set title = excluded.title,
        front = excluded.front,
        operational_date = excluded.operational_date,
        estimate_minutes = excluded.estimate_minutes,
        stage = excluded.stage,
        definition_of_done = excluded.definition_of_done,
        status = excluded.status,
        started_steps = excluded.started_steps,
        updated_at = now();

  delete from public.executar_dependencies as existing
  where existing.organization_id = p_organization_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_payload -> 'dependencies') as incoming(
        organization_id text,
        project_id text,
        delivery_id text,
        predecessor_id text
      )
      where incoming.organization_id = existing.organization_id
        and incoming.project_id = existing.project_id
        and incoming.delivery_id = existing.delivery_id
        and incoming.predecessor_id = existing.predecessor_id
    );

  delete from public.executar_deliveries as existing
  where existing.organization_id = p_organization_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_payload -> 'deliveries') as incoming(
        organization_id text,
        project_id text,
        delivery_id text
      )
      where incoming.organization_id = existing.organization_id
        and incoming.project_id = existing.project_id
        and incoming.delivery_id = existing.delivery_id
    );

  insert into public.executar_dependencies (
    organization_id, project_id, delivery_id, predecessor_id
  )
  select
    item.organization_id,
    item.project_id,
    item.delivery_id,
    item.predecessor_id
  from jsonb_to_recordset(p_payload -> 'dependencies') as item(
    organization_id text,
    project_id text,
    delivery_id text,
    predecessor_id text
  )
  on conflict (organization_id, project_id, delivery_id, predecessor_id) do nothing;

  if jsonb_array_length(p_payload -> 'events') = 0 then
    if v_revision <> 0 or v_current_revision <> -1 then
      raise exception 'Uma revisão já iniciada exige eventos operacionais reais'
        using errcode = '22023';
    end if;

    insert into public.executar_events (
      organization_id,
      project_id,
      event_id,
      revision,
      action,
      actor_type,
      actor_user_id,
      human_approved,
      payload
    ) values (
      p_organization_id,
      v_active_project_id,
      p_organization_id || ':' || v_active_project_id || ':0',
      0,
      'estado.inicial',
      'humano',
      p_actor_user_id,
      false,
      jsonb_build_object('state', v_state)
    );
  else
    for v_event in
      select value
      from jsonb_array_elements(p_payload -> 'events')
      order by (value ->> 'revision')::bigint
    loop
      if v_event ->> 'organizationId' is distinct from p_organization_id
        or (v_event ->> 'revision')::bigint <= v_current_revision
        or (v_event ->> 'revision')::bigint > v_revision
        or (
          v_event ? 'userId'
          and v_event ->> 'userId' is distinct from p_actor_user_id
        )
      then
        raise exception 'Evento inválido, repetido ou pertencente a outro ator'
          using errcode = '42501';
      end if;

      v_approved := false;

      if v_event ->> 'actor' = 'copiloto'
        and v_event ->> 'tool' in (
          'concluir_entrega', 'remover_entrega', 'substituir_plano'
        )
      then
        select exists (
          select 1
          from public.executar_approvals
          where organization_id = p_organization_id
            and project_id = v_event ->> 'projectId'
            and tool_name = v_event ->> 'tool'
            and expected_revision = (v_event ->> 'revision')::bigint - 1
            and approved_by_user_id = p_actor_user_id
            and status = 'approved'
        ) into v_approved;

        if not v_approved then
          raise exception 'Ferramenta sensível exige aprovação humana persistida no servidor'
            using errcode = '42501';
        end if;
      end if;

      insert into public.executar_events (
        organization_id,
        project_id,
        event_id,
        revision,
        action,
        delivery_id,
        actor_type,
        actor_user_id,
        human_approved,
        payload
      ) values (
        p_organization_id,
        v_event ->> 'projectId',
        p_organization_id || ':' || (v_event ->> 'projectId') || ':' ||
          (v_event ->> 'revision'),
        (v_event ->> 'revision')::bigint,
        v_event ->> 'action',
        v_event ->> 'taskId',
        coalesce(v_event ->> 'actor', 'humano'),
        p_actor_user_id,
        v_approved,
        jsonb_build_object(
          'fingerprint', v_event ->> 'fingerprint',
          'tool', v_event ->> 'tool',
          'state', case
            when (v_event ->> 'revision')::bigint = v_revision then v_state
            else null
          end
        )
      );

      v_last_event := v_event;
    end loop;

    if (v_last_event ->> 'revision')::bigint <> v_revision then
      raise exception 'A última revisão precisa corresponder ao estado persistido'
        using errcode = '22023';
    end if;
  end if;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'active_project_id', v_active_project_id,
    'revision', v_revision
  );
end;
$$;

-- statement-breakpoint
create function public.executar_solicitar_aprovacao(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_tool_name text,
  p_delivery_id text,
  p_expected_revision bigint,
  p_input jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_approval_id uuid;
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_project_id is null
    or p_tool_name is null
    or p_tool_name not in (
      'concluir_entrega', 'remover_entrega', 'substituir_plano'
    ) or p_expected_revision is null
    or p_expected_revision < 0
    or p_input is null
    or jsonb_typeof(p_input) <> 'object'
  then
    raise exception 'Proposta de aprovação inválida'
      using errcode = '22023';
  end if;

  insert into public.executar_approvals (
    organization_id,
    project_id,
    requested_by_user_id,
    tool_name,
    delivery_id,
    expected_revision,
    input,
    expires_at
  ) values (
    p_organization_id,
    p_project_id,
    p_actor_user_id,
    p_tool_name,
    p_delivery_id,
    p_expected_revision,
    p_input,
    now() + interval '15 minutes'
  )
  returning approval_id into v_approval_id;

  return v_approval_id;
end;
$$;

-- statement-breakpoint
create function public.executar_resolver_aprovacao(
  p_organization_id text,
  p_actor_user_id text,
  p_approval_id uuid,
  p_approved boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_updated uuid;
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_approval_id is null or p_approved is null then
    raise exception 'Decisão de aprovação inválida'
      using errcode = '22023';
  end if;

  update public.executar_approvals
  set status = case when p_approved then 'approved' else 'rejected' end,
      approved_by_user_id = case when p_approved then p_actor_user_id else null end
  where organization_id = p_organization_id
    and approval_id = p_approval_id
    and requested_by_user_id = p_actor_user_id
    and status = 'pending'
    and expires_at > now()
  returning approval_id into v_updated;

  return v_updated is not null;
end;
$$;

-- statement-breakpoint
create function public.executar_projetar_registros_operacionais()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_organization_id text := public.executar_current_organization();
  v_actor_user_id text := public.executar_current_user();
  v_state jsonb := new.payload -> 'state';
  v_project jsonb;
  v_evidence jsonb;
  v_evidence_list jsonb;
  v_comment jsonb;
  v_read jsonb;
  v_project_id text;
  v_storage_path text;
begin
  if jsonb_typeof(v_state) is distinct from 'object' then
    return new;
  end if;

  if v_organization_id !~ '^org_[A-Za-z0-9_-]+$'
    or v_actor_user_id !~ '^user_[A-Za-z0-9_-]+$'
    or new.organization_id is distinct from v_organization_id
    or new.actor_user_id is distinct from v_actor_user_id
    or v_state ->> 'organizationId' is distinct from v_organization_id
    or jsonb_typeof(v_state -> 'projects') is distinct from 'array'
  then
    raise exception 'Snapshot sem organização e identidade Clerk autenticadas'
      using errcode = '42501';
  end if;

  for v_project in
    select value from jsonb_array_elements(v_state -> 'projects')
  loop
    v_project_id := v_project ->> 'id';
    v_evidence_list := case
      when v_project_id = v_state ->> 'activeProjectId'
        then coalesce(v_state -> 'evidence', '[]'::jsonb)
      else coalesce(v_project -> 'snapshot' -> 'evidence', '[]'::jsonb)
    end;

    if jsonb_typeof(v_evidence_list) is distinct from 'array' then
      raise exception 'A lista de evidências do projeto é inválida'
        using errcode = '22023';
    end if;

    for v_evidence in
      select value from jsonb_array_elements(v_evidence_list)
    loop
      if v_evidence ? 'authorUserId'
        and v_evidence ->> 'authorUserId' is distinct from v_actor_user_id
      then
        continue;
      end if;

      v_storage_path := nullif(v_evidence -> 'file' ->> 'storagePath', '');

      if v_storage_path is not null
        and split_part(v_storage_path, '/', 1) <> v_organization_id
      then
        raise exception 'Arquivo de evidência pertencente a outra organização'
          using errcode = '42501';
      end if;

      insert into public.executar_evidence (
        organization_id,
        project_id,
        evidence_id,
        delivery_id,
        note,
        external_url,
        storage_path,
        verified,
        author_user_id,
        created_at
      ) values (
        v_organization_id,
        v_project_id,
        md5(
          v_organization_id || ':' || v_project_id || ':' ||
          (v_evidence ->> 'taskId') || ':' || (v_evidence ->> 'createdAt')
        )::uuid,
        v_evidence ->> 'taskId',
        coalesce(v_evidence ->> 'note', ''),
        nullif(v_evidence ->> 'url', ''),
        v_storage_path,
        coalesce((v_evidence ->> 'verified')::boolean, false),
        v_actor_user_id,
        coalesce((v_evidence ->> 'createdAt')::timestamptz, now())
      )
      on conflict (organization_id, project_id, evidence_id) do nothing;
    end loop;
  end loop;

  for v_comment in
    select value
    from jsonb_array_elements(
      coalesce(v_state -> 'collaboration' -> 'comments', '[]'::jsonb)
    )
  loop
    if v_comment ->> 'organizationId' is distinct from v_organization_id then
      raise exception 'Comentário pertencente a outra organização'
        using errcode = '42501';
    end if;

    if v_comment ->> 'authorId' is distinct from v_actor_user_id then
      continue;
    end if;

    insert into public.executar_comments (
      organization_id,
      project_id,
      comment_id,
      delivery_id,
      author_user_id,
      body,
      mentions,
      revision,
      created_at
    ) values (
      v_organization_id,
      v_comment ->> 'projectId',
      v_comment ->> 'id',
      v_comment ->> 'taskId',
      v_actor_user_id,
      v_comment ->> 'body',
      coalesce(v_comment -> 'mentions', '[]'::jsonb),
      (v_comment ->> 'revision')::bigint,
      coalesce((v_comment ->> 'createdAt')::timestamptz, now())
    )
    on conflict (organization_id, project_id, comment_id) do nothing;
  end loop;

  for v_read in
    select value
    from jsonb_array_elements(
      coalesce(v_state -> 'collaboration' -> 'notificationReads', '[]'::jsonb)
    )
  loop
    if v_read ->> 'organizationId' is distinct from v_organization_id then
      raise exception 'Leitura de notificação pertencente a outra organização'
        using errcode = '42501';
    end if;

    if v_read ->> 'userId' is distinct from v_actor_user_id then
      continue;
    end if;

    insert into public.executar_notification_reads (
      organization_id,
      project_id,
      notification_id,
      user_id,
      read_at
    ) values (
      v_organization_id,
      v_read ->> 'projectId',
      v_read ->> 'id',
      v_actor_user_id,
      coalesce((v_read ->> 'readAt')::timestamptz, now())
    )
    on conflict (organization_id, project_id, notification_id, user_id)
    do nothing;
  end loop;

  return new;
end;
$$;

-- statement-breakpoint
revoke all on function public.executar_set_context(text, text) from public;

-- statement-breakpoint
revoke all on function public.executar_carregar_estado(text, text) from public;

-- statement-breakpoint
revoke all on function public.executar_persistir_estado(text, text, jsonb) from public;

-- statement-breakpoint
revoke all on function public.executar_solicitar_aprovacao(text, text, text, text, text, bigint, jsonb) from public;

-- statement-breakpoint
revoke all on function public.executar_resolver_aprovacao(text, text, uuid, boolean) from public;

-- statement-breakpoint
revoke all on function public.executar_projetar_registros_operacionais() from public;

-- statement-breakpoint
grant execute on function public.executar_set_context(text, text) to executar_runtime;

-- statement-breakpoint
grant execute on function public.executar_carregar_estado(text, text) to executar_runtime;

-- statement-breakpoint
grant execute on function public.executar_persistir_estado(text, text, jsonb) to executar_runtime;

-- statement-breakpoint
grant execute on function public.executar_solicitar_aprovacao(text, text, text, text, text, bigint, jsonb) to executar_runtime;

-- statement-breakpoint
grant execute on function public.executar_resolver_aprovacao(text, text, uuid, boolean) to executar_runtime;

-- statement-breakpoint
grant execute on function public.executar_projetar_registros_operacionais() to executar_runtime;

-- statement-breakpoint
create trigger executar_events_projetar_registros
after insert on public.executar_events
for each row
when (new.payload ? 'state')
execute function public.executar_projetar_registros_operacionais();
