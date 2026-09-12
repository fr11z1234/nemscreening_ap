begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ===================== 20260824161500_selektiv_ressourcescreening.sql =====================
-- Selektiv nedrivning: rapporttype pa sagen, og de tre felter en ressource
-- kraever ud over det, en miljoprove allerede har.
--
-- Intet her aendrer eksisterende adfaerd. `report_type` har en standardvaerdi,
-- sa hver sag der findes i forvejen bliver ved med at vaere en almindelig
-- miljoscreening, og de tre nye kolonner pa `samples` er nullable. Eurofins-
-- eksporten laeser ingen af dem — den bygges af provemaerkning, sagsnavn og de
-- fire analysefelter, og de star uroerte.

-- ---------------------------------------------------------------------------
-- Rapporttype
-- ---------------------------------------------------------------------------
-- Typen afgor hvilke afsnit rapporten far, og hvilke felter provetagningen
-- viser. Den er ikke en etikette: en selektiv sag skal kunne kende sig selv,
-- ogsa naar rapporten bygges manader senere.
create type screening.report_type as enum ('miljoescreening', 'selektiv');

alter table screening.cases
  add column report_type screening.report_type not null default 'miljoescreening';

-- ---------------------------------------------------------------------------
-- Bygningsdel
-- ---------------------------------------------------------------------------
-- Hvor i bygningen materialet sidder. Det er en ANDEN oplysning end
-- `building_ids`, som siger hvilke bygninger proven daekker — og det er den,
-- der afgor hvilken overskrift materialet havner under i ressourcescreeningen.
--
-- `facade` og `vaegge` deler overskrift i rapporten. De star alligevel som to
-- vaerdier, fordi skabelonen giver udvendigt og indvendigt teglmurvaerk hver
-- sin skaebne: det udvendige kan genbruges som hele sten, det indvendige kun
-- nyttiggores ved nedknusning. Uden skellet kunne rapporten ikke vaelge
-- mellem de to saetninger.
create type screening.building_part as enum (
  'fundament',
  'baerende',
  'facade',
  'vaegge',
  'vinduer_doere',
  'indvendige_overflader',
  'tag',
  'oevrige'
);

-- ---------------------------------------------------------------------------
-- Miljo og ressourcehandtering
-- ---------------------------------------------------------------------------
-- Screenerens vurdering af hvad der skal ske med materialet. Vaerdierne er
-- arkets egne. Arket staver «Genanveldelse»; det er en tastefejl i regnearket
-- og ikke et fagudtryk, sa her star det rigtigt.
create type screening.resource_handling as enum (
  'genbrug',
  'genanvendelse',
  'bortskaffelse'
);

alter table screening.samples
  add column building_part       screening.building_part,
  add column material_condition  smallint,
  add column resource_handling   screening.resource_handling,
  -- Standen er 1-5 fra regnearket, hvor 1 er bedst. Talvaerdi og ikke tekst,
  -- fordi den skal kunne sammenlignes: laegges flere prover af samme materiale
  -- sammen til en linje i rapporten, er det den daarligste stand der gaelder.
  add constraint samples_material_condition_check
    check (material_condition is null or material_condition between 1 and 5);

-- Ressourcescreeningen slar sagens prover op pa bygningsdel. Delvist indeks:
-- prover uden bygningsdel indgar ikke i afsnittet og behover ikke plads her.
create index samples_case_part_idx
  on screening.samples (case_id, building_part)
  where building_part is not null;

-- RLS er slaet til pa `cases` og `samples` i forvejen, og politikkerne gaelder
-- hele raekken. Nye kolonner arver dem, sa der skal ingen politik tilfojes.

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260824161500', 'selektiv_ressourcescreening', array[$fil$-- Selektiv nedrivning: rapporttype pa sagen, og de tre felter en ressource
-- kraever ud over det, en miljoprove allerede har.
--
-- Intet her aendrer eksisterende adfaerd. `report_type` har en standardvaerdi,
-- sa hver sag der findes i forvejen bliver ved med at vaere en almindelig
-- miljoscreening, og de tre nye kolonner pa `samples` er nullable. Eurofins-
-- eksporten laeser ingen af dem — den bygges af provemaerkning, sagsnavn og de
-- fire analysefelter, og de star uroerte.

-- ---------------------------------------------------------------------------
-- Rapporttype
-- ---------------------------------------------------------------------------
-- Typen afgor hvilke afsnit rapporten far, og hvilke felter provetagningen
-- viser. Den er ikke en etikette: en selektiv sag skal kunne kende sig selv,
-- ogsa naar rapporten bygges manader senere.
create type screening.report_type as enum ('miljoescreening', 'selektiv');

alter table screening.cases
  add column report_type screening.report_type not null default 'miljoescreening';

-- ---------------------------------------------------------------------------
-- Bygningsdel
-- ---------------------------------------------------------------------------
-- Hvor i bygningen materialet sidder. Det er en ANDEN oplysning end
-- `building_ids`, som siger hvilke bygninger proven daekker — og det er den,
-- der afgor hvilken overskrift materialet havner under i ressourcescreeningen.
--
-- `facade` og `vaegge` deler overskrift i rapporten. De star alligevel som to
-- vaerdier, fordi skabelonen giver udvendigt og indvendigt teglmurvaerk hver
-- sin skaebne: det udvendige kan genbruges som hele sten, det indvendige kun
-- nyttiggores ved nedknusning. Uden skellet kunne rapporten ikke vaelge
-- mellem de to saetninger.
create type screening.building_part as enum (
  'fundament',
  'baerende',
  'facade',
  'vaegge',
  'vinduer_doere',
  'indvendige_overflader',
  'tag',
  'oevrige'
);

-- ---------------------------------------------------------------------------
-- Miljo og ressourcehandtering
-- ---------------------------------------------------------------------------
-- Screenerens vurdering af hvad der skal ske med materialet. Vaerdierne er
-- arkets egne. Arket staver «Genanveldelse»; det er en tastefejl i regnearket
-- og ikke et fagudtryk, sa her star det rigtigt.
create type screening.resource_handling as enum (
  'genbrug',
  'genanvendelse',
  'bortskaffelse'
);

