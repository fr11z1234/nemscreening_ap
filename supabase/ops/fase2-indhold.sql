-- Kontorets indhold fra Supabase-branchen fase-2, laest ud 2026-09-12.
--
-- Skrevet af supabase/ops/byg-branch-indhold.js ud af branchens egne raekker,
-- ikke i haanden. Det er trin 0.1 i FASE-2-TIL-MAIN.md, og det er svaret paa
-- spoergsmaal 1 i afsnit 10: kontorets ord er deres faglige arbejde og er
-- KONFIGURATION, ikke sager. Derfor gemmes de foer wipen og laegges paa
-- produktionen i 4.7 som `fase2-indhold.sql`.
--
-- Noeglet paa materialets NAVN. Id'erne er tilfaeldige — screening_seed_lookups
-- indsaetter uden id, saa `gen_random_uuid()` giver forskellige id'er i hvert
-- miljoe, og et id herfra ville ikke findes paa produktionen.
--
-- Idempotent: hver saetning er et `update ... where name = ...`, saa filen kan
-- koeres to gange uden at gore skade. Omdoebningerne staar FOERST, saa
-- teksterne bagefter kan noegles paa det nye navn.
--
-- Roerer IKKE: sager, proever, billeder, labsvar, bygningsdele, proevearter.
-- De to foerste er der ingen af paa branchen efter wipen, og de tre sidste er
-- uaendrede — efterproevet, ikke antaget.
begin;

-- ---------------------------------------------------------------------------
-- Omdoebninger (2)
-- ---------------------------------------------------------------------------
-- Kontoret har rettet navnet i panelet. Bemaerk hvad det koster, og at det er
-- accepteret i afsnit 10: en prove paa produktionen, der har teksten
-- 'Isolering' i `samples.material`, mister koblingen til materialeraekken.
-- Det betyder INTET for en miljoescreening — den slaar aldrig materialet op —
-- og der findes ingen selektive sager endnu.
update screening.materials set name = 'Gasbeton/porebeton' where name = 'Gasbeton';
update screening.materials set name = 'Mineraluld' where name = 'Isolering';

-- ---------------------------------------------------------------------------
-- Rapportens ord (53 materialer)
-- ---------------------------------------------------------------------------
-- Kundens og kontorets egne saetninger. Ret dem ikke for at gore dem paenere:
-- de gaar til en kommune, og de er skrevet af dem, der ved hvad der skal staa.
--
-- Alle seks saetninger skrives pr. materiale, ogsaa de tomme. Ellers ville en
-- saetning, kontoret har SLETTET, blive staaende paa produktionen.
update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = null,
  sentence_forurenet     = null,
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = null
where name = 'Asbest plader';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Asfalt vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Asfalt udsorteres separat og afleveres til genanvendelse, hvor materialet kan oparbejdes og indgå i ny asfalt eller anden egnet anvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Asfalt';

