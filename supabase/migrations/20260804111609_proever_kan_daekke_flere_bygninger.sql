-- En prove kan daekke flere bygninger: samme hvide facademaling sidder pa alle
-- tre, og der er ingen grund til at bestille tre ens analyser. Lokaliteten er
-- intern information, sa den behover ingen egen tabel — en liste pa raekken er
-- nok, og den folger med i offline-koen som et almindeligt felt.
alter table screening.samples
  add column if not exists building_ids uuid[] not null default '{}';

-- Det der stod i building_id, staar nu forst i listen.
update screening.samples
   set building_ids = array[building_id]
 where building_id is not null
   and cardinality(building_ids) = 0;

-- building_id beholdes som den forste af de valgte, for det der laeser
-- databasen udenom appen. Fremmednoglen pa den (on delete set null) daekker
-- ikke listen, sa den skal ryddes i handen nar en bygning forsvinder — ellers
-- ville en prove pege pa en bygning der ikke findes, og synkroniseringen fejle
-- pa fremmednoglen naeste gang raekken skrives.
create or replace function screening.fjern_slettet_bygning()
returns trigger
language plpgsql
security definer
set search_path = screening, pg_catalog
as $$
begin
  update screening.samples
     set building_ids = array_remove(building_ids, old.id)
   where old.id = any(building_ids);
  return old;
end;
$$;

drop trigger if exists case_buildings_fjern_fra_proever on screening.case_buildings;

create trigger case_buildings_fjern_fra_proever
  after delete on screening.case_buildings
  for each row
  execute function screening.fjern_slettet_bygning();