# Fase 2 → main: udrulningsplan

> **Status: klar til udførelse.** Afsnit 10 er besvaret. Intet i produktionen
> er rørt. Den udførende agent kører selv hele vejen under én tilladelse
> forud og stopper kun på et fejlet bevis. Hvert trin markeres her, når dets
> bevis holdt, og kun da.

Målet er ét: **alt, der er i produktionen i dag, bliver ved med at være der og
virke præcis som i dag** — mens appen får fase 2's funktioner, så der kan laves
selektive rapporter. Ingen fejl, ingen korrupte data, ingen nedetid.

---

## Til den agent, der udfører planen

Du har ikke den samtale, planen kom ud af. Alt, du behøver, står her og i de
tre filer, du læser først: `AGENTS.md`, `README.md` og `supabase/LAESMIG.md`.
Læs dem, før du gør noget.

### Hvad denne plan ændrer ved `AGENTS.md`

`AGENTS.md` siger «flet ikke `fase-2` til `main`» og «rør aldrig produktionen».
**Begge regler gælder stadig**, med én præcis undtagelse: trinnene i Fase 4 og
5 i denne plan, under den ene tilladelse mennesket giver forud, og kun så
længe hvert bevis før dem holdt. Planen er ikke en generel tilladelse til at
røre produktionen. Er du i tvivl, om et trin er dækket, er det ikke.

### Sådan er ansvaret fordelt

Mennesket, der giver dig opgaven, er ikke databaseudvikler og skal **ikke**
træffe beslutninger undervejs. Planen er skrevet, så du kan fuldføre den
alene: **beviserne er portene, ikke mennesket.** Du får én tilladelse forud —
til hele forløbet, Fase 0 til 6, produktionen inklusive — og den gælder
præcis så længe, hvert bevis holder. Det øjeblik et bevis ikke holder, er
tilladelsen brugt op: du stopper, rapporterer, og intet sker, før mennesket
er tilbage. Du spørger ikke «må jeg fortsætte?» undervejs; svaret står i
beviset.

Det, mennesket skal levere — én gang, i starten, uden at tage stilling til
noget:

| Hvad | Hvorfor du ikke kan skaffe det selv | Hvornår |
| --- | --- | --- |
| **`PGURL_PROD`** — produktionens forbindelsesstreng, *Session pooler* (dashboard → Connect) | Backup (4.2) og datakopien (2.1) kræver `pg_dump`, og MCP kan ikke dumpe. | Før Fase 2. |
| **`PGURL_BRANCH`** — branchens forbindelsesstreng, *Session pooler* | Kopien læses ind med `psql` (2.3). | Før Fase 2. |
| **Ét login til produktionen** — e-mail og kodeord til en `office`/`admin`-bruger (menneskets egen, eller en testbruger oprettet på `/brugere`) | Røgtesterne 4.6 og 5.3 kræver, at *du* klikker appen igennem på produktionen. | Før Fase 4. |

Bed om alle tre samlet, som det første efter du har læst planen, og bed om
dem præcis én gang. De gives i din session som miljøvariabler og skrives
**aldrig** i en fil i repoet.

Alt andet gør du selv: storage ryddes med SQL (12.6), browsertestene kører du
selv (se «Browseren» nedenfor), og Vercel behøver ingen indstilling — 5.1 er
et tjek, 5.3 er beviset.

### Regler, der ikke kan forhandles

| Regel | Hvorfor |
| --- | --- |
| **Produktionen (`mwityvqavrqxqaunvtdg`) røres kun i Fase 4 og 5, kun med planens scripts, og kun så længe hvert foregående bevis holdt.** Fase 2.1 er den ene læsning før det (`pg_dump`), og 4.1 er læsninger. | Produktionen er rigtige forretningsdata. Tilladelsen er givet forud og betinget — ikke pr. trin, men pr. bevis. |
| **Du kører selv** — `psql` i `postgres:17`-containeren med `$PGURL_PROD`/`$PGURL_BRANCH`, eller MCP `execute_sql`. **Aldrig** MCP `apply_migration` mod produktionen. | Samme værktøj i generalprøven og i produktionen. |
| **Kun scripts fra `supabase/ops/`, bygget som planen siger.** Ingen improviseret SQL mod produktionen, ingen «lige en hurtig rettelse». | Det, der er øvet, er det, der køres. |
| **Aldrig** `supabase db push`, `db reset --linked`, `migration repair` eller Supabases «merge branch». | De rammer websitets migrationshistorik eller kører migrationer mod produktionen uden om planen. |
| **Aldrig** MCP `apply_migration` mod produktionen. | Den stempler sit eget versionsnummer, og historikken skal have filernes. |
| **Aldrig** `seed.sql` mod andet end branchen, og kun brugerafsnittet (linje 40–99). | Resten af filen opretter en selektiv testsag. |
| **Aldrig** `.env.local.prod` → `.env.local`. | `next dev` skal aldrig tale med produktionen. |
| **Fejler et bevis, stopper du.** Du retter ikke fremad, du gætter ikke på årsagen, du kører ikke næste trin, og du spørger ikke om lov til at fortsætte. Du rapporterer, hvad der stod, og venter på mennesket. | Et bevis, der fejler, er ny viden. Planen skal rettes af nogen, der kan læse svaret, før den udføres videre. |
| **Du træffer ingen beslutninger, planen ikke allerede har truffet.** Svarene i afsnit 10 er givet; står et af dem alligevel tomt, bruger du anbefalingen i samme række. Møder du et valg, planen ikke dækker, og som ikke kan afgøres af et bevis, er det et stop — ikke et gæt. | Mennesket har bedt om ikke at blive spurgt. Det betyder ikke, at du må gætte; det betyder, at planen skal dække det, og gør den ikke, er det planen, der skal rettes. |
| **Rapporten er ikke valgfri.** Efter hvert trin, med tal. Mennesket læser den ikke undervejs, men den er det eneste spor, der findes, hvis noget skal forstås bagefter. | Se «Sådan rapporterer du». |

### Browseren

Accept-listen (9A) kræver, at appen klikkes igennem — i 2.7, 3.6, 4.6 og 5.3.
**Det gør du selv.** Har du et browserværktøj (Claude i Chrome, `run`-skillen,
Playwright MCP), bruger du det. Har du ikke, scripter du det med Playwright
(`npx playwright install chromium`, headless) mod `next dev` lokalt,
previewet og produktionen: log ind, sagslisten, åbn sag, åbn prøve, gem,
eksportér Eurofins (download → md5), print rapport (`page.pdf()`), og tæl
skemaets kolonner i PDF'en. Screenshots gemmes i `supabase/ops/skaerm/` som
bilag til rapporten.

Kun hvis ingen af delene kan lade sig gøre, skriver du en nummereret
klikke-liste til mennesket for præcis de punkter, du ikke kunne nå, og
stopper der. Det er det ene sted, mennesket kan blive bedt om at gøre noget
ud over at levere de tre nøgler — og det skal siges tydeligt, hvad der skal
ses, og hvad der er rigtigt at se.

**På produktionen** (4.6, 5.3) logger du ind med det login, mennesket har
givet. En selektiv testsag oprettet i 5.3 er rigtig data i produktionen:
**den slettes igen i 6.5**, gennem appens egen sletning, så storage følger
med. Var loginet en testbruger oprettet til formålet, lukkes den i 6.5.

### Fælder på denne maskine

- Bash-værktøjet er **Git Bash**. `python` findes ikke — brug `node` til
  scripts. `psql` og `pg_dump` findes **kun i containeren** (`docker run --rm
  postgres:17 …`), ikke på Windows. Ser din shell ikke `docker`, er den ældre
  end installationen: sæt `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`
  forrest i `PATH` i kaldet — ellers fejler også credential-hjælperen med
  «docker-credential-desktop not found».
- **Heredocs æder dobbelte backslashes**: `"\\b"` i en heredoc ender som `"\b"`
  i filen. Skriv scripts, der ikke bruger backslash, eller skriv dem med
  Write-værktøjet. Det kostede en hel fejlsøgning under planlægningen.
- MSYS konverterer argumenter, der ligner stier. Send SQL i filer, ikke som
  argumenter.
- `PGCLIENTENCODING=UTF8` **hver gang** `psql` kaldes. Uden den er `æøå` vrøvl.

### Værktøjer og id'er

| Hvad | Værdi |
| --- | --- |
| Produktion (Supabase-projekt) | `mwityvqavrqxqaunvtdg` — **rør ikke uden go** |
| Branch (Supabase, TEST) | `ezylaouiajlpxhrplqln` — den kører alt i Fase 0–3 mod |
| MCP-værktøjer, der bruges | `execute_sql`, `list_migrations`, `reset_branch`, `delete_branch`, `create_branch` (kræver `confirm_cost` først), `list_branches` |
| Git | `origin/main` = `f6a4870`, `fase-2` = `bd936cf` ved planens start. Er de flyttet, stop og spørg. |

### Sådan rapporterer du