update screening.materials set
  report_name            = 'Beton',
  sentence_genbrug       = 'Beton vurderes egnet til genbrug, hvis hele elementer kan demonteres og anvendes igen.',
  sentence_genanvendelse = 'Beton udsorteres som en ren fraktion og kan efter nedknusning genanvendes som sekundært materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Beton (undtagen, gasbeton, letbeton)';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Funktionsdygtigt elektronik kan demonteres og udsorteres med henblik på direkte genbrug.',
  sentence_genanvendelse = 'Elektronik udsorteres særskilt og afleveres til godkendt behandling, hvor anvendelige materialer kan genanvendes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Elektronik';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Asbestfri eternit kan genbruges, hvis pladerne kan demonteres hele og er egnede til videre anvendelse.',
  sentence_genanvendelse = 'Asbestfri eternit udsorteres separat og afleveres til relevant behandling eller genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Eternit, asbestfri';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Fugemasse vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Fugemasse vurderes ikke egnet til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Fugemasse';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele blokke eller elementer kan demonteres og genbruges, hvis deres stand tillader det.',
  sentence_genanvendelse = 'Gasbeton/porebeton udsorteres separat og afleveres til genanvendelse som mineralsk materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Gasbeton/porebeton';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og ubeskadigede gipsplader kan demonteres forsigtigt med henblik på genbrug.',
  sentence_genanvendelse = 'Gips udsorteres som en separat, ren og tør fraktion og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Gips';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og anvendelige glaspartier kan demonteres forsigtigt og anvendes igen.',
  sentence_genanvendelse = 'Glas udsorteres separat og afleveres til genanvendelse, hvor det kan indgå i produktionen af nye glasprodukter.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Glas';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele fliser og klinker kan demonteres skånsomt og udsorteres med henblik på genbrug.',
  sentence_genanvendelse = 'Glaseret tegl, fliser og klinker udsorteres separat og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Glasseret tegl / Fliser / Klinker';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Ren, tør og ubeskadiget glasuld kan demonteres og genbruges, hvor materialets stand tillader det.',
  sentence_genanvendelse = 'Glasuld udsorteres separat, holdes ren og tør og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Glasuld';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og anvendelige metaldele demonteres og udsorteres med henblik på direkte genbrug.',
  sentence_genanvendelse = 'Jern og metal udsorteres separat og afleveres til genanvendelse gennem oparbejdning og omsmeltning.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Jern og metal';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele Leca-blokke kan demonteres og genbruges, hvor deres stand tillader det.',
  sentence_genanvendelse = 'Leca udsorteres separat og afleveres til genanvendelse som mineralsk materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Leca';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele letbetonelementer kan demonteres og anvendes igen, hvor deres stand tillader det.',
  sentence_genanvendelse = 'Letbeton udsorteres separat og afleveres til genanvendelse som mineralsk materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Letbeton';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og ubeskadigede linoleumsbelægninger kan genbruges, hvor demontering og stand tillader det',
  sentence_genanvendelse = 'Linoleum udsorteres separat og afleveres til genanvendelse, hvor en egnet modtageordning findes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Linoleum';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Maling vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Maling og malingsrester udsorteres separat og afleveres til relevant behandling, hvor materialet kan nyttiggøres eller bortskaffes forsvarligt.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Maling';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Mursten demonteres og sorteres skånsomt, så hele og anvendelige sten kan genbruges.',
  sentence_genanvendelse = 'Mursten, der ikke kan genbruges direkte, udsorteres som en ren mineralsk fraktion og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Mursten';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Puds vurderes normalt ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Rent puds udsorteres som mineralsk materiale og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Puds';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele PVC-produkter kan genbruges, hvor stand og anvendelse tillader det.',
  sentence_genanvendelse = 'PVC udsorteres separat fra øvrig plast og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'PVC';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Skorsten';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Ren, tør og ubeskadiget stenuld kan demonteres og genbruges.',
  sentence_genanvendelse = 'Stenuld udsorteres som en ren og tør fraktion og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Stenuld';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Tagpap vurderes normalt ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Tagpap udsorteres separat og afleveres til relevant behandling eller genanvendelse, hvor materialet kan oparbejdes til nye produkter.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Tagpap';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Tapet vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Tapet udsorteres og afleveres til relevant behandling eller genanvendelse, hvor dette er muligt.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Tapet';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Træ demonteres skånsomt og sorteres, så anvendelige trædele kan bevares til genbrug.',
  sentence_genanvendelse = 'Træ udsorteres som en separat træfraktion og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Træ';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Trykimprægneret træ kan genbruges direkte, hvis træet er helt, intakt og egnet til videre anvendelse.',
  sentence_genanvendelse = 'Trykimprægneret træ udsorteres separat og afleveres til relevant behandling eller bortskaffelse, da det på grund af imprægneringsmidlerne normalt ikke kan genanvendes som almindeligt træ.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Træ, trykimprægneret';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og anvendelige vinduer demonteres forsigtigt og opbevares beskyttet med henblik på direkte genbrug.',
  sentence_genanvendelse = 'Vinduer udsorteres og adskilles efter materialetype, så glas, træ og metal kan afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Vinduer';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele vinylprodukter kan genbruges, hvor materialets stand og anvendelse tillader det.',
  sentence_genanvendelse = 'Vinyl udsorteres separat og afleveres til relevant genanvendelse, hvor en egnet modtageordning findes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Vinyl';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = null,
  sentence_forurenet     = null,
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = null
where name = 'Andet byggeaffald indeholdende asbest';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Terrazzo vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Terrazzo udsorteres som mineralsk materiale og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Terrazzo';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Materialeblandingen vurderes ikke umiddelbart egnet til direkte genbrug.',
  sentence_genanvendelse = 'Beton og asfalt udsorteres og afleveres til et egnet modtageanlæg med henblik på sortering og genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Blandinger af beton og asfalt';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Materiale kan genbruges, hvor de enkelte materialer kan udsorteres og bevares hele.',
  sentence_genanvendelse = 'Mineralsk materiale udsorteres separat og afleveres til genanvendelse, herunder eventuel nedknusning.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Blandinger af materialer, fra natursten, uglaseret tegl og beton';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og ubeskadigede EPS-elementer kan udsorteres til genbrug, hvor dette er muligt.',
  sentence_genanvendelse = 'EPS udsorteres som en ren fraktion og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Flamingo';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele glasfiberprodukter kan genbruges, hvis deres stand og anvendelse tillader det.',
  sentence_genanvendelse = 'Glasfiber udsorteres separat og afleveres til relevant genanvendelse, hvor en egnet modtageordning findes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Glasfiber';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Rent indskudsler kan genbruges direkte, hvor materialets kvalitet og den nye anvendelse tillader det.',
  sentence_genanvendelse = 'Indskudsler udsorteres som en ren mineralsk fraktion og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Indskudsler';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og anvendelige kabler kan udsorteres til genbrug, hvor deres stand og funktion tillader det.',
  sentence_genanvendelse = 'Kabler udsorteres separat og afleveres til behandling, hvor metal og øvrige materialer kan genanvendes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Kabler';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Kabler udsorteres separat og afleveres til behandling, hvor metal og øvrige materialer kan genanvendes.',
  sentence_genanvendelse = 'Materiale fra koksvægge udsorteres efter materialetype og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Koksvægge';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Lysstofrør vurderes ikke egnet til direkte genbrug, medmindre de er hele, funktionsdygtige og egnede til videre anvendelse.',
  sentence_genanvendelse = 'Lysstofrør udsorteres separat og afleveres til godkendt behandling, hvor glas, metal og øvrige materialer kan genanvendes, og eventuelle miljøskadelige stoffer håndteres forsvarligt.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Lysstofrør';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Natursten udsorteres og bevares hele med henblik på direkte genbrug.',
  sentence_genanvendelse = 'Natursten udsorteres separat og afleveres til genanvendelse som mineralsk materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Natursten, fx granit og flint';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele produkter kan genbruges, hvor dette er relevant.',
  sentence_genanvendelse = 'Pap og papir udsorteres som en ren og tør fraktion og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Pap og papir';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele plastprodukter og komponenter kan udsorteres til direkte genbrug.',
  sentence_genanvendelse = 'Plast udsorteres efter plasttype og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Plast';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Sandblæsningssand vurderes ikke egnet til direkte genbrug efter anvendelse.',
  sentence_genanvendelse = 'Brugt sandblæsningssand udsorteres separat og afleveres til relevant behandling eller bortskaffelse, afhængigt af indholdet af maling, metalrester, plast og øvrige forureninger.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Sandblæsningssand (fra metal og plast)';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Sandblæsningssand vurderes ikke egnet til direkte genbrug efter anvendelse.',
  sentence_genanvendelse = 'Brugt sandblæsningssand udsorteres separat og afleveres til relevant behandling eller bortskaffelse, afhængigt af sandets indhold og eventuelle forureninger.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Sandblæsningssand (undtagen fra metal og plast)';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og funktionsdygtige sanitetsprodukter kan demonteres forsigtigt og genbruges.',
  sentence_genanvendelse = 'Sanitet, der ikke kan genbruges, udsorteres separat og afleveres til genanvendelse som mineralsk materiale.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Sanitet';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Slagge kan genbruges, hvor materialets egenskaber og dokumentation gør det egnet til den konkrete anvendelse.',
  sentence_genanvendelse = 'Slagge udsorteres separat og afleveres til relevant behandling eller genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Slagge';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele termoruder i anvendelig stand demonteres forsigtigt og kan udsorteres med henblik på genbrug.',
  sentence_genanvendelse = 'Termoruder udsorteres særskilt og afleveres til behandling, hvor glas og øvrige materialer kan genanvendes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Termoruder';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Uglaseret tegl/tagsten nedtages skånsomt og sorteres, så hele og anvendelige sten kan genbruges.',
  sentence_genanvendelse = 'Uglaseret tegl/tagsten udsorteres som en ren mineralsk fraktion og afleveres til genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Uglaseret tegl (mur- og tagsten)';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = null,
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Andet byggeaffald indeholdende farlige stoffer';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Materialer, der er egnede til direkte genbrug, udsorteres og håndteres, så deres mulighed for videre anvendelse bevares.',
  sentence_genanvendelse = 'Rent byggeaffald udsorteres efter materialetype og afleveres til relevant genanvendelse.',
  sentence_bortskaffelse = null,
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = null
where name = 'Andet byggeaffald uden asbest eller farlige stoffer';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = null,
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Andet byggeaffald indeholdende PCB, farligt affald';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Ren, tør og ubeskadiget mineraluld kan genbruges, hvor materialets stand og anvendelse tillader det.',
  sentence_genanvendelse = 'Mineraluld udsorteres separat og afleveres til relevant genanvendelse, hvor en egnet modtageordning findes.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Mineraluld';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = null,
  sentence_genanvendelse = null,
  sentence_bortskaffelse = null,
  sentence_forurenet     = null,
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = null
where name = 'Isolering m. asbest';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Kit vurderes ikke egnet til direkte genbrug.',
  sentence_genanvendelse = 'Kit udsorteres separat og afleveres til relevant behandling.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Kit';

