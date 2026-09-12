-- fase2-verify, FOER-halvdelen. Afsnit 7 og 12.2 i FASE-2-TIL-MAIN.md.
--
-- Koeres FOER migrationen, paa branchen (2.4) og paa produktionen (4.3), og
-- svaret gemmes som foer-branch.txt / foer-prod.txt.
--
-- Planen kalder verifikationen «én fil, to halvdele». Den ligger som TO filer,
-- fordi psql ikke kan bedes om at koere halvdelen af en fil. Indholdet er det,
-- planen beskriver, og efter-halvdelen gentager de samme spoergsmaal ORDRET —
-- ellers kan svarene ikke sammenlignes.
--
-- Kaldes med:  psql -At -F "|" -f fase2-verify-foer.sql -o foer-<sted>.txt
--
-- Formen er tre felter: afsnit | navn | vaerdi. Saa kan foer og efter
-- sammenlignes med diff, og hver linje siger selv hvad den er.

-- ---------------------------------------------------------------------------
-- Raekketal pr. tabel (12.2)
-- ---------------------------------------------------------------------------
-- `building_parts` staar IKKE her: tabellen findes ikke foer migrationen.
-- Forventede forskelle foer/efter: app_settings +1 (shared_disposal_text),
-- building_parts 8. Alt andet identisk.
select 'raekketal' as afsnit, 'app_settings'   as navn, count(*)::text as vaerdi from screening.app_settings
union all select 'raekketal', 'app_users',      count(*)::text from screening.app_users
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
-- md5 af de GAMLE kolonner (12.2)
-- ---------------------------------------------------------------------------
-- Kolonnerne skrives eksplicit. `row::text` af hele raekken ville tage de nye,
-- tomme kolonner med efter migrationen og altid afvige — og saa beviser tallet
-- ingenting. Listerne er hentet ud af basislinjen selv (den lokale stak paa
-- 20260804111609), i tabellens egen kolonnerraekkefoelge.
--
-- Migrationen skriver i INGEN af dem, saa alle elleve md5'er skal vaere ens
-- foer og efter — ogsaa `materials`, hvor kun de nye kolonner faar tekst.
--
-- `coalesce(..., 'TOM')` fordi string_agg giver NULL paa en tom tabel, og en
-- tom celle kan ikke skelnes fra en fejl i en diff.
--
-- `app_settings` er den ene undtagelse, og planens 12.2 saa den ikke: migration
-- 8 LAEGGER en raekke i tabellen (`shared_disposal_text`), og nr. 9 kan laegge
-- `sentence_farligt`. Md5 over alle raekker ville derfor altid afvige, og saa
-- beviser tallet ingenting. Paastanden i 9A punkt 14 er, at migrationen ikke
-- skriver i en eksisterende CELLE — derfor maales de raekker, der fandtes i
-- forvejen, og de to nye noegler holdes uden for. Raekketallet ovenfor faenger
-- stadig, at der kom praecis én til.
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