Efter hvert trin: trinnets nummer, kommandoen ordret, svaret ordret (tal,
md5'er, fejltekst), og om beviset holdt. Efter hver fase: en linje pr. trin
med ✓ eller ✗. Ingen sammenfatninger i stedet for tal. Marker trinnet med
`[x]` i denne fil, når beviset holdt — og kun da.

---

## 1. Ordbog — to ting hedder «main», to ting hedder «fase-2»

Det er let at tale forbi hinanden her, så tabellen er reglen:

| Git-gren | Vercel | Supabase | Hvad der er i den | Skæbne |
| --- | --- | --- | --- | --- |
| `main` | **Production** | projekt `mwityvqavrqxqaunvtdg` | **Rigtige sager, rigtige billeder, rigtige labsvar.** Delt med nemscreening.dk (`public`). | **Bliver stående.** Røres kun af de ni migrationer, der *tilføjer*. |
| `fase-2` | Preview | branch `ezylaouiajlpxhrplqln` | **Testsager.** 8 sager, 62 prøver, 114 billeder, 30 labsvar, testlogins. | **Wipes i Fase 0** og igen i Fase 4.0. Er generalprøven. Slettes til sidst. |

```mermaid
flowchart LR
  subgraph TEST["TEST — Supabase-branchen fase-2"]
    B[(branch-database)]
  end
  subgraph GIT["Git"]
    F2[fase-2-grenen<br/>kode + 9 migrationsfiler]
    M[main-grenen]
  end
  subgraph PROD["PRODUKTION — projekt mwityvqavrqxqaunvtdg"]
    P[(produktionsdatabasen<br/>rigtige sager)]
    V[Vercel Production]
  end
  B -. "INTET rejser herfra" .-> P
  P -. "én LÆSNING til generalprøven<br/>(pg_dump, spørgsmål 2)" .-> B
  F2 -- "fast-forward" --> M
  M -- "Vercel bygger" --> V
  F2 -- "de 9 migrationsFILER<br/>som SQL, én transaktion" --> P
  style B fill:#fde8e8,stroke:#c00
  style P fill:#e6f4ea,stroke:#080
```

**Det eneste, der rejser fra fase 2 til produktionen, er kode og
migrationsfiler fra git.** Databasen på branchen er et testmiljø og bidrager
med ingenting — heller ikke ved et uheld, for den er tom, når migrationen
laves.

---

## 2. Grundlaget — det, der er konstateret

Intet af det her er antaget. Alt er læst ud af repoet, af branchen og af
udviklermaskinen; produktionen er ikke rørt.

### Koden

- `origin/main` (`f6a4870`) og `fase-2` (`bd936cf`) skilles ved `05f581c`.
- `main` har **ét** commit, `fase-2` mangler: brugeradministrationen
  (`/brugere`, `/kodeord`, `src/lib/supabase/admin.ts`, `SUPABASE_SECRET_KEY`).
- `fase-2` har **19** commits, `main` mangler.
- En prøvefletning i et isoleret worktree gav **én konflikt**: `main` retter
  `src/components/AppHeader.tsx`, som `fase-2` har slettet til fordel for
  `Skal`/`SkalRamme`. `src/lib/types.ts` fletter selv, rent.
- Ingen ændringer i `package.json`. Ingen nye miljøvariabler. Ingen
  storage-ændringer. Ingen realtime. Ingen genererede databasetyper.
- **Alle 35 `select("…")`-strenge i koden er holdt op mod branchens skema:**
  hver kolonne findes. Koden refererer ikke til noget, filerne ikke skaber.

### Databasen

- Produktionens migrationshistorik indeholder **websitets 24 migrationer foran
  screening-appens 11**. Derfor er `supabase db push` udelukket: den ville
  kræve en «repair» af websitets historik. **Migrationerne lægges på med SQL og
  registreres i hånden med filernes egne versionsnumre.**
- De ni fase-2-migrationer blev lagt på branchen med MCP-værktøjet, som gav dem
  *sine egne* versionsnumre (`20260824171828` for filen `20260824161500_…`).
  Branchens historik er ikke sandheden — **filerne er**.
- **Branchens skema er filernes skema — bevist med md5.** Skemalisten (12.1)
  giver `0eae9171f6330081f8eeeef71032e849` både på den lokale stak, bygget af de 20 filer,
  og på branchen: 289 identiske linjer ned til politikkernes betingelser,
  funktionernes kroppe, defaults, grants og RLS-flag. Ingen drift.
- **Migrationen er rent additiv — bevist med diff.** Den lokale stak nulstillet
  til produktionens version (`db reset --version 20260804111609`) giver
  `982a253bed9339988695b362769c67d3`, 251 linjer. Forskellen op til fase 2 er **38 linjer
  tilføjet, 0 fjernet.** Begge lister ligger i `supabase/ops/` som
  `skema-basis.txt` og `skema-fase2.txt`.
- **De ni migrationer er rent additive.** Se bilaget i afsnit 11. Nullable
  kolonner, én `not null default` (metadata-only i Postgres 11+, ingen
  omskrivning af tabellen), én ny tabel med RLS, to enum-typer (én oprettes og
  droppes igen undervejs), én indstillingsrække. **Ingen kolonne, `main`-koden
  bruger, ændres, omdøbes eller droppes.**
- Én migration har en spærre: `saetninger_fra_skabelonen` afbryder, hvis ikke
  præcis 12 materialenavne rammer. Det er en beskyttelse — og grunden til, at
  navnene tjekkes *før*.
- Postgres **17.6**. Tabellerne ejes af `postgres`. `pgrst_ddl_watch` findes, så
  PostgREST genindlæser skemaet selv efter DDL. Migrationsfilerne har LF-
  linjeskift (`.gitattributes` tvinger det), så md5 kan sammenlignes.

### Offline-køen på telefonerne

- `src/lib/offline/store.ts` normaliserer gamle rækker: nye felter bliver
  `null`. En kø skrevet af gammel kode kan synkes af ny kode.
- Men `src/lib/offline/sync.ts` **sender** de tre nye kolonner. Ny kode mod
  gammelt skema fejler med «column does not exist». Gammel kode mod nyt skema
  fejler ikke — den sender bare ikke kolonnerne, og de er nullable.
- Derfor: **databasen først, koden bagefter.** Ufravigeligt.

### Udviklermaskinen

- **Docker Desktop er installeret** (12. september 2026, sammen med WSL2) —
  klient og motor 29.7.2. `postgres:17`-imaget er hentet: `pg_dump` og `psql`
  17.11, og `Tæppe` kommer gennem Windows → container som ægte UTF-8. Der er
  ingen Windows-`psql`; alt kører i containeren, så P.1, P.3 og P.5 er opfyldt.
  Docker ligger i `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` og
  på brugerens PATH — **en shell, der er startet før installationen, ser den
  ikke** og skal have stien sat forrest i `PATH`.
- Generalprøven ligger alligevel på Supabase-branchen (afsnit 5): den bygges af
  produktionens egen migrationshistorik, og det gør den lokale stak ikke.
  Den lokale stak bruges til 3.8.
- `.env.local` peger på branchen (`ezylaouiajlpxhrplqln`). Der findes også en
  `.env.local.prod`. **Den kopieres ikke til `.env.local` på noget tidspunkt i
  denne plan** — produktionen testes gennem Vercel, ikke gennem `next dev`.
- Node 24, npm 11, Supabase CLI 2.117. **Den lokale stak kører** og står på
  produktionens version (`db reset --version 20260804111609 --no-seed`) —
  11 migrationer, ingen data. `npx supabase db reset` bringer den til fase 2
  med seed.

### Indhold på branchen, der ikke er sager

Kontoret har arbejdet i materialepanelet på branchen: tekster på **53 af 55**
materialer, **to omdøbt** (`Gasbeton` → `Gasbeton/porebeton`, `Isolering` →
`Mineraluld`), **to lukket** (`Pore beton`, `Støbeasfalt`) og de **fire fælles
bortskaffelsestekster** i `app_settings`. Bygningsdele og prøvearter er
urørte. Det er spørgsmål 1 i afsnit 10: gemmes det til en fil før wipen, eller
går det med i wipen?

---

## 3. Principper

| # | Princip | Hvorfor |
| --- | --- | --- |
| 1 | **Expand only.** | Intet skal droppes bagefter. Ingen contract-fase, ingen anden udrulning. |
| 2 | **Databasen før koden.** | Gammel kode tåler nyt skema; ny kode tåler ikke gammelt. Se offline-køen. |
| 3 | **Én transaktion for alle ni på produktionen.** | Alt eller intet. Fejler nr. 7, er 1–6 rullet tilbage, og der er intet at rydde op. Ingen af filerne indeholder noget ikke-transaktionelt. |
| 4 | **Det, der er øvet, er det, der køres.** | Samme script, samme værktøj, mod en kopi af produktionens data på branchen — og derefter mod produktionen uændret. |
| 5 | **Produktionen røres kun under én tilladelse forud, og kun så længe hvert bevis holder.** | Mennesket giver tilladelsen én gang og bedømmer intet undervejs; beviserne er portene. Hvert trin er ét script, der ligger færdigt. Ingen improvisation mod prod. |
| 6 | **Det, der går live, er den commit, der er testet.** | `main` fast-forwardes til `fase-2`. Ingen fletnings-commit på `main`, der aldrig har været bygget. |
| 7 | **Testmiljøet bidrager med ingenting.** | Branchen wipes før alt andet og igen lige før produktionen. Selv et uheld kan ikke flytte testdata til produktionen. |
| 8 | **Alt sammenlignes med tal, ikke med øjne.** | Rækketal, md5 af gamle kolonner og en normaliseret skemaliste — før og efter, branch og produktion. Browseren kommer bagefter. |

---

## 4. Forudsætninger — skal være på plads, før Fase 0 begynder

| # | Forudsætning | Hvordan | Bevis |
| --- | --- | --- | --- |
| P.1 | **`psql` og `pg_dump` i version 17** — enten gennem Docker (P.5, anbefalet) eller installeret direkte | **Med Docker:** intet at installere; kommandoerne køres som `docker run --rm -i -e PGCLIENTENCODING=UTF8 -v "$PWD:/w" -w /w postgres:17 psql "$PGURL" …` — Linux-`psql`, så P.3 er løst af sig selv. **Uden Docker:** `winget install PostgreSQL.PostgreSQL.17`, vælg kun *Command Line Tools*. Version 17, fordi serveren er 17.6 og `pg_dump` skal være mindst serverens version. | `pg_dump --version` svarer 17.x |
| P.2 | **Forbindelsesstrenge** til branchen og til produktionen | Dashboard → *Connect* → **Session pooler** (port 5432, bruger `postgres.<ref>`). Ikke *Direct* — den er IPv6-only og virker ikke på de fleste hjemmenetværk. Ikke *Transaction pooler* — den kan ikke `set local`. Strengene lægges i miljøvariabler (`PGURL_BRANCH`, `PGURL_PROD`) i den åbne terminal, **aldrig i en fil i repoet**. | `psql "$PGURL_BRANCH" -c "select 1"` svarer. Produktionens streng afprøves først i Fase 4. |
| P.3 | **`PGCLIENTENCODING=UTF8`** i enhver terminal, der kører `psql` | Windows-`psql` bruger ellers konsollens kodetabel, og `'Bærende konstruktioner'` bliver til vrøvl i databasen. Spærren i `saetninger_fra_skabelonen` ville fange det (`Tæppe` rammer ikke), men vi stoler ikke på held. | `psql … -c "select 'æøå'"` skriver `æøå` tilbage. |
| P.4 | **Supabase MCP** som reserveværktøj til SQL mod branch og produktion | Findes allerede. Kan køre scripts og verifikationer, men **ikke** `pg_dump` — derfor er P.1 ikke valgfri. | — |
| P.5 | **Docker Desktop** (anbefalet — den anden udviklermaskine har den allerede) | Giver `psql`/`pg_dump` i en container (P.1), fjerner UTF-8-fælden (P.3), giver den lokale stak fra `AGENTS.md` tilbage og gør trin 3.8 muligt. Windows 11 Pro; WSL2-backend. | `docker run --rm postgres:17 pg_dump --version` svarer 17.x. `npx supabase start` virker. |

- [x] P.1 — `pg_dump`/`psql` 17.11 i `postgres:17`-containeren (12. sep. 2026)
- [x] P.2 — **opfyldt for branchen** (12. sep. 2026):
  `psql -At -c "select 1, current_database(), current_user, server_version, client_encoding"`
  svarer `1|postgres|postgres|17.6|UTF8`. UTF-8 bevist samme vej:
  `æøå|Bærende konstruktioner|Tæppe|Kviksølv (Hg)`. Produktionens streng
  afprøves først i 2.1, som planen siger.

  **Forbindelsen gives som `PG*`-variabler, ikke som en URI.** PowerShell —
  som er skallen her, ikke Git Bash — åd citationstegnene om
  `sh -c "psql $URL"`, og kommandoen forsvandt uden en fejl: exit 0 og intet
  svar. Det så ud som om kodeordet var galt, og det var det ikke.
  `psql` og `pg_dump` læser selv `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` og
  `PGDATABASE`, så der er ingen streng at citere og intet at procent-kode — og
  kodeordet står ikke i procestabellen. Opsætningen ligger i
  `ops-scratch/Forbind.ps1` (uden for repoet, ingen hemmeligheder i den).

  **Værtsnavnet er pr. PROJEKT, ikke pr. region.** Det kostede tid at finde ud
  af, og det er ikke til at gætte:

  | | Vært | Port |
  | --- | --- | --- |
  | Branchen `ezylaouiajlpxhrplqln` | `aws-0-eu-north-1.pooler.supabase.com` | 5432 |
  | Produktionen `mwityvqavrqxqaunvtdg` | **`aws-1`**`-eu-north-1.pooler.supabase.com` | 5432 |

  Begge er i `eu-north-1` (`list_projects`), og alligevel svarer den forkerte
  vært `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` — altså før
  kodeordet overhovedet prøves. Det er sådan, den rigtige vært findes: den
  forkerte kender ikke tenant'en, den rigtige beder om kodeordet. Produktionen er
  ældre (28. maj) end branchen (24. aug.) og er landet på en anden
  pooler-klynge.

  Produktionens streng er afprøvet i 2.1 som planen siger, og svarer
  `1|postgres|17.6`.

- [ ] ~~P.2~~ — historik: hvad der gik galt før det virkede. Værten var fundet:
  `aws-0-eu-north-1.pooler.supabase.com`, port 5432, Session pooler. Projektets
  region er `eu-north-1` (`list_projects`), og af de to kandidater kendte kun
  `aws-0` tenant'en — `aws-1` svarede `ENOTFOUND tenant/user
  postgres.ezylaouiajlpxhrplqln`. Men `select 1` mod branchen svarer
  `FATAL: password authentication failed for user "postgres"`: tenant'en findes,
  **kodeordet holder ikke.** Databasekodeordet er ikke det samme som
  Supabase-kontoens eller appens login. Produktionens streng afprøves først i
  2.1 (`pg_dump`, ren læsning), som planen siger.

  **Agenten kan ikke skaffe kodeordet selv.** Prøvet, og det er en blindgyde
  værd at kende: MCP forbinder til branchen som `postgres`, men på Supabase er
  `postgres` **ikke superbruger** og må ikke ændre sin egen adgangskode —
  `alter user postgres with password …` svarer `42501: permission denied to
  alter role, DETAIL: Only superusers can alter privileged roles.` Der findes
  heller ingen MCP-værktøj til kodeord. Begge databasekodeord skal derfor komme
  fra dashboardet (Project Settings → Database → *Reset database password*), og
  det gælder også en ny branch oprettet i 0.4. Tabellen i «Sådan er ansvaret
  fordelt» burde sige det: nøglen er ikke bare en streng, den er et kodeord,
  der kun findes i dashboardet.

  **Og «Database» står ikke i menuen, når man er på en branch.** Dashboardet
  skriver «Certain settings are not available while you're on a preview branch»
  og skjuler punktet. Siden findes alligevel — den hører til branchens **eget**
  projekt-ref, ikke forælderens:
  `…/dashboard/project/ezylaouiajlpxhrplqln/database/settings`. Skriv adressen
  direkte. Supabase viser i øvrigt **aldrig** et eksisterende databasekodeord:
  Connect-dialogen skriver `[YOUR-PASSWORD]`, så kender man det ikke, er
  nulstilling den eneste vej. `create_branch` giver heller intet kodeord
  tilbage, så 0.4 løser det ikke.
- [x] P.3 — UTF-8 bevist gennem containeren (12. sep. 2026)
- [x] P.4 — MCP svarer: `execute_sql`, `list_migrations`, `reset_branch`, `create_branch`, `delete_branch`, `confirm_cost`, `list_branches`, `query_logs` (12. sep. 2026)
- [x] P.5 — stakken bygger alle 20 migrationer rent; `db reset --version` virker (12. sep. 2026)

**Branchens id (til `reset_branch`).** Planen skriver `reset_branch(ezylaouiajlpxhrplqln, …)`
med projekt-ref'en som stedfortræder. MCP'en vil have branchens *id*:
`6784528e-cab3-41e8-8671-6199e9f6213d` (navn `fase-2`, ref `ezylaouiajlpxhrplqln`,
forælder `mwityvqavrqxqaunvtdg`). Den anden branch i registret, `main`, **er**
produktionen (`is_default`) og må ikke nulstilles eller slettes.

**Skemalisten genfremstillet.** `skemaliste.sql` mod den lokale stak giver
`982a253bed9339988695b362769c67d3`, 251 linjer, og filen er **byte-identisk**
med `skema-basis.txt`. `diff skema-basis.txt skema-fase2.txt` giver 38 linjer
tilføjet, 0 fjernet. Værktøjskæden rammer altså planens egne tal, før
produktionen er rørt.

---

## 5. Forløbet

```mermaid
flowchart TD
  F0["Fase 0<br/>Wipe: branchen nulstilles til produktionens skema"]
  F1["Fase 1<br/>Scripts bygges mekanisk af filerne"]
  F2["Fase 2<br/>Generalprøve på branchen:<br/>kopi af prod-data → migration → gammel kode"]
  F3["Fase 3<br/>Koden: main flettes ind i fase-2,<br/>ny kode testes mod branchen, rollback øves"]
  F4["Fase 4<br/>PRODUKTION: wipe branchen igen, databasen (én transaktion)"]
  F5["Fase 5<br/>PRODUKTION: koden (fast-forward)"]
  F6["Fase 6<br/>Efter: overvågning, oprydning, dokumentation"]
  F0 --> F1 --> F2 --> F3 --> F4 --> F5 --> F6
  F2 -. "fejler noget: tilbage hertil,<br/>prod er ikke rørt" .-> F1
  F3 -. "fejler noget: tilbage hertil,<br/>prod er ikke rørt" .-> F1
  F4 -. "transaktionen fejler:<br/>intet er ændret" .-> F2
  F5 -. "koden fejler: Vercel-rollback,<br/>databasen bliver" .-> F4
  style F4 fill:#fff3cd,stroke:#b8860b
  style F5 fill:#fff3cd,stroke:#b8860b
```

Fase 0–3 rører ikke produktionen (Fase 2 *læser* den én gang, med `pg_dump`).
Fase 4 og 5 ændrer den, og kun de.

Rækkefølgen er ikke tilfældig: efter wipen står branchen på produktionens
skema, og den flettede kode kan først testes, når migrationen er kørt på
branchen — med produktionens data lagt ind *først*, så migrationen øves mod
rigtige rækker. Derfor kommer scripts og generalprøve før kodefletningen.

---

## 6. Trin for trin

Hvert trin har et **bevis**: det, der skal være sandt bagefter. Er beviset ikke
der, går man ikke videre.

### Fase 0 — Wipe: branchen `fase-2` nulstilles til produktionens skema

Branchen er et testmiljø. Den nulstilles helt — data, skema *og* de ni
migrationer — til præcis den migrationsversion, produktionen står på. Så er
den både tom og den mest trofaste generalprøve, der findes: den bygges af den
samme historik, produktionen har.

| # | Trin | Hvordan | Bevis |
| --- | --- | --- | --- |
| 0.1 | Kontorets indhold (spørgsmål 1) | **Hvis ja:** materialetekster, omdøbninger, lukninger og de fire fælles tekster læses ud til `supabase/ops/branch-indhold-2026-09-12.sql` som `update … where name = …`, idempotent, med tælling til sidst. **Hvis nej:** intet — det går med i wipen. | Filen findes med 53 materialer + 4 indstillinger; eller «nej» står i afsnit 10. |
| 0.2 | Storage tømmes | `delete from storage.objects where bucket_id in ('screening-photos', 'screening-rapport')` på branchen (12.6). Filerne bag rækkerne bliver liggende som forældreløse blobs i et testprojekt — de kan ikke nås uden en objektrække, og branchen er ikke produktionen. Det er det bevidste valg frem for at bede mennesket om en storage-nøgle. | `count(*)` i de to buckets = 0. |
| 0.3 | **Nulstilling** | `reset_branch(ezylaouiajlpxhrplqln, migration_version = '20260804111609')` — den sidste af produktionens elleve. Alt efter den forsvinder: de ni MCP-registrerede migrationer, alle sager, alle brugere. | Historikkens sidste version er `20260804111609`. `screening.cases` = 0. Ingen `report_type`, ingen `building_parts`. |
| 0.4 | Reserve, hvis 0.3 ikke kan gå *bagud* | Branchen slettes (`delete_branch`) og oprettes forfra (`create_branch`) — den bygges af produktionens migrationshistorik. Ny ref → `.env.local.branch` og Vercels Preview-variabler rettes, og previewet bygges igen (`NEXT_PUBLIC_*` bages ind). | Samme bevis som 0.3. |
| 0.5 | De to fælder fra `LAESMIG.md` | `alter role authenticator set pgrst.db_schemas = 'public, graphql_public, screening'; notify pgrst, 'reload config'; notify pgrst, 'reload schema';` — og de to testlogins fra `seed.sql`s brugerafsnit (linje 40–99, **kun** det afsnit; sagen i seed'en er en selektiv sag og hører ikke til på et produktionsskema). | En forespørgsel uden login svarer `42501`, ikke `PGRST106`. `kontor@fase2.test` og `screener@fase2.test` kan logge ind på previewet. |
| 0.6 | **Basislinjen bekræftes** | Skemalisten (12.1) køres på den nulstillede branch. `skema-basis.txt` findes allerede — fremstillet lokalt af de elleve filer — og branchen skal give det samme. Er den ikke det, bygger `reset_branch` ikke det, historikken siger, og det skal forstås, før produktionen sammenlignes med noget. | md5 = `982a253bed9339988695b362769c67d3`. |

- [x] 0.1 — `branch-indhold-2026-09-12.sql`: **53 materialer med tekst, 2 omdøbninger, 2 lukninger, 4 fælles tekster.** Bevis holdt.
- [x] 0.2 — `DELETE 118`. Begge screening-buckets på 0; websitets `blog-images` og `customer-files` urørte. Bevis holdt.
- [x] 0.3 — **11 screening-migrationer, sidste `20260804111609`.** `cases`, `samples`, `sample_photos`, `app_users`, `auth.users` alle 0. `cases.report_type` findes ikke, `building_parts` findes ikke. `materials` seedet forfra på 55 uden tekster. Bevis holdt.
- [x] 0.4 — **ikke nødvendig.** 0.3 kunne gå bagud. `reset_branch` tog ~45 s (`RUNNING_MIGRATIONS` → `FUNCTIONS_DEPLOYED`).
- [x] 0.5 — `pgrst.db_schemas=public, graphql_public, screening` (den **overlevede** nulstillingen; sat igen plus begge `notify`). En forespørgsel uden login svarer `{"code":"42501",…,"message":"permission denied for schema screening"}` med `Proxy-Status: PostgREST; error=42501` — **ikke** `PGRST106`. Begge testlogins får HTTP 200 med `access_token`. Bevis holdt.
- [x] 0.6 — **`982a253bed9339988695b362769c67d3`, 251 linjer, byte-identisk med `skema-basis.txt`.** Bevis holdt. `reset_branch` bygger altså præcis det, produktionens historik siger.

**Historikken bekræftede afsnit 2.** Branchens `schema_migrations` har
**websitets 24** migrationer (`20260528090719_platform` …
`20260708211542_bookings_grant_select`) **foran screening-appens 11**
(`20260725173107_screening_schema_init` … `20260804111609`). Det er præcis
grunden til, at `supabase db push` er udelukket.

**To ting at vide om 0.5's bevis, hvis nogen skal gøre det igen:**

`Invoke-WebRequest` i PowerShell **slugte fejlkroppen** og viste kun
`HTTP 401` med tom krop, hvilket lignede en ugyldig nøgle. `curl -i` viste det
rigtige svar. Brug `curl`.

Og **`Accept-Profile: screening` skal med.** Uden den svarer den samme
forespørgsel `200 []` med `content-profile: public` — den rammer **websitets**
`public.cases`, som findes i samme database. Det er ikke vores tabel, og et
grønt svar dér betyder ingenting.

### Fase 1 — Scripts: bygges mekanisk af filerne, ikke skrevet i hånden

Alle ligger i `supabase/ops/`, indeholder ingen hemmeligheder, og læses
igennem, før de køres nogen steder. De committes — de er dokumentationen af,
hvordan det blev gjort.

| Script | Indhold | Hvorfor sådan |
| --- | --- | --- |
| `fase2-prod.sql` | `begin;` `set local lock_timeout = '5s';` `set local statement_timeout = '60s';` → for hver af de ni filer: **filens indhold byte for byte** + `insert into supabase_migrations.schema_migrations (version, name, statements)` med **filens** versionsnummer og hele filen som `statements[1]` → `notify pgrst, 'reload schema';` `commit;` Ren SQL, ingen psql-kommandoer, så det samme script kan køres af `psql` og af MCP. | Byte for byte, så produktionen får præcis det, branchen fik. `lock_timeout` er ikke pynt: står en langsom forespørgsel og holder `samples`, skal vi fejle hurtigt og prøve igen — ikke stille alle andre i kø bag os. |
| `fase2-verify.sql` | Se afsnit 7. Én fil, to halvdele: «før» (tal og md5'er, der gemmes) og «efter» (de samme tal + de nye påstande). | Sammenligningen er mekanisk. Tallene gemmes som filer i `supabase/ops/`, så de kan læses bagefter. |
| `fase2-rollback.sql` | Drop i omvendt rækkefølge: `samples.building_part_id` før `building_parts`, kolonnerne før typerne, og de ni historikrækker til sidst. Én transaktion. | Ligger i skuffen. Øves i 3.7. Se afsnit 8 for, hvornår den *ikke* skal bruges. |
| `fase2-indhold.sql` | Kun hvis spørgsmål 1 er ja: kopi af `branch-indhold-2026-09-12.sql`. Nøglet på materialets *navn*; omdøbningerne står som `update … set name = 'Mineraluld' where name = 'Isolering'`. | Kontorets ord er data, ikke skema. Derfor et eget script og ikke en migrationsfil. |

- [x] `fase2-prod.sql` — md5 af hver indlejret fil = md5 af filen i `supabase/migrations/`
- [x] `fase2-verify.sql` — ligger som `fase2-verify-foer.sql` og `fase2-verify-efter.sql`
- [x] `fase2-rollback.sql` — skrevet ordret fra 12.5; beviset er 3.7
- [ ] `fase2-indhold.sql` (hvis ja) — laves i 0.1

**Fase 1 blev bygget før Fase 0.** Det er en afvigelse fra rækkefølgen og
skal siges: scriptene er rene filer, bygget mekanisk af de ni migrationsfiler i
git, og de rører hverken branchen eller produktionen. De blev lavet, mens P.2
ventede på et databasekodeord, i stedet for at stå stille. Intet andet i
rækkefølgen er rykket.

**«Én fil, to halvdele» ligger som to filer.** `psql` kan ikke bedes om at køre
halvdelen af en fil. Indholdet er planens, og de to halvdele stiller de samme
spørgsmål ordret — ellers kunne svarene ikke sammenlignes.

**De gamle kolonner er ikke skrevet af.** De er hentet ud af basislinjen selv
(`information_schema.columns` på den lokale stak, som står på
`20260804111609`), i tabellens egen rækkefølge. `materials` blev `id, name,
sort_order, active` — præcis som mønstret i 12.2 viser. For `samples` er det de
samme 20 kolonner som i 12.2, blot med `building_ids` på sin virkelige plads
til sidst; kun det, at listen er **den samme før og efter og begge steder**,
kan gøre md5'en til et bevis, og det er den.

**Generalprøve på den lokale stak, før noget delt blev rørt.** Hele kæden er
kørt igennem mod den lokale Docker-stak, der stod på produktionens version.
Ingen branch, ingen produktion:

| Hvad | Svar |
| --- | --- |
| `fase2-verify-foer.sql` | Kører. 55 materialer, 21 prøvearter, 1 indstilling — seed-migrationens egne tal. |
| `fase2-prod.sql` | **`COMMIT`.** 0,49 s inkl. containerstart. |
| Tallene undervejs | `UPDATE 0` præcis hvor afsnit 11 lover nul rækker · `UPDATE 12` på spærren i `saetninger_fra_skabelonen` · `INSERT 0 0` på `app_settings.sentence_farligt`, fordi `sentence_bortskaffelse` ikke findes. |
| Skemalisten bagefter | **`0eae9171f6330081f8eeeef71032e849`**, 289 linjer, **byte-identisk** med `skema-fase2.txt`. |
| Rækketal før → efter | Kun `app_settings` 1 → 2 og `building_parts` 0 → 8. Alt andet uændret. |
| md5 af gamle kolonner | **Alle elleve identiske.** |
| Historikken | Ni versioner, og de ni `md5(statements[1])` er linje for linje `fase2-prod.md5`. |
| De nye påstande | Alle som ventet. `materials` 1 `report_name`, 5 genbrug, 7 genanvendelse = 12. `Tæppe` har sin sætning. Otte bygningsdele i `sort_order`, `Bærende konstruktioner` iblandt — UTF-8 hele vejen. RLS til, to politikker, **ingen grant til `anon`**. `building_part`-enummet og `sentences_reviewed` er væk igen. |

Det er det tungeste bevis, der kunne skaffes uden at røre noget: **det script,
der skal køre på produktionen, laver filernes skema byte for byte.**

### Fase 2 — Generalprøve på branchen: produktionens data, migrationen, gammel kode

Branchen står på produktionens skema (Fase 0). Nu får den produktionens data,
og migrationen køres præcis, som den skal køres i Fase 4.

| # | Trin | Hvordan | Bevis |
| --- | --- | --- | --- |
| 2.1 | **Produktionen læses — én gang** (spørgsmål 2) | `pg_dump "$PGURL_PROD" --schema=screening --data-only --no-owner --no-privileges -f prod-data.sql`. **Ren læsning.** Filen ligger uden for repoet og slettes i 6.4. | Filen findes. `grep -c "^COPY"` = antal tabeller i `screening`. |
| 2.2 | Brugerne kan lande | `app_users` peger på `auth.users`, som ikke findes på branchen. For hvert id i dumpets `app_users` indsættes en stub i `auth.users` efter opskriften i `seed.sql` — tilfældigt kodeord, ingen kan logge ind som dem. | `select count(*) from auth.users` = 2 testlogins + antal prod-brugere. |
| 2.3 | Data ind | `psql "$PGURL_BRANCH" -v ON_ERROR_STOP=1 -f prod-data.sql`. Med fremmednøglerne **slået til** — fejler noget, er dumpet ikke konsistent, og det vil vi vide. Derefter `update screening.cases set case_name = '[TEST] ' || case_name`, så branchen aldrig kan forveksles med produktionen i en browser. Billederne følger ikke med (storage er ikke en del af dumpet); rapporter viser tomme billedfelter, og det er ventet. | Rækketal pr. tabel = dumpet. Alle sagsnavne begynder med `[TEST]`. |
| 2.4 | «Før»-tal | `fase2-verify.sql`, før-halvdelen → `supabase/ops/foer-branch.txt`. | Filen findes. |
| 2.5 | **Migrationen** | `psql "$PGURL_BRANCH" -v ON_ERROR_STOP=1 -f fase2-prod.sql`. Tiden tages. | `COMMIT`. Under ét sekund. |
| 2.6 | «Efter»-tal | `fase2-verify.sql`, efter-halvdelen → `supabase/ops/efter-branch.txt`. | Rækketal identiske med 2.4. Gamle kolonners md5 identiske. Skemalisten = `0eae9171f6330081f8eeeef71032e849`. Alle nye påstande i afsnit 7 sande. |
| 2.7 | **Gammel kode mod nyt skema** | `git worktree add ../main-gammel origin/main` → `npm ci` → `next dev` med `.env.local` (branchen). Sagsliste, åbn en `[TEST]`-sag, åbn en prøve, gem den, synk en ny prøve, Eurofins-eksport, print rapport. | Alt virker. **Det er beviset for, at Fase 4 ikke kan ramme nogen, mens den gamle kode stadig kører i produktionen.** Eurofins-filen gemmes til sammenligning i 3.6. |

> **2.3 har en fælde, planen ikke havde set: opslagstabellerne kolliderer.**
> `screening_seed_lookups` indsætter de 55 materialer og 21 prøvearter **uden
> id**, så `gen_random_uuid()` giver dem forskellige id'er i hvert miljø — men
> de samme navne. Branchen står efter Fase 0 med sine egne seedede rækker, og
> `pg_dump --data-only` tager produktionens med. De rammer `materials_name_key`,
> `sample_types_name_key` og `app_settings_pkey` og får 2.3 til at fejle på en
> dublet.
>
> Det er **ikke** tegnet på, at dumpet er inkonsistent, som 2.3 ellers siger —
> det er to miljøer, der har seedet den samme liste hver for sig. Derfor ryddes
> branchens tre opslagstabeller, lige før dumpet læses ind, så produktionens
> egne rækker lander uændret:
>
> ```sql
> delete from screening.app_settings;
> delete from screening.materials;
> delete from screening.sample_types;
> ```
>
> Det er efterprøvet, at det er farligt frit: **ingen fremmednøgle peger på nogen
> af de tre** (`grep 'REFERENCES screening.(materials|sample_types|app_settings)'
> i `skema-basis.txt` giver ingenting), og `samples.material` og
> `samples.sample_type` er ren tekst, ikke opslag. `building_parts` findes ikke
> endnu på dette tidspunkt.
>
> Og det er ikke bare for at komme videre: generalprøven skal køre på
> produktionens rækker. Spærren i `saetninger_fra_skabelonen` slår op på **navn**,
> og `app_settings` skal have produktionens ene `eurofins_analyses_details`, for
> at «+1 række» i 2.6 betyder det samme som i 4.5.