update screening.materials set
  report_name            = null,
  sentence_genbrug       = 'Hele og rene tæpper kan genbruges, hvis standen tillader videre anvendelse.',
  sentence_genanvendelse = 'Tagpap udsorteres separat og afleveres til relevant behandling eller genanvendelse.',
  sentence_bortskaffelse = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_forurenet     = 'Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger.',
  sentence_asbest        = 'Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald.',
  sentence_farligt       = 'Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger.'
where name = 'Tæppe';

-- ---------------------------------------------------------------------------
-- Lukkede materialer (2)
-- ---------------------------------------------------------------------------
-- Materialer slettes ikke, de lukkes. Et lukket materiale forsvinder fra
-- vaelgeren i marken og bliver staaende i de rapporter, der bruger det.
update screening.materials set active = false where name = 'Pore beton';
update screening.materials set active = false where name = 'Støbeasfalt';

-- ---------------------------------------------------------------------------
-- De fire faelles bortskaffelsestekster (4)
-- ---------------------------------------------------------------------------
-- Kontakten `shared_disposal_text` er slaaet til af migration
-- 20260909120000 og staar ikke her. Disse fire er teksterne, den peger paa —
-- og de seedes IKKE af nogen migration, fordi de er kundens ord.
-- Uden dem ville forureningsafsnittet staa uden et ord om affaldet.
insert into screening.app_settings (key, value) values ('sentence_asbest', '"Asbestholdigt affald skal udsorteres særskilt og håndteres, så støvdannelse og spredning af asbestfibre begrænses. Affaldet skal opbevares i egnet, lukket og tydeligt mærket emballage og holdes adskilt fra øvrige affaldsfraktioner. Affaldet afleveres efter kommunens anvisninger til et modtageanlæg, der modtager asbestholdigt affald."'::jsonb)
  on conflict (key) do update set value = excluded.value;
