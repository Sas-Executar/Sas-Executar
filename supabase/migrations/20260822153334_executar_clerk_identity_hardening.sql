-- Bloqueia sessões anônimas e aceita somente identidades Clerk nas policies EXECUTAR.
-- Tabelas, dados, policies e bucket anteriores do scanner permanecem inalterados.

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
      'alter policy %I on public.%I using (%s)',
      relation_name || '_select_organization', relation_name, select_claim
    );
    execute format(
      'alter policy %I on public.%I with check (%s)',
      relation_name || '_insert_organization', relation_name, insert_claim
    );
    execute format(
      'alter policy %I on public.%I using (%s) with check (%s)',
      relation_name || '_update_organization', relation_name, update_using_claim, update_check_claim
    );
    execute format(
      'alter policy %I on public.%I using (%s)',
      relation_name || '_delete_organization', relation_name, delete_claim
    );

    if relation_name = 'executar_events' then
      execute format('revoke update, delete on public.%I from authenticated', relation_name);
    end if;
  end loop;
end
$$;


alter policy executar_storage_select_organization
on storage.objects
using (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

alter policy executar_storage_insert_organization
on storage.objects
with check (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

alter policy executar_storage_update_organization
on storage.objects
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

alter policy executar_storage_delete_organization
on storage.objects
using (
  bucket_id = 'executar-evidencias'
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) is false
  and (select auth.jwt() ->> 'sub') ~ '^user_[A-Za-z0-9_-]+$'
  and (storage.foldername(name))[1] =
    (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id'))
);

