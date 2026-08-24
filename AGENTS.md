<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nemscreening

Læs `README.md` først — den forklarer kæden fra sag til rapport, hvor tingene
ligger, og hvordan databasen er skruet sammen. Herunder står kun det, der er
let at bryde.

## LÆS DETTE FØRST: fase 2 er i gang

Der bygges en version 2 med brydende ændringer. Den skal kunne kasseres i sin
helhed, og den må ikke kunne røre det, der er live. Derfor gælder følgende, og
det vejer tungere end alt andet i denne fil.

**Arbejd på grenen `fase-2`. Flet den ikke til `main`.** Vercel bygger `main`
som produktion; ethvert push dertil går live med det samme. Afsnittet
«Udrulning» nedenfor beskriver den normale rutine — den er sat ud af kraft,
indtil fase 2 er færdig og nogen udtrykkeligt beder om at flette.

**Databasen deles med hjemmesiden.** Samme Supabase-projekt huser
nemscreening.dk: `public` indeholder websitets leads, bookinger og indlæg —
rigtige forretningsdata, ikke testdata. Screening-appen bor i `screening`.

> Rør aldrig `public`. Kør aldrig noget mod produktionsprojektet
> `mwityvqavrqxqaunvtdg` — heller ikke læsninger, med mindre nogen beder om
> det. Brug ikke Supabases «merge branch»-knap: den kører migrationer mod
> produktionen og rammer dermed også websitet.

De to skemaer kan skilles rent ad — ingen fremmednøgle går fra `screening` ind
i `public` — men `auth` er **fælles**. En kunde, der logger ind på hjemmesiden,
er allerede `authenticated` her. Gate derfor aldrig adgang på `authenticated`
alene, altid på `screening.is_member()`, `is_office()` eller `is_admin()`.

### Hvor du udvikler

| Miljø | Hvornår |
| --- | --- |
| Lokal Docker-stak | Standard. Alt udviklingsarbejde og alle skemaændringer. |
| Supabase-branchen `fase-2` | Når noget skal ses mod den delte test-database. |
| Produktion | Aldrig. |

Skift med `cp .env.local.lokal .env.local` eller `cp .env.local.branch
.env.local` (filerne er gitignorerede og ligger kun på udviklerens maskine —
findes de ikke, spørg efter dem frem for at gætte).

Start den lokale stak med `npx supabase start`. Den bygger databasen op fra
`supabase/migrations/` og fylder den med `supabase/seed.sql`.

**Fortryd-knappen er `npx supabase db reset`.** Den river databasen ned og
bygger den op igen fra migrationer og seed på få sekunder. Brug den frit — det
er hele grunden til, at fase 2 kan laves uden risiko.

### Skemaændringer

Skemaet kommer fra filerne i `supabase/migrations/`, aldrig omvendt. Skriv en
ny migrationsfil, afprøv den med `db reset` lokalt, og anvend den derefter på
`fase-2`-branchen.

**Ret aldrig skemaet direkte i dashboardet eller SQL-editoren.** Så driver
filerne fra virkeligheden, og evnen til at bygge miljøet op igen forsvinder —
det var netop det problem, `supabase/LAESMIG.md` beskriver, og det kostede en
dags oprydning at komme ud af.

### Test-login

Begge brugere findes i den lokale stak og i `fase-2`-branchen, aldrig i
produktionen. Adgangskode for begge: `fase2-test`.

- `kontor@fase2.test` — admin, må alt
- `screener@fase2.test` — screener, må ikke skrive i `lab_results`

Brug den sidste til at efterprøve, at rolleadskillelsen holder.

Læs `supabase/LAESMIG.md` før du rører databasen. Den forklarer, hvordan
migrationerne blev til, hvad en Supabase-branch faktisk er, og de to fælder en
ny branch falder i.

## Sprog og form

- Alt brugeren ser er **dansk** med æøå.
- Kodekommentarer er **dansk uden æøå**: `raekke`, `prove`, `naeste`,
  `graense`. Undtagelsen er citerede tekster og kolonnenavne — `"Kviksølv
  (Hg)"` skrives som det står i filen.