- [x] 2.1 — **11 `COPY`-blokke = 11 tabeller.** 1.091.103 bytes, 3 s. Kun data (intet `CREATE`/`ALTER`/`GRANT`), intet fra `public`, `auth` eller `storage`. Bevis holdt.
- [x] 2.2 — `INSERT 0 7`. `auth.users` = **9** (7 fra produktionen + 2 testlogins), `auth.identities` = **2**. Kun de to testlogins kan logge ind. Bevis holdt.
- [x] 2.3 — dumpet ind på 1,6 s med fremmednøglerne **slået til** og `ON_ERROR_STOP=1`, ingen fejl. Rækketal = dumpets. Alle **61** sagsnavne bærer `[TEST]`, 0 umærkede. Bevis holdt.
- [x] 2.4 — `foer-branch.txt` skrevet, 11 rækketal + 11 md5'er.
- [x] 2.5 — **`COMMIT`.** 1,98 s inkl. containerstart, altså godt under et sekund for SQL'en. Bevis holdt.
- [x] 2.6 — **Alt holdt.** Se tabellen nedenfor. Bevis holdt.
- [x] 2.7 — **Alt virker. 0 svar ≥ 400, 0 konsolfejl, 0 skemarelaterede fejl.** Bevis holdt.

**2.7, hvad der blev set.** `git worktree add ../main-gammel origin/main` →
`npm ci` → `next dev -p 3100` mod branchen (Next.js 16.2.11). Klikket igennem
med Playwright headless, `kontor@fase2.test`. Skærmbilleder i
`supabase/ops/skaerm/2-7-gammel-kode/`.

