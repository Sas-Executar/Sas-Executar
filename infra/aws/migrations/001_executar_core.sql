create extension if not exists pgcrypto;

-- statement-breakpoint
create table public.executar_organizations (
  organization_id text primary key check (organization_id ~ '^org_[A-Za-z0-9_-]+$'),
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now()
);

-- statement-breakpoint
create table public.executar_projects (
  organization_id text not null,
  project_id text not null,
  name text not null check (length(trim(name)) > 0),
  daily_capacity_minutes integer not null default 360 check (daily_capacity_minutes between 15 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, project_id),
  foreign key (organization_id) references public.executar_organizations (organization_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_deliveries (
  organization_id text not null,
  project_id text not null,
  delivery_id text not null,
  title text not null check (length(trim(title)) > 0),
  front text not null,
  operational_date text not null,
  estimate_minutes integer not null check (estimate_minutes > 0),
  stage integer not null check (stage > 0),
  definition_of_done text,
  status text not null default 'BACKLOG_VALIDATED'
    check (status in ('BACKLOG_VALIDATED', 'READY', 'DOING', 'VERIFY', 'DONE', 'BLOCKED')),
  started_steps integer not null default 0 check (started_steps >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, project_id, delivery_id),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_dependencies (
  organization_id text not null,
  project_id text not null,
  delivery_id text not null,
  predecessor_id text not null,
  primary key (organization_id, project_id, delivery_id, predecessor_id),
  check (delivery_id <> predecessor_id),
  foreign key (organization_id, project_id, delivery_id)
    references public.executar_deliveries (organization_id, project_id, delivery_id) on delete cascade,
  foreign key (organization_id, project_id, predecessor_id)
    references public.executar_deliveries (organization_id, project_id, delivery_id) on delete restrict
);

-- statement-breakpoint
create table public.executar_evidence (
  organization_id text not null,
  project_id text not null,
  evidence_id uuid not null default gen_random_uuid(),
  delivery_id text not null,
  note text not null default '',
  external_url text,
  storage_path text,
  verified boolean not null default false,
  author_user_id text not null check (author_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  created_at timestamptz not null default now(),
  primary key (organization_id, project_id, evidence_id),
  check (storage_path is null or split_part(storage_path, '/', 1) = organization_id),
  foreign key (organization_id, project_id, delivery_id)
    references public.executar_deliveries (organization_id, project_id, delivery_id) on delete restrict
);

-- statement-breakpoint
create table public.executar_events (
  organization_id text not null,
  project_id text not null,
  event_id text not null,
  revision bigint not null check (revision >= 0),
  action text not null,
  delivery_id text,
  actor_type text not null check (actor_type in ('humano', 'copiloto')),
  actor_user_id text not null check (actor_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  human_approved boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (organization_id, project_id, event_id),
  unique (organization_id, project_id, revision),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_approvals (
  organization_id text not null,
  project_id text not null,
  approval_id uuid not null default gen_random_uuid(),
  requested_by_user_id text not null check (requested_by_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  approved_by_user_id text check (approved_by_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  tool_name text not null,
  delivery_id text,
  expected_revision bigint not null check (expected_revision >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  input jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, project_id, approval_id),
  check (status <> 'approved' or approved_by_user_id is not null),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_comments (
  organization_id text not null,
  project_id text not null,
  comment_id text not null,
  delivery_id text not null,
  author_user_id text not null check (author_user_id ~ '^user_[A-Za-z0-9_-]+$'),
  body text not null check (length(body) between 1 and 2000),
  mentions jsonb not null default '[]'::jsonb check (jsonb_typeof(mentions) = 'array'),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default now(),
  primary key (organization_id, project_id, comment_id),
  foreign key (organization_id, project_id, delivery_id)
    references public.executar_deliveries (organization_id, project_id, delivery_id) on delete cascade
);

-- statement-breakpoint
create table public.executar_notification_reads (
  organization_id text not null,
  project_id text not null,
  notification_id text not null,
  user_id text not null check (user_id ~ '^user_[A-Za-z0-9_-]+$'),
  read_at timestamptz not null default now(),
  primary key (organization_id, project_id, notification_id, user_id),
  foreign key (organization_id, project_id)
    references public.executar_projects (organization_id, project_id) on delete cascade
);

-- statement-breakpoint
create or replace function public.executar_current_organization()
returns text
language sql
stable
as $$
  select nullif(current_setting('executar.organization_id', true), '')
$$;

-- statement-breakpoint
create or replace function public.executar_current_user()
returns text
language sql
stable
as $$
  select nullif(current_setting('executar.user_id', true), '')
$$;

-- statement-breakpoint
revoke all on function public.executar_current_organization() from public;

-- statement-breakpoint
grant execute on function public.executar_current_organization() to executar_runtime;

-- statement-breakpoint
revoke all on function public.executar_current_user() from public;

-- statement-breakpoint
grant execute on function public.executar_current_user() to executar_runtime;

-- statement-breakpoint
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'executar_organizations',
    'executar_projects',
    'executar_deliveries',
    'executar_dependencies'
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
      'create policy %I on public.%I for insert to executar_runtime with check (organization_id = public.executar_current_organization())',
      relation_name || '_insert_tenant', relation_name
    );
    execute format(
      'create policy %I on public.%I for update to executar_runtime using (organization_id = public.executar_current_organization()) with check (organization_id = public.executar_current_organization())',
      relation_name || '_update_tenant', relation_name
    );
    execute format(
      'create policy %I on public.%I for delete to executar_runtime using (organization_id = public.executar_current_organization())',
      relation_name || '_delete_tenant', relation_name
    );
  end loop;

  foreach relation_name in array array[
    'executar_evidence',
    'executar_events',
    'executar_approvals',
    'executar_comments',
    'executar_notification_reads'
  ] loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('alter table public.%I force row level security', relation_name);
    execute format('revoke all on public.%I from public', relation_name);
    execute format('grant select, insert, update, delete on public.%I to executar_runtime', relation_name);
  end loop;

  grant usage on schema public to executar_runtime;
end
$$;

-- statement-breakpoint
create policy executar_evidence_select_tenant
on public.executar_evidence for select to executar_runtime
using (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_evidence_insert_author
on public.executar_evidence for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_evidence_update_author
on public.executar_evidence for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_evidence_delete_author
on public.executar_evidence for delete to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_events_select_tenant
on public.executar_events for select to executar_runtime
using (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_events_insert_actor
on public.executar_events for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and actor_user_id = public.executar_current_user()
);

-- statement-breakpoint
revoke update, delete on public.executar_events from executar_runtime;

-- statement-breakpoint
create policy executar_approvals_select_tenant
on public.executar_approvals for select to executar_runtime
using (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_approvals_insert_requester
on public.executar_approvals for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and requested_by_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_approvals_update_requester
on public.executar_approvals for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and requested_by_user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and requested_by_user_id = public.executar_current_user()
  and (
    approved_by_user_id is null
    or approved_by_user_id = public.executar_current_user()
  )
);

-- statement-breakpoint
create policy executar_comments_select_tenant
on public.executar_comments for select to executar_runtime
using (organization_id = public.executar_current_organization());

-- statement-breakpoint
create policy executar_comments_insert_author
on public.executar_comments for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_comments_update_author
on public.executar_comments for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_comments_delete_author
on public.executar_comments for delete to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and author_user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_notification_reads_select_user
on public.executar_notification_reads for select to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_notification_reads_insert_user
on public.executar_notification_reads for insert to executar_runtime
with check (
  organization_id = public.executar_current_organization()
  and user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_notification_reads_update_user
on public.executar_notification_reads for update to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and user_id = public.executar_current_user()
)
with check (
  organization_id = public.executar_current_organization()
  and user_id = public.executar_current_user()
);

-- statement-breakpoint
create policy executar_notification_reads_delete_user
on public.executar_notification_reads for delete to executar_runtime
using (
  organization_id = public.executar_current_organization()
  and user_id = public.executar_current_user()
);

-- statement-breakpoint
create index executar_projects_organization_idx
  on public.executar_projects (organization_id);

-- statement-breakpoint
create index executar_deliveries_project_status_idx
  on public.executar_deliveries (organization_id, project_id, status);

-- statement-breakpoint
create index executar_dependencies_predecessor_idx
  on public.executar_dependencies (organization_id, project_id, predecessor_id);

-- statement-breakpoint
create index executar_evidence_delivery_idx
  on public.executar_evidence (organization_id, project_id, delivery_id);

-- statement-breakpoint
create index executar_events_revision_idx
  on public.executar_events (organization_id, project_id, revision);

-- statement-breakpoint
create index executar_approvals_project_status_idx
  on public.executar_approvals (organization_id, project_id, status);

-- statement-breakpoint
create index executar_comments_delivery_idx
  on public.executar_comments (organization_id, project_id, delivery_id);

-- statement-breakpoint
create index executar_notification_reads_user_idx
  on public.executar_notification_reads (organization_id, project_id, user_id);
