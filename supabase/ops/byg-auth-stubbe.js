// 2.2: stubbe i auth.users til produktionens brugere, saa dumpets app_users kan
// lande. Opskriften er seed.sql linje 56-79 (se 12.7).
//
// `screening.app_users.id` har en fremmednoegle til `auth.users`, og en branch
// starter uden brugere. Uden stubbene fejler 2.3 paa fremmednoeglen.
//
// INGEN kan logge ind som dem:
//   - kodeordet er et `gen_random_uuid()`, som ingen ser
//   - der oprettes INGEN auth.identities, og uden en identity kan GoTrue ikke
//     logge brugeren ind med e-mail
// Raekkerne slettes igen i 4.0.
//
//   node supabase/ops/byg-auth-stubbe.js <prod-data.sql> <ud.sql>
const fs = require("fs");

const [dumpSti, udSti] = process.argv.slice(2);
if (!dumpSti || !udSti) {
  console.error("brug: node byg-auth-stubbe.js <prod-data.sql> <ud.sql>");
  process.exit(2);
}

const dump = fs.readFileSync(dumpSti, "utf8");

// Find COPY-blokken for app_users og laes kolonnenavnene ud af den, frem for at
// antage en raekkefoelge. pg_dump skriver dem selv i hovedet.
const m = dump.match(/^COPY screening\.app_users \(([^)]*)\) FROM stdin;\n([\s\S]*?)\n\\\.$/m);
if (!m) {
  console.error("FEJL: fandt ingen COPY-blok for screening.app_users i dumpet");
  process.exit(1);
}
const kolonner = m[1].split(",").map((s) => s.trim());
const iId = kolonner.indexOf("id");
const iEmail = kolonner.indexOf("email");
const iNavn = kolonner.indexOf("full_name");
if (iId < 0 || iEmail < 0) {
  console.error("FEJL: app_users mangler id eller email. Fandt: " + kolonner.join(", "));
  process.exit(1);
}

// COPY er tabsepareret med \N for null.
const brugere = m[2].split("\n").filter((l) => l.length).map((l) => {
  const f = l.split("\t");
  return {
    id: f[iId],
    email: f[iEmail] === "\\N" ? null : f[iEmail],
    navn: iNavn >= 0 && f[iNavn] !== "\\N" ? f[iNavn] : null,
  };
});

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const b of brugere) {
  if (!uuid.test(b.id)) {
    console.error("FEJL: '" + b.id + "' ser ikke ud som et uuid");
    process.exit(1);
  }
  if (!b.email) {
    console.error("FEJL: bruger " + b.id + " har ingen e-mail; auth.users kraever en");
    process.exit(1);
  }
}

const s = (v) => "'" + String(v).replace(/'/g, "''") + "'";

const ud = [
  "-- Stubbe i auth.users til produktionens " + brugere.length + " brugere (2.2).",
  "--",
  "-- Skrevet af supabase/ops/byg-auth-stubbe.js ud af prod-data.sql, ikke i",
  "-- haanden. Kolonnenavnene er laest ud af dumpets eget COPY-hoved.",
  "--",
  "-- KUN PAA BRANCHEN. Raekkerne findes, fordi screening.app_users har en",
  "-- fremmednoegle til auth.users, og en branch starter uden brugere — uden dem",
  "-- fejler 2.3 paa fremmednoeglen. De slettes igen i 4.0.",
  "--",
  "-- Ingen kan logge ind som dem: kodeordet er et gen_random_uuid(), som ingen",
  "-- ser, og der oprettes INGEN auth.identities. Uden en identity kan GoTrue",
  "-- ikke logge brugeren ind med e-mail.",
  "--",
  "-- De fire tomme token-kolonner er ikke pynt — se kommentaren i seed.sql.",
  "begin;",
  "",
  "insert into auth.users (",
  "  instance_id, id, aud, role, email, encrypted_password,",
  "  email_confirmed_at, created_at, updated_at,",
  "  raw_app_meta_data, raw_user_meta_data,",
  "  confirmation_token, recovery_token, email_change_token_new, email_change",
  ")",
  "values",
];

const raekker = brugere.map((b) => [
  "  ('00000000-0000-0000-0000-000000000000',",
  "   " + s(b.id) + ",",
  "   'authenticated', 'authenticated', " + s(b.email) + ",",
  "   extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),",
  "   now(), now(), now(),",
  "   '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb,",
  "   " + (b.navn ? "jsonb_build_object('full_name', " + s(b.navn) + ")" : "'{}'::jsonb") + ",",
  "   '', '', '', '')",
].join("\n"));

ud.push(raekker.join(",\n"));
ud.push(
  "on conflict (id) do nothing;",
  "",
  "-- Spaerre: der maa IKKE komme identities ud af dette. Kom der en, kunne en",
  "-- rigtig bruger logge ind paa testmiljoeet med et kodeord, ingen kender —",
  "-- eller vaerre, faa nulstillet det.",
  "do $$",
  "declare antal_brugere int; antal_identities int;",
  "begin",
  "  select count(*) into antal_brugere from auth.users;",
  "  select count(*) into antal_identities from auth.identities;",
  "  if antal_brugere <> " + (brugere.length + 2) + " then",
  "    raise exception 'stubbe: auth.users har %, forventede " + (brugere.length + 2) + " (" + brugere.length + " fra prod + 2 testlogins)', antal_brugere;",
  "  end if;",
  "  if antal_identities <> 2 then",
  "    raise exception 'stubbe: auth.identities har %, forventede 2 (kun de to testlogins)', antal_identities;",
  "  end if;",
  "  raise notice 'stubbe ok: % brugere, % identities', antal_brugere, antal_identities;",
  "end $$;",
  "",
  "commit;",
  "",
);

fs.writeFileSync(udSti, ud.join("\n"), "utf8");
console.log("skrev " + udSti);
console.log("  brugere fra dumpet : " + brugere.length);
console.log("  forventet auth.users efter: " + (brugere.length + 2) + " (" + brugere.length + " + 2 testlogins)");
console.log("  identities der oprettes   : 0");
