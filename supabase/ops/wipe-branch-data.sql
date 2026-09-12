-- 4.0: branchen toemmes igen, foer produktionen roeres. Afsnit 12.6.
--
-- KUN PAA BRANCHEN. Storage toemmes med `wipe-branch-storage.sql` FOERST.
--
-- Hvorfor: kopien af produktionens data fra Fase 2 skal vaek, og alt hvad der er
-- oprettet under test med. Branchen skal vaere TOM, naar migrationen laves paa
-- produktionen — saa kan selv et uheld ikke flytte testdata derover. Det er
-- princip 7: testmiljoeet bidrager med ingenting.
--
-- Sagerne rydder databasen selv op efter: fremmednoeglerne fra `cases` til
-- `case_buildings`, `samples`, `case_files` og `exports` staar paa CASCADE, og
-- `samples` tager `sample_photos` og `lab_results` med. Én sletning, ikke syv der
-- hver kan fejle halvvejs.
begin;

-- Spaerre. Produktionen har ogsaa sager, og denne fil sletter dem alle.
-- De to testlogins findes KUN paa branchen og i den lokale stak, aldrig i
-- produktionen — saa deres tilstedevaerelse er beviset for, hvor vi er.
do $$
begin
  if not exists (select 1 from screening.app_users where email = 'kontor@fase2.test') then
    raise exception 'wipe-branch-data.sql afbrudt: kontor@fase2.test findes ikke'
      using hint = 'Testloginene findes kun paa branchen. Er de ikke her, er dette efter alt at doemme produktionen.';
  end if;
end $$;

delete from screening.cases;

-- Produktionens brugere fra generalproeven. De to testlogins bliver.
-- `app_users` foerst: den har fremmednoeglen til `auth.users`.
delete from screening.app_users where email not in ('kontor@fase2.test', 'screener@fase2.test');
delete from auth.users        where email not in ('kontor@fase2.test', 'screener@fase2.test');

commit;

-- Bevis: 0,0,0,0,0,0,0 og app_users = 2.
select 'cases' as tabel, count(*) as n from screening.cases
union all select 'case_buildings', count(*) from screening.case_buildings
union all select 'samples', count(*) from screening.samples
union all select 'sample_photos', count(*) from screening.sample_photos
union all select 'case_files', count(*) from screening.case_files
union all select 'exports', count(*) from screening.exports
union all select 'lab_results', count(*) from screening.lab_results
union all select 'app_users', count(*) from screening.app_users
union all select 'auth.users', count(*) from auth.users
order by 1;

-- Og at buckets er tomme.
select bucket_id, count(*) as objekter from storage.objects
where bucket_id in ('screening-photos', 'screening-rapport') group by 1 order by 1;