alter table screening.samples
  add column building_part       screening.building_part,
  add column material_condition  smallint,
  add column resource_handling   screening.resource_handling,
  -- Standen er 1-5 fra regnearket, hvor 1 er bedst. Talvaerdi og ikke tekst,
  -- fordi den skal kunne sammenlignes: laegges flere prover af samme materiale
  -- sammen til en linje i rapporten, er det den daarligste stand der gaelder.
  add constraint samples_material_condition_check
    check (material_condition is null or material_condition between 1 and 5);

-- Ressourcescreeningen slar sagens prover op pa bygningsdel. Delvist indeks:
-- prover uden bygningsdel indgar ikke i afsnittet og behover ikke plads her.
create index samples_case_part_idx
  on screening.samples (case_id, building_part)
  where building_part is not null;

-- RLS er slaet til pa `cases` og `samples` i forvejen, og politikkerne gaelder
-- hele raekken. Nye kolonner arver dem, sa der skal ingen politik tilfojes.
$fil$]);

-- ===================== 20260824193000_bygningsoversigt.sql =====================
-- Bygningsoversigten: rapportens «Projektets omfang».
--
-- Fire felter mere fra BBR, og tre som BBR ikke kan levere.
--
-- Alle syv er nullable. En sag der findes i forvejen far dem tomme, og
-- rapportens afsnit springer de linjer over frem for at skrive en stjerne —
-- praecis som resten af bilagene gor, nar de mangler.

-- ---------------------------------------------------------------------------
-- Fra BBR
-- ---------------------------------------------------------------------------
-- Koderne gemmes, ikke teksten. `usage_code` og `usage_text` star begge, fordi
-- de er aeldre end denne beslutning; her gemmes kun koden, og ordlyden slaas op
-- i BBR's kodeliste i src/lib/bbr/map.ts. Sa gaelder en rettet ordlyd hver
-- eksisterende sag med det samme og kraever ikke en datamigration.
--
-- Ydervaeg og tag er ikke kun oplysninger til rapporten. Kode 3 hedder
-- «Fibercement herunder asbest» i begge lister, og kode 10 er den samme plade
-- uden. BBR fortaeller altsa foer besoget, om der kan vaere asbest i facaden
-- eller taget — og det kan kun laeses her, hvis koden er det, der staar.
alter table screening.case_buildings
  add column floors             int,
  add column wall_material_code text,
  add column roof_material_code text,
  add column heating_code       text;

-- ---------------------------------------------------------------------------
-- Screenerens egne ord
-- ---------------------------------------------------------------------------
-- De tre findes ikke i BBR og kan ikke komme derfra: «Bygningen er planlagt til
-- delvis nedrivning» er en beslutning i projektet, ikke en registrering om
-- ejendommen.
--
-- De er i fare ved hvert BBR-opslag: `saveBuildings` sletter alle bygninger pa
-- sagen og skriver dem op igen. Derfor baerer den nu de skrevne noter med over
-- pa den bygning, der har samme bbr_building_id. Uden det ville tre afsnit
-- skrevet i marken forsvinde, fordi nogen trykkede «Hent fra BBR igen».
alter table screening.case_buildings
  add column usage_note        text,
  add column construction_note text,
  add column plan_note         text;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260824193000', 'bygningsoversigt', array[$fil$-- Bygningsoversigten: rapportens «Projektets omfang».
--
-- Fire felter mere fra BBR, og tre som BBR ikke kan levere.
--
-- Alle syv er nullable. En sag der findes i forvejen far dem tomme, og
-- rapportens afsnit springer de linjer over frem for at skrive en stjerne —
-- praecis som resten af bilagene gor, nar de mangler.

-- ---------------------------------------------------------------------------
-- Fra BBR
-- ---------------------------------------------------------------------------
-- Koderne gemmes, ikke teksten. `usage_code` og `usage_text` star begge, fordi
-- de er aeldre end denne beslutning; her gemmes kun koden, og ordlyden slaas op
-- i BBR's kodeliste i src/lib/bbr/map.ts. Sa gaelder en rettet ordlyd hver
-- eksisterende sag med det samme og kraever ikke en datamigration.
--
-- Ydervaeg og tag er ikke kun oplysninger til rapporten. Kode 3 hedder
-- «Fibercement herunder asbest» i begge lister, og kode 10 er den samme plade
-- uden. BBR fortaeller altsa foer besoget, om der kan vaere asbest i facaden
-- eller taget — og det kan kun laeses her, hvis koden er det, der staar.
alter table screening.case_buildings
  add column floors             int,
  add column wall_material_code text,
  add column roof_material_code text,
  add column heating_code       text;

-- ---------------------------------------------------------------------------
-- Screenerens egne ord
-- ---------------------------------------------------------------------------
-- De tre findes ikke i BBR og kan ikke komme derfra: «Bygningen er planlagt til
-- delvis nedrivning» er en beslutning i projektet, ikke en registrering om
-- ejendommen.
--
-- De er i fare ved hvert BBR-opslag: `saveBuildings` sletter alle bygninger pa
-- sagen og skriver dem op igen. Derfor baerer den nu de skrevne noter med over
-- pa den bygning, der har samme bbr_building_id. Uden det ville tre afsnit
-- skrevet i marken forsvinde, fordi nogen trykkede «Hent fra BBR igen».
alter table screening.case_buildings
  add column usage_note        text,
  add column construction_note text,
  add column plan_note         text;
$fil$]);

-- ===================== 20260825120000_materialepanel.sql =====================
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

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260825120000', 'materialepanel', array[$fil$-- Materialepanelet: bygningsdele og rapporttekst flyttes fra kode til database.
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
$fil$]);