| 9A | Hvad | Svar |
| --- | --- | --- |
| 1 | Sagslisten | **61 sager** — samme tal som `count(*)` i databasen. |
| 2 | Sagen åbner | `[TEST] Mosevej 2, 8370 Hadsten`, 32 prøver, BBR-siden med. |
| 3 | En prøve åbner | Alle felter som gemt. |
| 4 | «Fortsæt prøvetagning» | Åbnede på **Prøve 15**, ikke prøve 1 — den senest rørte. |
| 8 | Eurofins-eksporten | 35.823 bytes, md5 **`a8da4e8d72d74fbc93307fead8bf30e6`**. |
| 9 | Resultatsiden | Åbner. |
| 11 | Rapporten | **37 sider** (`.print-side`), `rapport.pdf` 733.422 bytes. **Ingen** «Projektets omfang», **ingen** ressourcescreening. |
| 15 | Ingen nedetid | Ingen fejl nogen steder. Den gamle kode kender hele det nye skema. |

**Skrivningen er den halvdel, der kunne gå galt, og den er prøvet.** Læsning
beviser ingenting om `sync.ts`, som upserter `samples` med en eksplicit
kolonneliste. Mængden på prøve 15 blev ændret 0,2 → 9,99, læst tilbage som 9,99
og sat til 0,2 igen — begge skrivninger landede, ingen fejl. `toRow` nævner
ingen af fase 2's kolonner, og de er nullable.

**`updated_at` ejes af databasen.** `samples_updated_at`
(`BEFORE UPDATE … EXECUTE FUNCTION screening.set_updated_at()`) sætter den, og
den kan **ikke** skrives udefra — et forsøg på at sætte den tilbage til dumpets
værdi blev overskrevet. Det er derfor 9A punkt 3 kan holde: gemmes en prøve uden
ændring, er `updated_at` det eneste, der kan flytte sig.

**Eurofins-filen er deterministisk i indholdet, men ikke i navnet.** Hentet to
gange med samme kode: samme 35.823 bytes og samme md5, men navnene var
`…_t1789211157708.xlsx` og `…_t1789211159451.xlsx` — filnavnet bærer et
`Date.now()`. **Sammenlign bytes, ikke filnavn**, i 3.6. Ellers fejler 9A punkt 8
på noget, der er med vilje.

**Offline-køen ligger klar til 3.6** (9A punkt 7, første halvdel). Den gamle app
skrev den uden net, og den bor i en **vedvarende** browserprofil
(`ops-scratch/browser/profil-offline`). Køen holder prøve 32 med
`estimated_tons: 3.21`; databasen står på dumpets `1`. Synker den nye kode den,
skifter tallet — og så er beviset set og ikke sluttet.

To ting, det kostede at finde ud af, og som gælder alle browsertrin:

- **Knappens tekst skifter.** `{isLastRow ? "Næste prøve" : "Næste"}`, og pilen
  øverst har `aria-label="Næste prøve"`. Et navneopslag rammer derfor to ting
  eller ingen. Brug `button.flex-1` med `hasText: /Næste/`.
- **«Lokalitet» er ikke et tekstfelt.** Det er mærkaten over bygningsknapperne —
  lokalitet **er** `building_ids`. Knapperne er kontakter, så et klik på en
  bygning, der allerede er valgt, slår den **fra**, og så nægter «Næste» at gå
  videre. `location_note` er noget andet og vises ikke her.

**Rørte rækker på branchen** (testkopi, wipes i 4.0), sat tilbage til dumpets
værdier: prøve 1 (`estimated_tons` 0.1, `comment` null), prøve 15
(`estimated_tons` 0.2), prøve 32 (`estimated_tons` 1 — køen skal ændre den til
3,21 i 3.6). `updated_at` kan ikke sættes tilbage, se ovenfor. Sagens
prøve-md5 uden `updated_at` er igen `def3188a192c7e9a08e3c7d85eb7eaa2`, altså
præcis som før skrivetesten.

**Produktionens virkelige størrelse** (fra dumpet, 2.1): 61 sager, 87 bygninger,
776 prøver, 1541 billeder, 331 labsvar, 359 bilag, 87 eksporter, 7 brugere,
55 materialer, 21 prøvearter og **1** indstilling. Det sidste bekræfter
pre-flight-forventningen i 12.3: kun `eurofins_analyses_details`.

**Tallene fra migrationen mod produktionens data (2.5)** er præcis dem, bilaget
i afsnit 11 lover — nu mod 776 prøver og ikke mod en tom tabel:

| Svar | Hvad det betyder |
| --- | --- |
| `UPDATE 0` | `samples.building_part_id`-opdateringen rammer **nul** rækker. Ingen prøve har en bygningsdel. |
| `UPDATE 12` | Spærren i `saetninger_fra_skabelonen`. Produktionens `materials` indeholder altså de tolv navne **ordret**. |
| `UPDATE 1` | `Beton` får sit `report_name`. |
| `DO` | Spærren gik igennem. |
| `UPDATE 0`, `UPDATE 0` | De to sætningskopier rammer nul — `sentence_bortskaffelse` er tom overalt. |
| `INSERT 0 0` | `app_settings.sentence_farligt` indsættes ikke, fordi `sentence_bortskaffelse` ikke findes som nøgle. |
| `INSERT 0 8` | Bygningsdelene. |

**2.6, holdt op mod 2.4** (`node supabase/ops/sammenlign-verify.js`):

| Påstand | Svar |
| --- | --- |
| Rækketal | Alle uændrede undtagen `app_settings` 1 → 2 og `building_parts` ny med 8. |
| **md5 af gamle kolonner** | **Alle elleve identiske** — inkl. `samples` (776 rækker) og `sample_photos` (1541). |
| Skemalisten | **`0eae9171f6330081f8eeeef71032e849`**, 289 linjer. |
| Historikken | Ni versioner, alle nio `md5(statements[1])` = `fase2-prod.md5`. |
| De nye påstande | Alle 28 som ventet, inkl. `Tæppe`, `Bærende konstruktioner`, RLS, politikker og **ingen grant til `anon`**. |

Det er **9A punkt 14 bevist mod produktionens egne rækker**: migrationen skriver
ikke i én eneste eksisterende celle.

### Fase 3 — Koden: `main` flettes ind i `fase-2`, ny kode testes, rollback øves

`fase-2` er testgrenen. Alt integreres og testes *dér*; `main` får senere kun
en fast-forward til den commit, der har været igennem det hele.

| # | Trin | Hvordan | Bevis |
| --- | --- | --- | --- |
| 3.1 | Flet | `git merge origin/main` på `fase-2`. | Én konflikt, som forventet: `AppHeader.tsx`. |
| 3.2 | Løs konflikten | `AppHeader.tsx` slettes. `main`s to hensigter porteres til `Skal`/`SkalRamme`: «Brugere» i navigationen for `admin`, og navnet nederst i rammen linker til `/kodeord`. `<AppHeader />` og «← Sager»-linket fjernes fra `brugere/page.tsx` og `kodeord/page.tsx` — layoutet leverer rammen og navigationen nu. | Ingen reference til `AppHeader` tilbage i `src/`. |
| 3.3 | Dokumentationen rettes i samme ombæring | `AGENTS.md`: låsen «fase 2 er i gang, flet ikke» fjernes, «Udrulning» sættes i kraft igen, «Om data» rettes (sagerne i produktionen **er** produktionsdata), kendetegnet «test-databasen har én sag» rettes. `supabase/LAESMIG.md`: proceduren for prod-migrationer (SQL + håndregistrering, fordi `db push` er udelukket), den opdaterede miljøtabel, og at branchen nu er bygget af filerne med filernes versionsnumre. **Denne fil og `supabase/ops/` committes på `fase-2` i samme commit** — de er utrackede nu og når ellers aldrig `main` ved fast-forwarden. Dansk commit-besked, som de andre. | `main`s `AGENTS.md` siger ikke «flet ikke» det øjeblik, den går live. `git status` er ren efter committen (bortset fra `.claude/`). |
| 3.4 | Den fulde kæde | `npm run verify:eurofins && npm run verify:lab && npm run verify:ressourcer && npm run verify:kamera && npx tsc --noEmit && npm run lint && npm run build` | Alt grønt. |
| 3.5 | Push | `git push origin fase-2` → Vercel bygger preview af **præcis den commit**, der senere går live, mod branchen. | Preview bygger grønt. |
| 3.6 | **Ny kode mod nyt skema** — lokalt (`next dev`) *og* på previewet, begge testlogins | En **gammel** `[TEST]`-sag ende til ende: liste, sag, «Fortsæt prøvetagning» åbner der hvor man slap, billede, synk, eksport, resultater, rapport-print med fuldt skema (tæl kolonnerne). **Eurofins-filen for samme sag som i 2.7 er byte-identisk.** Derefter: opret en **ny selektiv** sag ende til ende, `/materialer`, `/indstillinger`, `/brugere` som admin, `/kodeord`. `screener@` ser ikke Brugere/Materialer/Indstillinger og får 404 på dem. | Set i en browser — ikke antaget. Eurofins-md5 ens. |
| 3.7 | **Rollback øves** | `psql "$PGURL_BRANCH" -f fase2-rollback.sql` → skemalisten skal give `982a253bed9339988695b362769c67d3` (basis) → `fase2-prod.sql` igen → `0eae9171f6330081f8eeeef71032e849` (fase 2). Rækketal uændrede hele vejen. | Begge md5'er matcher. Begge scripts er nu bevist. |
| 3.8 | Filerne er ikke drevet | `npx supabase db reset` (alle 20 + seed) på den lokale stak. Gjort én gang allerede den 12. september — alle 20 byggede rent — men gøres igen efter fletningen, for det er *den* commit, der går live. | Bygger grønt. Skemalisten = `0eae9171f6330081f8eeeef71032e849`. |

- [x] 3.1 — **én konflikt, som forventet:** `CONFLICT (modify/delete): src/components/AppHeader.tsx deleted in HEAD and modified in origin/main`. `src/lib/types.ts` flettede sig selv rent. Bevis holdt.
- [x] 3.2 — **ingen reference til `AppHeader` tilbage i `src/`**, og filen er væk. Bevis holdt.
- [x] 3.3 — commit `22b40dd` med to forældre (`bd936cf` + `f6a4870`). `git status` ren bortset fra `.claude/`. `AGENTS.md` siger ikke længere «flet ikke». Bevis holdt.
- [x] 3.4 — **hele kæden grøn.** Bevis holdt.
- [x] 3.5 — `bd936cf..22b40dd fase-2 -> fase-2`. Vercel: **● Ready** på 24 s. Bevis holdt.
- [x] 3.6 — **lokalt: holdt, alle punkter.** Previewet klikkede mennesket selv igennem (12. sep. 2026) efter listen nedenfor: «det hele virker». Bevis holdt.
- [x] 3.7 — **rollback → `982a253bed9339988695b362769c67d3`, genanvendelse → `0eae9171f6330081f8eeeef71032e849`.** Begge byte-identiske med de committede lister. Alle elleve md5'er af gamle kolonner identiske hele vejen ned og op. Bevis holdt.
- [x] 3.8 — `npx supabase db reset`: alle 20 migrationer og `seed.sql` byggede rent, skemalisten **`0eae9171f6330081f8eeeef71032e849`**, og seed-sagens prøver hedder `P1, P2, 3, P4, P5`. Bevis holdt.

### 3.2, hvad der blev porteret

`main`s sidehoved havde to hensigter, og de er nu rammens:

| Hensigt | Hvor den ligger nu |
| --- | --- |
| «Brugere» i navigationen, kun for `admin` | `Skal.tsx`, efter Materialer og Indstillinger — smallere grænse, sidste plads |
| Navnet fører til `/kodeord` | `SkalRamme.tsx`, navnet nederst er nu et link med `aria-current` som de andre punkter |

`<AppHeader />` og «← Sager» er fjernet fra `brugere/page.tsx` og
`kodeord/page.tsx` — layoutet leverer begge dele nu.

**`supabase/ops/` er undtaget ESLint.** Planens generator i 12.4 er ordret
CommonJS, og repoets `no-require-imports` er rigtig i `src/` og forkert for et
script, `node` skal kunne køre direkte. Samme begrundelse som `supabase/.temp/**`
allerede havde: ellers holder kontrolkæden op med at sige noget om vores eget
arbejde.

**`supabase/ops/` har sin egen `.gitattributes` med `eol=lf`.** Uden den ville
`core.autocrlf` give `.txt` og `.md5` CRLF i arbejdskopien, og så ville hver
linje i en skemaliste afvige — eller værre: en md5 ville bære et `\r` og
`sammenlign-verify.js` fejle på noget, der ikke er en fejl.

