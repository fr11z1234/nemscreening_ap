-- Materialepanelet: bygningsdele og rapporttekst flyttes fra kode til database.
--
-- Rapportens saetninger stod i src/lib/rapport/ressourcer.ts og kunne kun rettes
-- med en udrulning. De skal kunne rettes af kontoret, fordi det er dem der ved
-- hvad kommunen skal laese — og fordi et forkert ord dér er en faglig pastand,
-- ikke en tastefejl.
--
-- Begge lister flyttes UAENDRET. De 56 materialer og de 8 bygningsdele staar ord
-- for ord som for. Intet slas sammen, intet tilfojes: bliver listen lavet om
-- her, kan kontoret ikke genkende den i panelet, og de kan selv rette den
-- bagefter.

-- ---------------------------------------------------------------------------
-- Bygningsdele
-- ---------------------------------------------------------------------------
-- Var en enum med de otte vaerdier fra den forste skabelon. En enum kan ikke
-- aendres uden en migration, og listen skal kunne styres i panelet — sa den
-- bliver en tabel.
--
-- `sort_order` er ikke pynt: den ER overskrifternes raekkefolge i rapporten,
-- nedefra og op gennem bygningen. Rettes den i panelet, flytter afsnittene sig.
create table screening.building_parts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into screening.building_parts (name, sort_order)
select p.name, p.ord
from unnest(array[
  'Fundament og sokkel',
  'Bærende konstruktioner',
  'Facade (udvendig)',
  'Vægge (indvendig)',
  'Vinduer og døre',
  'Indvendige overflader',
  'Tag',
  'Øvrige'
]) with ordinality as p(name, ord);

-- Proven peger nu pa raekken. `on delete set null` og ikke cascade: slettes en
-- bygningsdel i panelet, ma proven blive — den er taget, og dens maengde og
-- billeder gaelder stadig. Den falder blot ud af ressourceafsnittet, indtil
-- nogen vaelger en ny.
alter table screening.samples
  add column building_part_id uuid references screening.building_parts(id) on delete set null;

update screening.samples s
set building_part_id = bp.id
from screening.building_parts bp
where bp.name = case s.building_part
  when 'fundament'             then 'Fundament og sokkel'
  when 'baerende'              then 'Bærende konstruktioner'
  when 'facade'                then 'Facade (udvendig)'
  when 'vaegge'                then 'Vægge (indvendig)'
  when 'vinduer_doere'         then 'Vinduer og døre'
  when 'indvendige_overflader' then 'Indvendige overflader'
  when 'tag'                   then 'Tag'
  when 'oevrige'               then 'Øvrige'
end;

drop index if exists screening.samples_case_part_idx;

alter table screening.samples drop column building_part;
drop type screening.building_part;

create index samples_case_part_idx
  on screening.samples (case_id, building_part_id)
  where building_part_id is not null;

-- ---------------------------------------------------------------------------
-- Materialerne
-- ---------------------------------------------------------------------------
-- Navnet staar uroert. Fire nye felter, alle frivillige.
--
-- `report_name` er navnet i rapporten. Screeneren vaelger «Beton (undtagen,
-- gasbeton, letbeton)» — det er affaldsfraktionens navn — men kunden skal laese
-- «Beton», uden parentesen. Er feltet tomt, bruges navnet.
--
-- De tre saetninger er det, der printes efter maengden, en pr. handtering.
-- Screeneren vaelger handteringen pa proven, og rapporten henter den saetning.
-- Er den tom, skriver rapporten navn og maengde og lover ingenting — en
-- opdigtet saetning er vaerre end en manglende.
--
-- `sentences_reviewed` er falsk pa alt der er seedet fra skabelonen. Ordene er
-- kundens egne og staar ordret, men hvilken handtering hver saetning hoerer til,
-- er udledt af ordlyden. Panelet viser det, indtil en fagperson har set efter.
alter table screening.materials
  add column report_name            text,
  add column sentence_genbrug       text,
  add column sentence_genanvendelse text,
  add column sentence_bortskaffelse text,
  add column sentences_reviewed     boolean not null default false;

-- ---------------------------------------------------------------------------
-- Adgang
-- ---------------------------------------------------------------------------
-- `materials` har sine politikker i forvejen: alle medlemmer laeser, kontor og
-- admin retter. De nye kolonner arver dem. Bygningsdelene far det samme —
-- screeneren skal kunne LAESE dem for at kunne vaelge dem i marken, men
-- rapportens ord og struktur hoerer pa kontoret.
alter table screening.building_parts enable row level security;

create policy building_parts_select on screening.building_parts
  for select to authenticated using (screening.is_member());
create policy building_parts_write on screening.building_parts
  for all to authenticated using (screening.is_office()) with check (screening.is_office());
