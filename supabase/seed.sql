-- Testdata til et tomt udviklingsmiljo.
--
-- Koeres automatisk efter migrationerne naar en Supabase-branch bygges op, og
-- af `supabase db reset` lokalt. Opslagslisterne — materialer, proveart og
-- Eurofins-koden — kommer fra migrationen screening_seed_lookups og staar
-- derfor ikke her.

-- ---------------------------------------------------------------------------
-- Spaerre
-- ---------------------------------------------------------------------------
-- Websitet nemscreening.dk deler database med screening-appen. Denne fil
-- opretter brugere og sager, og den ma under ingen omstaendigheder ramme
-- produktionen. To ting afsloerer den: screening har allerede sager, og
-- public.leads indeholder rigtige henvendelser.
do $$
declare
  antal_sager bigint;
  antal_leads bigint := 0;
begin
  select count(*) into antal_sager from screening.cases;
  if antal_sager > 0 then
    raise exception 'seed.sql afbrudt: screening.cases er ikke tom'
      using hint = 'Filen bygger et TOMT miljo op. Er der allerede sager, er det efter alt at doemme produktionen.';
  end if;

  -- Opslaget i public.leads skal vaere dynamisk. PL/pgSQL planlaegger hele
  -- udtrykket paa forhaand, saa en almindelig reference ville slaa tabellen op
  -- allerede der — og fejle i et miljo uden website. Altsaa praecis det miljo
  -- filen er skrevet til. EXECUTE udskyder opslaget til det faktisk koeres.
  if to_regclass('public.leads') is not null then
    execute 'select count(*) from public.leads' into antal_leads;
  end if;

  if antal_leads > 0 then
    raise exception 'seed.sql afbrudt: public.leads indeholder data'
      using hint = 'Websitets henvendelser findes kun i produktionen. Stop her.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Brugere