- Kommentarer forklarer **hvorfor**, ikke hvad. Koden siger allerede hvad.
- Commit-beskeder er danske og i samme tone: hvad der blev ændret, og hvorfor
  det var forkert før.

## Kør altid dette

```bash
npm run verify:eurofins && npm run verify:lab && npx tsc --noEmit && npm run lint && npm run build
```

De to `verify`-scripts er den eneste rigtige testdækning. De kører uden
database og uden browser. Rør du `src/lib/eurofins/` eller `src/lib/lab/`,
skal de køre — og udvid dem, når du tilføjer noget.

Der er ingen automatiseret browsertest. Kan du ikke se ændringen i en browser,
så **sig det** i stedet for at melde den færdig.

## Regler der koster penge at bryde

**Eurofins-eksporten må ikke bygges fra bunden.** Vi udfylder deres egen
`.xlsx`-skabelon og kopierer hver anden byte uændret. Skabelonen har fem
skjulte ark, og `Order_Metadata` binder filen til kunde, kontrakt og
ordreskabelon. Uden dem afviser deres import filen. Læs
`src/lib/eurofins/skabelon/LAESMIG.md` før du rører noget der.

**Grænseværdierne bor ét sted**, i `src/lib/lab/parametre.ts`. De afgør om et
materiale er rent, forurenet eller farligt affald. Ændr dem aldrig på et gæt —
de kommer fra Nemscreenings egen tabel. `src/lib/lab/LAESMIG.md` forklarer
hvad der er verificeret mod rigtige data, og hvad der ikke er.

**Prøvetagningen er offline først.** Alt skrives til IndexedDB og
synkroniseres bagefter. Antag aldrig at en skrivning er landet i Supabase, og
læg aldrig noget i flowet der kræver netværk for at komme videre.

**Databasen ligger i skemaet `screening`.** RLS er slået til. Kun `office` og
`admin` må skrive i `lab_results`; UI'et skal vise det frem for at fejle.

## Domæneregler der ligner detaljer, men ikke er det

- Prøven får **P foran nummeret** når mindst én analyse er valgt. Uden analyse
  er den kun kortlagt og kommer ikke med til laboratoriet: `P1, 2, P3, P4`.
- **Numre genbruges ikke.** Sletter man P3, hedder de næste stadig P4 og P5 —
  poserne i bilen er mærket.
- **Efter 1990 udelukker PCB og asbest.** Reglen ligger i `src/lib/types.ts` og
  bruges både i prøvetagningen og i eksportkontrollen.
- En prøve kræver **lokalitet og mindst ét billede**. Materiale og prøveart er
  frivillige — en tom prøve er tilladt og kommer ikke med til laboratoriet.
- **Højst to billeder pr. prøve.**
- **Prøvetagningen åbner der hvor man slap.** Uden `?seq=` i adressen er man
  kommet fra "Fortsæt prøvetagning", og så skal man tilbage til den senest
  rørte prøve — ikke til en ny, blank. En ny er et tryk væk; den halvfærdige
  man forlod er ikke.
- **Påvist asbest er farligt affald.** Rød, hver gang. Der er intet gult
  mellemniveau og ingen manuel vurdering af om den støver — den vurdering
  fandtes, og den blev ikke sat.

## Lokalitet

**En prøve kan dække flere bygninger.** Den hvide facademaling går hele vejen
rundt, og der er ingen grund til at bestille den samme analyse tre gange.
Bygningerne står i `samples.building_ids` i den rækkefølge de blev valgt.

**Men kun den første følger med til næste prøve.** Flere bygninger er
undtagelsen og gælder som regel én prøve. Arvede næste prøve hele listen,
skulle screeneren fjerne to bygninger igen og igen resten af dagen.

**`building_id` er afledt** af `building_ids[0]` og skrives kun med, fordi den
har fremmednøglen og fordi noget uden for appen kan læse den. Appen selv læser
altid listen. Læg aldrig en beslutning i den kolonne.

