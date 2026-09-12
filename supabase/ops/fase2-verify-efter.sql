-- fase2-verify, EFTER-halvdelen. Afsnit 7 og 12.2/12.4 i FASE-2-TIL-MAIN.md.
--
-- Koeres EFTER migrationen, paa branchen (2.6) og paa produktionen (4.5), og
-- svaret gemmes som efter-branch.txt / efter-prod.txt.
--
-- De to foerste afsnit er ORDRET de samme som i foer-halvdelen — ellers kan
-- svarene ikke sammenlignes. Kun `building_parts` er lagt til raekketallene,
-- fordi tabellen nu findes. Derefter kommer de nye paastande.
--
-- Kaldes med:  psql -At -F "|" -f fase2-verify-efter.sql -o efter-<sted>.txt
--
-- Skemalisten er IKKE her. Den er sit eget spoergsmaal (12.1, skemaliste.sql),
-- fordi svaret er en liste paa 289 linjer, der skal gemmes som fil for at kunne
-- diff'es. Den koeres ved siden af.

-- ---------------------------------------------------------------------------
-- Raekketal pr. tabel (12.2)
-- ---------------------------------------------------------------------------
-- Forventet mod foer-halvdelen: app_settings +1 (shared_disposal_text),
-- building_parts 8 (ny). ALT ANDET IDENTISK.
select 'raekketal' as afsnit, 'app_settings'   as navn, count(*)::text as vaerdi from screening.app_settings
union all select 'raekketal', 'app_users',      count(*)::text from screening.app_users
union all select 'raekketal', 'building_parts', count(*)::text from screening.building_parts
union all select 'raekketal', 'case_buildings', count(*)::text from screening.case_buildings
union all select 'raekketal', 'case_files',     count(*)::text from screening.case_files
union all select 'raekketal', 'cases',          count(*)::text from screening.cases
union all select 'raekketal', 'exports',        count(*)::text from screening.exports
union all select 'raekketal', 'lab_results',    count(*)::text from screening.lab_results
union all select 'raekketal', 'materials',      count(*)::text from screening.materials
union all select 'raekketal', 'sample_photos',  count(*)::text from screening.sample_photos
union all select 'raekketal', 'sample_types',   count(*)::text from screening.sample_types
union all select 'raekketal', 'samples',        count(*)::text from screening.samples
order by 2;

-- ---------------------------------------------------------------------------
-- md5 af de GAMLE kolonner (12.2) — ordret som i foer-halvdelen
-- ---------------------------------------------------------------------------
-- Alle elleve skal vaere IDENTISKE med foer. Migrationen skriver ikke i en
-- eneste eksisterende celle. Det er 9A punkt 14, og den kan ikke snydes af et
-- oeje, der ser det, det forventer.
-- `app_settings` maales uden de to noegler, migrationen selv laegger — se den
-- lange begrundelse i foer-halvdelen. Raekketallet ovenfor faenger den nye.
select 'md5' as afsnit, 'app_settings' as navn,
       coalesce(md5(string_agg((key, value, updated_at)::text, '|' order by key)), 'TOM') as vaerdi
from screening.app_settings
where key not in ('shared_disposal_text', 'sentence_farligt')
union all
select 'md5', 'app_users',
       coalesce(md5(string_agg((id, full_name, email, role, active, created_at, updated_at)::text, '|' order by id)), 'TOM')
from screening.app_users
union all
select 'md5', 'case_buildings',
       coalesce(md5(string_agg((id, case_id, bbr_building_id, building_no, label, usage_code, usage_text,
                                built_year, rebuilt_year, area_built, area_total, area_residential,
                                raw_bbr, is_manual, sort_order, created_at)::text, '|' order by id)), 'TOM')
from screening.case_buildings
union all
select 'md5', 'case_files',
       coalesce(md5(string_agg((id, case_id, kind, storage_path, filename, mime, bytes, width, height,
                                sort_order, created_by, created_at, doc_id, doc_order)::text, '|' order by id)), 'TOM')
from screening.case_files
union all
select 'md5', 'cases',
       coalesce(md5(string_agg((id, case_name, status, customer_name, customer_contact, customer_email,
                                customer_phone, address_text, dawa_adgangsadresse_id, postnr, city, area_m2,
                                built_year, rebuilt_year, source_booking_id, note, created_by, created_at,
                                updated_at)::text, '|' order by id)), 'TOM')
from screening.cases
union all
select 'md5', 'exports',
       coalesce(md5(string_agg((id, case_id, kind, filename, row_count, sample_ids, generated_by,
                                generated_at)::text, '|' order by id)), 'TOM')