**Skærmbillederne committes ikke** (`ops/.gitignore`). Generalprøven kørte mod en
kopi af produktionens data, så de viser rigtige adresser, rigtige kunder og
rigtige labsvar — 61 sagsnavne på ét af dem. Tallene (`foer-*.txt`,
`efter-*.txt`, `skema-*.txt`, `*.md5`) er derimod med: de er dokumentationen af,
at intet blev rørt.

### 3.6, hvad der blev set lokalt

Mod branchen, som har produktionens 61 sager og fase 2-skemaet. Begge testlogins.

| 9A | Hvad | Svar |
| --- | --- | --- |
| 1 | Sagslisten | 61 sager. |
| 7 | **Offline-køen** | Køen, den **gamle** app skrev, blev synket af den **nye**: 1 → 0 i IndexedDB, og prøve 32 gik fra 1 til **3,21 ton** i databasen. De tre fase 2-felter står stadig `null` på rækken — den nye kode opdigtede ikke værdier. |
| 8 | **Eurofins-filen** | **`a8da4e8d72d74fbc93307fead8bf30e6`** — samme md5 som den gamle kode, og `cmp` siger byte-identisk. |
| 11 | Rapporten | 37 sider, ingen selektive afsnit på en miljøscreening. |
| 13 | **Rollerne** | admin ser Sager, Materialer, Indstillinger, **Brugere**; alle fire svarer 200. Screeneren ser **kun** Sager og får **404** på alle tre paneler — men 200 på `/kodeord`, for sit eget kodeord må enhver skifte. |

**Ny selektiv sag ende til ende.** Oprettet med rapporttypen «Selektiv
nedrivning», adresse fra DAWA, BBR-bygninger hentet og gemt, og en prøve med alle
tre selektive felter — bygningsdel «Bærende konstruktioner», stand 2, håndtering
«Genanvendelse». Prøvesiden viser `Bygningsdel`, `Materiale stand` og
`Miljø & ressourcehåndtering`, som kun står på en selektiv sag. Rapporten fik
**«Projektets omfang»** med BBR's egen anvendelsestekst og
**«Ressourcescreening»**. 0 svar ≥ 400, 0 konsolfejl.

**Og alle 61 gamle sager er stadig `miljoescreening`** — kun den nye er
`selektiv`. Det er 9B's «Alle eksisterende sager bliver `miljoescreening`»,
efterprøvet.

### 3.6, previewet: klikket igennem af mennesket

Agenten kunne ikke nå det, og mennesket gjorde det i stedet efter en nummereret
liste — det ene sted i planen, hvor det er meningen. Svaret var «det hele
virker», og den ene ting, der blev spurgt om, var **de manglende billeder**:
appen skriver «2 foto», og der er ingen.

**Det er ventet, og 2.3 siger det.** Rækkerne om billederne fulgte med dumpet,
filerne gjorde ikke: `pg_dump` kopierer tabelrækker og ikke Storage, og branchens
egne buckets blev tømt i 0.2. På branchen står der 1541 rækker i `sample_photos`
og **0** filer i `screening-photos`, 359 rækker i `case_files` og **0** filer i
`screening-rapport`. Migrationen rører ikke Storage, så det kan ikke ske i
produktionen; at eksisterende billeder vises, er 9A punkt 6 og prøves i 4.6/5.3,
hvor filerne er der.

Eurofins-filen fra previewet blev ikke hentet ind til sammenligning, og den
behøvedes ikke: 9A punkt 8 er «samme sag, gammel kode mod ny», og den er ført
lokalt mod den samme branch-database — `a8da4e8d72d74fbc93307fead8bf30e6` begge
veje, `cmp` byte-identisk. Previewet kører den samme commit mod den samme
database.

### Hvorfor previewet ikke kunne nås

`https://nemscreening-app-git-fase-2-nemscreening.vercel.app` og
deployment-URL'en svarer **begge** `HTTP 302 → vercel.com/sso-api`. Det er
Vercels *Deployment Protection*, og den gælder previews, ikke produktionen —
`https://nemscreening-app.vercel.app/login` svarer `200`, så **5.3 kan køres**.

Selve buildet er grønt (● Ready, 24 s), så det, previewet mangler at vise, er om
den *byggede* artefakt taler rigtigt med branchens database. Planen forudsatte,
at previewet kunne nås; det kan det ikke uden en af to ting, og begge er
menneskets valg, ikke agentens: et *Protection Bypass for Automation*-token på
projektet, eller at mennesket selv klikker det igennem.

### 3.7, hvad rollbacken gjorde

| | Skemaliste | `app_settings` | Alt andet |
| --- | --- | --- | --- |
| Før | `0eae9171…` | 2 | cases 62, samples 777, case_buildings 88, case_files 359, exports 91, lab_results 331, materials 55, sample_photos 1541, sample_types 21, app_users 9 |
| Efter rollback | **`982a253…`** | 1 | uændret |
| Efter genanvendelse | **`0eae9171…`** | 2 | uændret |

`DELETE 9` fjernede de ni historikrækker, og `app_settings` er den ene række
migrationen selv ejer. **Ingen data gik tabt ved turen ned og op**, og alle
elleve md5'er af gamle kolonner var identiske hele vejen.

### Fase 4 — PRODUKTION: databasen

> **Vindue:** et tidspunkt, hvor ingen er i marken og ingen har appen åben
> (spørgsmål 4). En kø fra gammel kode *kan* synkes af ny kode — det er bevist
> i 9A punkt 7 — så en glemt kø på en telefon er ikke farlig. Det er en
> forholdsregel, ikke en spærre.

Du kører selv, trin for trin, under tilladelsen forud. Hvert trins bevis er
porten til det næste. Varighed: under en time, hvoraf selve migrationen er
under et sekund.

| # | Trin | Hvordan | Bevis |
| --- | --- | --- | --- |
| 4.0 | **Branchen wipes igen** | Kopien af produktionens data fra Fase 2 og alt, der er oprettet under test, slettes: storage tømmes, `delete from screening.cases`, prod-brugerne fjernes fra `app_users` og `auth.users` (de to testlogins bliver). Branchen skal være **tom**, når migrationen laves. | `cases`, `samples`, `sample_photos`, `case_files`, `exports`, `lab_results`, `case_buildings` = 0. `app_users` = 2. Buckets tomme. |
| 4.1 | **Pre-flight — kun læsning** | På produktionen: historikken har de 11 screening-versioner med filernes numre og md5 · **skemalisten = `982a253bed9339988695b362769c67d3`** (produktionen er, hvad dens filer siger — `skema-basis.txt` er listen bag tallet) · de 12 materialenavne findes ordret · `Asbest`, `Sod`, `Mulig asbest` findes i `sample_types` · ingen af de nye kolonner, typer, tabeller eller `app_settings`-nøgler findes allerede · rækketal pr. tabel · antal prøver med prøveart `Asbest`/`Sod` og om de har analyser eller labsvar · antal prøver uden mængde · PostgREST udstiller `screening`. | Alle tjek grønne. De to sidste tal går til spørgsmål 5. **Afviger skemalisten, stoppes der:** så er produktionen rettet i hånden på et tidspunkt, og det skal forstås først. |
| 4.2 | **Backup** | `pg_dump "$PGURL_PROD" --schema=screening -f prod-backup-<tidsstempel>.sql` (skema + data) og `pg_dump "$PGURL_PROD" --table=supabase_migrations.schema_migrations --data-only -f prod-historik-<tidsstempel>.sql`. Storage er **ikke** med — migrationen rører den ikke. Supabase' egen backup noteres, men **vores restore-punkt er vores egen fil.** | Begge filer findes. Rækketal i backuppen = 4.1. |
| 4.3 | «Før»-tal | `fase2-verify.sql`, før-halvdelen → `supabase/ops/foer-prod.txt`. | Filen findes. |
| 4.4 | **Migrationen** | `PGCLIENTENCODING=UTF8 psql "$PGURL_PROD" -v ON_ERROR_STOP=1 -f fase2-prod.sql`. Én transaktion. Låsene holdes under ét sekund; forespørgsler fra appen venter, de fejler ikke. Fejler den, er intet ændret — tilbage til Fase 2 med fejlen. Fejler den på `lock_timeout`, prøves igen om et minut. | `COMMIT`. |
| 4.5 | **Verifikation** | `fase2-verify.sql`, efter-halvdelen → `supabase/ops/efter-prod.txt`. | Rækketal = 4.3. Gamle kolonners md5 = 4.3. **Skemalisten = `0eae9171f6330081f8eeeef71032e849`** — produktionen, branchen og filerne beskriver samme skema. Ni versioner i historikken med matchende md5. Grants og RLS på `building_parts`. UTF-8-påstandene sande. |
| 4.6 | **Den gamle, kørende app** | Log ind på produktionen med det givne login og røgtest det, der stadig kører på Vercel, mod det nye skema: sagsliste, sag, rapport, eksport. | Alt virker. Nu ved vi, at Fase 5 kan tage den tid, det tager. |
| 4.7 | Kontorets indhold | Kun hvis spørgsmål 1 er ja: `fase2-indhold.sql`. | Tællingen i scriptet stemmer. |

- [x] 4.0 — `DELETE 62` sager, `DELETE 7` brugere. Alle børnetabeller 0 via CASCADE, `app_users` = 2, `auth.users` = 2, alle fire buckets tomme. Bevis holdt.
- [x] 4.1 — **alle tjek grønne.** Se nedenfor: to af planens tjek var forkert *formuleret*, produktionen var ikke afveget. Bevis holdt.
- [x] 4.2 — `prod-backup-20260912-142809.sql` (1,07 MB) og `prod-historik-20260912-142809.sql` (68 KB). Backuppen har hele skemaet (11 tabeller, 21 politikker, 5 funktioner, 13 indeks, 3 typer, RLS på alle 11) og rækketal **præcis** = 4.1. Kun `screening`. Bevis holdt.
- [x] 4.3 — `foer-prod.txt` skrevet.
- [x] 4.4 — **`COMMIT`.** 2,14 s inkl. containerstart. Bevis holdt.
- [x] 4.5 — **`BEVIS: HOLDER — ingen gammel celle er roert`.** Skemalisten `0eae9171f6330081f8eeeef71032e849`. Bevis holdt.
- [ ] 4.6 — **stoppet:** loginet virker ikke, se nedenfor.
- [ ] 4.7 — venter på 4.6.

### 4.1: produktionen var ikke afveget — to af planens tjek var

**Historikken er fælles med websitet, og websitet har lagt to migrationer på.**
8. september 2026: `20260908200516 framework_agreements` og
`20260908200657 agreement_function_search_path`. Planen forventede «11 rækker,
ingen senere» og filtrerede på `version >= '20260725173107'` — og et datofilter
fanger websitets migrationer. Det så ud som om produktionen var rettet i hånden.

Den var ikke, og det er bevist tre gange:

1. **Skemalisten på produktionen gav `982a253bed9339988695b362769c67d3`, 251
   linjer** — byte for byte det samme som `skema-basis.txt`, branchen og den
   lokale stak. Websitets to migrationer har ikke ændret én kolonne, én politik
   eller én funktion i `screening`.
2. **Deres SQL er læst.** Den første opretter `public.framework_agreements`,
   `framework_agreement_lines`, `framework_agreement_events` og to nullable
   kolonner på `public.bookings`; den anden sætter `search_path` på fire
   `public.`-funktioner. Ordet «screening» står kun i firmanavnet NemScreening,
   i en kommentar.
3. **De stod i historik-backuppen fra 4.2**, altså før migrationen i 4.4.

`preflight-prod.sql` tæller nu screenings elleve **ved navn**. Reglen for dette
projekt: **filtrér aldrig migrationer på dato.** Den samme fælde ramte
`fase2-verify-efter.sql` i 4.5 og er rettet der også.

**Og `pgrst.db_schemas` står «ikke sat» på produktionen — det er normalt.**
Rolleindstillingen er *branchens* greb, fordi en branch uden GitHub-integration
ikke får `config.toml` anvendt. Produktionen har skemaet slået til i dashboardet.
Det rigtige tjek er adfærden, og den svarer
`42501 permission denied for schema screening` — altså at Postgres kender skemaet
og nægter adgang uden login, præcis som det skal være. Ikke `PGRST106`.

### 4.1's tal til afsnit 9B (rapporteres, afgør intet)

| Hvad | Antal |
| --- | --- |
| Prøver med prøvearten **Asbest** | 15 — heraf 13 med analyser, 9 med labsvar |
| Prøver med prøvearten **Sod** | 17 — ingen med analyser, ingen med labsvar |
| Prøver **uden mængde** (spærrer «Næste») | 102 |

De 12 materialenavne findes ordret, ingen mangler. 55 materialer, 0 lukkede,
21 prøvearter — samme liste som branchen, så 4.7 rammer alle rækker. `Asbest`,
`Sod` og `Mulig asbest` findes alle tre. **Intet af fase 2 fandtes i forvejen:**
0 nye kolonner, ingen `building_parts`, ingen enum-typer, kun
`eurofins_analyses_details` i `app_settings`.

### 4.4 og 4.5: ringen er lukket

**Produktionen kørte linje for linje det samme som generalprøven.** `psql`-svaret
fra 2.5 (branchen) og 4.4 (produktionen) er identiske: 51 linjer, `BEGIN` til
`COMMIT`, med `UPDATE 0` hvor bilaget lover nul rækker, `UPDATE 12` på spærren og
`INSERT 0 0` på den `app_settings`-kopi, der ikke skal ramme noget.

**Tre miljøer, tre veje, samme skema.** Skemalisten efter migrationen er
**byte-identisk** med `skema-fase2.txt` på produktionen, på branchen og på den
lokale stak.

**Ni af elleve md5'er var ens på branchen og produktionen allerede før
migrationen** — kun `app_users` (branchen havde to testlogins mere) og `cases`
(branchens navne bar `[TEST]`) afveg. Generalprøven kørte altså mod en trofast
kopi, bit for bit.

Og efter migrationen: alle elleve md5'er uændrede, rækketal uændrede undtagen
`app_settings` 1 → 2 og `building_parts` som ny med 8. **Migrationen skrev ikke i
én eneste eksisterende celle i 61 sager, 776 prøver, 1541 billeder og 331
labsvar.**

### 4.6: stoppet — loginet er ikke medlem af appen

Loginet, mennesket gav, kan ikke bruges:

```
https://nemscreening-app.vercel.app/login?error=Forkert+e-mail+eller+kodeord.
```

To ting er galt, og den anden er den vigtige:

- **Kodeordet passer ikke.** GoTrue svarer `{"code":400,
  "error_code":"invalid_credentials","msg":"Invalid login credentials"}`.