-- ---------------------------------------------------------------------------
-- auth.users skrives i handen, fordi en branch starter uden brugere og appen
-- kraever login til alt. Det er den skroebeligste del af filen: skemaet her
-- ejes af GoTrue og kan aendre sig mellem Supabase-versioner. Fejler den,
-- opret brugerne i dashboardet under Authentication med PRAECIS de id'er der
-- staar nedenfor — resten af filen haenger paa dem.
--
-- De fire tomme token-kolonner er ikke pynt. GoTrue laeser dem ind i Go-strenge
-- der ikke kan rumme NULL, og de har ingen standardvaerdi i tabellen. Udelader
-- man dem, oprettes brugeren fint, men ethvert login svarer 500 «Database error
-- querying schema» — fejlen naevner ikke seed'en med et ord. De ovrige
-- token-kolonner har '' som standard og klarer sig selv.
--
-- Adgangskode for begge: fase2-test
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'kontor@fase2.test',
   extensions.crypt('fase2-test', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Test Kontor"}'::jsonb,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'screener@fase2.test',
   extensions.crypt('fase2-test', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Test Screener"}'::jsonb,
   '', '', '', '')
on conflict (id) do nothing;

-- Uden en identity kan GoTrue ikke logge brugeren ind med e-mail.
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', u.email, now(), now(), now()
from auth.users u
where u.email in ('kontor@fase2.test', 'screener@fase2.test')
on conflict do nothing;

-- Medlemskabet HER er det der giver adgang — ikke det at vaere logget ind.
-- En kunde fra websitet er ogsaa "authenticated". Se screening_rls_policies.
insert into screening.app_users (id, full_name, email, role, active) values
  ('11111111-1111-4111-8111-111111111111', 'Test Kontor',   'kontor@fase2.test',   'admin',    true),
  ('22222222-2222-4222-8222-222222222222', 'Test Screener', 'screener@fase2.test', 'screener', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- En sag med bygninger
-- ---------------------------------------------------------------------------
-- Sagen er en SELEKTIV nedrivning, sa ressourcescreeningen kan ses uden at der
-- forst skal oprettes en sag og tages prover i hand. Den almindelige
-- miljoscreening er standardvaerdien og fas ved at oprette en ny sag.
-- Handteringsteksten er hentet ORDRET fra Nemscreenings eget plandokument
-- («Naeste udviklingsfase – Selektiv nedrivning»), afsnittet om saneringsregler.
-- Den er ikke skrevet her: teksten gar til en kommune, og den slags ord skal
-- komme fra en fagperson. Den daekker praecis de tre fund i sagen — PCB i fugen,
-- bly i malingen og asbest i tagpladerne — sa afsnittet kan ses virke.
insert into screening.cases (
  id, case_name, status, report_type, customer_name, customer_contact,
  customer_email, customer_phone, address_text, postnr, city, area_m2,
  built_year, rebuilt_year, note, contamination_handling_note, created_by
) values (
  'ca5e0001-0000-4000-8000-000000000001',
  'Nørrebrogade 12, 2200 København N',
  'sendt_til_lab',
  'selektiv',
  'Testkunde ApS', 'Hanne Jensen', 'hanne@testkunde.dk', '12 34 56 78',
  'Nørrebrogade 12, 2200 København N', '2200', 'København N',
  418, 1968, 2004,
  'Seed-sag. Prøverne dækker grøn, gul og rød med vilje.',
  'Asbestholdige materialer skal identificeres og udsorteres inden den øvrige nedrivning. Arbejdet skal udføres efter de gældende regler for asbestarbejde. Materialerne skal håndteres, emballeres, mærkes, transporteres og afleveres efter de gældende krav.

PCB-holdige fuger udsorteres før den øvrige nedrivning. Der skal samtidig tages højde for risiko for sekundær forurening af tilstødende materialer som beton, tegl eller træ.

Maling med forhøjede koncentrationer af bly eller andre tungmetaller registreres som en separat forureningskilde. Hvis malingen afrenses, skal afrensningsmateriale og støv opsamles særskilt.',
  '11111111-1111-4111-8111-111111111111'
);

-- Materiale- og varmefelterne er BBR-KODER og ikke tekst; ordlyden slas op i
-- src/lib/bbr/map.ts. Garagens tag star som kode 3, «Fibercement herunder
-- asbest» — det er BBR's egen made at sige, at der kan vaere asbest i pladerne,
-- og det er netop den bygning, prove P4 er taget pa. Sa er advarslen pa
-- BBR-siden ogsa noget man kan se virke.
insert into screening.case_buildings (
  id, case_id, building_no, label, usage_code, usage_text,
  built_year, area_built, area_total, floors,
  wall_material_code, roof_material_code, heating_code,
  usage_note, construction_note, plan_note,
  is_manual, sort_order
) values
  ('b0110001-0000-4000-8000-000000000001',
   'ca5e0001-0000-4000-8000-000000000001',
   '1', 'Bygning 1', '140',
   'Etagebolig-bygning, flerfamiliehus eller to-familiehus',
   1968, 320, 418, 4,
   '1', '5', '1',
   'Privat beboelse med erhverv i stueetagen.',
   'Opført som traditionel muret konstruktion med tegltag. Fremstår generelt i ældre stand med slidte overflader.',
   'Bygningen er planlagt til fuldstændig nedrivning.',
   false, 1),
  ('b0110002-0000-4000-8000-000000000002',
   'ca5e0001-0000-4000-8000-000000000001',
   '2', 'Bygning 2', '910', 'Garage',
   1972, 98, 98, 1,
   '2', '3', '9',
   'Garage og opmagasinering.',
   'Letbetonsten med tagplader af fibercement. Fremstår i ringe stand.',
   'Bygningen er planlagt til fuldstændig nedrivning.',
   false, 2);

-- ---------------------------------------------------------------------------
-- Proever
-- ---------------------------------------------------------------------------
-- Nummereringen er med vilje: prove 3 har ingen analyser og faar derfor intet
-- P foran. Raekken bliver P1, P2, 3, P4, P5 — samme moenster som i AGENTS.md.
-- label og is_lab_sample er GENERATED ALWAYS og saettes ikke her.
--
-- P5 er efter 1990 og har derfor hverken PCB eller asbest. Reglen ligger i
-- types.ts, men den skal ogsaa holde i de data man udvikler imod.
--
-- Bygningsdel, stand og handtering er de selektive felter. De er sat pa alle
-- fem prover, men kun de to rene naar frem til ressourcescreeningen: en prove
-- der er kommet tilbage som forurenet eller farligt affald er ikke en
-- ressource, og rapporten ma ikke love at den kan genbruges. Prove 3 er ren
-- fordi den aldrig blev analyseret, P5 fordi svaret la under graenserne.
insert into screening.samples (
  id, case_id, seq, material, sample_type, building_id, building_ids,
  location_note, estimated_tons, period,
  analysis_pcb, analysis_asbestos, analysis_metals, analysis_pah,
  material_condition, resource_handling,
  comment, created_by
) values
  ('5a3b0001-0000-4000-8000-000000000001',
   'ca5e0001-0000-4000-8000-000000000001', 1,
   'Fugemasse', 'Fuger',
   'b0110001-0000-4000-8000-000000000001',
   array['b0110001-0000-4000-8000-000000000001']::uuid[],
   'Fuger omkring vinduer, gadeside', 0.4, 'foer_1990',
   true, false, true, false,
   3, 'bortskaffelse',
   'Elastisk fuge, blød', '22222222-2222-4222-8222-222222222222'),

  ('5a3b0002-0000-4000-8000-000000000002',
   'ca5e0001-0000-4000-8000-000000000001', 2,
   'Maling', 'Hvid maling',
   'b0110001-0000-4000-8000-000000000001',
   array['b0110001-0000-4000-8000-000000000001',
         'b0110002-0000-4000-8000-000000000002']::uuid[],
   'Facademaling, samme på begge bygninger', 1.2, 'foer_1990',
   false, false, true, false,
   -- GENBRUG med vilje, selvom svaret er bly 1800 mg/kg og dermed forurenet.
   -- Den prove viser reglen: screeneren vurderede at malingen kunne genbruges,
   -- analysen sagde noget andet, og rapporten flytter linjen til
   -- forureningsafsnittet med bortskaffelsesteksten. Aendrer man den til
   -- bortskaffelse, holder seed'en op med at vise det.
   3, 'genbrug',
   null, '22222222-2222-4222-8222-222222222222'),

  ('5a3b0003-0000-4000-8000-000000000003',
   'ca5e0001-0000-4000-8000-000000000001', 3,
   'Beton (undtagen, gasbeton, letbeton)', 'Rent',
   'b0110001-0000-4000-8000-000000000001',
   array['b0110001-0000-4000-8000-000000000001']::uuid[],
   'Bærende vægge, kælder', 42, 'foer_1990',
   false, false, false, false,
   2, 'genanvendelse',
   'Kun kortlagt — ingen analyse bestilt',
   '22222222-2222-4222-8222-222222222222'),

  ('5a3b0004-0000-4000-8000-000000000004',
   'ca5e0001-0000-4000-8000-000000000001', 4,
   'Eternit, asbestfri', 'Mulig asbest',
   'b0110002-0000-4000-8000-000000000002',
   array['b0110002-0000-4000-8000-000000000002']::uuid[],
   'Tagplader på garage', 2.8, 'foer_1990',
   false, true, false, false,
   4, 'bortskaffelse',
   null, '22222222-2222-4222-8222-222222222222'),

  ('5a3b0005-0000-4000-8000-000000000005',
   'ca5e0001-0000-4000-8000-000000000001', 5,
   'Træ', 'Ubehandlet',
   'b0110001-0000-4000-8000-000000000001',
   array['b0110001-0000-4000-8000-000000000001']::uuid[],
   'Gulvbrædder, tilbygning fra 2004', 3.5, 'efter_1990',
   false, false, true, true,
   2, 'genbrug',
   null, '22222222-2222-4222-8222-222222222222');

-- Bygningsdelen saettes ved navn og ikke ved id: raekkerne i building_parts far
-- et nyt uuid ved hver opbygning, sa der er intet fast id at skrive her.
update screening.samples s
set building_part_id = bp.id
from screening.building_parts bp
where s.case_id = 'ca5e0001-0000-4000-8000-000000000001'
  and bp.name = case s.seq
    when 1 then 'Facade (udvendig)'
    when 2 then 'Facade (udvendig)'
    when 3 then 'Fundament og sokkel'
    when 4 then 'Tag'
    when 5 then 'Indvendige overflader'
  end;

-- ---------------------------------------------------------------------------
-- Labsvar
-- ---------------------------------------------------------------------------
-- Vaerdierne er valgt op mod graenserne i parametre.ts, saa skemaet viser alle
-- tre niveauer. I.a. er "ikke analyseret" og faar ingen farve; I.P. er "ikke
-- paavist" og er groen. Prove 3 har ingen analyser og faar derfor ingen raekke.
insert into screening.lab_results (
  sample_id, pb, cd, cr, cu, hg, ni, zn,
  asbestos, pcb_total, chlor_paraffins, pah_total, received_at
) values
  -- P1: PCB 62 mg/kg er over 50 og dermed farligt affald. Metallerne er rene.
  ('5a3b0001-0000-4000-8000-000000000001',
   '25', '0,2', '15', '30', '< 0,05', '8', '120',
   'I.a.', '62', 'I.a.', 'I.a.', now() - interval '3 days'),

  -- P2: bly 1800 mg/kg ligger mellem 40 og 2500 — forurenet, ikke farligt.
  ('5a3b0002-0000-4000-8000-000000000002',
   '1800', '0,4', '22', '95', '< 0,05', '12', '340',
   'I.a.', 'I.a.', 'I.a.', 'I.a.', now() - interval '3 days'),

  -- P4: paavist asbest er farligt affald. Hver gang, uden mellemniveau.
  ('5a3b0004-0000-4000-8000-000000000004',
   'I.a.', 'I.a.', 'I.a.', 'I.a.', 'I.a.', 'I.a.', 'I.a.',
   'Påvist', 'I.a.', 'I.a.', 'I.a.', now() - interval '3 days'),

  -- P5: alt under graensen. Den groenne raekke.
  ('5a3b0005-0000-4000-8000-000000000005',
   '12', '< 0,1', '9', '18', 'I.P.', '6', '85',
   'I.a.', 'I.a.', 'I.a.', '1,2', now() - interval '3 days');

-- ---------------------------------------------------------------------------
-- Hvad der IKKE er her
-- ---------------------------------------------------------------------------
-- Billeder. sample_photos og case_files peger paa filer i Storage, og en
-- branch starter med tomme buckets. Raekker uden filer bag sig ville give
-- doede billeder i rapporten frem for ingen billeder, og det er vaerre.
-- Skal rapporten ses med billeder, laeg dem op gennem appen.
