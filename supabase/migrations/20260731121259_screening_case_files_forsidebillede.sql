-- Rapportens side 2 viser et billede af ejendommen. Det er ikke et provefoto:
-- det hoerer til sagen, tages ofte forfra ved ankomst, og bruges kun her.
alter table screening.case_files
  drop constraint case_files_kind_check;

alter table screening.case_files
  add constraint case_files_kind_check
  check (kind in ('plantegning', 'forsidebillede', 'eurofins_pdf', 'eurofins_side'));

create unique index case_files_et_forsidebillede
  on screening.case_files (case_id)
  where kind = 'forsidebillede';