- **Kontoen er ikke medlem af screening-appen.**
  `Madsrahbekfriis@hotmail.com` har en `auth.users`-konto (bekræftet, sidst
  logget ind 24. august 2026) men **ingen række i `screening.app_users`**. Det er
  et website-login: `auth` er fælles, og en kunde på nemscreening.dk er allerede
  `authenticated` her. Adgang til appen kræver medlemskab, og det er netop derfor
  `is_member()` findes.

Produktionens `office`/`admin`-medlemmer er andre konti (3 aktive admins).
**Databasen er migreret og verificeret** — 4.4 committede, 4.5 er grøn — så der
er intet halvt gjort. Det, der mangler, er at klikke den *kørende* app igennem,
og det kræver et login, der er medlem.

### Fase 5 — PRODUKTION: koden

| # | Trin | Hvordan | Bevis |
| --- | --- | --- | --- |
| 5.1 | Vercel-miljøet | **Intet skal ændres.** Production har allerede `NEXT_PUBLIC_*` mod produktionsprojektet og `DATAFORDELER_API_KEY` — appen kører på dem i dag — og fase 2 tilføjer ingen variabler. `SUPABASE_SECRET_KEY` hører til `main`s `/brugere`; mangler den, siger siden det selv, og det blokerer ikke. Du behøver ikke adgang til Vercels dashboard. | 5.3 er beviset: den nye kode taler med produktionen (sagslisten har produktionens sager, ikke én `[TEST]`-sag). |
| 5.2 | **Fast-forward** | `git checkout main && git merge --ff-only fase-2 && git push origin main`. Intet andet. | `main` peger på samme commit som `fase-2`. Vercel bygger grønt. |
| 5.3 | Røgtest med ny kode | En **gammel** sag ende til ende (som 3.6). En **ny selektiv** sag ende til ende. `/materialer`, `/indstillinger`, `/brugere` som admin. En rigtig screener-konto afvises rigtigt. Rapport-print med fuldt skema. | Set i en browser på produktionen. |
| 5.4 | Besked til screenerne | Genindlæs appen. Uden Skew Protection får åbne faner «server action not found», indtil de genindlæser — det er Next.js, og det er derfor vinduet er en aften. | Sendt. |

- [x] 5.1 — **intet ændret, og det er efterprøvet frem for antaget.** `/brugere` svarede 200 med 7 brugere på produktionen og klagede ikke over en manglende nøgle, **før** fast-forwarden — `main`s kode kørte der i forvejen, så `SUPABASE_SECRET_KEY` er sat. Bevis holdt.
- [x] 5.2 — `git merge --ff-only fase-2` → `Updating 065e548..b132a07`, `git push` → `f6a4870..b132a07 main -> main`. Vercel: **● Ready**, Production, 25 s. `main` og `fase-2` står på samme commit. Bevis holdt.
- [~] 5.3 — **holdt, på nær screener-halvdelen.** Se nedenfor.
- [ ] 5.4 — mennesket sender beskeden.

### 5.3, det tungeste bevis i hele forløbet

**Eurofins-filen for produktionens egen sag er byte-identisk før og efter.**
Samme sag (`Mosevej 2, 8370 Hadsten`), samme 35.817 bytes:

| Kode | md5 |
| --- | --- |
| Gammel (4.6, otte minutter før fast-forwarden) | `d73488e3ff6b895f8444570316fb6c50` |
| Ny (5.3, efter) | `d73488e3ff6b895f8444570316fb6c50` |

`cmp` siger identisk. 9A punkt 8 er dermed bevist **på produktionens egne data**,
ikke kun på branchens kopi.

**Og billederne er der.** Rapporten har 38 sider og PDF'en er **17,9 MB** mod
733 KB på branchen — forskellen er de rigtige fotos. Det er 9A punkt 6, set.

| 9A | Hvad | Svar |
| --- | --- | --- |
| 1 | Sagslisten | 61 sager, samme tal som `count(*)`. |
| 2, 3, 4 | Sag, prøve, «Fortsæt» | Åbner, alle felter som gemt. |
| 6 | Billeder | 17,9 MB PDF med de rigtige fotos. |
| 8 | Eurofins | Byte-identisk, se ovenfor. |
| 9 | Resultatsiden | Åbner. |
| 11 | Rapporten | 38 sider, ingen selektive afsnit på en miljøscreening. |
| 13 | Panelerne som admin | Navigationen viser Sager, Materialer, Indstillinger, **Brugere** og navnet «Mads». Alle fire svarer 200. |

0 svar ≥ 400, 0 konsolfejl, 0 skemarelaterede fejl.

**En ny selektiv sag ende til ende på produktionen** (`d63847b9-…`, slettes i
6.5): rapporttype, DAWA-adresse, BBR-bygning hentet og gemt, en prøve med
bygningsdel, stand og håndtering. Rapporten fik «Projektets omfang» med BBR's
egen anvendelsestekst og «Ressourcescreening». **Alle 61 gamle sager er stadig
`miljoescreening`** — kun den nye er `selektiv`.

**Og kontorets ord fra 4.7 når frem i en rapport.** Ressourcelinjen står som
kunden skal læse den:

> **Bærende konstruktioner**
> Beton – 40.000 kg i god stand, Beton udsorteres som en ren fraktion og kan
> efter nedknusning genanvendes som sekundært materiale.

Fem ting på én linje, og hver af dem er en regel: bygningsdelen som overskrift,
**`report_name` «Beton»** uden affaldsfraktionens parentes, **40.000 kg** fordi
screeneren tastede 40 ton, **«i god stand»** fordi standen var 2, og kontorets
egen sætning. Analyseskemaet skriver derimod
`Beton (undtagen, gasbeton, letbeton)` — materialet som **registreret** — og det
er meningen: skemaet bindes til den enkelte prøve, så entreprenøren kan slå
rækken op. De to er ikke i modstrid.

### 5.3, det ene der mangler: screeneren

«En rigtig screener-konto afvises rigtigt» er **ikke** prøvet på produktionen.
Jeg har ikke et screener-kodeord, og produktionens to aktive screenere er ikke
mine konti.

**Serversiden er derimod bevist på produktionen, uden noget login.** Alle fire
skrivepolitikker kræver `screening.is_office()` — `using` **og** `with_check`:

| Tabel | Politik | Kræver |
| --- | --- | --- |
| `materials` | `materials_write` | `screening.is_office()` |
| `app_settings` | `app_settings_write` | `screening.is_office()` |
| `building_parts` | `building_parts_write` | `screening.is_office()` |
| `lab_results` | `lab_results_write` | `screening.is_office()` |

og `is_office()` kræver en **aktiv** række i `screening.app_users` med rollen
`office` eller `admin`. En screener kan altså **fysisk ikke** skrive der, uanset
hvad brugerfladen viser. Læsning kræver `is_member()`.

Det, der mangler, er kun brugerfladen: skjuler navigationen de tre paneler, og
svarer siderne 404. Det er prøvet på branchen med en rigtig screener-konto mod
**præcis denne commit** — 404 på alle tre, og kun «Sager» i menuen.

### Fase 6 — Efter

| # | Trin | Hvordan |
| --- | --- | --- |
| 6.1 | Overvågning | Logs på produktionen i 24–48 timer (MCP `query_logs`, læsning). Fejl fra PostgREST (`PGRST…`), fra synkroniseringen og fra rapporten er det, der kigges efter. |
| 6.2 | Branchen (spørgsmål 6) | Slettes med `delete_branch` — **aldrig** «merge branch», den kører migrationer mod produktionen og rammer websitet. Eller beholdes som stående testmiljø, nu bygget af filerne. Git-grenen kan blive stående. |
| 6.3 | Runbook | Denne fil opdateres med, hvad der faktisk skete, og hvad der afveg. Næste udrulning skal ikke genopdage, at `db push` ikke virker her. |
| 6.4 | Filerne med produktionsdata | `prod-data.sql` fra 2.1 slettes. Backuppen fra 4.2 gemmes et sted, der ikke er udviklerens skrivebord, i mindst 30 dage. |
| 6.5 | Sporene efter 5.3 i produktionen | Den selektive testsag slettes gennem appens egen sletning (lag for lag, så storage følger med). Var loginet en testbruger oprettet til formålet, lukkes den på `/brugere`. Bevis: `count(*)` i `cases` = tallet fra 4.1. |

- [x] 6.1 — **ingen nye fejl.** Se nedenfor. Fortsat overvågning i 24–48 timer er menneskets.
- [x] 6.2 — **branchen beholdes** (svar 6 i afsnit 10). Den står nu med fase 2-skemaet, de to testlogins og ingen sager — bygget af filerne med filernes egne versionsnumre. `seed.sql` kan fylde den op, når den skal bruges.
- [x] 6.3 — denne fil er runbooken. Hvert trin bærer sit svar ordret, og hver rettelse står med sin grund.
- [x] 6.4 — `prod-data.sql` (1,04 MB), `auth-stubbe.sql`, `branch-indhold.json` og de to Eurofins-testfiler er slettet. **Backuppen beholdes:** `prod-backup-20260912-142809.sql` (1,07 MB) og `prod-historik-20260912-142809.sql` — de skal flyttes et sted, der ikke er skrivebordet, i mindst 30 dage.
- [x] 6.5 — **`cases` = 61**, præcis tallet fra 4.1. Bevis holdt.

### 6.1: hvad loggene siger

Det, der kunne have været skræmmende, var 41 gange
`Warp server error: Thread killed by timeout manager` fra PostgREST. Det er
**ikke** fase 2. Samme besked, samme eneste variant, i vinduet **før**
migrationen:

| Vindue | `Warp server error` |
| --- | --- |
| Før migrationen (3 timer) | **155** |
| Efter migrationen (50 min) | **36** |

Samme takt. Det er PostgREST's tomgangsstøj, når idle-tråde lukkes.

**Ingen `PGRST…`, ingen «column does not exist», ingen «permission denied».**
De øvrige fund er gjort rede for: to `invalid_credentials` og én `bad_json` er
mine egne fejlslagne loginforsøg, og `session_not_found` på `GET /user` har
`referer: https://nemscreening.dk` — det er **websitets** brugere med udløbne
sessioner, ikke vores.

Og én linje er et godt tegn:
`Received a schema cache reload message on the "pgrst" channel` — det er
`notify pgrst, 'reload schema'` fra migrationen, der gør sit arbejde.

**Sikkerhedsrådgiverne viser intet nyt fra fase 2.** `building_parts` står
**ikke** under «RLS Enabled No Policy», så Supabases egen linter bekræfter, at
den har sine to politikker. De øvrige fund er websitets `public.`-funktioner og
screenings `is_member()`/`is_office()`/`fjern_slettet_bygning()`, som stammer fra
grundmigrationerne og er med vilje.

### 6.5: hvad testsagen kostede

Slettet gennem **appens egen** sletning, ikke med SQL — netop fordi den læser
storage-stierne ud, før rækkerne forsvinder. Dialogen krævede tre fluebén (sagen,
1 bygning, 1 prøve), og «Slet» åbnede sig først, da alle tre var sat.

| Tabel | Efter | Som i 4.1 |
| --- | --- | --- |
| `cases` | **61** | ✓ |
| `case_buildings` | 87 | ✓ |
| `samples` | 776 | ✓ |
| `sample_photos` | 1541 | ✓ |
| `lab_results` | 331 | ✓ |
| `case_files` | 359 | ✓ |
| `exports` | **89** | 87 + 2 |

Ingen forældreløse storage-filer efter sagen.

**De to ekstra `exports`-rækker er mine**, én fra røgtesten i 4.6 og én fra 5.3.
`exports` er en log over hentede Eurofins-filer, og at hente en er præcis det,
kontoret gør hver uge. Ingen sag, prøve, billede eller labsvar er rørt.

---

## 13. Hvad produktionen står med nu

| Hvad | Før | Nu |
| --- | --- | --- |
| Skema | `982a253bed9339988695b362769c67d3`, 251 linjer | **`0eae9171f6330081f8eeeef71032e849`, 289 linjer** |
| Sager | 61 | 61, alle `miljoescreening` |
| Prøver · billeder · labsvar | 776 · 1541 · 331 | uændret, md5 for md5 |
| `building_parts` | fandtes ikke | 8 rækker, RLS, to politikker |
| `materials` | 55 navne, ingen tekst | 55 navne, **53 med kontorets ord**, 2 lukket, 2 omdøbt |
| `app_settings` | 1 nøgle | 6: eurofins + `shared_disposal_text` + de fire tekster |
| Kode (`main`) | `f6a4870` | **`b132a07`** |
| Migrationshistorik | 11 screening + 24 website + 2 website | + **de ni**, med filernes egne numre og md5 |

**Restore-punktet** er `prod-backup-20260912-142809.sql`. Rollback af koden er
Vercels «Instant Rollback» til deployment `nemscreening-84gavw52p`, og den rører
**ikke** databasen — det er hele pointen med expand-only.

`fase2-rollback.sql` ligger i skuffen, øvet i begge retninger i 3.7. Den skal
**ikke** køres uden at nogen har forstået hvorfor: tomme nye kolonner skader
ingen, og den tager kontorets tekster med sig.

---

## 7. Verifikationen — hvad `fase2-verify.sql` påstår

Alt er tal og tekst, der kan sammenlignes mekanisk. Ingen påstand hviler på et
menneske, der kigger.

**Før og efter, på branch og produktion, skal være ens:**

| Påstand | Hvordan |
| --- | --- |
| Rækketal pr. tabel i `screening` | `count(*)` for alle 11 tabeller. |
| Gamle kolonners indhold | Pr. tabel: `md5(string_agg(row::text, '' order by id))` over **kun de kolonner, der fandtes før**. Et ændret tal, en flyttet decimal, en tabt `null` — alt slår igennem. |

**Efter, på branch og produktion, skal være sande:**

| Påstand | Hvordan |
| --- | --- |
| Skemaet er filernes skema | En normaliseret liste: kolonner (type, nullable, default), constraints (`pg_get_constraintdef`), indeks (`indexdef`), politikker (`cmd`, `qual`, `with_check`), funktioner (md5 af `pg_get_functiondef`), triggere (`pg_get_triggerdef`), enum-værdier, **RLS slået til pr. tabel** (`relrowsecurity`), og grants pr. tabel for `authenticated`, `service_role` og `anon`. Sorteret, uden OID'er og ejere. md5 af listen = `0eae9171f6330081f8eeeef71032e849` (`skema-fase2.txt`); før migrationen `982a253bed9339988695b362769c67d3` (`skema-basis.txt`). |
| Historikken | De ni versioner findes med filernes numre, og `md5(statements[1])` = md5 af filen. |
| Alle sager er miljøscreeninger | `count(*) where report_type <> 'miljoescreening'` = 0. |
| Nye kolonner er tomme | `count(*)` med ikke-null i hver af de nye kolonner = 0 (undtagen `materials`, hvor 12 rækker har sætning og én har `report_name`). |
| Bygningsdelene | 8 rækker, navnene **ordret** — `'Bærende konstruktioner'` findes (UTF-8-beviset). |
| Materialerne | 12 rækker med `sentence_genbrug` eller `sentence_genanvendelse`; `'Tæppe'` er en af dem (UTF-8-beviset). |
| Indstillingen | `shared_disposal_text = true`. Ingen `sentence_*`-nøgler, medmindre 4.7 er kørt. |
| `anon` har intet | Ingen grants til `anon` på nogen tabel i `screening`. |

