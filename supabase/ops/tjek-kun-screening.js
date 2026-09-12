// Kan fase2-prod.sql roere noget uden for screening-skemaet?
//
// Produktionen deles med nemscreening.dk: `public` er websitets leads,
// bookinger, indlaeg og rammeaftaler. Scriptet maa roere `screening` og
// migrationstabellen, og INTET andet. Det er ikke nok at mene det — her taelles
// hver skemakvalificeret reference i filen.
const fs = require("fs");
const path = require("path");

const sti = path.join(__dirname, "fase2-prod.sql");
const raa = fs.readFileSync(sti, "utf8");

// Kommentarer ud foerst. Ellers taeller ordet «public» i en forklaring med.
const sql = raa
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

const TILLADT = new Set(["screening", "supabase_migrations", "extensions", "pg_catalog", "information_schema"]);

// De skemaer, der FINDES i dette Supabase-projekt. Alt andet foran et punktum er
// et tabelalias (`t.id`, `bp.name`) og ikke et skema — derfor kan man ikke bare
// taelle alt paa formen `x.y`. Foerste udgave af dette script gjorde det og
// meldte `t`, `p`, `bp`, `f`, `s` og `m` som fejl.
const SKEMAER = new Set([
  "public", "screening", "auth", "storage", "extensions", "graphql", "graphql_public",
  "realtime", "supabase_migrations", "supabase_functions", "vault", "pgbouncer", "cron",
  "net", "information_schema", "pg_catalog", "pg_toast",
]);

// Alt paa formen <skema>.<noget>
const fundet = {};
const aliasser = new Set();
for (const m of sql.matchAll(/\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)/gi)) {
  const praefiks = m[1].toLowerCase();
  if (SKEMAER.has(praefiks)) fundet[praefiks] = (fundet[praefiks] || 0) + 1;
  else aliasser.add(praefiks);
}

console.log("Skemaer, fase2-prod.sql naevner:");
let fejl = 0;
for (const [skema, antal] of Object.entries(fundet).sort((a, b) => b[1] - a[1])) {
  const ok = TILLADT.has(skema);
  console.log("  " + (ok ? "ok   " : "FEJL ") + skema.padEnd(22) + antal + " reference(r)");
  if (!ok) fejl++;
}
console.log("  (tabelaliasser, ikke skemaer: " + [...aliasser].sort().join(", ") + ")");

// Og de ord, der ville vaere alarmerende uanset form.
console.log("");
console.log("Ord der ikke maa staa der:");
for (const ord of ["public.", "auth.", "storage.", "graphql_public", "leads", "bookings", "agreement", "framework"]) {
  const antal = (sql.toLowerCase().match(new RegExp(ord.toLowerCase().replace(".", "\\."), "g")) || []).length;
  const ok = antal === 0;
  console.log("  " + (ok ? "ok   " : "FEJL ") + ord.padEnd(22) + antal);
  if (!ok) fejl++;
}

console.log("");
console.log(fejl === 0
  ? "HOLDER — scriptet kan kun roere screening og migrationstabellen"
  : "FEJLER — " + fejl + " reference(r) uden for screening");
process.exit(fejl === 0 ? 0 : 1);
