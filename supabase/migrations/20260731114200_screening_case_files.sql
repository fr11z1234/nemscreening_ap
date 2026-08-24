-- Rapportens bilag: plantegningen og Eurofins' egen analyserapport.
--
-- De hoerer til sagen og ikke til en enkelt prove, saa de kan ikke ligge i
-- sample_photos. Eurofins-PDF'en gemmes bade som den kom og som en raekke
-- billeder, en pr. side: rapporten printes fra browseren, og en browser
-- printer ikke indholdet af en indlejret PDF med.

create table screening.case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references screening.cases(id) on delete cascade,
  kind text not null check (kind in ('plantegning', 'eurofins_pdf', 'eurofins_side')),
  storage_path text not null,
  filename text,
  mime text,
  bytes bigint,
  width integer,
  height integer,
  -- Sidetallet for eurofins_side. Nul for de arter der kun findes en gang.
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- En sag har en plantegning og en Eurofins-PDF. Uploader man igen, erstatter
-- den den gamle. Bilagets sider er undtaget - dem er der flere af.
create unique index case_files_en_pr_art
  on screening.case_files (case_id, kind)
  where kind in ('plantegning', 'eurofins_pdf');

create unique index case_files_en_pr_side
  on screening.case_files (case_id, sort_order)
  where kind = 'eurofins_side';

create index case_files_sag on screening.case_files (case_id);

alter table screening.case_files enable row level security;

-- Samme deling som lab_results: alle medlemmer kan se rapportens dele,
-- kun kontoret laegger dem op.
create policy case_files_select on screening.case_files
  for select using (screening.is_member());

create policy case_files_write on screening.case_files
  for all using (screening.is_office()) with check (screening.is_office());

grant select, insert, update, delete on screening.case_files to authenticated;

-- Egen bucket: screening-photos tillader kun billeder, og en Eurofins-rapport
-- fylder mere end et komprimeret provefoto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screening-rapport',
  'screening-rapport',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy screening_rapport_select on storage.objects
  for select using (bucket_id = 'screening-rapport' and screening.is_member());

create policy screening_rapport_insert on storage.objects
  for insert with check (bucket_id = 'screening-rapport' and screening.is_office());

create policy screening_rapport_update on storage.objects
  for update using (bucket_id = 'screening-rapport' and screening.is_office())
  with check (bucket_id = 'screening-rapport' and screening.is_office());

create policy screening_rapport_delete on storage.objects
  for delete using (bucket_id = 'screening-rapport' and screening.is_office());