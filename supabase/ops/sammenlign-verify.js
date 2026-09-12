// Holder foer- og efter-halvdelen op mod hinanden. Bruges i 2.6 og i 4.5.
//
//   node supabase/ops/sammenlign-verify.js foer-branch.txt efter-branch.txt
//
// Det er 9A punkt 14, gjort mekanisk: raekketallene skal vaere ens paa naer de
// to, migrationen selv laver, og alle elleve md5'er af de GAMLE kolonner skal
// vaere identiske. Én afvigelse er et fejlet bevis.
//
// ---------------------------------------------------------------------------
// DEN GAELDER KUN MELLEM 4.3 OG 4.5. Brug den ikke bagefter.
// ---------------------------------------------------------------------------
// Scriptet maaler ÉN ting: aendrede MIGRATIONEN noget, den ikke maatte. Alt
// efter 4.5 flytter med rette de samme tal, og saa raaber det ulv:
//
//   4.7 (kontorets indhold) aendrer `materials.name` (to omdoebninger) og
//   `materials.active` (to lukninger) — altsaa GAMLE kolonner, med vilje, og
//   det er svaret paa spoergsmaal 1 i afsnit 10. Den laegger ogsaa fire
//   `sentence_*`-noegler i `app_settings`, saa baade raekketal og md5 dér
//   flytter sig. Og saetningstaellerne gaar fra migrationens 5/7/0/0/0/0 til
//   kontorets 47/47/49/49/43/49.
//
//   Enhver hentet Eurofins-fil laegger en raekke i `exports`. Det er en log
//   over det, kontoret goer hver uge.
//
// Koert efter 4.7 melder scriptet derfor 13 «fejl», som alle er rigtige
// aendringer. Skal tilstanden efterproeves senere, sammenlign da mod tal, der er
// taget EFTER 4.7 — ikke mod foer-prod.txt.
const fs = require("fs");
const path = require("path");

const [foerSti, efterSti] = process.argv.slice(2);
if (!foerSti || !efterSti) {
  console.error("brug: node sammenlign-verify.js <foer.txt> <efter.txt>");
  process.exit(2);
}

function laes(sti) {
  const ud = { raekketal: {}, md5: {}, historik: {}, nyt: {} };
  for (const l of fs.readFileSync(sti, "utf8").split("\n")) {
    if (!l.trim()) continue;
    const i = l.indexOf("|");
    const j = l.indexOf("|", i + 1);
    if (i < 0 || j < 0) continue;
    const afsnit = l.slice(0, i), navn = l.slice(i + 1, j), vaerdi = l.slice(j + 1);
    if (ud[afsnit]) ud[afsnit][navn] = vaerdi;
  }
  return ud;
}

const foer = laes(foerSti);
const efter = laes(efterSti);

// De eneste forventede forskelle i raekketal. Alt andet er en afvigelse.
const VENTET = { app_settings: +1, building_parts: "ny=8" };

let fejl = 0;
const sig = (ok, tekst) => { console.log((ok ? "  ok    " : "  FEJL  ") + tekst); if (!ok) fejl++; };

console.log("=== Raekketal ===");
const tabeller = [...new Set([...Object.keys(foer.raekketal), ...Object.keys(efter.raekketal)])].sort();
for (const t of tabeller) {
  const a = foer.raekketal[t], b = efter.raekketal[t];
  if (a === undefined) {
    sig(t === "building_parts" && b === "8", t + ": ny tabel med " + b + " raekker (ventet: building_parts med 8)");
  } else if (b === undefined) {
    sig(false, t + ": fandtes foer (" + a + "), men ikke efter");
  } else if (a === b) {
    sig(true, t + ": " + a + " uaendret");
  } else if (VENTET[t] === +1 && Number(b) - Number(a) === 1) {
    sig(true, t + ": " + a + " -> " + b + " (+1, ventet: shared_disposal_text)");
  } else {
    sig(false, t + ": " + a + " -> " + b + " — UVENTET AENDRING");
  }
}

