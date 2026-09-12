-- fase2-rollback.sql — ordret fra FASE-2-TIL-MAIN.md, afsnit 12.5.
--
-- Omvendt raekkefoelge af de ni. En transaktion. Check-constrainten og indekset
-- paa `samples` og politikkerne paa `building_parts` forsvinder med det, de
-- sidder paa. `comment on` nulstilles, saa basislinjen kan rammes byte for byte.
--
-- Ligger i skuffen. Oeves i 3.7 mod branchen, og koeres ALDRIG mod produktionen
-- paa agentens eget initiativ — se afsnit 8: tomme nye kolonner skader ingen,
-- og en rollback uden forstaaelse af afvigelsen er endnu en aendring.
begin;
set local lock_timeout = '5s';

-- 20260910 farligt_affald_egen_tekst
delete from screening.app_settings where key = 'sentence_farligt';
alter table screening.materials drop column sentence_farligt;
comment on column screening.materials.sentence_bortskaffelse is null;

-- 20260909 faelles_bortskaffelsestekst
delete from screening.app_settings where key = 'shared_disposal_text';
comment on table screening.app_settings is null;

-- 20260904 bortskaffelsestekster
alter table screening.materials drop column sentence_forurenet, drop column sentence_asbest;

-- 20260828 forureningshaandtering
alter table screening.cases drop column contamination_handling_note;

-- 20260825124500 uden_gennemset_flag: intet — kolonnen er allerede vaek
-- 20260825120500 saetninger_fra_skabelonen: intet — teksterne bor i kolonner, der droppes herunder

-- 20260825120000 materialepanel
alter table screening.materials
  drop column report_name, drop column sentence_genbrug,
  drop column sentence_genanvendelse, drop column sentence_bortskaffelse;
alter table screening.samples drop column building_part_id;
drop table screening.building_parts;

-- 20260824193000 bygningsoversigt
alter table screening.case_buildings
  drop column floors, drop column wall_material_code, drop column roof_material_code,
  drop column heating_code, drop column usage_note, drop column construction_note,
  drop column plan_note;

-- 20260824161500 selektiv_ressourcescreening
alter table screening.samples drop column material_condition, drop column resource_handling;
alter table screening.cases drop column report_type;
drop type screening.resource_handling;
drop type screening.report_type;

delete from supabase_migrations.schema_migrations where version in (
  '20260824161500', '20260824193000', '20260825120000', '20260825120500', '20260825124500',
  '20260828104500', '20260904120000', '20260909120000', '20260910120000');

notify pgrst, 'reload schema';
commit;