from screening.exports
union all
select 'md5', 'lab_results',
       coalesce(md5(string_agg((sample_id, pb, cd, cr, cu, hg, ni, zn, asbestos, pcb_total,
                                chlor_paraffins, pah_total, raw, received_at, created_at,
                                asbestos_dusty)::text, '|' order by sample_id)), 'TOM')
from screening.lab_results
union all
select 'md5', 'materials',
       coalesce(md5(string_agg((id, name, sort_order, active)::text, '|' order by id)), 'TOM')
from screening.materials
union all
select 'md5', 'sample_photos',
       coalesce(md5(string_agg((id, sample_id, storage_path, width, height, bytes, taken_at, sort_order,
                                created_by, created_at)::text, '|' order by id)), 'TOM')
from screening.sample_photos
union all
select 'md5', 'sample_types',
       coalesce(md5(string_agg((id, name, sort_order, active)::text, '|' order by id)), 'TOM')
from screening.sample_types
union all
select 'md5', 'samples',
       coalesce(md5(string_agg((id, case_id, seq, material, sample_type, building_id, location_note,
                                estimated_tons, period, analysis_pcb, analysis_asbestos, analysis_metals,
                                analysis_pah, comment, created_by, created_at, updated_at, is_lab_sample,
                                label, building_ids)::text, '|' order by id)), 'TOM')
from screening.samples
order by 2;

-- ---------------------------------------------------------------------------
-- Historikken (12.4) — de ni versioner med filernes numre
-- ---------------------------------------------------------------------------
-- md5'erne holdes op mod fase2-prod.md5, linje for linje. Forventet: ni raekker.
--
-- RETTET: her stod `where version >= '20260824161500'`. Det virkede paa branchen
-- og gav ELLEVE paa produktionen, fordi historikken er FAELLES med websitet, og
-- websitet lagde to migrationer paa 8. september 2026 — `framework_agreements`
-- og `agreement_function_search_path`. De er nyere end vores foerste og blev
-- fanget af datofilteret.
--
-- Det saa ud som et fejlet bevis og var det ikke: de to stod i historik-backuppen
-- fra 4.2, altsaa FOER migrationen, og deres SQL roerer kun `public.` og
-- `auth.` — intet i `screening`. Men et tjek, der melder fejl paa noget rigtigt,
-- er et daarligt tjek. Derfor staar de ni nu ved navn.
--
-- Laer af det: paa dette projekt maa INTET filtreres paa migrationsdato.
select 'historik' as afsnit, version as navn, md5(statements[1]) as vaerdi
from supabase_migrations.schema_migrations
where version in (
  '20260824161500', '20260824193000', '20260825120000', '20260825120500', '20260825124500',
  '20260828104500', '20260904120000', '20260909120000', '20260910120000')
order by version;