-- ===================== 20260825120500_saetninger_fra_skabelonen.sql =====================
-- Saetningerne fra kundens egen skabelon, lagt pa materialerne.
--
-- Ordene er IKKE vores. De star ordret som i det dokument Nemscreening sender
-- til kommuner. Standen er taget ud af dem, fordi den nu er et felt screeneren
-- udfylder — «i god stand» saettes ind af rapporten. Ret dem ikke for at gore
-- dem paenere.
--
-- HVILKEN handtering hver saetning hoerer til, er udledt her, og det er det
-- eneste gaet i filen. Reglen er mekanisk, sa den kan efterproves: saetningen
-- lander i den spalte, hvis ord staar FORST i den. «kan genbruges som hele sten
-- eller nedknuses» har genbrug forst; «kan knuses og genanvendes som
-- fyldmateriale» lander under genanvendelse.
--
-- Derfor staar `sentences_reviewed` som falsk pa alle raekker herunder. Panelet
-- viser det, indtil en fagperson har set efter, og det er praecis den fordeling,
-- de skal se efter.

-- ---------------------------------------------------------------------------
-- Materialer med ÉN entydig saetning i skabelonen
-- ---------------------------------------------------------------------------
update screening.materials m
set sentence_genbrug       = t.genbrug,
    sentence_genanvendelse = t.genanvendelse,
    sentences_reviewed     = false
from (values
  ('Beton (undtagen, gasbeton, letbeton)',
   null, 'egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.'),
  ('Puds',
   null, 'kan genanvendes som fyldmateriale.'),
  ('Eternit, asbestfri',
   null, 'kan knuses og genanvendes som fyldmateriale eller indgå i produktionen af nye byggematerialer.'),
  ('Gips',
   null, 'kan genanvendes, hvis korrekt frasorteret.'),
  ('Fugemasse',
   null, 'kan typisk genanvendes som mineralholdigt materiale efter behandling.'),
  ('Tapet',
   null, 'kan genanvendes og bruges til nye produkter, f.eks. papirprodukter.'),
  ('Isolering',
   null, 'kan genanvendes og bruges til fremstilling af ny isolering eller andre byggematerialer.'),
  ('Tæppe',
   'begrænset genbrugspotentiale, men kan i nogle tilfælde materialegenanvendes.', null),
  ('Glasseret tegl / Fliser / Klinker',
   'kan genbruges ved sortering og knusning til sekundære råmaterialer, f.eks. stabilgrus eller til vej- og anlægsprojekter.', null),
  ('Tagpap',
   'begrænset genbrugspotentiale, primært til energiudnyttelse.', null),
  ('Uglaseret tegl (mur- og tagsten)',
   'kan genbruges som hele sten eller nedknuses til sekundært råmateriale.', null),
  ('Vinduer',
   'med potentiale for genbrug, afhængigt af stand og eventuelle forurenende stoffer.', null)
) as t(navn, genbrug, genanvendelse)
where m.name = t.navn;

-- ---------------------------------------------------------------------------
-- Rapportnavn
-- ---------------------------------------------------------------------------
-- Kun ét. Parentesen pa betonen er en affaldsklassifikation og hoerer ikke i et
-- dokument til en kommune.
--
-- De ovrige lader vi staa tomme med vilje. Skabelonens linjenavne er bundet til
-- HVOR materialet sad — «Teglsten (tag)», «Fundamentsten», «Glas (uden for
-- vinduer)» — og rapportnavnet gaelder nu materialet uanset bygningsdel. Satte
-- vi «(tag)» pa uglaseret tegl, ville en facade fa det med. Kontoret saetter dem
-- selv i panelet, hvor de kan se hvad de gor.
update screening.materials set report_name = 'Beton'
where name = 'Beton (undtagen, gasbeton, letbeton)';

-- ---------------------------------------------------------------------------
-- De seks der IKKE kan seedes, og skabelonens ord til dem
-- ---------------------------------------------------------------------------
-- Skabelonen giver disse materialer FLERE forskellige saetninger, alt efter hvor
-- de sad. Med saetningen pa materialet er der kun plads til én pr. handtering,
-- og at vaelge for kontoret ville vaere at traeffe en faglig beslutning pa deres
-- vegne. De staar derfor tomme i panelet.
--
-- Kundens ord er skrevet ned her, sa de ikke skal findes frem igen. Er der brug
-- for flere af dem samtidig, er svaret at oprette materialet praecist — fx
-- «Trægulve» ved siden af «Træ» — for det er ogsa hvad de er.
--
--   Træ
--     bærende:    ubehandlet træ har et højt genbrugspotentiale, alternativt
--                 kan det energiudnyttes.
--     facade:     har genbrugspotentiale afhængigt af overfladebehandling.
--     vinduer/døre: velegnet til genbrug.
--     indvendige: vurderes egnede til genbrug eller energiudnyttelse.
--     tag:        kan genbruges eller energiudnyttes.
--
--   Jern og metal
--     bærende/øvrige: med højt genbrugspotentiale gennem omsmeltning og
--                 recirkulering.
--     tag:        har højt genbrugspotentiale gennem omsmeltning.
--
--   Letbeton
--     facade/vægge: kan knuses og genanvendes som fyldmateriale eller bruges i
--                 produktionen af nye byggematerialer.
--     øvrige:     kan nyttiggøres gennem genanvendelse.
--
--   Glas
--     vinduer/døre: kan genbruges eller anvendes i ny glasproduktion.
--     øvrige:     kan genbruges eller indgå i glasproduktion.
--
--   Mursten
--     facade:     kan genbruges som hele sten eller nedknuses til sekundært
--                 råmateriale.
--     vægge:      kan nyttiggøres ved nedknusning og genanvendelse.
--
--   PVC
--     tag:        kan genanvendes, hvis ubehandlet.
--     øvrige:     kan genanvendes og bruges til fremstilling af nye
--                 plastprodukter.

