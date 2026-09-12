-- 4.1: pre-flight paa produktionen. KUN LAESNING — ikke én skrivning.
--
-- Afsnit 12.3 ordret, med forventet svar ved hver. Afviger ét, er 4.1 et fejlet
-- bevis: stop.
--
-- Skemalisten (12.1) og raekketal/md5 (12.2) koeres som deres egne filer ved
-- siden af — de skal gemmes, ikke bare laeses.
--
-- Formen er tre felter: nr | hvad | svar, saa hele svaret kan laeses paa én gang
-- og gemmes som fil.

-- 1. Historikken.
--
--    RETTET: planen skrev «11 raekker, ingen senere», og filteret var
--    `version >= 20260725173107`. Men historikken er FAELLES med websitet, og
--    websitet laegger ogsaa migrationer paa — de to fra 8. september 2026,
--    `framework_agreements` og `agreement_function_search_path`, er deres. Et
--    filter paa dato faenger dem, og saa ser produktionen «aendret» ud, uden at
--    screening er roert. Derfor taelles screenings elleve ved NAVN, og resten
--    listes for sig.
--
--    Forventet: de elleve findes, foerste 20260725173107, sidste 20260804111609.
--    Kommer der senere raekker, er de websitets — og tjek 2 (skemalisten) er den,
--    der afgoer, om screening er roert. Den kan ikke tales udenom.
select '1' as nr, 'screenings elleve findes' as hvad, count(*)::text as svar
from supabase_migrations.schema_migrations
where version in ('20260725173107', '20260725173145', '20260725173227', '20260725173244',
                  '20260725181550', '20260728164410', '20260731114200', '20260731120216',
                  '20260731121259', '20260731123207', '20260804111609')
union all
select '1', 'senere raekker (websitets, hvis nogen)',
       coalesce(string_agg(version || ' ' || name, ', ' order by version), 'ingen')
from supabase_migrations.schema_migrations where version > '20260804111609'
union all
-- Naevner en af dem screening-skemaet? Ordet «NemScreening» i en kommentar
-- taeller ikke — derfor `screening.` med punktum.
select '1', 'senere raekker der naevner «screening.»',
       coalesce(string_agg(version, ', ' order by version), 'ingen')
from supabase_migrations.schema_migrations
where version > '20260804111609' and statements[1] ilike '%screening.%'

-- 3. De tolv navne, spaerren i saetninger_fra_skabelonen kraever. Forventet: 12.
union all
select '3', 'af de tolv navne findes', count(*)::text
from screening.materials where name in (
  'Beton (undtagen, gasbeton, letbeton)', 'Puds', 'Eternit, asbestfri', 'Gips', 'Fugemasse',
  'Tapet', 'Isolering', 'Tæppe', 'Glasseret tegl / Fliser / Klinker', 'Tagpap',
  'Uglaseret tegl (mur- og tagsten)', 'Vinduer')
union all
-- Og hvilke der i saa fald MANGLER, saa en fejl siger hvad frem for hvor mange.
select '3', 'af de tolv MANGLER',
       coalesce(string_agg(n, ', ' order by n), 'ingen')
from unnest(array[
  'Beton (undtagen, gasbeton, letbeton)', 'Puds', 'Eternit, asbestfri', 'Gips', 'Fugemasse',
  'Tapet', 'Isolering', 'Tæppe', 'Glasseret tegl / Fliser / Klinker', 'Tagpap',
  'Uglaseret tegl (mur- og tagsten)', 'Vinduer']) as n
where not exists (select 1 from screening.materials m where m.name = n)

-- 3b. Hele materialelisten. Ikke i planen, men 4.7 noegler paa NAVN, og
--     branch-indhold-2026-09-12.sql daekker 53 af branchens 55. Er produktionens
--     liste en anden, rammer nogle af opdateringerne ingenting.
union all
select '3b', 'materialer i alt', count(*)::text from screening.materials
union all
select '3b', 'materialer lukket (active = false)', count(*)::text from screening.materials where not active
union all
select '3b', 'proevearter i alt', count(*)::text from screening.sample_types