**Listen har ingen fremmednøgle.** En trigger på `case_buildings`
(`fjern_slettet_bygning`) fjerner id'et fra alle prøver, når en bygning
slettes — og `saveBuildings` sletter dem alle sammen, hver gang BBR hentes
igen. Uden den ville `building_ids[0]` kunne pege på en bygning der ikke
findes, og synkroniseringen ville fejle på fremmednøglen resten af dagen.
Prøvetagningen sorterer derudover ukendte id'er fra, når den indlæser.

Lokaliteten er **intern information**. Den står i rapporten og på sagen, men
styrer intet i eksporten til laboratoriet.

## Sletning

**Der slettes ét lag ad gangen, med flueben ved hvert.** `SletDialog` tager en
liste over hvad der forsvinder, og "Slet" åbner sig først når de alle er sat.
Et enkelt "er du sikker?" bliver trykket væk uden at blive læst, og det der
forsvinder er altid mere end det man trykkede på. Tomme lag springes over — et
flueben ved "0 billeder" lærer kun folk at sætte flueben uden at læse.

**Databasen rydder selv op.** Fremmednøglerne fra `cases` til
`case_buildings`, `samples`, `case_files` og `exports` står på CASCADE, og
`samples` tager `sample_photos` og `lab_results` med. Det er én sletning, ikke
syv der hver kan fejle halvvejs. Slet ikke børnene i hånden først.

**Men storage kender databasen ikke.** Billederne i `screening-photos` og
bilagene i `screening-rapport` bliver liggende, når rækkerne er væk. Stierne
skal derfor læses ud **før** sletningen — bagefter er der ikke noget tilbage
at spore dem med — og fjernes bagefter, aldrig omvendt: en rapport der peger
på et billede der ikke findes, er værre end en forladt fil i en bucket. Hent
dem i sider: PostgREST sender højst 1000 rækker, og en sag med tusind prøver
har to tusind billeder.

**RLS afviser ved at slette nul rækker, ikke ved at give en fejl.** Sæt
`.select("id")` på enhver sletning og tjek at der kom noget tilbage. Uden den
får brugeren at vide at sagen er slettet, og ser den ligge der igen ved næste
opdatering.

**Kun `office` og `admin` må slette en sag** (`cases_delete` kræver
`is_office()`) — samme grænse som `lab_results`. Prøver må derimod slettes af
ethvert medlem. UI'et deler den på samme måde: knappen vises ikke for den der
alligevel ville få nej.

**Prøvesletningen er offline først** som resten af prøvetagningen. Det lokale
i IndexedDB ryddes først; ellers kan en synk der er i gang nå at skrive rækken
op igen, eller et foto uden prøve blive liggende i køen og fejle på
fremmednøglen resten af dagen. Netværket må ikke kunne spærre vejen — men nåede
rækken ikke til Supabase, skal det siges, ikke ties ihjel.

Og husk at **numre ikke genbruges**: se domænereglerne ovenfor.

## Udseende

Appen er **lys, altid** — den følger ikke styresystemet. Paletten er
nemscreening.dk's egen (navy, mint, bone) og ligger i `:root` i `globals.css`
sammen med `color-scheme: light`. Tilføj ikke `dark:`-varianter eller et
`prefers-color-scheme`-blok uden at spørge; et halvt mørkt tema er værre end
ingen.

Knapper har både `hover:` og `active:`. Tailwinds `hover` sidder bag
`@media (hover: hover)`, så den ikke hænger fast efter et tryk på telefonen.

## Rapporten

Printes til PDF fra browseren. Rapporten **bygges ikke** af et PDF-bibliotek —
sideskift ligger i `.print-side` i `globals.css`, og farverne er tvunget
igennem med `print-color-adjust`, ellers kommer skemaet ud i gråtoner.

`pdfjs-dist` er den eneste undtagelse, og den **læser** kun: Eurofins'
analyserapport tegnes om til ét billede pr. side ved upload, fordi en browser
ikke printer indholdet af en indlejret PDF med. Se
`src/lib/rapport/pdfsider.ts`. Biblioteket hentes med et dynamisk `import()`,
så det ikke ligger i den bundt marken henter for at tage en prøve. Brug det
ikke til at *bygge* PDF'er — så er vi tilbage ved to rapporter der kan sige
hver sit.