-- Spaerre. Rammer et navn ikke listen, sker der ingenting — og resultatet er en
-- rapport hvor et materiale mangler sin saetning. Det ser ud som om skabelonen
-- var ufuldstaendig, ikke som om der var en tastefejl. Derfor taelles der efter.
do $$
declare antal int;
begin
  select count(*) into antal
  from screening.materials
  where sentence_genbrug is not null or sentence_genanvendelse is not null;

  if antal <> 12 then
    raise exception 'saetninger: % materialer fik tekst, forventede 12', antal
      using hint = 'Et navn i VALUES-listen findes ikke i screening.materials. Sammenlign med screening_seed_lookups.';
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260825120500', 'saetninger_fra_skabelonen', array[$fil$-- Saetningerne fra kundens egen skabelon, lagt pa materialerne.
--
-- Ordene er IKKE vores. De star ordret som i det dokument Nemscreening sender
-- til kommuner. Standen er taget ud af dem, fordi den nu er et felt screeneren
-- udfylder — «i god stand» saettes ind af rapporten. Ret dem ikke for at gore
-- dem paenere.
--
-- HVILKEN handtering hver saetning hoerer til, er udledt her, og det er det
-- eneste gaet i filen. Reglen er mekanisk, sa den kan efterproves: saetningen
-- lander i den spalte, hvis ord staar FORST i den. «kan genbruges som hele sten
-- eller nedknuses» har genbrug forst; «kan knuses og genanvendes som
-- fyldmateriale» lander under genanvendelse.
--
-- Derfor staar `sentences_reviewed` som falsk pa alle raekker herunder. Panelet
-- viser det, indtil en fagperson har set efter, og det er praecis den fordeling,
-- de skal se efter.

-- ---------------------------------------------------------------------------
-- Materialer med ÉN entydig saetning i skabelonen
-- ---------------------------------------------------------------------------
update screening.materials m
set sentence_genbrug       = t.genbrug,
    sentence_genanvendelse = t.genanvendelse,
    sentences_reviewed     = false
from (values
  ('Beton (undtagen, gasbeton, letbeton)',
   null, 'egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.'),
  ('Puds',
   null, 'kan genanvendes som fyldmateriale.'),
  ('Eternit, asbestfri',
   null, 'kan knuses og genanvendes som fyldmateriale eller indgå i produktionen af nye byggematerialer.'),
  ('Gips',
   null, 'kan genanvendes, hvis korrekt frasorteret.'),
  ('Fugemasse',
   null, 'kan typisk genanvendes som mineralholdigt materiale efter behandling.'),
  ('Tapet',
   null, 'kan genanvendes og bruges til nye produkter, f.eks. papirprodukter.'),
  ('Isolering',
   null, 'kan genanvendes og bruges til fremstilling af ny isolering eller andre byggematerialer.'),
  ('Tæppe',
   'begrænset genbrugspotentiale, men kan i nogle tilfælde materialegenanvendes.', null),
  ('Glasseret tegl / Fliser / Klinker',
   'kan genbruges ved sortering og knusning til sekundære råmaterialer, f.eks. stabilgrus eller til vej- og anlægsprojekter.', null),
  ('Tagpap',
   'begrænset genbrugspotentiale, primært til energiudnyttelse.', null),
  ('Uglaseret tegl (mur- og tagsten)',
   'kan genbruges som hele sten eller nedknuses til sekundært råmateriale.', null),
  ('Vinduer',
   'med potentiale for genbrug, afhængigt af stand og eventuelle forurenende stoffer.', null)
) as t(navn, genbrug, genanvendelse)
where m.name = t.navn;

-- ---------------------------------------------------------------------------
-- Rapportnavn
-- ---------------------------------------------------------------------------
-- Kun ét. Parentesen pa betonen er en affaldsklassifikation og hoerer ikke i et
-- dokument til en kommune.
--
-- De ovrige lader vi staa tomme med vilje. Skabelonens linjenavne er bundet til
-- HVOR materialet sad — «Teglsten (tag)», «Fundamentsten», «Glas (uden for
-- vinduer)» — og rapportnavnet gaelder nu materialet uanset bygningsdel. Satte
-- vi «(tag)» pa uglaseret tegl, ville en facade fa det med. Kontoret saetter dem
-- selv i panelet, hvor de kan se hvad de gor.
update screening.materials set report_name = 'Beton'
where name = 'Beton (undtagen, gasbeton, letbeton)';

-- ---------------------------------------------------------------------------
-- De seks der IKKE kan seedes, og skabelonens ord til dem
-- ---------------------------------------------------------------------------
-- Skabelonen giver disse materialer FLERE forskellige saetninger, alt efter hvor
-- de sad. Med saetningen pa materialet er der kun plads til én pr. handtering,
-- og at vaelge for kontoret ville vaere at traeffe en faglig beslutning pa deres
-- vegne. De staar derfor tomme i panelet.
--
-- Kundens ord er skrevet ned her, sa de ikke skal findes frem igen. Er der brug
-- for flere af dem samtidig, er svaret at oprette materialet praecist — fx
-- «Trægulve» ved siden af «Træ» — for det er ogsa hvad de er.
--
--   Træ
--     bærende:    ubehandlet træ har et højt genbrugspotentiale, alternativt
--                 kan det energiudnyttes.
--     facade:     har genbrugspotentiale afhængigt af overfladebehandling.
--     vinduer/døre: velegnet til genbrug.
--     indvendige: vurderes egnede til genbrug eller energiudnyttelse.
--     tag:        kan genbruges eller energiudnyttes.
--
--   Jern og metal
--     bærende/øvrige: med højt genbrugspotentiale gennem omsmeltning og
--                 recirkulering.
--     tag:        har højt genbrugspotentiale gennem omsmeltning.
--
--   Letbeton
--     facade/vægge: kan knuses og genanvendes som fyldmateriale eller bruges i
--                 produktionen af nye byggematerialer.
--     øvrige:     kan nyttiggøres gennem genanvendelse.
--
--   Glas
--     vinduer/døre: kan genbruges eller anvendes i ny glasproduktion.
--     øvrige:     kan genbruges eller indgå i glasproduktion.
--
--   Mursten
--     facade:     kan genbruges som hele sten eller nedknuses til sekundært
--                 råmateriale.
--     vægge:      kan nyttiggøres ved nedknusning og genanvendelse.
--
--   PVC
--     tag:        kan genanvendes, hvis ubehandlet.
--     øvrige:     kan genanvendes og bruges til fremstilling af nye
--                 plastprodukter.

