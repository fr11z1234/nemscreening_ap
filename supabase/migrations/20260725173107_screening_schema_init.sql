-- Screening-appen bor i sit eget skema, helt adskilt fra websitets tabeller i public.
-- Ingen fremmednogler peger ind i public.
create schema if not exists screening;

create type screening.user_role       as enum ('screener','office','admin');
create type screening.case_status     as enum ('oprettet','under_screening','proever_taget','sendt_til_lab','afsluttet');
create type screening.building_period as enum ('foer_1990','efter_1990');

-- Egen brugertabel. auth.users er faelles for hele projektet, men medlemskab HER
-- er det der giver adgang til screening-data. Se RLS-migrationen.
create table screening.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        screening.user_role not null default 'screener',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Opslagslister. Tabeller frem for hardkodede lister, sa de kan rettes uden deployment.
create table screening.materials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  active     boolean not null default true
);

create table screening.sample_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  active     boolean not null default true
);

create table screening.cases (
  id                     uuid primary key default gen_random_uuid(),
  case_name              text not null,                       -- sagsnavn = adressen, gar i Eurofins kolonne 2
  status                 screening.case_status not null default 'oprettet',
  customer_name          text,
  customer_contact       text,
  customer_email         text,
  customer_phone         text,
  address_text           text,
  dawa_adgangsadresse_id text,
  postnr                 text,
  city                   text,
  area_m2                numeric,                             -- arkhovedet, forudfyldt fra BBR
  built_year             int,
  rebuilt_year           int,
  source_booking_id      uuid,                                -- los reference til public.bookings, bevidst ingen FK
  note                   text,
  created_by             uuid references screening.app_users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table screening.case_buildings (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references screening.cases(id) on delete cascade,
  bbr_building_id  text,
  building_no      text,
  label            text not null,                             -- "Bygning 1" - vises i proveformularen
  usage_code       text,
  usage_text       text,
  built_year       int,
  rebuilt_year     int,
  area_built       numeric,
  area_total       numeric,
  area_residential numeric,
  raw_bbr          jsonb,                                     -- hele BBR-svaret, sa nye felter ikke kraever migration
  is_manual        boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create table screening.samples (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references screening.cases(id) on delete cascade,
  seq               int not null,                             -- lobende taeller 1..n pr. sag
  material          text,
  sample_type       text,                                     -- proveart
  building_id       uuid references screening.case_buildings(id) on delete set null,
  location_note     text,
  estimated_tons    numeric,
  period            screening.building_period,
  analysis_pcb      boolean not null default false,
  analysis_asbestos boolean not null default false,
  analysis_metals   boolean not null default false,
  analysis_pah      boolean not null default false,
  comment           text,
  created_by        uuid references screening.app_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Reglen "P foran nar der er valgt mindst en analyse" handhaeves i databasen,
  -- sa ingen kodesti kan blive uenig med den om hvad der skal til laboratoriet.
  is_lab_sample boolean generated always as
    (analysis_pcb or analysis_asbestos or analysis_metals or analysis_pah) stored,
  label text generated always as
    (case when analysis_pcb or analysis_asbestos or analysis_metals or analysis_pah
          then 'P' || seq::text else seq::text end) stored,

  constraint samples_case_seq_unique unique (case_id, seq)
);

create table screening.sample_photos (
  id           uuid primary key default gen_random_uuid(),
  sample_id    uuid not null references screening.samples(id) on delete cascade,
  storage_path text not null unique,
  width        int,
  height       int,
  bytes        bigint,
  taken_at     timestamptz,
  sort_order   int not null default 0,
  created_by   uuid references screening.app_users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table screening.exports (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references screening.cases(id) on delete cascade,
  kind         text not null default 'eurofins_csv',
  filename     text,
  row_count    int,
  sample_ids   uuid[] not null default '{}',
  generated_by uuid references screening.app_users(id) on delete set null,
  generated_at timestamptz not null default now()
);

create table screening.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Forberedt til V2. Vaerdier gemmes som tekst fordi laboratoriet svarer
-- med ting som "< 0,05", "I.a." og "I.P." side om side med rene tal.
create table screening.lab_results (
  sample_id       uuid primary key references screening.samples(id) on delete cascade,
  pb              text,
  cd              text,
  cr              text,
  cu              text,
  hg              text,
  ni              text,
  zn              text,
  asbestos        text,
  pcb_total       text,
  chlor_paraffins text,
  pah_total       text,
  raw             jsonb,
  received_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index cases_status_created_idx    on screening.cases (status, created_at desc);
create index cases_created_by_idx        on screening.cases (created_by);
create index case_buildings_case_idx     on screening.case_buildings (case_id, sort_order);
create index samples_case_seq_idx        on screening.samples (case_id, seq);
create index samples_case_lab_idx        on screening.samples (case_id) where is_lab_sample;
create index sample_photos_sample_idx    on screening.sample_photos (sample_id, sort_order);
create index exports_case_idx            on screening.exports (case_id, generated_at desc);

create or replace function screening.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_users_updated_at before update on screening.app_users
  for each row execute function screening.set_updated_at();
create trigger cases_updated_at before update on screening.cases
  for each row execute function screening.set_updated_at();
create trigger samples_updated_at before update on screening.samples
  for each row execute function screening.set_updated_at();

-- anon far bevidst ingenting: screening-appen kraever altid login.
grant usage on schema screening to authenticated, service_role;
grant select, insert, update, delete on all tables in schema screening to authenticated;
grant all on all tables in schema screening to service_role;
alter default privileges in schema screening grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema screening grant all on tables to service_role;