insert into screening.app_settings (key, value) values ('sentence_bortskaffelse', '"Materialet kan ikke genbruges eller genanvendes og skal derfor bortskaffes. Affaldet håndteres og afleveres efter kommunens gældende anvisninger."'::jsonb)
  on conflict (key) do update set value = excluded.value;
insert into screening.app_settings (key, value) values ('sentence_farligt', '"Farligt affald skal udsorteres særskilt fra øvrigt affald og opbevares i egnet og forsvarlig container, beholder eller emballage. Håndteringen skal ske, så spredning af farlige stoffer begrænses. Affaldet afleveres til godkendt modtageanlæg i henhold til den konkrete affaldsklassificering og kommunens anvisninger."'::jsonb)
  on conflict (key) do update set value = excluded.value;
insert into screening.app_settings (key, value) values ('sentence_forurenet', '"Forurenet affald skal udsorteres fra rene materialer og øvrige affaldsfraktioner. Affaldet skal opbevares separat i egnet container, beholder eller emballage, så spredning af forurenede materialer begrænses. Affaldet afleveres efter den konkrete affaldsklassificering og kommunens anvisninger."'::jsonb)
  on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------------
-- Spaerre
-- ---------------------------------------------------------------------------
-- Samme slags spaerre som i `saetninger_fra_skabelonen`, og af samme grund:
-- rammer et navn ikke, sker der ingenting, og resultatet er en rapport hvor et
-- materiale mangler sin saetning. Det ser ud som om kontoret ikke havde skrevet
-- den, ikke som om filen ramte forbi. Derfor taelles der efter.
do $$
declare
  antal_tekst int;
  antal_lukket int;
  antal_faelles int;
begin
  select count(*) into antal_tekst from screening.materials
   where report_name is not null or sentence_genbrug is not null
      or sentence_genanvendelse is not null or sentence_bortskaffelse is not null
      or sentence_forurenet is not null or sentence_asbest is not null
      or sentence_farligt is not null;
  select count(*) into antal_lukket from screening.materials where not active;
  select count(*) into antal_faelles from screening.app_settings where key like 'sentence\_%';

  if antal_tekst <> 53 then
    raise exception 'indhold: % materialer har tekst, forventede 53', antal_tekst
      using hint = 'Et navn i filen findes ikke i screening.materials. Sammenlign navnelisten med 4.1.';
  end if;
  if antal_lukket <> 2 then
    raise exception 'indhold: % lukkede materialer, forventede 2', antal_lukket;
  end if;
  if antal_faelles <> 4 then
    raise exception 'indhold: % faelles tekster, forventede 4', antal_faelles;
  end if;

  raise notice 'indhold ok: % materialer med tekst, % lukkede, % faelles tekster',
    antal_tekst, antal_lukket, antal_faelles;
end $$;

commit;