-- Spaerre. Rammer et navn ikke listen, sker der ingenting — og resultatet er en
-- rapport hvor et materiale mangler sin saetning. Det ser ud som om skabelonen
-- var ufuldstaendig, ikke som om der var en tastefejl. Derfor taelles der efter.
do $$
declare antal int;
begin
  select count(*) into antal
  from screening.materials
  where sentence_genbrug is not null or sentence_genanvendelse is not null;

  if antal <> 12 then
    raise exception 'saetninger: % materialer fik tekst, forventede 12', antal
      using hint = 'Et navn i VALUES-listen findes ikke i screening.materials. Sammenlign med screening_seed_lookups.';
  end if;
end $$;
$fil$]);

-- ===================== 20260825124500_uden_gennemset_flag.sql =====================
-- `sentences_reviewed` ud igen.
--
-- Flaget var tilfojet, sa panelet kunne vise hvilke af skabelonens saetninger
-- der var seedet med et gaet om handteringen. Men det kostede et flueben, en
-- forklaring under fluebenet, en advarsel over listen og en prik ved hvert
-- materiale — fire ting pa en side, der skal kunne overskues.
--
-- Panelet er nu ryddet, og flaget har intet at gore der. Kundens ord til de seks
-- materialer, der ikke kunne seedes entydigt, staar stadig som kommentar i
-- 20260825120500_saetninger_fra_skabelonen.sql, sa oplysningen er ikke tabt.
--
-- Kolonnen droppes frem for at blive liggende ubrugt: en kolonne ingen skriver i
-- er en kolonne, den naeste laeser tror betyder noget.
alter table screening.materials drop column sentences_reviewed;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260825124500', 'uden_gennemset_flag', array[$fil$-- `sentences_reviewed` ud igen.
--
-- Flaget var tilfojet, sa panelet kunne vise hvilke af skabelonens saetninger
-- der var seedet med et gaet om handteringen. Men det kostede et flueben, en
-- forklaring under fluebenet, en advarsel over listen og en prik ved hvert
-- materiale — fire ting pa en side, der skal kunne overskues.
--
-- Panelet er nu ryddet, og flaget har intet at gore der. Kundens ord til de seks
-- materialer, der ikke kunne seedes entydigt, staar stadig som kommentar i
-- 20260825120500_saetninger_fra_skabelonen.sql, sa oplysningen er ikke tabt.
--
-- Kolonnen droppes frem for at blive liggende ubrugt: en kolonne ingen skriver i
-- er en kolonne, den naeste laeser tror betyder noget.
alter table screening.materials drop column sentences_reviewed;
$fil$]);

-- ===================== 20260828104500_forureningshaandtering.sql =====================
-- Skabelonens andet sporgsmal i forureningsafsnittet.
--
--   «Hvordan skal disse materialer handteres i forbindelse med nedrivningen
--    (fx asbestregler, korrekt emballering, bortskaffelse som farligt affald)?»
--
-- Det forste sporgsmal — om der er materialer, der kan skabe risiko — svarer
-- rapporten selv pa: er der en gul eller rod prove, er svaret ja. Det her kan
-- den ikke. Svaret afhaenger af hvad der konkret er fundet, hvilke regler der
-- gaelder for det, og hvordan entreprenoren skal gribe det an — en faglig
-- vurdering, som kun et menneske kan skrive, og som gar til en kommune.
--
-- Feltet ligger pa sagen og ikke pa proven: det handler om nedrivningen som
-- helhed og naevner typisk flere materialer i samme saetning.
--
-- Teksten kan blive lang. Derfor `text` og ikke en laengdebegraensning, og
-- derfor et tekstfelt over flere linjer i UI'et.
alter table screening.cases
  add column contamination_handling_note text;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260828104500', 'forureningshaandtering', array[$fil$-- Skabelonens andet sporgsmal i forureningsafsnittet.
--
--   «Hvordan skal disse materialer handteres i forbindelse med nedrivningen
--    (fx asbestregler, korrekt emballering, bortskaffelse som farligt affald)?»
--
-- Det forste sporgsmal — om der er materialer, der kan skabe risiko — svarer
-- rapporten selv pa: er der en gul eller rod prove, er svaret ja. Det her kan
-- den ikke. Svaret afhaenger af hvad der konkret er fundet, hvilke regler der
-- gaelder for det, og hvordan entreprenoren skal gribe det an — en faglig
-- vurdering, som kun et menneske kan skrive, og som gar til en kommune.
--
-- Feltet ligger pa sagen og ikke pa proven: det handler om nedrivningen som
-- helhed og naevner typisk flere materialer i samme saetning.
--
-- Teksten kan blive lang. Derfor `text` og ikke en laengdebegraensning, og
-- derfor et tekstfelt over flere linjer i UI'et.
alter table screening.cases
  add column contamination_handling_note text;
$fil$]);