-- 4. Provearterne, reglen visueltFund bygger paa. Forventet: 3 raekker.
union all
select '4', 'Asbest / Sod / Mulig asbest findes',
       coalesce(string_agg(name, ', ' order by name), 'INGEN')
from screening.sample_types where name in ('Asbest', 'Sod', 'Mulig asbest')

-- 5. Intet af det nye findes allerede. Forventet: 0, 0, 0 og kun eurofins-noeglen.
union all
select '5', 'nye kolonner der allerede findes', count(*)::text
from information_schema.columns where table_schema = 'screening' and column_name in (
  'report_type', 'building_part', 'building_part_id', 'material_condition', 'resource_handling',
  'contamination_handling_note', 'floors', 'wall_material_code', 'roof_material_code', 'heating_code',
  'usage_note', 'construction_note', 'plan_note', 'report_name', 'sentence_genbrug',
  'sentence_genanvendelse', 'sentence_bortskaffelse', 'sentence_forurenet', 'sentence_asbest',
  'sentence_farligt', 'sentences_reviewed')
union all
select '5', 'tabellen building_parts findes', count(*)::text
from information_schema.tables where table_schema = 'screening' and table_name = 'building_parts'
union all
select '5', 'enum-typerne findes', count(*)::text
from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'screening' and t.typname in ('report_type', 'resource_handling', 'building_part')
union all
select '5', 'noegler i app_settings', coalesce(string_agg(key, ', ' order by key), 'ingen')
from screening.app_settings

-- 7. Adfaerdsaendringerne (afsnit 9B, spoergsmaal 5). Tallene RAPPORTERES.
--    De afgoer intet — svaret i afsnit 10 er «ja, ubetinget».
union all
select '7', 'proever med proeveart ' || sample_type,
       count(*)::text || ' i alt, ' ||
       count(*) filter (where is_lab_sample)::text || ' med analyser, ' ||
       count(*) filter (where exists (select 1 from screening.lab_results r where r.sample_id = s.id))::text || ' med labsvar'
from screening.samples s where sample_type in ('Asbest', 'Sod') group by sample_type
union all
select '7', 'proever uden maengde (spaerrer «Naeste»)', count(*)::text
from screening.samples where estimated_tons is null or estimated_tons <= 0

-- 8. PostgREST udstiller screening.
--
--    RETTET: planen ledte efter `pgrst.db_schemas` paa rollen `authenticator`.
--    Paa PRODUKTIONEN staar den «IKKE SAT», og det er ikke en fejl — produktionen
--    har skemaet slaaet til i dashboardets API-indstillinger, ikke som en
--    rolleindstilling. Rolleindstillingen er BRANCHENS greb, fordi en branch
--    oprettet uden GitHub-integrationen ikke faar config.toml anvendt (se
--    supabase/LAESMIG.md).
--
--    Tallet her er derfor kun til orientering. Det rigtige tjek er adfaerden, og
--    den kan ikke laeses i SQL — den skal spoerges over HTTP uden login:
--
--      curl -H "apikey: <publishable>" -H "Accept-Profile: screening" \
--           https://mwityvqavrqxqaunvtdg.supabase.co/rest/v1/cases?select=id
--
--    Rigtigt svar: 42501 «permission denied for schema screening» — altsaa at
--    Postgres KENDER skemaet og naegter adgang. Er svaret PGRST106 «Invalid
--    schema», er skemaet ikke udstillet, og appen ser ud som om databasen er tom.
union all
select '8', 'pgrst.db_schemas paa rollen (kun til orientering)',
       coalesce((select s from pg_db_role_setting r join pg_roles ro on ro.oid = r.setrole, unnest(r.setconfig) s
                 where ro.rolname = 'authenticator' and s like 'pgrst.db_schemas%'),
                'ikke sat — normalt paa produktionen, se kommentaren')
order by 1, 2;
