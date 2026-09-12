// Beviset for `fase2-prod.sql` (Fase 1): md5 af hver indlejret fil = md5 af
// filen i supabase/migrations/.
//
// Der er TO indlejringer af hver fil i scriptet, og de skal begge holde:
//
//   1. SQL'en, der koeres. Den er skrevet med `trimEnd()`, saa den er filen
//      uden afsluttende linjeskift — Postgres er ligeglad, og det er den
//      version, skemaet bygges af.
//   2. `statements[1]`, der registreres i historikken mellem $fil$-maerkerne.
//      Den er filen BYTE FOR BYTE. Det er den, 4.5 holder op mod
//      fase2-prod.md5, saa det er den, der skal vaere praecis.
//
// Scriptet regner ogsaa efter, at der ikke er sluppet noget med ind mellem
// blokkene, og at transaktionen aabner og lukker.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const opsDir = __dirname;
const migDir = path.join(opsDir, "..", "migrations");
const script = fs.readFileSync(path.join(opsDir, "fase2-prod.sql"), "utf8");
const md5Fil = fs.readFileSync(path.join(opsDir, "fase2-prod.md5"), "utf8").trimEnd().split("\n");

const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");

let fejl = 0;
const sig = (ok, tekst) => { console.log((ok ? "  ok   " : "  FEJL ") + tekst); if (!ok) fejl++; };

// --- Rammen om det hele ------------------------------------------------------
console.log("Transaktion og opsaetning");
sig(script.startsWith("begin;\n"), "begynder med begin;");
sig(script.includes("\nset local lock_timeout = '5s';\n"), "lock_timeout = 5s");
sig(script.includes("\nset local statement_timeout = '60s';\n"), "statement_timeout = 60s");
sig(script.includes("\nnotify pgrst, 'reload schema';\ncommit;\n"), "slutter med notify + commit;");
sig(!/^\s*(commit|rollback)\s*;/im.test(script.replace(/\ncommit;\n$/, "\n")), "ingen commit undervejs");
sig(!script.includes("\r"), "ingen CRLF i scriptet");
console.log("");

// --- De ni filer -------------------------------------------------------------
// $fil$-blokkene i den raekkefoelge de staar.
const blokke = [...script.matchAll(/array\[\$fil\$([\s\S]*?)\$fil\$\]/g)].map((m) => m[1]);
console.log("Indlejrede filer: " + blokke.length + " $fil$-blokke, " + md5Fil.length + " linjer i fase2-prod.md5");
console.log("");

if (blokke.length !== 9 || md5Fil.length !== 9) {
  console.log("  FEJL forventede 9 og 9");
  fejl++;
}

for (const linje of md5Fil) {
  const [forventet, navn] = linje.split(/\s+/);
  const paaDisk = fs.readFileSync(path.join(migDir, navn), "utf8");
  const md5Disk = md5(paaDisk);
  const version = navn.slice(0, 14);
  const name = navn.slice(15).replace(/\.sql$/, "");

  console.log(navn);
  sig(md5Disk === forventet, "fase2-prod.md5 = filen paa disk (" + md5Disk + ")");

  // Blokken, der registreres i historikken, skal vaere filen byte for byte.
  const blok = blokke.find((b) => md5(b) === md5Disk);
  sig(Boolean(blok), "statements[1] er filen byte for byte");

  // Historikraekken skal have filens eget versionsnummer og navn.
  const raekke = "values ('" + version + "', '" + name + "', array[$fil$";
  sig(script.includes(raekke), "registreres som version " + version + " / " + name);

  // Selve SQL'en skal ogsaa staa der, som trimEnd() giver den.
  sig(script.includes("-- ===================== " + navn + " ====================="), "har sin overskrift");
  sig(script.includes(paaDisk.trimEnd()), "SQL'en, der koeres, staar uaendret");
  console.log("");
}

// --- Intet ekstra ------------------------------------------------------------
// Alt i scriptet skal kunne gores rede for: rammen, de ni overskrifter, de ni
// SQL-kroppe og de ni insert-saetninger. Taeller vi dem, skal antallet passe.
console.log("Ingen fremmede saetninger");
const antalInsert = (script.match(/insert into supabase_migrations\.schema_migrations/g) || []).length;
sig(antalInsert === 9, "praecis 9 historik-inserts (fandt " + antalInsert + ")");
const antalOverskrift = (script.match(/^-- ={21} .+ ={21}$/gm) || []).length;
sig(antalOverskrift === 9, "praecis 9 overskrifter (fandt " + antalOverskrift + ")");
console.log("");

console.log(fejl === 0 ? "BEVIS: HOLDER — alle 9 filer er indlejret byte for byte" : "BEVIS: FEJLER — " + fejl + " punkt(er)");
process.exit(fejl === 0 ? 0 : 1);
