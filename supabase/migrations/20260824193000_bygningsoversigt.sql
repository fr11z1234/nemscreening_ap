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