-- ===================== 20260904120000_bortskaffelsestekster.sql =====================
-- Bortskaffelsen far tre saetninger i stedet for en.
--
-- Der stod EN tekst pa materialet, og den blev sat pa linjen uanset om
-- laboratoriet svarede gult eller rodt. Men de tre tilfaelde kraever hver sit
-- af entreprenoren: forurenet affald skal udsorteres, farligt affald skal til
-- et godkendt modtageanlaeg, og asbest skal befugtes, emballeres stovtaet og
-- holdes adskilt fra alt andet. En faelles saetning maa enten love for lidt om
-- asbesten eller for meget om det forurenede.
--
-- Kontoret havde selv fundet en vej udenom: asbestteksten lagt pa de
-- materialer, der HEDDER noget med asbest — «Asbest plader», «Isolering m.
-- asbest». Det virker kun, hvis screeneren ramte det rigtige navn i marken.
-- Svarer Eurofins «Pavist» pa en prove, der er registreret som «Eternit,
-- asbestfri», skal asbestteksten frem alligevel. Det er analysen der ved det,
-- ikke navnet.
--
-- `sentence_bortskaffelse` bliver STAENDE og skifter ikke betydning: den
-- daekker bade screenerens eget valg og et rodt svar. Farligt affald og
-- bortskaffelse er den samme besked. Derfor er der kun to nye kolonner, og
-- derfor aendrer ingen af de fem materialer, kontoret allerede har skrevet
-- tekst pa, ordlyd ved denne migration.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts, ved siden af
-- `faktiskHandtering`, sa de to regler kan laeses sammen.
alter table screening.materials
  add column sentence_forurenet text,
  add column sentence_asbest    text;