---

## 8. Rollback — hvad der gøres, hvis noget går galt

| Hvad gik galt | Hvad der gøres | Røres databasen? |
| --- | --- | --- |
| Transaktionen i 4.4 fejler | Ingenting — den er atomisk, intet er ændret. Tilbage til Fase 2 med fejlen. | Nej. |
| Verifikationen i 4.5 viser en afvigelse | **Stop — det er et fejlet bevis.** Rapportér afvigelsen ordret, med `diff` mod `efter-branch.txt`, og vent. `fase2-rollback.sql` køres ikke af dig på egen hånd: tomme nye kolonner skader ingen, og en rollback uden forståelse af afvigelsen er endnu en ændring. | Kun efter at mennesket er tilbage. |
| Koden i Fase 5 fejler | **Vercel «Instant Rollback»** til forrige deployment, eller `git revert` på `main`. Den gamle kode kører fejlfrit på det udvidede skema — bevist i 2.7 og 4.6. | **Nej.** Det er hele pointen med expand-only. |
| Noget opdages dagen efter | Samme som ovenfor. Kode rulles tilbage uafhængigt af databasen. | Nej. |
| Sidste udvej | Restore af `screening` fra backuppen i 4.2. | Ja, og kun da. |

---

## 9. Eksisterende sager — hvad «fejlfrit» betyder, og hvad der ændrer sig med vilje

### 9A. Accept-listen: det, der skal virke præcis som i dag

Det her er kravet, planen findes for. Hvert punkt er en handling på en **sag,
der findes i produktionen i dag**, og hvert punkt har et sted, hvor det
bevises — med den gamle kode mod det nye skema (2.7, 4.6), og med den nye
kode (3.6, 5.3). Fejler ét punkt, er udrulningen ikke færdig, uanset hvad
resten viser.

| # | På en eksisterende sag skal … | Bevises i |
| --- | --- | --- |
| 1 | **Sagslisten** vise alle sager — samme antal som `count(*)` i 4.1 — med navn, status og prøvetal som før. | 2.7, 3.6, 4.6, 5.3 |
| 2 | **Sagen** åbne med navn, adresse, BBR-oplysninger, bygninger, prøver, billedtal og labsvar-tællere som før. Ingen felter fra fase 2 vises tomme eller som «—» på en miljøscreening. | 3.6, 5.3 |
| 3 | **En eksisterende prøve** åbne med alle felter, som de blev gemt: materiale, prøveart, lokalitet, bygning(er), mængde, periode, de fire analyser, kommentar, billeder. Gemmes den uden ændring, ændres kun `updated_at`. | 3.6, 5.3 |
| 4 | **«Fortsæt prøvetagning»** åbne på den senest rørte prøve, ikke en ny. | 3.6, 5.3 |
| 5 | **En ny prøve på en gammel sag** få næste ledige nummer — numre genbruges ikke — og `P` foran, når en analyse er valgt. Bygningen arves fra forrige prøve. | 3.6, 5.3 |
| 6 | **Billeder**: eksisterende vises; et nyt kan tages og lander i `sample_photos` og storage; det tredje afvises. | 3.6, 5.3 |
| 7 | **Offline**: en prøve taget uden net synkroniseres bagefter, og en kø skrevet af den *gamle* app synkroniseres af den nye. | 2.7 (gammel skriver) → 3.6 (ny synker) |
| 8 | **Eurofins-eksporten** for en gammel sag være **byte-identisk** med den, den gamle kode laver — samme skabelon, samme skjulte ark, samme `Order_Metadata`. | 2.7 gemmer filen, 3.6 sammenligner md5 |
| 9 | **Resultatsiden** vise samme niveauer og farver som før for hver prøve — med de to undtagelser i 9B, som tælles i 4.1. | 3.6, 5.3 |
| 10 | **Labsvar** kunne indlæses af `office`/`admin` og ikke af `screener` — samme grænse som før. | 3.6 (begge testlogins), 5.3 |
| 11 | **Rapporten** have præcis de sider, den havde: forside, oplysninger, metode, analyseskema, grænseværdier, prøvesider, bilag. **Ingen** «Projektets omfang», **ingen** ressourcescreening, **ingen** forureningsnote på en miljøscreening. Printet med fuldt skema står tallene på én linje. | 2.7, 3.6, 4.6, 5.3 |
| 12 | **Sletning** af en prøve og af en sag virke med lag-for-lag-dialogen, og storage ryddes bagefter. | 3.6 (på en `[TEST]`-sag) |
| 13 | **Rollerne** have samme grænser: screener ser ikke Brugere, Materialer, Indstillinger og får 404 på dem; kontor kan slette sager. | 3.6, 5.3 |
| 14 | **Data**: rækketal og md5 af **alle gamle kolonner i alle elleve tabeller** være uændrede før og efter migrationen. Migrationen skriver ikke i én eneste eksisterende celle. | 2.4→2.6, 4.3→4.5 (12.2) |
| 15 | **Den app, der kører i produktionen, mens databasen migreres,** blive ved med at virke — der er ingen nedetid mellem Fase 4 og Fase 5. | 2.7 (bevis på forhånd), 4.6 (på selve aftenen) |

Punkt 8 og 14 er de to, der ikke kan snydes af et øje, der ser det, det
forventer: en md5 er enten den samme, eller også er den ikke.

### 9B. Ændringer, der rammer gamle sager med vilje

Fase 2's domæneregler gælder også bagud. Det er ikke fejl, men det skal siges
højt, før det går live (spørgsmål 5):

| Regel | Hvad der sker med en gammel sag | Hvor mange |
| --- | --- | --- |
| **`Asbest` og `Sod` som prøveart er et fund** | En gammel `Sod`-prøve farves gul i analyseskemaet — også hvis laboratoriet svarede rent. En gammel `Asbest`-prøve viser «Påvist», medmindre laboratoriet har analyseret for asbest — så vinder laboratoriet. Eksportkontrollen advarer om en sådan række, hvis den stadig er på vej til laboratoriet. | Tælles i 4.1. |
| **Mængde kræves på «Næste»** | En gammel prøve uden mængde spærrer «Næste», indtil mængden tastes. Gemte rækker og offline-køen fejler ikke — kravet ligger i knappen. | Tælles i 4.1. |
| **Kameraet beskærer til søgeren** | Nye billeder er stående og viser det, der stod i søgeren. Gamle billeder røres ikke og ser stadig rigtige ud i rapporten. | — |
| **Rapporttypen** | Alle eksisterende sager bliver `miljoescreening` og får præcis den rapport, de havde. Typen kan ikke ændres bagefter. | Alle. |
| **Navigationen** | Sidemenu på skærm, burger på telefon. Samme adresser som før. | — |

---

## 10. Spørgsmålene — besvaret af mennesket, 12. september 2026

| # | Spørgsmål | Anbefaling | Svar |
| --- | --- | --- | --- |
| 1 | **Kontorets indhold på branchen** — 53 materialetekster, 4 fælles tekster, 2 lukninger, 2 omdøbninger: gemmes til fil før wipen (0.1) og lægges på produktionen i 4.7, eller går det med i wipen? | Gem det. Det er deres arbejde og deres faglige ord, og det er *konfiguration*, ikke sager. Bemærk omdøbningerne: prod-prøver med teksten `Isolering`/`Gasbeton` mister koblingen til materialerækken. Det betyder **intet** for en miljøscreening — den slår aldrig materialet op — og der findes ingen selektive sager. Men det er en beslutning, ikke en detalje. | **Ja.** Gem til fil i 0.1, læg på produktionen i 4.7, inklusive de to omdøbninger. |
| 2 | **Læsning fra produktionen til generalprøven** — `pg_dump` af `screening` er ren læsning, men kræver produktionens forbindelsesstreng (databasekodeordet) på udviklermaskinen, og lægger en kopi af produktionens data på branchen, indtil 4.0 sletter den igen. | Ja. Uden den øves migrationen mod noget, der *ligner* jeres data, ikke jeres data. | **Ja.** Kopien slettes igen i 4.0. |
| 3 | **Hvem taster mod produktionen** — agenten selv, eller udvikleren med scriptene foran sig? | Agenten selv, med `psql` i containeren og `$PGURL_PROD` givet én gang. Mennesket er ikke databaseudvikler og skal ikke bedømme svar undervejs; beviserne gør det. | **Agenten selv.** Mennesket leverer de tre nøgler (se «Sådan er ansvaret fordelt») og træffer ingen beslutninger undervejs. |
| 4 | **Vinduet** — hvornår, og hvem bekræfter, at ingen har appen åben? | Et tidspunkt uden nogen i marken. | **Nu.** Ingen er på arbejde, ingen har appen åben. Skulle en telefon have en glemt kø, synker den nye kode den (9A punkt 7). |
| 5 | **De to regler, der gælder bagud** (afsnit 9B) — accepteres? | Ja, det er jeres egne regler. | **Ja, ubetinget.** 4.1's tal rapporteres, men afgør intet. |
| 6 | **Branchen efter go-live** — slettes, eller beholdes som stående testmiljø? | Behold den. Den er nu bygget af filerne med filernes versionsnumre og er dermed et rigtigt testmiljø. | **Beholdes.** |

---

## 11. Bilag — de ni migrationer, én for én

| Fil | Gør | Rører eksisterende rækker? |
| --- | --- | --- |
| `20260824161500_selektiv_ressourcescreening.sql` | Enum `report_type`; `cases.report_type not null default 'miljoescreening'`; enum `building_part` (droppes igen i nr. 3); `samples.building_part`, `material_condition`, `resource_handling` (nullable); delvist indeks. | Nej. Alle sager får default-værdien i kataloget — ingen omskrivning. |
| `20260824193000_bygningsoversigt.sql` | 7 nullable kolonner på `case_buildings`: `floors`, `wall_material_code`, `roof_material_code`, `heating_code`, `usage_note`, `construction_note`, `plan_note`. | Nej. |
| `20260825120000_materialepanel.sql` | Tabel `building_parts` (8 rækker, RLS, to politikker); `samples.building_part_id` (FK, `on delete set null`); enum-kolonnen droppes; `materials.report_name`, `sentence_genbrug`, `sentence_genanvendelse`, `sentence_bortskaffelse`, `sentences_reviewed`. | `update samples` rammer 0 rækker (ingen har `building_part`). |
| `20260825120500_saetninger_fra_skabelonen.sql` | 12 materialer får kundens sætninger; `Beton` får `report_name`. **Spærre:** afbryder, hvis ikke præcis 12 rammer. | Ja — 12 rækker i `materials` får tekst i *nye* kolonner. Navnene røres ikke. |
| `20260825124500_uden_gennemset_flag.sql` | `materials.sentences_reviewed` droppes igen. | Nej (kolonnen er ny). |
| `20260828104500_forureningshaandtering.sql` | `cases.contamination_handling_note` (nullable). | Nej. |
| `20260904120000_bortskaffelsestekster.sql` | `materials.sentence_forurenet`, `sentence_asbest`; kopi fra `sentence_bortskaffelse`. | Kopien rammer 0 rækker på prod (feltet er tomt). |
| `20260909120000_faelles_bortskaffelsestekst.sql` | `app_settings`: `shared_disposal_text = true`. | Én ny række. |
| `20260910120000_farligt_affald_egen_tekst.sql` | `materials.sentence_farligt`; kopi fra `sentence_bortskaffelse`; `app_settings.sentence_farligt` fra `sentence_bortskaffelse`. | Begge kopier rammer 0 rækker på prod. |

Ingen af dem: ændrer en eksisterende kolonnes type, dropper noget `main`-koden
bruger, rører `public`, rører storage, eller kræver `concurrently`. Alle er
transaktionelle: `create type` i samme transaktion som brugen af den er
tilladt (kun `alter type … add value` er det ikke), og et ikke-`concurrently`
indeks kan bygges inde i en transaktion.

**Låsene, konkret:** `alter table … add column` tager `ACCESS EXCLUSIVE` på
`cases`, `samples`, `case_buildings` og `materials`, og de holdes til
`commit`. Alle ni er metadata-ændringer eller rammer under tyve rækker; det
eneste, der læser hele `samples`, er indekset og en `update`, der rammer nul.
Transaktionen tager under ét sekund. Forespørgsler fra appen, der rammer
imens, **venter** — de fejler ikke. Den eneste måde at fejle på er, at en
anden transaktion allerede holder en lås på en af tabellerne i mere end fem
sekunder; så afbryder `lock_timeout` os, intet er ændret, og vi prøver igen.

---

## 12. Bilag — SQL og scripts, der bruges ordret

Det her er ikke eksempler. Det er de spørgsmål, der stilles til branchen og
produktionen, og de skal være **de samme** begge steder, ellers kan svarene
ikke sammenlignes. Ret dem ikke undervejs; ret dem i planen, hvis de er
forkerte.

### 12.1 Skemalisten (0.6, 2.6, 3.7, 4.1, 4.5)

Én forespørgsel, ét svar: listen og dens md5. Sorteret, uden OID'er og ejere,
så to databaser med samme skema giver samme tekst.