**Papiret er stående A4**, og det hænger sammen med at
**analyseskemaets overskrifter står på højkant**. De to kan ikke skilles ad.

Arket lå ned, fordi seksten kolonner ikke kunne dele 186 mm uden at hvert tal
brækkede i to linjer. Det var rigtigt, så længe overskriften lå ned med dem:
`Chlorerede paraffiner` er fem gange bredere end sin kolonne. Rejst op koster
overskriften ingen bredde, og så er det tallet der sætter målet — `< 2500`
fylder 9,2 mm af de 10,3 en analysekolonne har, når cellernes sideluft holdes
nede (`--skema-sideluft`). Det er også sådan de rapporter, kunden kender i
forvejen, er sat.

Lægger du overskrifterne ned igen, skal papiret vendes i samme ombæring — og
omvendt. Ellers brækker tallene, præcis som før.

Gevinsten er siden med prøven: to billeder ved siden af hinanden går fra
128 × 85 mm til 89 × 130. Billederne er taget stående med en telefon, så det er
højden der afgør hvor stort motivet bliver.

**Der må kun være ÉN `@page`-regel**, og dens margin er nul. Sidemarginen
ligger som `padding: 12mm` inde i hver sektion i stedet. Det lyder omvendt,
men det er det eneste der giver både en forside der går til kant og et
analyseskema der passer.

Det er prøvet med navngivne sider — `@page forside` med margin nul og
`@page bilag` i stående — og så blev **skemaet klippet**: browseren satte
indholdet op mod det ene sideboks-mål og tegnede det ind i det andet, 297 mm
mod 273 mm, altså otte procent skåret af i højre side. Det svarede til
halvanden analysekolonne. Tilføj ikke en navngiven side uden at printe en
rapport med et fuldt skema bagefter og tælle kolonnerne.

Analyseskemaets streger, kolonnebredder og rækkehøjder ligger i `.skema` i
`globals.css` — ikke i `ResultatSkema.tsx`. Tabellen er `table-layout: fixed`
med en `colgroup` i procent, så den passer både i skærmens designbredde og i
papirets bredde. På skærmen skaleres den ned af `TilpasBredde` i stedet for at
få en vandret rullebjælke; `@media print` sætter den transform ud af kraft.

**Grænseværdirækkerne under skemaet er ikke farvelagt**, og de er undtaget
skemaets mindstehøjde på to linjer. Kun prøvens egne felter har farve. Farver
man også grænserne, står der rødt og gult på hver eneste side i rapporten, og
så holder farven op med at betyde noget.

Til gengæld **er** grænseværdisiden farvelagt — den er ét sted i rapporten og
er netop den side der forklarer hvad grøn, gul og rød betyder. Den bygges af
`GRAENSE_RAEKKER` i `parametre.ts`, så tallene ikke kan komme til at sige
noget andet end skemaet. Rækkefølgen dér følger den tabel kunderne kender, og
ikke skemaets kolonner.

**Rapportens bilag** — forsidebillede, plantegning og Eurofins' PDF'er —
ligger i `screening.case_files` og i bucket'en `screening-rapport`. Ikke i
`sample_photos`: den hænger på en prøve og tager kun billeder. Alle bilag er
frivillige; mangler de, springes siderne over frem for at efterlade et tomt
ark.

RLS på `case_files` er **delt efter hvem der ejer materialet**: billeder er
markarbejde og må skrives af ethvert medlem, mens `eurofins_pdf` og
`eurofins_side` hører til laboratoriesvaret og kræver `is_office()` — samme
grænse som `lab_results`. UI'et deler den på samme måde, så det ikke lover
noget databasen afviser.

**Side 1 er en forside** med forsidebilledet i fuld flade (`.forside` i
`globals.css`). Overlayet er to gradienter og ikke en dækkende flade: toppen
lige nok til at mærket kan ses mod en lys himmel, bunden nok til at
overskriften kan læses, og midten — huset — rørt så lidt som muligt. Er der
ikke taget et billede, står navy'en alene. Forsiden går til papirets kant —
den er den ene sektion uden `padding`, se reglen om `@page` ovenfor.

