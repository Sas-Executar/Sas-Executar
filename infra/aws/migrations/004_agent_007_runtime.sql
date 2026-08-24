alter table public.executar_runs
add column heartbeat_at timestamptz not null default now();

-- statement-breakpoint
drop policy executar_runs_update_actor on public.executar_runs;

-- statement-breakpoint
create policy executar_runs_update_tenant
on public.executar_runs for update to executar_runtime
using (organization_id = public.executar_current_organization())
with check (organization_id = public.executar_current_organization());

-- statement-breakpoint
create function public.executar_iniciar_run(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_run_id text,
  p_run_type text,
  p_idempotency_key text,
  p_lock_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_run public.executar_runs%rowtype;
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_project_id is null
    or p_run_id is null
    or p_run_type not in ('COMMAND', 'ROUTINE', 'CONNECTOR', 'PROJECTION')
    or p_idempotency_key is null
    or p_lock_key is null
    or length(p_run_id) not between 8 and 160
    or length(p_idempotency_key) not between 8 and 240
    or length(p_lock_key) not between 3 and 160
    or not exists (
      select 1 from public.executar_projects
      where organization_id = p_organization_id
        and project_id = p_project_id
    )
  then
    raise exception 'Contrato de run inválido ou projeto inexistente'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id || ':' || p_project_id || ':' || p_lock_key,
      0
    )
  );

  select * into v_run
  from public.executar_runs
  where organization_id = p_organization_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_run.project_id is distinct from p_project_id
      or v_run.run_type is distinct from p_run_type
      or v_run.lock_key is distinct from p_lock_key
    then
      raise exception 'Chave de idempotência reutilizada em outro contrato'
        using errcode = '22023';
    end if;

    return jsonb_build_object(
      'replayed', true,
      'run_id', v_run.run_id,
      'status', v_run.status,
      'result', v_run.result
    );
  end if;

  update public.executar_runs
  set status = 'FAILED',
      result = jsonb_build_object('errorCode', 'RUN_LEASE_EXPIRED'),
      completed_at = now(),
      heartbeat_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and lock_key = p_lock_key
    and status = 'RUNNING'
    and heartbeat_at < now() - interval '2 minutes';

  if exists (
    select 1 from public.executar_runs
    where organization_id = p_organization_id
      and project_id = p_project_id
      and lock_key = p_lock_key
      and status = 'RUNNING'
  ) then
    raise exception 'Já existe uma execução ativa para este projeto'
      using errcode = '40001';
  end if;

  insert into public.executar_runs (
    organization_id,
    project_id,
    run_id,
    run_type,
    idempotency_key,
    lock_key,
    actor_user_id
  ) values (
    p_organization_id,
    p_project_id,
    p_run_id,
    p_run_type,
    p_idempotency_key,
    p_lock_key,
    p_actor_user_id
  ) returning * into v_run;

  return jsonb_build_object(
    'replayed', false,
    'run_id', v_run.run_id,
    'status', v_run.status,
    'result', v_run.result
  );
end;
$$;

-- statement-breakpoint
create function public.executar_reservar_efeito_run(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_run_id text,
  p_effect_key text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_effect_key is null or length(p_effect_key) not between 3 and 200 then
    raise exception 'Chave de efeito inválida' using errcode = '22023';
  end if;

  update public.executar_runs
  set heartbeat_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and run_id = p_run_id
    and status = 'RUNNING';

  if not found then
    raise exception 'Efeito exige run ativo no mesmo tenant e projeto'
      using errcode = '22023';
  end if;

  insert into public.executar_run_effects (
    organization_id, project_id, run_id, effect_key
  ) values (
    p_organization_id, p_project_id, p_run_id, p_effect_key
  ) on conflict (organization_id, project_id, run_id, effect_key) do nothing;

  return true;
end;
$$;

-- statement-breakpoint
create function public.executar_finalizar_efeito_run(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_run_id text,
  p_effect_key text,
  p_status text,
  p_error_code text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_status not in ('SUCCEEDED', 'FAILED') then
    raise exception 'Status final de efeito inválido' using errcode = '22023';
  end if;

  update public.executar_run_effects
  set status = p_status,
      error_code = p_error_code,
      updated_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and run_id = p_run_id
    and effect_key = p_effect_key
    and status = 'PENDING';

  if not found and not exists (
    select 1 from public.executar_run_effects
    where organization_id = p_organization_id
      and project_id = p_project_id
      and run_id = p_run_id
      and effect_key = p_effect_key
      and status = p_status
  ) then
    raise exception 'Efeito não reservado no mesmo tenant e projeto'
      using errcode = '22023';
  end if;

  update public.executar_runs
  set heartbeat_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and run_id = p_run_id
    and status = 'RUNNING';

  return true;
end;
$$;

-- statement-breakpoint
create function public.executar_finalizar_run(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_run_id text,
  p_result jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_result is null or jsonb_typeof(p_result) <> 'object' then
    raise exception 'Resultado do run deve ser um objeto'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from public.executar_run_effects
    where organization_id = p_organization_id
      and project_id = p_project_id
      and run_id = p_run_id
      and status <> 'SUCCEEDED'
  ) then
    raise exception 'Run não pode concluir com efeitos pendentes ou falhos'
      using errcode = '22023';
  end if;

  update public.executar_runs
  set status = 'SUCCEEDED',
      result = p_result,
      completed_at = now(),
      heartbeat_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and run_id = p_run_id
    and status = 'RUNNING';

  if not found and not exists (
    select 1 from public.executar_runs
    where organization_id = p_organization_id
      and project_id = p_project_id
      and run_id = p_run_id
      and status = 'SUCCEEDED'
  ) then
    raise exception 'Conclusão exige run ativo no mesmo tenant e projeto'
      using errcode = '22023';
  end if;

  return true;
end;
$$;

-- statement-breakpoint
create function public.executar_falhar_run(
  p_organization_id text,
  p_actor_user_id text,
  p_project_id text,
  p_run_id text,
  p_error_code text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.executar_set_context(p_organization_id, p_actor_user_id);

  if p_error_code is null or length(p_error_code) not between 2 and 120 then
    raise exception 'Código de erro do run é inválido' using errcode = '22023';
  end if;

  update public.executar_runs
  set status = 'FAILED',
      result = jsonb_build_object('errorCode', p_error_code),
      completed_at = now(),
      heartbeat_at = now()
  where organization_id = p_organization_id
    and project_id = p_project_id
    and run_id = p_run_id
    and status = 'RUNNING';

  if not found and not exists (
    select 1 from public.executar_runs
    where organization_id = p_organization_id
      and project_id = p_project_id
      and run_id = p_run_id
      and status = 'FAILED'
  ) then
    raise exception 'Falha exige run ativo no mesmo tenant e projeto'
      using errcode = '22023';
  end if;

  return true;
end;
$$;