console.log("");
console.log("=== md5 af de gamle kolonner — skal alle vaere ens ===");
for (const t of Object.keys(foer.md5).sort()) {
  const a = foer.md5[t], b = efter.md5[t];
  sig(a === b, t + ": " + (a === b ? a : a + " -> " + b + "  MIGRATIONEN HAR SKREVET I EN GAMMEL KOLONNE"));
}
for (const t of Object.keys(efter.md5)) {
  if (!(t in foer.md5)) sig(false, t + ": md5 findes kun i efter-halvdelen");
}

console.log("");
console.log("=== Historikken mod fase2-prod.md5 ===");
const md5Fil = fs.readFileSync(path.join(__dirname, "fase2-prod.md5"), "utf8").trimEnd().split("\n");
const ventet = {};
for (const l of md5Fil) { const [m, f] = l.split(/\s+/); ventet[f.slice(0, 14)] = m; }
const versioner = Object.keys(ventet).sort();
sig(Object.keys(efter.historik).length === 9, "ni versioner i historikken (fandt " + Object.keys(efter.historik).length + ")");
for (const v of versioner) {
  sig(efter.historik[v] === ventet[v], v + ": " + (efter.historik[v] === ventet[v] ? ventet[v] : "fil " + ventet[v] + " != db " + efter.historik[v]));
}

console.log("");
console.log("=== De nye paastande ===");
// Forventede vaerdier. Kun de tal, der IKKE afhaenger af hvor meget data der er.
const NYT = {
  "sager_ikke_miljoescreening": "0",
  "cases.contamination_handling_note_udfyldt": "0",
  "samples.building_part_id_udfyldt": "0",
  "samples.material_condition_udfyldt": "0",
  "samples.resource_handling_udfyldt": "0",
  "case_buildings.syv_nye_felter_udfyldt": "0",
  "materials.report_name_udfyldt": "1",
  "materials.sentence_genbrug_udfyldt": "5",
  "materials.sentence_genanvendelse_udfyldt": "7",
  "materials.med_saetning_i_alt": "12",
  "materials.sentence_bortskaffelse_udfyldt": "0",
  "materials.sentence_forurenet_udfyldt": "0",
  "materials.sentence_asbest_udfyldt": "0",
  "materials.sentence_farligt_udfyldt": "0",
  "materials.Taeppe_har_saetning": "true",
  "building_parts.antal": "8",
  "building_parts.navne_i_sort_order":
    "Fundament og sokkel / Bærende konstruktioner / Facade (udvendig) / Vægge (indvendig) / " +
    "Vinduer og døre / Indvendige overflader / Tag / Øvrige",
  "building_parts.Baerende_findes": "true",
  "building_parts.alle_aktive": "true",
  "app_settings.shared_disposal_text": "true",
  "app_settings.noegler": "eurofins_analyses_details, shared_disposal_text",
  "building_parts.rls": "true",
  "building_parts.politikker": "building_parts_select, building_parts_write",
  "anon_grants_i_screening": "0",
  "enum_typer": "building_period, case_status, report_type, resource_handling, user_role",
  "samples.building_part_findes_stadig": "0",
  "materials.sentences_reviewed_findes_stadig": "0",
};
for (const [n, v] of Object.entries(NYT)) {
  const faktisk = efter.nyt[n];
  sig(faktisk === v, n + ": " + (faktisk === v ? v : "fandt " + JSON.stringify(faktisk) + ", ventede " + JSON.stringify(v)));
}
// Grants tjekkes for det, der betyder noget: authenticated har de fire, anon ingen.
const g = efter.nyt["building_parts.grants"] || "";
sig(/authenticated=SELECT/.test(g) && /authenticated=INSERT/.test(g) && /authenticated=UPDATE/.test(g) && /authenticated=DELETE/.test(g),
    "building_parts.grants: authenticated har SELECT/INSERT/UPDATE/DELETE");
sig(!/anon=/.test(g), "building_parts.grants: INGEN grant til anon");

console.log("");
console.log(fejl === 0 ? "BEVIS: HOLDER — ingen gammel celle er roert" : "BEVIS: FEJLER — " + fejl + " punkt(er)");
process.exit(fejl === 0 ? 0 : 1);
