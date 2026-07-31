<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nemscreening

Læs `README.md` først — den forklarer kæden fra sag til rapport, hvor tingene
ligger, og hvordan databasen er skruet sammen. Herunder står kun det, der er
let at bryde.

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
- **Påvist asbest er farligt affald.** Rød, hver gang. Der er intet gult
  mellemniveau og ingen manuel vurdering af om den støver — den vurdering
  fandtes, og den blev ikke sat.

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

**Papiret er liggende A4.** Stående giver de seksten kolonner 186 mm at dele,
og så brækker hvert tal i to linjer. Ændr `@page` med omtanke.

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

**Side 1 er en forside** i navy med mærkets mint (`.forside` i
`globals.css`). Den går til papirets kant og har derfor sin egen `@page
forside` med margin nul — resten af rapporten beholder sine 12 mm. Side 2 er
oplysningerne: BBR til venstre, firmaet til højre. Firmaets adresse, telefon,
e-mail og CVR er de samme hver gang og står i `src/lib/rapport/firma.ts`; kun
navnet på den, der har lavet rapporten, kommer fra den indloggede bruger.

**Logoet skal på hver side.** Det ligger i `public/logo/` — se `LAESMIG.md`
dér — og bruges gennem `src/components/Logo.tsx`. Sidehovedet står inde i hver
sektion og ikke som et `position: fixed`-element: en fastgjort kasse kan ikke
undtage forsiden og følger ikke med, når bilagssiderne skifter til stående
papir. Derfor er metodeteksten delt i grupper à en side (`RAPPORT_SIDER`) —
et afsnit, der selv brækker over to ark, ville efterlade det andet uden mærke.

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

Arbejd på en gren, flet til `main`, push. Vercel bygger `main` som produktion.