**Forsidebilledet tages, når sagen oprettes** — samme greb som i
prøvetagningen, en firkant med live-kamera man trykker på. Det kan ikke
uploades med det samme, for sagen findes ikke endnu: derfor returnerer
`createCase` sagens id i stedet for at omdirigere, og browseren lægger
billedet op og navigerer først bagefter. Går uploaden galt, navigerer vi
alligevel — sagen ER oprettet, og billedet kan lægges op igen fra
resultatsiden.

Side 2 er oplysningerne: BBR til venstre, firmaet til højre. Firmaets adresse,
telefon, e-mail og CVR er de samme hver gang og står i
`src/lib/rapport/firma.ts`; kun navnet på den, der har lavet rapporten, kommer
fra den indloggede bruger.

**Logoet skal på hver side.** Det er én fil i `public/logo/` — se `LAESMIG.md`
dér — og bruges gennem `src/components/Logo.tsx`. Sidehovedet står inde i hver
sektion og ikke som et `position: fixed`-element: en fastgjort kasse kan ikke
undtage forsiden, og den skal kunne tage plads fra bilagets billede.
Derfor er metodeteksten delt i grupper à en side (`RAPPORT_SIDER`) —
et afsnit, der selv brækker over to ark, ville efterlade det andet uden mærke.

Eurofins-bilaget er stående sider på et stående ark, og går op i 89 % uden
spildt papir. Dengang arket lå ned, måtte den samme side ned på 58 % og
efterlod 75 mm tomt i hver side — og billedet fik sin højde af `flex: 1` i en
spalte uden fast højde, altså ingenting, så det løb ud over sidehovedet i
stedet. Højden på `.print-bilag img` skal stå i hånden.

Der er **én plantegning, men flere dokumenter fra Eurofins** — analyserapport
og asbestappendiks kommer som hver sin fil. `doc_id` binder et bilags PDF
sammen med dens sider, så ét bilag kan fjernes uden at de andre følger med, og
`doc_order` er bilagets plads bagest. Hent altid med
`.order("doc_order").order("sort_order")`: to bilag har begge en side 1, så
sidetallet alene hverken sorterer eller duer som React-nøgle.

## Om data

Sagerne i Supabase er **testdata** pr. juli 2026 og slettes inden go-live.
Uoverensstemmelser i dem er ikke fejl der skal migreres væk.

## Udrulning

> **Sat ud af kraft, mens fase 2 bygges.** Flet ikke til `main` uden at nogen
> udtrykkeligt beder om det — se afsnittet øverst i filen. Resten her beskriver
> den normale rutine, som gælder igen bagefter.

Arbejd på en gren, flet til `main`, push. Vercel bygger `main` som produktion.

### Preview mod en test-database

Enhver anden gren end `main` bygges af Vercel som Preview. Preview har sit
**eget sæt miljøvariabler**, adskilt fra Production, så en preview kan pege på
en anden database uden at røre den live. `fase-2` peger på Supabase-branchen
af samme navn; se `supabase/LAESMIG.md`.

To ting koster tid, hvis man ikke kender dem:

**`NEXT_PUBLIC_*` bages ind i buildet.** Ændrer du dem i Vercel, gælder det
først for *næste* deployment — den eksisterende har de gamle værdier indeni.
Symptomet er, at appen stædigt taler med den forkerte database, uanset hvad
dashboardet viser. Der skal bygges igen.

**Vercel afviser `NEXT_PUBLIC_*` som «Sensitive»** på Preview og Production.
Ældre variabler kan stå som Sensitive fra dengang det var tilladt, men et
forsøg på at rette dem fejler — og fejlen er let at overse, så man tror at
værdien er gemt. De skal tilføjes med `--no-sensitive`. Det er der ingen skade
i: en `NEXT_PUBLIC_`-variabel ligger i browserens bundt i forvejen.

Sådan afgøres det, hvilken database en preview faktisk bruger: log ind og se
på sagslisten. Test-databasen har **én** sag, Nørrebrogade 12, med prøverne
P1, P2, 3, P4, P5. Produktionen har snesevis. De kan ikke forveksles.
