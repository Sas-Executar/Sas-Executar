-- Persistência canônica transacional para o projeto Supabase autorizado.
-- SECURITY INVOKER preserva RLS e a autoridade da sessão Clerk em cada escrita.

create function public.executar_persistir_estado(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_claims jsonb := auth.jwt();
  v_organization_id text := coalesce(v_claims -> 'o' ->> 'id', v_claims ->> 'org_id');
  v_actor_user_id text := v_claims ->> 'sub';
  v_expected_revision bigint;
  v_current_revision bigint;
  v_revision bigint;
  v_active_project_id text;
  v_state jsonb;
  v_event jsonb;
  v_last_event jsonb;
  v_approved boolean;
begin
  if coalesce((v_claims ->> 'is_anonymous')::boolean, false)
    or v_organization_id !~ '^org_[A-Za-z0-9_-]+$'
    or v_actor_user_id !~ '^user_[A-Za-z0-9_-]+$'
  then
    raise exception 'Sessão Clerk autenticada e organização ativa obrigatórias'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'organization_id' is distinct from v_organization_id
    or p_payload ->> 'actor_user_id' is distinct from v_actor_user_id
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
    or v_state ->> 'organizationId' is distinct from v_organization_id
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
    where project.value ->> 'organization_id' is distinct from v_organization_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_payload -> 'deliveries') as delivery(value)
    where delivery.value ->> 'organization_id' is distinct from v_organization_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_payload -> 'dependencies') as dependency(value)
    where dependency.value ->> 'organization_id' is distinct from v_organization_id
  ) then
    raise exception 'O lote não pode conter recursos de outra organização'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_organization_id, 0));

  select coalesce(max(revision), -1)
  into v_current_revision
  from public.executar_events
  where organization_id = v_organization_id;

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
  values (v_organization_id, v_organization_id)
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
  where existing.organization_id = v_organization_id
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
  where existing.organization_id = v_organization_id
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
      v_organization_id,
      v_active_project_id,
      v_organization_id || ':' || v_active_project_id || ':0',
      0,
      'estado.inicial',
      'humano',
      v_actor_user_id,
      false,
      jsonb_build_object('state', v_state)
    );
  else
    for v_event in
      select value
      from jsonb_array_elements(p_payload -> 'events')
      order by (value ->> 'revision')::bigint
    loop
      if v_event ->> 'organizationId' is distinct from v_organization_id
        or (v_event ->> 'revision')::bigint <= v_current_revision
        or (v_event ->> 'revision')::bigint > v_revision
        or (
          v_event ? 'userId'
          and v_event ->> 'userId' is distinct from v_actor_user_id
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
          where organization_id = v_organization_id
            and project_id = v_event ->> 'projectId'
            and tool_name = v_event ->> 'tool'
            and expected_revision = (v_event ->> 'revision')::bigint - 1
            and approved_by_user_id = v_actor_user_id
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
        v_organization_id,
        v_event ->> 'projectId',
        v_organization_id || ':' || (v_event ->> 'projectId') || ':' ||
          (v_event ->> 'revision'),
        (v_event ->> 'revision')::bigint,
        v_event ->> 'action',
        v_event ->> 'taskId',
        coalesce(v_event ->> 'actor', 'humano'),
        v_actor_user_id,
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
    'organization_id', v_organization_id,
    'active_project_id', v_active_project_id,
    'revision', v_revision
  );
end;
$$;

revoke all on function public.executar_persistir_estado(jsonb) from public;
revoke all on function public.executar_persistir_estado(jsonb) from anon;
grant execute on function public.executar_persistir_estado(jsonb) to authenticated;