-- Den gamle tekst kopieres over i de to nye.
--
-- Uden det her ville migrationen GORE rapporter tavse. «Asbest plader» har sin
-- asbesttekst staaende i `sentence_bortskaffelse` — det var det eneste felt der
-- fandtes — og efter reglen herunder slaar en asbestprove op i
-- `sentence_asbest`. Var den tom, ville saetningen forsvinde ud af rapporten
-- uden en fejl nogen steder. Det samme for et gult svar paa «Andet byggeaffald
-- indeholdende farlige stoffer».
--
-- Kopien er derfor ikke et gaet paa, hvad der BOR staa, men den eneste
-- skrivning der bevarer det, rapporterne siger i dag: alle tre felter giver
-- samme svar som det ene gjorde for. Kontoret kan sa dele dem ad i panelet, et
-- materiale ad gangen, og se forskellen med det samme.
update screening.materials
set sentence_forurenet = coalesce(sentence_forurenet, sentence_bortskaffelse),
    sentence_asbest    = coalesce(sentence_asbest,    sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, eller svaret er farligt affald.';
comment on column screening.materials.sentence_forurenet is
  'Forurenet affald: gult svar pa en prove, screeneren havde sat til genbrug eller genanvendelse.';
comment on column screening.materials.sentence_asbest is
  'Asbest pavist. Overruler begge de andre, uanset hvad screeneren valgte.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260904120000', 'bortskaffelsestekster', array[$fil$-- Bortskaffelsen far tre saetninger i stedet for en.
--
-- Der stod EN tekst pa materialet, og den blev sat pa linjen uanset om
-- laboratoriet svarede gult eller rodt. Men de tre tilfaelde kraever hver sit
-- af entreprenoren: forurenet affald skal udsorteres, farligt affald skal til
-- et godkendt modtageanlaeg, og asbest skal befugtes, emballeres stovtaet og
-- holdes adskilt fra alt andet. En faelles saetning maa enten love for lidt om
-- asbesten eller for meget om det forurenede.
--
-- Kontoret havde selv fundet en vej udenom: asbestteksten lagt pa de
-- materialer, der HEDDER noget med asbest — «Asbest plader», «Isolering m.
-- asbest». Det virker kun, hvis screeneren ramte det rigtige navn i marken.
-- Svarer Eurofins «Pavist» pa en prove, der er registreret som «Eternit,
-- asbestfri», skal asbestteksten frem alligevel. Det er analysen der ved det,
-- ikke navnet.
--
-- `sentence_bortskaffelse` bliver STAENDE og skifter ikke betydning: den
-- daekker bade screenerens eget valg og et rodt svar. Farligt affald og
-- bortskaffelse er den samme besked. Derfor er der kun to nye kolonner, og
-- derfor aendrer ingen af de fem materialer, kontoret allerede har skrevet
-- tekst pa, ordlyd ved denne migration.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts, ved siden af
-- `faktiskHandtering`, sa de to regler kan laeses sammen.
alter table screening.materials
  add column sentence_forurenet text,
  add column sentence_asbest    text;

-- Den gamle tekst kopieres over i de to nye.
--
-- Uden det her ville migrationen GORE rapporter tavse. «Asbest plader» har sin
-- asbesttekst staaende i `sentence_bortskaffelse` — det var det eneste felt der
-- fandtes — og efter reglen herunder slaar en asbestprove op i
-- `sentence_asbest`. Var den tom, ville saetningen forsvinde ud af rapporten
-- uden en fejl nogen steder. Det samme for et gult svar paa «Andet byggeaffald
-- indeholdende farlige stoffer».
--
-- Kopien er derfor ikke et gaet paa, hvad der BOR staa, men den eneste
-- skrivning der bevarer det, rapporterne siger i dag: alle tre felter giver
-- samme svar som det ene gjorde for. Kontoret kan sa dele dem ad i panelet, et
-- materiale ad gangen, og se forskellen med det samme.
update screening.materials
set sentence_forurenet = coalesce(sentence_forurenet, sentence_bortskaffelse),
    sentence_asbest    = coalesce(sentence_asbest,    sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, eller svaret er farligt affald.';
comment on column screening.materials.sentence_forurenet is
  'Forurenet affald: gult svar pa en prove, screeneren havde sat til genbrug eller genanvendelse.';
comment on column screening.materials.sentence_asbest is
  'Asbest pavist. Overruler begge de andre, uanset hvad screeneren valgte.';
$fil$]);

-- ===================== 20260909120000_faelles_bortskaffelsestekst.sql =====================
-- En faelles bortskaffelsestekst pr. affaldstype, i stedet for en pr. materiale.
--
-- Kunden havde glemt at sige det: de tre bortskaffelsestekster er de SAMME for
-- alle materialer. De blev skrevet pr. materiale, fordi de bor sammen med
-- genbrugs- og genanvendelsessaetningen, og de to ER forskellige fra materiale
-- til materiale — beton knuses, trae genbruges. Men «farligt affald skal til et
-- godkendt modtageanlaeg» er den samme besked, uanset hvad der er farligt ved
-- det.
--
-- Derfor en kontakt frem for en udskiftning. Materialernes egne saetninger
-- roeres ikke af denne migration; slaas kontakten fra igen, skriver rapporten
-- praecis som for. Det er den vej, kommunen kan sende os: paapeger de, at en
-- tekst skal vaere unik for det enkelte materiale, er svaret et flueben og ikke
-- en udrulning.

-- ---------------------------------------------------------------------------
-- Hvor indstillingen bor
-- ---------------------------------------------------------------------------
-- `app_settings` er noegle/vaerdi og har staaet siden skemaet blev bygget, med
-- Eurofins-koden som eneste raekke. Den er stedet: en ny tabel med en enkelt
-- raekke ville vaere det samme med flere ord, og RLS staar her allerede rigtigt
-- — alle medlemmer laeser, kun kontoret skriver. Screeneren SKAL kunne laese
-- den: hun kan hente rapporten, og rapporten kan ikke tegnes uden.
--
-- Derfor er der heller ingen skemaaendring i denne fil. Den saetter en enkelt
-- vaerdi, og appen kan koere uden den — indstillingssiden skriver de samme
-- raekker. Filen findes, for at et miljo bygget op fra bunden staar med
-- kontakten slaaet til, som kunden har bedt om.

-- ---------------------------------------------------------------------------
-- Kontakten
-- ---------------------------------------------------------------------------
-- Noeglerne hedder det samme som kolonnerne paa `screening.materials`, saa det
-- er til at se, hvilken faelles tekst der traeder i stedet for hvilken:
-- `sentence_bortskaffelse`, `sentence_forurenet` og `sentence_asbest`.
--
-- DE TRE TEKSTER SEEDES IKKE. Det er kundens ord, og de hoerer i databasen —
-- samme regel som rapportens ovrige saetninger, der flyttede ud af koden med
-- materialepanelet. De skrives paa /indstillinger.
--
-- Er kontakten slaaet til, uden at nogen har skrevet dem, falder rapporten
-- tilbage paa materialernes egne saetninger. Se `faellesTekster` i
-- src/lib/indstillinger.ts: et tomt felt maa goere en rapport kortere, men det
-- maa ikke goere forureningsafsnittet tavst.
insert into screening.app_settings (key, value) values
  ('shared_disposal_text', 'true'::jsonb)
on conflict (key) do nothing;

comment on table screening.app_settings is
  'Noegle/vaerdi for det, der skal kunne rettes uden en udrulning. Laeses af alle medlemmer, skrives kun af kontoret.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260909120000', 'faelles_bortskaffelsestekst', array[$fil$-- En faelles bortskaffelsestekst pr. affaldstype, i stedet for en pr. materiale.
--
-- Kunden havde glemt at sige det: de tre bortskaffelsestekster er de SAMME for
-- alle materialer. De blev skrevet pr. materiale, fordi de bor sammen med
-- genbrugs- og genanvendelsessaetningen, og de to ER forskellige fra materiale
-- til materiale — beton knuses, trae genbruges. Men «farligt affald skal til et
-- godkendt modtageanlaeg» er den samme besked, uanset hvad der er farligt ved
-- det.
--
-- Derfor en kontakt frem for en udskiftning. Materialernes egne saetninger
-- roeres ikke af denne migration; slaas kontakten fra igen, skriver rapporten
-- praecis som for. Det er den vej, kommunen kan sende os: paapeger de, at en
-- tekst skal vaere unik for det enkelte materiale, er svaret et flueben og ikke
-- en udrulning.

-- ---------------------------------------------------------------------------
-- Hvor indstillingen bor
-- ---------------------------------------------------------------------------
-- `app_settings` er noegle/vaerdi og har staaet siden skemaet blev bygget, med
-- Eurofins-koden som eneste raekke. Den er stedet: en ny tabel med en enkelt
-- raekke ville vaere det samme med flere ord, og RLS staar her allerede rigtigt
-- — alle medlemmer laeser, kun kontoret skriver. Screeneren SKAL kunne laese
-- den: hun kan hente rapporten, og rapporten kan ikke tegnes uden.
--
-- Derfor er der heller ingen skemaaendring i denne fil. Den saetter en enkelt
-- vaerdi, og appen kan koere uden den — indstillingssiden skriver de samme
-- raekker. Filen findes, for at et miljo bygget op fra bunden staar med
-- kontakten slaaet til, som kunden har bedt om.

-- ---------------------------------------------------------------------------
-- Kontakten
-- ---------------------------------------------------------------------------
-- Noeglerne hedder det samme som kolonnerne paa `screening.materials`, saa det
-- er til at se, hvilken faelles tekst der traeder i stedet for hvilken:
-- `sentence_bortskaffelse`, `sentence_forurenet` og `sentence_asbest`.
--
-- DE TRE TEKSTER SEEDES IKKE. Det er kundens ord, og de hoerer i databasen —
-- samme regel som rapportens ovrige saetninger, der flyttede ud af koden med
-- materialepanelet. De skrives paa /indstillinger.
--
-- Er kontakten slaaet til, uden at nogen har skrevet dem, falder rapporten
-- tilbage paa materialernes egne saetninger. Se `faellesTekster` i
-- src/lib/indstillinger.ts: et tomt felt maa goere en rapport kortere, men det
-- maa ikke goere forureningsafsnittet tavst.
insert into screening.app_settings (key, value) values
  ('shared_disposal_text', 'true'::jsonb)
on conflict (key) do nothing;

comment on table screening.app_settings is
  'Noegle/vaerdi for det, der skal kunne rettes uden en udrulning. Laeses af alle medlemmer, skrives kun af kontoret.';
$fil$]);

