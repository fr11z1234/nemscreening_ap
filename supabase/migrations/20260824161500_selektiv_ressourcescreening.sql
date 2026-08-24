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
