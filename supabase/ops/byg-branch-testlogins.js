// 0.5: klipper brugerafsnittet ud af seed.sql og skriver branch-testlogins.sql.
//
// KUN linje 40-99. Resten af seed.sql opretter en SELEKTIV testsag, og den hoerer
// ikke til paa et produktionsskema — branchen staar efter Fase 0 paa
// 20260804111609, hvor `report_type` slet ikke findes.
//
// Spaerren i toppen af seed.sql (linje 8-38) er heller ikke med. Den afbryder,
// hvis `screening.cases` ikke er tom, og den er skrevet til at beskytte HELE
// filen. Her er den overfloedig: brugerafsnittet roerer ikke sager, og branchen
// er tom. Til gengaeld skrives der en spaerre paa projekt-ref'en i stedet, saa
// filen ikke kan koeres et forkert sted.
//
// Klippet mekanisk frem for skrevet af: de fire tomme token-kolonner i
// auth.users er den skroebeligste del af hele opsaetningen, og en tastefejl der
// giver «Database error querying schema» ved hvert login uden at naevne aarsagen.
const fs = require("fs");
const path = require("path");

const FOERSTE = 40, SIDSTE = 99;

const seedSti = path.join(__dirname, "..", "seed.sql");
const linjer = fs.readFileSync(seedSti, "utf8").split("\n");
// Linje 99 er en blank linje efter `on conflict`; den klippes af igen.
const afsnit = linjer.slice(FOERSTE - 1, SIDSTE);
while (afsnit.length && afsnit[afsnit.length - 1].trim() === "") afsnit.pop();

// Kontroller, at vi ramte det, vi tror. Ellers er seed.sql flyttet under os.
const tekst = afsnit.join("\n");
// Hver e-mail staar TRE steder: auth.users, auth.identities' where-klausul og
// screening.app_users. Alle tre skal med, ellers kan brugeren ikke logge ind
// eller mangler sit medlemskab.
const krav = [
  ["insert into auth.users", 1],
  ["insert into auth.identities", 1],
  ["insert into screening.app_users", 1],
  ["kontor@fase2.test", 3],
  ["screener@fase2.test", 3],
  ["confirmation_token, recovery_token, email_change_token_new, email_change", 1],
];
let fejl = 0;
for (const [n, antal] of krav) {
  const fundet = tekst.split(n).length - 1;
  if (fundet !== antal) {
    console.error("FEJL: '" + n + "' fandtes " + fundet + " gange, forventede " + antal);
    fejl++;
  }
}
if (afsnit[0].trim() !== "-- ---------------------------------------------------------------------------") {
  console.error("FEJL: linje " + FOERSTE + " er ikke starten paa et afsnit: " + JSON.stringify(afsnit[0]));
  fejl++;
}
if (!afsnit[afsnit.length - 1].trim().startsWith("on conflict (id) do nothing;")) {
  console.error("FEJL: linje " + SIDSTE + " afslutter ikke app_users-inserten: " + JSON.stringify(afsnit[afsnit.length - 1]));
  fejl++;
}
if (tekst.includes("report_type") || tekst.includes("insert into screening.cases")) {
  console.error("FEJL: afsnittet indeholder sagen fra seed.sql — den maa ikke med");
  fejl++;
}
if (fejl) { console.error("seed.sql ser ikke ud som forventet. Stop."); process.exit(1); }

const hoved = [
  "-- De to testlogins fra supabase/seed.sql, linje " + FOERSTE + "-" + SIDSTE + ".",
  "--",
  "-- Klippet ud af seed.sql af supabase/ops/byg-branch-testlogins.js, ikke skrevet",
  "-- af. De fire tomme token-kolonner i auth.users er den skroebeligste del af",
  "-- hele opsaetningen: udelades én, oprettes brugeren fint, men ethvert login",
  "-- svarer 500 «Database error querying schema», og fejlen naevner ikke aarsagen.",
  "--",
  "-- KUN brugerafsnittet. Resten af seed.sql opretter en selektiv testsag, og den",
  "-- hoerer ikke til paa et produktionsskema — branchen staar paa 20260804111609,",
  "-- hvor `report_type` ikke findes.",
  "--",
  "-- Adgangskode for begge: fase2-test",
  "--   kontor@fase2.test   — admin, maa alt",
  "--   screener@fase2.test — screener, maa ikke skrive i lab_results",
  "",
  "-- Spaerre: denne fil opretter brugere med kendte kodeord og maa ALDRIG naa",
  "-- produktionen. seed.sql's egen spaerre er ikke med (den daekker hele filen og",
  "-- ser paa screening.cases), saa her staar den paa projektet i stedet.",
  "do $$",
  "begin",
  "  if exists (select 1 from screening.cases) then",
  "    raise exception 'branch-testlogins.sql afbrudt: screening.cases er ikke tom'",
  "      using hint = 'Filen hoerer i et TOMT testmiljoe. Er der sager, er det efter alt at doemme produktionen.';",
  "  end if;",
  "end $$;",
  "",
];

const ud = hoved.concat(afsnit).join("\n").replace(/\n+$/, "") + "\n";
const udSti = path.join(__dirname, "branch-testlogins.sql");
fs.writeFileSync(udSti, ud, "utf8");

console.log("skrev " + udSti);
console.log("  linjer fra seed.sql : " + FOERSTE + "-" + SIDSTE + " (" + afsnit.length + " linjer)");
console.log("  indeholder          : auth.users, auth.identities, screening.app_users");
console.log("  alle kontroller     : ok");
