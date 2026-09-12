// 0.1: skriver branch-indhold-<dato>.sql ud af branch-indhold.json.
//
// Kontorets arbejde er DATA, ikke skema — derfor et eget script og ikke en
// migrationsfil. Filen er noeglet paa materialets NAVN, fordi id'erne er
// tilfaeldige (`gen_random_uuid()` i screening_seed_lookups) og altsaa
// forskellige i hvert miljoe.
//
// Raekkefoelgen er ikke tilfaeldig: omdoebningerne staar FOERST, saa
// tekstopdateringerne bagefter kan noegles paa det nye navn. Byttes de om,
// rammer teksterne ingenting.
//
//   node supabase/ops/byg-branch-indhold.js <json> <ud.sql>
const fs = require("fs");
const path = require("path");

const [jsonSti, udSti] = process.argv.slice(2);
if (!jsonSti || !udSti) {
  console.error("brug: node byg-branch-indhold.js <branch-indhold.json> <ud.sql>");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(jsonSti, "utf8"));

// Seed-listen, saa en omdoebning kan kendes fra et nyt materiale.
const mig = fs.readFileSync(path.join(__dirname, "..", "migrations", "20260725173227_screening_seed_lookups.sql"), "utf8");
function seedListe(efter) {
  const start = mig.indexOf(efter);
  const a = mig.indexOf("unnest(array[", start);
  const b = mig.indexOf("])", a);
  return [...mig.slice(a, b).matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
}
const seedMat = seedListe("insert into screening.materials");

const SAETNINGER = ["sentence_genbrug", "sentence_genanvendelse", "sentence_bortskaffelse",
                    "sentence_forurenet", "sentence_asbest", "sentence_farligt"];
const FELTER = ["report_name", ...SAETNINGER];

// SQL-streng. Apostrof fordobles; linjeskift maa staa som de er.
const s = (v) => (v === null || v === undefined ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const jsonb = (v) => "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";

const navne = data.materials.map((m) => m.name);
const omdoebt = [];
const forsvundne = seedMat.filter((n) => !navne.includes(n));
const tilkomne = navne.filter((n) => !seedMat.includes(n));

// Par dem sammen. Med én forsvundet og én tilkommen ad gangen er koblingen
// entydig kun hvis der er lige mange — og der er to af hver her. Rakken
// bestemmes af sort_order: en omdoebning beholder sin plads i listen.
for (const nyt of tilkomne) {
  const m = data.materials.find((x) => x.name === nyt);
  const gammelt = forsvundne.find((g) => seedMat.indexOf(g) + 1 === m.sort_order);
  if (!gammelt) {
    console.error("KAN IKKE PARRE: '" + nyt + "' (sort_order " + m.sort_order + ") har ingen forsvundet med samme plads");
    process.exit(1);
  }
  omdoebt.push([gammelt, nyt]);
}

const ud = [];
const P = (...l) => ud.push(...l);

P(
  "-- Kontorets indhold fra Supabase-branchen fase-2, laest ud " + new Date().toISOString().slice(0, 10) + ".",
  "--",
  "-- Skrevet af supabase/ops/byg-branch-indhold.js ud af branchens egne raekker,",
  "-- ikke i haanden. Det er trin 0.1 i FASE-2-TIL-MAIN.md, og det er svaret paa",
  "-- spoergsmaal 1 i afsnit 10: kontorets ord er deres faglige arbejde og er",
  "-- KONFIGURATION, ikke sager. Derfor gemmes de foer wipen og laegges paa",
  "-- produktionen i 4.7 som `fase2-indhold.sql`.",
  "--",
  "-- Noeglet paa materialets NAVN. Id'erne er tilfaeldige — screening_seed_lookups",
  "-- indsaetter uden id, saa `gen_random_uuid()` giver forskellige id'er i hvert",
  "-- miljoe, og et id herfra ville ikke findes paa produktionen.",
  "--",
  "-- Idempotent: hver saetning er et `update ... where name = ...`, saa filen kan",
  "-- koeres to gange uden at gore skade. Omdoebningerne staar FOERST, saa",
  "-- teksterne bagefter kan noegles paa det nye navn.",
  "--",
  "-- Roerer IKKE: sager, proever, billeder, labsvar, bygningsdele, proevearter.",
  "-- De to foerste er der ingen af paa branchen efter wipen, og de tre sidste er",
  "-- uaendrede — efterproevet, ikke antaget.",
  "begin;",
  "",
);

// ---------------------------------------------------------------------------
P(
  "-- ---------------------------------------------------------------------------",
  "-- Omdoebninger (" + omdoebt.length + ")",
  "-- ---------------------------------------------------------------------------",
  "-- Kontoret har rettet navnet i panelet. Bemaerk hvad det koster, og at det er",
  "-- accepteret i afsnit 10: en prove paa produktionen, der har teksten",
  "-- 'Isolering' i `samples.material`, mister koblingen til materialeraekken.",
  "-- Det betyder INTET for en miljoescreening — den slaar aldrig materialet op —",
  "-- og der findes ingen selektive sager endnu.",
);
for (const [gammelt, nyt] of omdoebt) {
  P("update screening.materials set name = " + s(nyt) + " where name = " + s(gammelt) + ";");
}
P("");

// ---------------------------------------------------------------------------
const medTekst = data.materials.filter((m) => FELTER.some((f) => m[f]));
P(
  "-- ---------------------------------------------------------------------------",
  "-- Rapportens ord (" + medTekst.length + " materialer)",
  "-- ---------------------------------------------------------------------------",
  "-- Kundens og kontorets egne saetninger. Ret dem ikke for at gore dem paenere:",
  "-- de gaar til en kommune, og de er skrevet af dem, der ved hvad der skal staa.",
  "--",
  "-- Alle seks saetninger skrives pr. materiale, ogsaa de tomme. Ellers ville en",
  "-- saetning, kontoret har SLETTET, blive staaende paa produktionen.",
);
for (const m of medTekst) {
  const saet = FELTER.map((f) => "      " + f.padEnd(22) + " = " + s(m[f])).join(",\n");
  P("update screening.materials set", saet.replace(/^ {6}/, "  ").replace(/\n {6}/g, "\n  "), "where name = " + s(m.name) + ";", "");
}

// ---------------------------------------------------------------------------
const lukkede = data.materials.filter((m) => !m.active);
P(
  "-- ---------------------------------------------------------------------------",
  "-- Lukkede materialer (" + lukkede.length + ")",
  "-- ---------------------------------------------------------------------------",
  "-- Materialer slettes ikke, de lukkes. Et lukket materiale forsvinder fra",
  "-- vaelgeren i marken og bliver staaende i de rapporter, der bruger det.",
);
for (const m of lukkede) {
  P("update screening.materials set active = false where name = " + s(m.name) + ";");
}
P("");

// ---------------------------------------------------------------------------
const faelles = data.app_settings.filter((a) => a.key.startsWith("sentence_"));
P(
  "-- ---------------------------------------------------------------------------",
  "-- De fire faelles bortskaffelsestekster (" + faelles.length + ")",
  "-- ---------------------------------------------------------------------------",
  "-- Kontakten `shared_disposal_text` er slaaet til af migration",
  "-- 20260909120000 og staar ikke her. Disse fire er teksterne, den peger paa —",
  "-- og de seedes IKKE af nogen migration, fordi de er kundens ord.",
  "-- Uden dem ville forureningsafsnittet staa uden et ord om affaldet.",
);
for (const a of faelles) {
  P(
    "insert into screening.app_settings (key, value) values (" + s(a.key) + ", " + jsonb(a.value) + ")",
    "  on conflict (key) do update set value = excluded.value;",
  );
}
P("");

// ---------------------------------------------------------------------------
P(
  "-- ---------------------------------------------------------------------------",
  "-- Spaerre",
  "-- ---------------------------------------------------------------------------",
  "-- Samme slags spaerre som i `saetninger_fra_skabelonen`, og af samme grund:",
  "-- rammer et navn ikke, sker der ingenting, og resultatet er en rapport hvor et",
  "-- materiale mangler sin saetning. Det ser ud som om kontoret ikke havde skrevet",
  "-- den, ikke som om filen ramte forbi. Derfor taelles der efter.",
  "do $$",
  "declare",
  "  antal_tekst int;",
  "  antal_lukket int;",
  "  antal_faelles int;",
  "begin",
  "  select count(*) into antal_tekst from screening.materials",
  "   where report_name is not null or sentence_genbrug is not null",
  "      or sentence_genanvendelse is not null or sentence_bortskaffelse is not null",
  "      or sentence_forurenet is not null or sentence_asbest is not null",
  "      or sentence_farligt is not null;",
  "  select count(*) into antal_lukket from screening.materials where not active;",
  "  select count(*) into antal_faelles from screening.app_settings where key like 'sentence\\_%';",
  "",
  "  if antal_tekst <> " + medTekst.length + " then",
  "    raise exception 'indhold: % materialer har tekst, forventede " + medTekst.length + "', antal_tekst",
  "      using hint = 'Et navn i filen findes ikke i screening.materials. Sammenlign navnelisten med 4.1.';",
  "  end if;",
  "  if antal_lukket <> " + lukkede.length + " then",
  "    raise exception 'indhold: % lukkede materialer, forventede " + lukkede.length + "', antal_lukket;",
  "  end if;",
  "  if antal_faelles <> " + faelles.length + " then",
  "    raise exception 'indhold: % faelles tekster, forventede " + faelles.length + "', antal_faelles;",
  "  end if;",
  "",
  "  raise notice 'indhold ok: % materialer med tekst, % lukkede, % faelles tekster',",
  "    antal_tekst, antal_lukket, antal_faelles;",
  "end $$;",
  "",
  "commit;",
  "",
);

fs.writeFileSync(udSti, ud.join("\n"), "utf8");

console.log("skrev " + udSti);
console.log("  omdoebninger          : " + omdoebt.map((o) => o[0] + " -> " + o[1]).join(", "));
console.log("  materialer med tekst  : " + medTekst.length);
console.log("  lukkede materialer    : " + lukkede.length);
console.log("  faelles tekster       : " + faelles.length + " (" + faelles.map((a) => a.key).join(", ") + ")");
console.log("  bygningsdele beroert  : 0 (uaendrede paa branchen)");
console.log("  proevearter beroert   : 0 (uaendrede paa branchen)");
