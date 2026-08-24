alter table public.executar_projects
add column completion_policy jsonb not null default jsonb_build_object(
  'requireDod', false,
  'requireEvidence', true,
  'requireVerification', true,
  'requireHumanApproval', true
);

-- statement-breakpoint
alter table public.executar_projects
add constraint executar_projects_completion_policy_object
check (jsonb_typeof(completion_policy) = 'object');

-- statement-breakpoint
create table public.executar_runs (
  organization_id text not null,
  project_id text not null,
  run_id text not null,
  run_type text not null check (run_type in ('COMMAND', 'ROUTINE', 'CONNECTOR', 'PROJECTION')),
  idempotency_key text not null,
  lock_key text not null,
  status text not null default 'RUNNING' check (status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  actor_user_id text not null check (actor_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (organization_id, project_id, run_id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
create unique index executar_runs_active_lock
on public.executar_runs (organization_id, project_id, lock_key)
where status = 'RUNNING';

-- statement-breakpoint
create table public.executar_run_effects (
  organization_id text not null,
  project_id text not null,
  run_id text not null,
  effect_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCEEDED', 'FAILED')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, project_id, run_id, effect_key),
  foreign key (organization_id, project_id, run_id)
    references public.executar_runs (organization_id, project_id, run_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_connector_bindings (
  organization_id text not null,
  project_id text not null,
  provider text not null check (provider in ('DRIVE', 'LINEAR')),
  logical_key text not null,
  direction text not null check (direction in ('IMPORT', 'EXPORT', 'PROJECTION')),
  external_id text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  cursor text,
  created_by_user_id text not null check (created_by_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, project_id, provider, logical_key, direction),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'executar_runs',
    'executar_run_effects',
    'executar_connector_bindings'
  ] loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('alter table public.%I force row level security', relation_name);
    execute format('revoke all on public.%I from public', relation_name);
    execute format('grant select, insert, update, delete on public.%I to executar_runtime', relation_name);
    execute format(
      'create policy %I on public.%I for select to executar_runtime using (organization_id = public.executar_current_organization())',
      relation_name || '_select_tenant', relation_name
    );
    execute format(
      'create policy %I on public.%I for delete to executar_runtime using (organization_id = public.executar_current_organization())',
      relation_name || '_delete_tenant', relation_name
    );
  end loop;
end
$$;

-- statement-breakpoint
create policy executar_runs_insert_actor
on public.executar_runs for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and actor_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_runs_update_actor
on public.executar_runs for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and actor_user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and actor_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_run_effects_insert_tenant
on public.executar_run_effects for insert to executar_runtime
with check (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_run_effects_update_tenant
on public.executar_run_effects for update to executar_runtime
using (organization_id = public.executar_current_organization())
with check (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_connector_bindings_insert_actor
on public.executar_connector_bindings for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and created_by_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_connector_bindings_update_actor
on public.executar_connector_bindings for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and created_by_user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and created_by_user_id = public.executar_current_user()
);