-- ===================== 20260910120000_farligt_affald_egen_tekst.sql =====================
-- Farligt affald far sin egen tekst. Bortskaffelse er ikke laengere det samme.
--
-- Bortskaffelsen havde tre saetninger, og «Farligt affald» og «Bortskaffelse»
-- delte den ene af dem: `sentence_bortskaffelse` blev skrevet baade naar
-- Eurofins svarede rodt, og naar screeneren selv havde sat proven til
-- bortskaffelse. Begrundelsen var, at de to er den samme besked til
-- entreprenoren. Det er de ikke. Rodt er et bevis fra laboratoriet paa at
-- materialet ER farligt affald og skal til et godkendt modtageanlaeg;
-- screenerens bortskaffelse er en vurdering af et materiale, der er rent
-- eller slet ikke analyseret, og som bare skal vaek. Skrevet med samme ord
-- lover rapporten enten for lidt om det farlige eller for meget om det rene.
--
-- Derfor et fjerde felt. `sentence_bortskaffelse` bliver STAENDE og faar en
-- smallere betydning: screeneren valgte bortskaffelse, og svaret er rent eller
-- proven er uden analyse. Rodt svar slaar op i `sentence_farligt`.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts. Den er
-- samtidig blevet enklere: teksten folger nu maerket paa linjen en-til-en, og
-- screenerens eget valg slaar ikke laengere laboratoriets svar. Eurofins har
-- et konkret bevis paa standen, hvor screeneren antager.
alter table screening.materials
  add column sentence_farligt text;

-- Den gamle tekst kopieres over i det nye felt.
--
-- Praecis som da forurenet og asbest kom til: uden kopien ville de rode linjer
-- i enhver eksisterende rapport miste deres saetning uden en fejl nogen steder,
-- for de slaar op i et felt, der lige er blevet oprettet tomt. Kopien er ikke
-- et gaet paa hvad der BOR staa — den er den eneste skrivning, der bevarer det
-- rapporterne siger i dag. Kontoret deler dem ad i panelet bagefter.
update screening.materials
set sentence_farligt = coalesce(sentence_farligt, sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_farligt is
  'Farligt affald: rodt svar fra laboratoriet.';
comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, og svaret er rent eller proven er uden analyse.';

-- Den faelles tekst faar samme fjerde felt.
--
-- Noeglen hedder det samme som kolonnen, som de tre andre goer. Og af samme
-- grund som ovenfor kopieres den faelles bortskaffelsestekst over, hvis
-- kontoret allerede har skrevet den: en rapport med faelles tekst slaaet til
-- ville ellers staa uden et ord om det farlige affald, indtil nogen opdagede
-- det paa /indstillinger. Har ingen skrevet den, indsaettes ingenting —
-- teksterne er kundens ord og seedes ikke.
insert into screening.app_settings (key, value)
select 'sentence_farligt', value
from screening.app_settings
where key = 'sentence_bortskaffelse'
on conflict (key) do nothing;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20260910120000', 'farligt_affald_egen_tekst', array[$fil$-- Farligt affald far sin egen tekst. Bortskaffelse er ikke laengere det samme.
--
-- Bortskaffelsen havde tre saetninger, og «Farligt affald» og «Bortskaffelse»
-- delte den ene af dem: `sentence_bortskaffelse` blev skrevet baade naar
-- Eurofins svarede rodt, og naar screeneren selv havde sat proven til
-- bortskaffelse. Begrundelsen var, at de to er den samme besked til
-- entreprenoren. Det er de ikke. Rodt er et bevis fra laboratoriet paa at
-- materialet ER farligt affald og skal til et godkendt modtageanlaeg;
-- screenerens bortskaffelse er en vurdering af et materiale, der er rent
-- eller slet ikke analyseret, og som bare skal vaek. Skrevet med samme ord
-- lover rapporten enten for lidt om det farlige eller for meget om det rene.
--
-- Derfor et fjerde felt. `sentence_bortskaffelse` bliver STAENDE og faar en
-- smallere betydning: screeneren valgte bortskaffelse, og svaret er rent eller
-- proven er uden analyse. Rodt svar slaar op i `sentence_farligt`.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts. Den er
-- samtidig blevet enklere: teksten folger nu maerket paa linjen en-til-en, og
-- screenerens eget valg slaar ikke laengere laboratoriets svar. Eurofins har
-- et konkret bevis paa standen, hvor screeneren antager.
alter table screening.materials
  add column sentence_farligt text;

-- Den gamle tekst kopieres over i det nye felt.
--
-- Praecis som da forurenet og asbest kom til: uden kopien ville de rode linjer
-- i enhver eksisterende rapport miste deres saetning uden en fejl nogen steder,
-- for de slaar op i et felt, der lige er blevet oprettet tomt. Kopien er ikke
-- et gaet paa hvad der BOR staa — den er den eneste skrivning, der bevarer det
-- rapporterne siger i dag. Kontoret deler dem ad i panelet bagefter.
update screening.materials
set sentence_farligt = coalesce(sentence_farligt, sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_farligt is
  'Farligt affald: rodt svar fra laboratoriet.';
comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, og svaret er rent eller proven er uden analyse.';

-- Den faelles tekst faar samme fjerde felt.
--
-- Noeglen hedder det samme som kolonnen, som de tre andre goer. Og af samme
-- grund som ovenfor kopieres den faelles bortskaffelsestekst over, hvis
-- kontoret allerede har skrevet den: en rapport med faelles tekst slaaet til
-- ville ellers staa uden et ord om det farlige affald, indtil nogen opdagede
-- det paa /indstillinger. Har ingen skrevet den, indsaettes ingenting —
-- teksterne er kundens ord og seedes ikke.
insert into screening.app_settings (key, value)
select 'sentence_farligt', value
from screening.app_settings
where key = 'sentence_bortskaffelse'
on conflict (key) do nothing;
$fil$]);

notify pgrst, 'reload schema';
commit;