-- ---------------------------------------------------------------------------
-- De nye paastande (afsnit 7)
-- ---------------------------------------------------------------------------
-- Forventet staar i parentes ved hver. Afviger én, er beviset fejlet.
select 'nyt' as afsnit, navn, vaerdi from (
  -- Alle sager er miljoescreeninger. Ingen eksisterende sag skifter rapport. (0)
  select 1 as ord, 'sager_ikke_miljoescreening' as navn,
         (select count(*)::text from screening.cases where report_type <> 'miljoescreening') as vaerdi
  -- Nye kolonner er tomme. (alle 0)
  union all select 2, 'cases.contamination_handling_note_udfyldt',
    (select count(*)::text from screening.cases where contamination_handling_note is not null)
  union all select 3, 'samples.building_part_id_udfyldt',
    (select count(*)::text from screening.samples where building_part_id is not null)
  union all select 4, 'samples.material_condition_udfyldt',
    (select count(*)::text from screening.samples where material_condition is not null)
  union all select 5, 'samples.resource_handling_udfyldt',
    (select count(*)::text from screening.samples where resource_handling is not null)
  union all select 6, 'case_buildings.syv_nye_felter_udfyldt',
    (select count(*)::text from screening.case_buildings
     where floors is not null or wall_material_code is not null or roof_material_code is not null
        or heating_code is not null or usage_note is not null or construction_note is not null
        or plan_note is not null)
  -- materials er undtagelsen: 12 raekker faar saetning, én faar report_name.
  union all select 7, 'materials.report_name_udfyldt',            -- 1 (Beton)
    (select count(*)::text from screening.materials where report_name is not null)
  union all select 8, 'materials.sentence_genbrug_udfyldt',       -- 5
    (select count(*)::text from screening.materials where sentence_genbrug is not null)
  union all select 9, 'materials.sentence_genanvendelse_udfyldt', -- 7
    (select count(*)::text from screening.materials where sentence_genanvendelse is not null)
  union all select 10, 'materials.med_saetning_i_alt',            -- 12 (spaerrens tal)
    (select count(*)::text from screening.materials
     where sentence_genbrug is not null or sentence_genanvendelse is not null)
  union all select 11, 'materials.sentence_bortskaffelse_udfyldt', -- 0
    (select count(*)::text from screening.materials where sentence_bortskaffelse is not null)
  union all select 12, 'materials.sentence_forurenet_udfyldt',     -- 0
    (select count(*)::text from screening.materials where sentence_forurenet is not null)
  union all select 13, 'materials.sentence_asbest_udfyldt',        -- 0
    (select count(*)::text from screening.materials where sentence_asbest is not null)
  union all select 14, 'materials.sentence_farligt_udfyldt',       -- 0
    (select count(*)::text from screening.materials where sentence_farligt is not null)
  -- UTF-8-beviset paa materialesiden: 'Tæppe' er en af de tolv.
  union all select 15, 'materials.Taeppe_har_saetning',            -- t
    (select coalesce(max((sentence_genbrug is not null or sentence_genanvendelse is not null)::text), 'MANGLER')
     from screening.materials where name = 'Tæppe')
  -- Bygningsdelene: 8 raekker, navnene ordret. 'Bærende konstruktioner' er UTF-8-beviset.
  union all select 16, 'building_parts.antal',                     -- 8
    (select count(*)::text from screening.building_parts)
  union all select 17, 'building_parts.navne_i_sort_order',
    (select string_agg(name, ' / ' order by sort_order) from screening.building_parts)
  union all select 18, 'building_parts.Baerende_findes',            -- t
    (select (count(*) = 1)::text from screening.building_parts where name = 'Bærende konstruktioner')
  union all select 19, 'building_parts.alle_aktive',               -- t
    (select (count(*) = 0)::text from screening.building_parts where not active)
  -- Indstillingen. Ingen sentence_*-noegler, med mindre 4.7 er koert.
  union all select 20, 'app_settings.shared_disposal_text',        -- true
    (select value::text from screening.app_settings where key = 'shared_disposal_text')
  union all select 21, 'app_settings.noegler',                     -- eurofins_analyses_details, shared_disposal_text
    (select string_agg(key, ', ' order by key) from screening.app_settings)
  -- RLS og grants paa den nye tabel (4.5's bevis).
  union all select 22, 'building_parts.rls',                       -- t
    (select relrowsecurity::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'screening' and c.relname = 'building_parts')
  union all select 23, 'building_parts.politikker',                -- building_parts_select, building_parts_write
    (select string_agg(policyname, ', ' order by policyname) from pg_policies
     where schemaname = 'screening' and tablename = 'building_parts')
  union all select 24, 'building_parts.grants',
    (select string_agg(grantee || '=' || privilege_type, ' ' order by grantee, privilege_type)
     from information_schema.role_table_grants
     where table_schema = 'screening' and table_name = 'building_parts'
       and grantee in ('authenticated', 'service_role', 'anon'))
  -- `anon` har intet paa NOGEN tabel i screening. (0)
  union all select 25, 'anon_grants_i_screening',
    (select count(*)::text from information_schema.role_table_grants
     where table_schema = 'screening' and grantee = 'anon')
  -- Alle enums i skemaet. De tre foerste er aeldre end fase 2; `report_type` og
  -- `resource_handling` er de nye, og `building_part` skal IKKE staa her — den
  -- oprettes i migration 1 og droppes igen i nr. 3.
  -- Forventet: building_period, case_status, report_type, resource_handling, user_role
  union all select 26, 'enum_typer',
    (select string_agg(t.typname, ', ' order by t.typname) from pg_type t
     join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'screening' and t.typtype = 'e')
  union all select 27, 'samples.building_part_findes_stadig',      -- 0
    (select count(*)::text from information_schema.columns
     where table_schema = 'screening' and table_name = 'samples' and column_name = 'building_part')
  union all select 28, 'materials.sentences_reviewed_findes_stadig', -- 0
    (select count(*)::text from information_schema.columns
     where table_schema = 'screening' and table_name = 'materials' and column_name = 'sentences_reviewed')
) d order by ord;
