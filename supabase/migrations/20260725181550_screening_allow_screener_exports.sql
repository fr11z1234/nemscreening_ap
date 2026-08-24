-- MVP'en beskriver at screeneren selv kan generere skabelonen ude pa sagen,
-- ELLER at en medarbejder pa kontoret gor det bagefter. Den oprindelige
-- politik kraevede kontor-rolle og ville have spaerret den forste vej.
drop policy exports_insert on screening.exports;

create policy exports_insert on screening.exports
  for insert to authenticated
  with check (screening.is_member());