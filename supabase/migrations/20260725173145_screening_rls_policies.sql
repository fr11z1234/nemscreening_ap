-- auth.users er faelles med kundeportalen, sa en website-kunde er ALLEREDE en gyldig
-- "authenticated"-bruger her. Adgang ma derfor aldrig gates pa authenticated alene,
-- men altid pa medlemskab i screening.app_users.
--
-- Funktionerne er SECURITY DEFINER, sa opslaget i app_users ikke rammer app_users'
-- egen RLS-politik og skaber uendelig rekursion.

create or replace function screening.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from screening.app_users u
    where u.id = (select auth.uid()) and u.active
  );
$$;

create or replace function screening.is_office()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from screening.app_users u
    where u.id = (select auth.uid()) and u.active and u.role in ('office','admin')
  );
$$;

create or replace function screening.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from screening.app_users u
    where u.id = (select auth.uid()) and u.active and u.role = 'admin'
  );
$$;

revoke execute on function screening.is_member(), screening.is_office(), screening.is_admin() from public;
grant  execute on function screening.is_member(), screening.is_office(), screening.is_admin() to authenticated, service_role;

alter table screening.app_users      enable row level security;
alter table screening.materials      enable row level security;
alter table screening.sample_types   enable row level security;
alter table screening.app_settings   enable row level security;
alter table screening.cases          enable row level security;
alter table screening.case_buildings enable row level security;
alter table screening.samples        enable row level security;
alter table screening.sample_photos  enable row level security;
alter table screening.exports        enable row level security;
alter table screening.lab_results    enable row level security;

-- Brugere: alle medlemmer kan se hinanden, kun admin kan aendre medlemskab.
create policy app_users_select on screening.app_users for select to authenticated using (screening.is_member());
create policy app_users_write  on screening.app_users for all    to authenticated using (screening.is_admin()) with check (screening.is_admin());

-- Opslagslister og indstillinger: alle laeser, kontor/admin retter.
create policy materials_select    on screening.materials    for select to authenticated using (screening.is_member());
create policy materials_write     on screening.materials    for all    to authenticated using (screening.is_office()) with check (screening.is_office());
create policy sample_types_select on screening.sample_types for select to authenticated using (screening.is_member());
create policy sample_types_write  on screening.sample_types for all    to authenticated using (screening.is_office());
create policy app_settings_select on screening.app_settings for select to authenticated using (screening.is_member());
create policy app_settings_write  on screening.app_settings for all    to authenticated using (screening.is_office()) with check (screening.is_office());

-- Sager: alle medlemmer arbejder pa tvaers. Kun kontor/admin ma slette en hel sag.
create policy cases_select on screening.cases for select to authenticated using (screening.is_member());
create policy cases_insert on screening.cases for insert to authenticated with check (screening.is_member());
create policy cases_update on screening.cases for update to authenticated using (screening.is_member()) with check (screening.is_member());
create policy cases_delete on screening.cases for delete to authenticated using (screening.is_office());

-- Bygninger, prover og fotos: fuld adgang for medlemmer. En screener skal kunne
-- slette en fejlindtastet prove i felten uden at ringe til kontoret.
create policy case_buildings_all on screening.case_buildings for all to authenticated using (screening.is_member()) with check (screening.is_member());
create policy samples_all        on screening.samples        for all to authenticated using (screening.is_member()) with check (screening.is_member());
create policy sample_photos_all  on screening.sample_photos  for all to authenticated using (screening.is_member()) with check (screening.is_member());

-- Eksportlog: alle kan se historikken, kontor/admin genererer.
create policy exports_select on screening.exports for select to authenticated using (screening.is_member());
create policy exports_insert on screening.exports for insert to authenticated with check (screening.is_office());

-- V2
create policy lab_results_select on screening.lab_results for select to authenticated using (screening.is_member());
create policy lab_results_write  on screening.lab_results for all    to authenticated using (screening.is_office()) with check (screening.is_office());