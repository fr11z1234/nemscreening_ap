const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dir = path.join(__dirname, "..", "migrations");
const NI = [
  "20260824161500_selektiv_ressourcescreening.sql",
  "20260824193000_bygningsoversigt.sql",
  "20260825120000_materialepanel.sql",
  "20260825120500_saetninger_fra_skabelonen.sql",
  "20260825124500_uden_gennemset_flag.sql",
  "20260828104500_forureningshaandtering.sql",
  "20260904120000_bortskaffelsestekster.sql",
  "20260909120000_faelles_bortskaffelsestekst.sql",
  "20260910120000_farligt_affald_egen_tekst.sql",
];
const ud = ["begin;", "set local lock_timeout = '5s';", "set local statement_timeout = '60s';", ""];
const md5 = [];
for (const f of NI) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  if (sql.includes("\r")) throw new Error(f + " har CRLF — md5 kan ikke sammenlignes");
  if (sql.includes("$fil$")) throw new Error(f + " indeholder $fil$ — vaelg et andet tag");
  const version = f.slice(0, 14);
  const name = f.slice(15).replace(/\.sql$/, "");
  md5.push(crypto.createHash("md5").update(sql).digest("hex") + "  " + f);
  ud.push(
    "-- ===================== " + f + " =====================",
    sql.trimEnd(),
    "",
    "insert into supabase_migrations.schema_migrations (version, name, statements)",
    "values ('" + version + "', '" + name + "', array[$fil$" + sql + "$fil$]);",
    "",
  );
}
ud.push("notify pgrst, 'reload schema';", "commit;", "");
fs.writeFileSync(path.join(__dirname, "fase2-prod.sql"), ud.join("\n"), "utf8");
fs.writeFileSync(path.join(__dirname, "fase2-prod.md5"), md5.join("\n") + "\n", "utf8");
console.log("skrev fase2-prod.sql og fase2-prod.md5 for " + NI.length + " filer");
