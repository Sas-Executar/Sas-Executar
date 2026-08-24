-- Template auditável da integração final, NÃO uma migration aplicada.
-- Gerar a migration oficial somente com: supabase migration new executar_multi_tenant
-- Regra padrão: projeto Supabase NOVO dedicado ao EXECUTAR.
-- Exceção autorizada nominalmente: executar-scanner-v1 (aaaftocmuiztyxdgclqt).
-- Preservar todas as tabelas, dados e policies anteriores do scanner.
-- Clerk é a autoridade de identidade; não existe Supabase Auth ou tabela de membership.

create table public.executar_organizations (
  organization_id text primary key check (organization_id ~ '^org_[A-Za-z0-9_-]+$'),
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now()
);

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

create index executar_projects_organization_idx
  on public.executar_projects (organization_id);
create index executar_deliveries_project_status_idx
  on public.executar_deliveries (organization_id, project_id, status);
create index executar_dependencies_predecessor_idx
  on public.executar_dependencies (organization_id, project_id, predecessor_id);
create index executar_evidence_delivery_idx
  on public.executar_evidence (organization_id, project_id, delivery_id);
create index executar_events_revision_idx
  on public.executar_events (organization_id, project_id, revision);
create index executar_approvals_project_status_idx
  on public.executar_approvals (organization_id, project_id, status);
create index executar_comments_delivery_idx
  on public.executar_comments (organization_id, project_id, delivery_id);
create index executar_notification_reads_user_idx
  on public.executar_notification_reads (organization_id, project_id, user_id);

do $$
declare
  relation_name text;
  organization_claim constant text :=
    '((select coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false)) is false' ||
    ' and (select auth.jwt() ->> ''sub'') ~ ''^user_[A-Za-z0-9_-]+$''' ||
    ' and organization_id = (select coalesce(auth.jwt() -> ''o'' ->> ''id'', auth.jwt() ->> ''org_id'')))';
  select_claim text;
  insert_claim text;
  update_using_claim text;
  update_check_claim text;
  delete_claim text;
begin
  foreach relation_name in array array[
    'executar_organizations',
    'executar_projects',
    'executar_deliveries',
    'executar_dependencies',
    'executar_evidence',
    'executar_events',
    'executar_approvals',
    'executar_comments',
    'executar_notification_reads'
  ] loop
    select_claim := organization_claim;
    insert_claim := organization_claim;
    update_using_claim := organization_claim;
    update_check_claim := organization_claim;
    delete_claim := organization_claim;

    if relation_name = 'executar_notification_reads' then
      select_claim := organization_claim ||
        ' and (user_id = (select auth.jwt() ->> ''sub''))';
      insert_claim := select_claim;
      update_using_claim := select_claim;
      update_check_claim := select_claim;
      delete_claim := select_claim;
    elsif relation_name = 'executar_evidence' then
      insert_claim := organization_claim ||
        ' and (author_user_id = (select auth.jwt() ->> ''sub''))';
      update_using_claim := insert_claim;
      update_check_claim := insert_claim;
      delete_claim := insert_claim;
    elsif relation_name = 'executar_comments' then
      insert_claim := organization_claim ||
        ' and (author_user_id = (select auth.jwt() ->> ''sub''))';
      update_using_claim := insert_claim;
      update_check_claim := insert_claim;
      delete_claim := insert_claim;
    elsif relation_name = 'executar_events' then
      insert_claim := organization_claim ||
        ' and (actor_user_id = (select auth.jwt() ->> ''sub''))';
    elsif relation_name = 'executar_approvals' then
      insert_claim := organization_claim ||
        ' and (requested_by_user_id = (select auth.jwt() ->> ''sub''))';
      update_check_claim := organization_claim ||
        ' and (status <> ''approved'' or approved_by_user_id = (select auth.jwt() ->> ''sub''))';
    end if;

    execute format('alter table public.%I enable row level security', relation_name);
    execute format('alter table public.%I force row level security', relation_name);
    execute format('revoke all on public.%I from anon', relation_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', relation_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (%s)',
      relation_name || '_select_organization', relation_name, select_claim
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      relation_name || '_insert_organization', relation_name, insert_claim
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      relation_name || '_update_organization', relation_name, update_using_claim, update_check_claim
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s)',
      relation_name || '_delete_organization', relation_name, delete_claim
    );

    if relation_name = 'executar_events' then
      execute format('revoke update, delete on public.%I from authenticated', relation_name);
    end if;
  end loop;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('executar-evidencias', 'executar-evidencias', false, 2621440)
on conflict (id) do nothing;

create policy executar_storage_select_organization
on storage.objects for select to authenticated
using (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

create policy executar_storage_insert_organization
on storage.objects for insert to authenticated
with check (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

create policy executar_storage_update_organization
on storage.objects for update to authenticated
using (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
)
with check (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

create policy executar_storage_delete_organization
on storage.objects for delete to authenticated
using (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'executar_events'
  ) then
    alter publication supabase_realtime add table public.executar_events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'executar_comments'
  ) then
    alter publication supabase_realtime add table public.executar_comments;
  end if;
end
$$;