```sql
with dele as (
  select 'kolonne ' || table_name || '.' || column_name || ' ' || data_type
       || case when udt_schema = 'screening' then ' (' || udt_name || ')' else '' end
       || case when is_nullable = 'NO' then ' not null' else '' end
       || coalesce(' default ' || column_default, '') as linje
  from information_schema.columns where table_schema = 'screening'
  union all
  select 'constraint ' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
  from pg_constraint k join pg_class c on c.oid = k.conrelid
  where k.connamespace = 'screening'::regnamespace
  union all
  select 'indeks ' || indexdef from pg_indexes where schemaname = 'screening'
  union all
  select 'politik ' || tablename || '.' || policyname || ' ' || cmd
       || ' roles=' || array_to_string(roles, ',')
       || ' using=' || coalesce(qual, '') || ' check=' || coalesce(with_check, '')
  from pg_policies where schemaname = 'screening'
  union all
  select 'rls ' || c.relname || ' enabled=' || c.relrowsecurity::text || ' forced=' || c.relforcerowsecurity::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'screening' and c.relkind = 'r'
  union all
  select 'funktion ' || p.proname || ' ' || md5(pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'screening'
  union all
  select 'trigger ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'screening' and not t.tgisinternal
  union all
  select 'enum ' || t.typname || ' ' || string_agg(e.enumlabel, ',' order by e.enumsortorder)
  from pg_type t join pg_namespace n on n.oid = t.typnamespace join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'screening' group by t.typname
  union all
  select 'grant ' || table_name || ' ' || grantee || ' ' || string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'screening' and grantee in ('authenticated', 'service_role', 'anon')
  group by table_name, grantee
)
select md5(string_agg(linje, chr(10) order by linje)) as md5,
       string_agg(linje, chr(10) order by linje) as liste
from dele;
```

Forespørgslen ligger som `supabase/ops/skemaliste.sql`. Mod den lokale stak:

```
docker run --rm -i -e PGCLIENTENCODING=UTF8 -v "$(pwd -W)/supabase/ops:/w" -w /w postgres:17 \
  psql "postgresql://postgres:postgres@host.docker.internal:54322/postgres" -At -F $'\t' -f skemaliste.sql
```

Mod branchen eller produktionen: samme kommando med `$PGURL_BRANCH`/`$PGURL_PROD`,
eller filens indhold gennem MCP `execute_sql`. Svaret er én række: md5, tab,
liste. Listen gemmes som fil (`skema-basis.txt`, `skema-fase2.txt`), ikke kun
md5'en: afviger to md5'er, skal man kunne `diff` de to lister og se *hvad*.

| Tilstand | md5 | Linjer | Fil |
| --- | --- | --- | --- |
| Produktionens skema (11 migrationer) | `982a253bed9339988695b362769c67d3` | 251 | `skema-basis.txt` |
| Fase 2 (20 migrationer) | `0eae9171f6330081f8eeeef71032e849` | 289 | `skema-fase2.txt` |

Begge er fremstillet den 12. september 2026 af den lokale stak, bygget af
filerne. Branchen gav det samme fase-2-tal.

### 12.2 Rækketal og md5 af gamle kolonner (2.4, 2.6, 4.3, 4.5)

Rækketal for alle tabeller i `screening`:

```sql
select 'app_settings' as tabel, count(*) as n from screening.app_settings
union all select 'app_users', count(*) from screening.app_users
union all select 'building_parts', count(*) from screening.building_parts  -- kun efter migrationen
union all select 'case_buildings', count(*) from screening.case_buildings
union all select 'case_files', count(*) from screening.case_files
union all select 'cases', count(*) from screening.cases
union all select 'exports', count(*) from screening.exports
union all select 'lab_results', count(*) from screening.lab_results
union all select 'materials', count(*) from screening.materials
union all select 'sample_photos', count(*) from screening.sample_photos
union all select 'sample_types', count(*) from screening.sample_types
union all select 'samples', count(*) from screening.samples
order by 1;
```

Før migrationen udelades linjen med `building_parts` (tabellen findes ikke).
**Forventede forskelle før/efter:** `app_settings` +1 (`shared_disposal_text`),
`building_parts` 8. **Alt andet identisk.**

md5 af de *gamle* kolonner — kolonnerne skrives eksplicit, for `row::text` af
hele rækken ville tage de nye, tomme kolonner med og altid afvige. Kolonnerne
tages fra `skema-basis.txt`, i den rækkefølge de står der. Mønstret, vist for
`samples` og `materials`:

```sql
select 'samples' as tabel, count(*) as n,
       md5(string_agg((id, case_id, seq, material, sample_type, building_id, building_ids,
                       location_note, estimated_tons, period, analysis_pcb, analysis_asbestos,
                       analysis_metals, analysis_pah, comment, created_by, created_at, updated_at,
                       is_lab_sample, label)::text, '|' order by id)) as md5
from screening.samples
union all
select 'materials', count(*),
       md5(string_agg((id, name, sort_order, active)::text, '|' order by id))
from screening.materials;
```

Én linje pr. tabel, alle elleve. `app_settings` sorteres på `key`, `lab_results`
på `sample_id`. Migrationen skriver i **ingen** af de gamle kolonner, så alle
elleve md5'er skal være identiske før og efter — også `materials`, hvor kun
de nye kolonner får tekst.

**Rettelse: `app_settings` kan ikke måles over alle rækker.** Migration 8
*lægger* `shared_disposal_text` i tabellen, og nr. 9 kan lægge
`sentence_farligt`. Md5 over alle rækker ville derfor altid afvige, og et tal,
der altid afviger, beviser ingenting. Påstanden i 9A punkt 14 er, at
migrationen ikke skriver i en eksisterende **celle** — så de to nye nøgler
holdes uden for md5'en (`where key not in (…)`), og rækketallet fanger, at der
kom præcis én til. De øvrige ti måles over alt.

### 12.3 Pre-flight på produktionen (4.1) — kun læsning

Forventet svar står ved hver. Afviger ét, er 4.1 et fejlet bevis: stop.

```sql
-- 1. Historikken: de elleve screening-migrationer med filernes numre. Forventet: 11 raekker,
--    versioner fra 20260725173107 til 20260804111609, ingen senere.
select version, name from supabase_migrations.schema_migrations
where version >= '20260725173107' order by version;

-- 2. Skemalisten (12.1). Forventet: md5 = skema-basis.txt.

-- 3. De tolv navne, spaerren kraever. Forventet: 12.
select count(*) from screening.materials where name in (
  'Beton (undtagen, gasbeton, letbeton)', 'Puds', 'Eternit, asbestfri', 'Gips', 'Fugemasse',
  'Tapet', 'Isolering', 'Tæppe', 'Glasseret tegl / Fliser / Klinker', 'Tagpap',
  'Uglaseret tegl (mur- og tagsten)', 'Vinduer');

-- 4. Provearterne, reglen visueltFund bygger paa. Forventet: 3 raekker.
select name from screening.sample_types where name in ('Asbest', 'Sod', 'Mulig asbest');

-- 5. Intet af det nye findes allerede. Forventet: 0, 0, 0 og kun 'eurofins_analyses_details'.
select count(*) from information_schema.columns where table_schema = 'screening' and column_name in (
  'report_type', 'building_part', 'building_part_id', 'material_condition', 'resource_handling',
  'contamination_handling_note', 'floors', 'wall_material_code', 'roof_material_code', 'heating_code',
  'usage_note', 'construction_note', 'plan_note', 'report_name', 'sentence_genbrug',
  'sentence_genanvendelse', 'sentence_bortskaffelse', 'sentence_forurenet', 'sentence_asbest',
  'sentence_farligt', 'sentences_reviewed');
select count(*) from information_schema.tables where table_schema = 'screening' and table_name = 'building_parts';
select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'screening' and t.typname in ('report_type', 'resource_handling', 'building_part');
select key from screening.app_settings order by key;

-- 6. Raekketal (12.2) og md5 af gamle kolonner (12.2). Gemmes som foer-prod.txt.

-- 7. Adfaerdsaendringerne (afsnit 9, spoergsmaal 5). Tallene rapporteres, de er ikke et bevis.
select sample_type,
       count(*) as i_alt,
       count(*) filter (where is_lab_sample) as med_analyser,
       count(*) filter (where exists (select 1 from screening.lab_results r where r.sample_id = s.id)) as med_labsvar
from screening.samples s where sample_type in ('Asbest', 'Sod') group by 1;
select count(*) as uden_maengde from screening.samples where estimated_tons is null or estimated_tons <= 0;

-- 8. PostgREST udstiller screening. Forventet: en streng, der indeholder 'screening'.
select s from pg_db_role_setting r join pg_roles ro on ro.oid = r.setrole, unnest(r.setconfig) s
where ro.rolname = 'authenticator' and s like 'pgrst.db_schemas%';
```

### 12.4 Generatoren til `fase2-prod.sql` (Fase 1)

`supabase/ops/byg-fase2-prod.js`, køres med `node supabase/ops/byg-fase2-prod.js`.
Den skriver `fase2-prod.sql` og `fase2-prod.md5` — den sidste er md5 af hver
fil, som den ligger i `supabase/migrations/`, og det er den, historikken
holdes op mod i 4.5.

```js
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
```

Historikken efter migrationen (2.6 og 4.5) — forventet: ni rækker, hvis md5
stemmer linje for linje med `fase2-prod.md5`:

```sql
select version, name, md5(statements[1]) as md5
from supabase_migrations.schema_migrations
where version >= '20260824161500' order by version;
```

### 12.5 `fase2-rollback.sql` (Fase 1, øves i 3.7)

Omvendt rækkefølge af de ni. Én transaktion. Check-constrainten og indekset
på `samples` og politikkerne på `building_parts` forsvinder med det, de sidder
på. `comment on` nulstilles, så basislinjen kan rammes byte for byte.

```sql
begin;
set local lock_timeout = '5s';

-- 20260910 farligt_affald_egen_tekst
delete from screening.app_settings where key = 'sentence_farligt';
alter table screening.materials drop column sentence_farligt;
comment on column screening.materials.sentence_bortskaffelse is null;

-- 20260909 faelles_bortskaffelsestekst
delete from screening.app_settings where key = 'shared_disposal_text';
comment on table screening.app_settings is null;

-- 20260904 bortskaffelsestekster
alter table screening.materials drop column sentence_forurenet, drop column sentence_asbest;

-- 20260828 forureningshaandtering
alter table screening.cases drop column contamination_handling_note;

-- 20260825124500 uden_gennemset_flag: intet — kolonnen er allerede vaek
-- 20260825120500 saetninger_fra_skabelonen: intet — teksterne bor i kolonner, der droppes herunder

-- 20260825120000 materialepanel
alter table screening.materials
  drop column report_name, drop column sentence_genbrug,
  drop column sentence_genanvendelse, drop column sentence_bortskaffelse;
alter table screening.samples drop column building_part_id;
drop table screening.building_parts;

-- 20260824193000 bygningsoversigt
alter table screening.case_buildings
  drop column floors, drop column wall_material_code, drop column roof_material_code,
  drop column heating_code, drop column usage_note, drop column construction_note,
  drop column plan_note;

-- 20260824161500 selektiv_ressourcescreening
alter table screening.samples drop column material_condition, drop column resource_handling;
alter table screening.cases drop column report_type;
drop type screening.resource_handling;
drop type screening.report_type;

delete from supabase_migrations.schema_migrations where version in (
  '20260824161500', '20260824193000', '20260825120000', '20260825120500', '20260825124500',
  '20260828104500', '20260904120000', '20260909120000', '20260910120000');

notify pgrst, 'reload schema';
commit;
```

Hvis `fase2-indhold.sql` (4.7) er kørt, tager rollbacken kontorets tekster
med — de bor i de kolonner, der droppes. Det er endnu en grund til, at
`branch-indhold-2026-09-12.sql` ligger som fil.

### 12.6 Wipe af branchen (0.2–0.3 og 4.0)

Storage først. `delete from storage.objects` fjerner rækken og ikke filen bag
den — de bliver liggende som forældreløse blobs. Det er acceptabelt her og
kun her: branchen er et testprojekt, og en fil uden objektrække kan ikke nås
gennem API'et. Gør det **aldrig** i produktionen. Derefter rækkerne:

```sql
-- Bevis for, at storage er tomt (efter API-sletningen):
select bucket_id, count(*) from storage.objects
where bucket_id in ('screening-photos', 'screening-rapport') group by 1;   -- forventet: ingen raekker

-- Sagerne, og alt der haenger paa dem (CASCADE):
delete from screening.cases;

-- Brugere, der ikke er de to testlogins (4.0: produktionens brugere fra generalproeven):
delete from screening.app_users where email not in ('kontor@fase2.test', 'screener@fase2.test');
delete from auth.users where email not in ('kontor@fase2.test', 'screener@fase2.test');

-- Bevis:
select 'cases', count(*) from screening.cases
union all select 'case_buildings', count(*) from screening.case_buildings
union all select 'samples', count(*) from screening.samples
union all select 'sample_photos', count(*) from screening.sample_photos
union all select 'case_files', count(*) from screening.case_files
union all select 'exports', count(*) from screening.exports
union all select 'lab_results', count(*) from screening.lab_results
union all select 'app_users', count(*) from screening.app_users;   -- 0,0,0,0,0,0,0,2
```

I Fase 0 gøres det *før* `reset_branch`, så der ikke ligger forældreløse filer
i storage bag en nulstillet database. `reset_branch` fjerner selv resten.

### 12.6a Storage kan ikke længere slettes bart — flaget skal med

Det bare `delete from storage.objects` ovenfor **virker ikke mere.** Supabase har
tilføjet en trigger, `protect_objects_delete` (`BEFORE DELETE … FOR EACH
STATEMENT`), og den svarer ordret:

```
ERROR:  Direct deletion from storage tables is not allowed. Use the Storage API instead.
HINT:   This prevents accidental data loss from orphaned objects.
CONTEXT: PL/pgSQL function storage.protect_delete() line 5 at RAISE
```

Triggeren har Supabases egen dør indbygget, og den står i funktionens krop — den
er **læst, ikke gættet**:

```sql
IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true'
  THEN RAISE EXCEPTION …
```

Sletningen ligger derfor som `supabase/ops/wipe-branch-storage.sql` med
`set local storage.allow_delete_query = 'true'` foran. **`set local`, ikke
`set`:** flaget gælder kun den ene transaktion, så beskyttelsen står urørt for
alt andet bagefter — også for det næste, nogen kører i samme session.

Første forsøg fejlede og slettede **nul** rækker (transaktionen blev afbrudt);
med flaget gav den `DELETE 118` og begge buckets på nul. Bruges igen i 4.0.

Reglen om produktionen står uændret: dér fjernes filerne gennem Storage-API'et
**før** rækkerne, aldrig omvendt. Flaget her er en tilladelse til at efterlade
forældreløse blobs i et testprojekt, og det er den eneste grund til, at det er
i orden.

### 12.7 Stubbe i `auth.users` til produktionens brugere (2.2)

Opskriften er `seed.sql`, linje 56–79: samme kolonner, samme fire tomme
token-kolonner. For hver række i dumpets `screening.app_users` indsættes
`(id, email)` fra dumpet, `encrypted_password = crypt(gen_random_uuid()::text,
gen_salt('bf'))` — et kodeord, ingen kender — og ingen `auth.identities`, så de
ikke kan logge ind. Rækkerne slettes igen i 4.0.
