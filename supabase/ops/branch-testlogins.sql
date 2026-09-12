-- De to testlogins fra supabase/seed.sql, linje 40-99.
--
-- Klippet ud af seed.sql af supabase/ops/byg-branch-testlogins.js, ikke skrevet
-- af. De fire tomme token-kolonner i auth.users er den skroebeligste del af
-- hele opsaetningen: udelades én, oprettes brugeren fint, men ethvert login
-- svarer 500 «Database error querying schema», og fejlen naevner ikke aarsagen.
--
-- KUN brugerafsnittet. Resten af seed.sql opretter en selektiv testsag, og den
-- hoerer ikke til paa et produktionsskema — branchen staar paa 20260804111609,
-- hvor `report_type` ikke findes.
--
-- Adgangskode for begge: fase2-test
--   kontor@fase2.test   — admin, maa alt
--   screener@fase2.test — screener, maa ikke skrive i lab_results

-- Spaerre: denne fil opretter brugere med kendte kodeord og maa ALDRIG naa
-- produktionen. seed.sql's egen spaerre er ikke med (den daekker hele filen og
-- ser paa screening.cases), saa her staar den paa projektet i stedet.
do $$
begin
  if exists (select 1 from screening.cases) then
    raise exception 'branch-testlogins.sql afbrudt: screening.cases er ikke tom'
      using hint = 'Filen hoerer i et TOMT testmiljoe. Er der sager, er det efter alt at doemme produktionen.';
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
