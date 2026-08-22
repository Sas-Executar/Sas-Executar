-- Projeta evidências, comentários e leituras do snapshot operacional.
-- O trigger SECURITY INVOKER preserva RLS, autoria Clerk e a transação da RPC.

create function public.executar_projetar_registros_operacionais()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_claims jsonb := auth.jwt();
  v_organization_id text := coalesce(v_claims -> 'o' ->> 'id', v_claims ->> 'org_id');
  v_actor_user_id text := v_claims ->> 'sub';
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

  if coalesce((v_claims ->> 'is_anonymous')::boolean, false)
    or v_organization_id !~ '^org_[A-Za-z0-9_-]+$'
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

revoke all on function public.executar_projetar_registros_operacionais() from public;
revoke all on function public.executar_projetar_registros_operacionais() from anon;
grant execute on function public.executar_projetar_registros_operacionais() to authenticated;

create trigger executar_events_projetar_registros
after insert on public.executar_events
for each row
when (new.payload ? 'state')
execute function public.executar_projetar_registros_operacionais();
