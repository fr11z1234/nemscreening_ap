// Deler psql's raa svar paa skemaliste.sql (12.1) i md5 og liste.
//
// Svaret er EN raekke med to felter adskilt af tab: md5, og listen med chr(10)
// mellem linjerne. psql -At foejer et enkelt linjeskift til sidst. Planens md5
// er beregnet i Postgres OVER LISTEN UDEN det linjeskift, saa md5 af den gemte
// fil er ikke det tal, planen naevner — derfor skrives listen ud som fil, og
// md5'en tages fra databasens eget felt. Scriptet regner ikke selv md5'en ud
// af listen; det kontrollerer kun, at de to er enige.
//
//   node supabase/ops/gem-skemaliste.js <raa-fil> <liste-fil> [forventet-md5]
//
// Ingen SQL. Ren plumbing, saa den samme forespoergsel kan koeres mod lokal
// stak, branch og produktion og sammenlignes byte for byte.
const fs = require("fs");
const crypto = require("crypto");

const [raaSti, listeSti, forventet] = process.argv.slice(2);
if (!raaSti || !listeSti) {
  console.error("brug: node gem-skemaliste.js <raa-fil> <liste-fil> [forventet-md5]");
  process.exit(2);
}

const raa = fs.readFileSync(raaSti, "utf8");
const tab = raa.indexOf("\t");
if (tab !== 32) {
  console.error("FEJL: forventede 32 tegn md5 og derefter tab, fandt tab paa " + tab);
  console.error("foerste 200 tegn: " + JSON.stringify(raa.slice(0, 200)));
  process.exit(1);
}

const md5FraDb = raa.slice(0, 32);
// psql laegger et linjeskift til sidst. Listen selv slutter uden.
const liste = raa.slice(33).replace(/\n$/, "");
const md5AfListe = crypto.createHash("md5").update(liste, "utf8").digest("hex");

if (md5AfListe !== md5FraDb) {
  console.error("FEJL: databasens md5 (" + md5FraDb + ") er ikke md5 af den liste, der blev laest (" + md5AfListe + ")");
  console.error("Det betyder, at svaret er blevet klippet eller omkodet paa vejen.");
  process.exit(1);
}

fs.writeFileSync(listeSti, liste + "\n", "utf8");

const linjer = liste.split("\n").length;
console.log("md5    : " + md5FraDb);
console.log("linjer : " + linjer);
console.log("fil    : " + listeSti);

if (forventet) {
  const holder = md5FraDb === forventet;
  console.log("forventet: " + forventet);
  console.log("BEVIS  : " + (holder ? "HOLDER" : "FEJLER"));
  if (!holder) process.exit(1);
}
