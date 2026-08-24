-- En sag har ofte mere end et dokument fra Eurofins: analyserapporten og et
-- asbestappendiks kommer som hver sin fil. De skal alle med bagest, i den
-- raekkefolge kontoret vaelger.
--
-- doc_id binder et bilags PDF sammen med dens sider, saa et enkelt bilag kan
-- fjernes uden at roere de andre. doc_order er bilagets plads i rapporten;
-- sort_order er stadig sidetallet inde i det enkelte bilag.

alter table screening.case_files
  add column doc_id uuid,
  add column doc_order integer not null default 0;

-- Eventuelle raekker fra for opdelingen hoerer til det samme forste bilag.
update screening.case_files
set doc_id = case_id, doc_order = 1
where kind in ('eurofins_pdf', 'eurofins_side') and doc_id is null;

-- Kun plantegningen findes en gang pr. sag. Eurofins-bilag er der flere af.
drop index if exists screening.case_files_en_pr_art;
drop index if exists screening.case_files_en_pr_side;

create unique index case_files_en_plantegning
  on screening.case_files (case_id)
  where kind = 'plantegning';

create unique index case_files_et_bilag_pr_doc
  on screening.case_files (case_id, doc_id)
  where kind = 'eurofins_pdf';

create unique index case_files_en_side_pr_doc
  on screening.case_files (case_id, doc_id, sort_order)
  where kind = 'eurofins_side';

-- Bilag og sider hentes altid i denne raekkefolge.
create index case_files_raekkefolge
  on screening.case_files (case_id, doc_order, sort_order);