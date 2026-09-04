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
npm run verify:eurofins && npm run verify:lab && npm run verify:ressourcer && npx tsc --noEmit && npm run lint && npm run build
```

De tre `verify`-scripts er den eneste rigtige testdækning. De kører uden
database og uden browser. Rør du `src/lib/eurofins/`, `src/lib/lab/` eller
`src/lib/rapport/`, skal de køre — og udvid dem, når du tilføjer noget.

`verify:ressourcer` kan ikke længere prøve rapportens tekst; den ligger i
databasen. Den prøver til gengæld alt det, der ikke må kunne rettes ved et uheld:
hvad der bliver en ressource, mængderne fra ton til kilo, rækkefølgen af
overskrifter, sideopdelingen, analyseskemaets bredde og BBR's kodelister. Og den
holder migrationen med sætningerne op mod den, der seeder materialelisten — et
navn stavet forkert dér giver ikke en fejl, men en rapport hvor et materiale
mangler sin sætning.

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
- En prøve kræver **lokalitet**. Materiale og prøveart er frivillige — en tom
 prøve er tilladt og kommer ikke med til laboratoriet.
- **Et billede kræves kun, når der er valgt en analyse.** Billedet dokumenterer
 hvor prøven i posen blev taget, og det er ufravigeligt for enhver række der
 skal til laboratoriet. En ressource er noget andet: «beton, bærende, 40 ton»
 er en opmåling, og der er tyve af dem i en bygning. Krævede hver af dem et
 billede, ville ressourcescreeningen tage længere tid end prøvetagningen — og
 billederne blive taget for at komme videre frem for for at dokumentere noget.
- **Højst to billeder pr. prøve.**
- **Prøvetagningen åbner der hvor man slap.** Uden `?seq=` i adressen er man
  kommet fra "Fortsæt prøvetagning", og så skal man tilbage til den senest
  rørte prøve — ikke til en ny, blank. En ny er et tryk væk; den halvfærdige
  man forlod er ikke.
- **Påvist asbest er farligt affald.** Rød, hver gang. Der er intet gult
  mellemniveau og ingen manuel vurdering af om den støver — den vurdering
  fandtes, og den blev ikke sat.

## Selektiv nedrivning

`cases.report_type` er `miljoescreening` eller `selektiv` og vælges, når sagen
oprettes. Standardværdien er den almindelige miljøscreening, så alt der fandtes
før opfører sig præcis som før. Typen kan endnu ikke ændres bagefter.

Den selektive rapport har i dag Projektets omfang (bygningsoversigten) og
Ressourcescreening ud over den almindelige rapports sider. Forureningsafsnittet,
saneringsbeskrivelsen og regelmotoren mangler.

**Eurofins-filen er den samme.** Den bygges af prøvemærkning, sagsnavn og de
fire analysefelter, og rapporttypen rører ingen af dem. En selektiv sag sender
de samme prøver til laboratoriet.

Selektiv slår tre felter til på prøven: `building_part_id`, `material_condition`
(1-5, hvor 1 er bedst) og `resource_handling`. Bygningsdelen arves til næste
prøve som bygningen gør — står man på taget, tages der flere prøver på taget —
men stand og håndtering gør ikke: de er vurderinger af netop dette materiale,
og arvet ville de være rigtige for den første prøve og stiltiende forkerte for
de næste.

**Ressourceafsnittet skriver kun det, der er registreret.** Det er hele
pointen. I Word-skabelonen står alle fyrre linjer altid, og den der laver
rapporten skal slette de tredive der ikke passer — det er arbejde, hvor en
glemt sletning bliver en påstand om et materiale, der ikke findes i bygningen.

## Materialepanelet

**Rapportens ord står i databasen, ikke i koden.** De lå i et katalog i
`src/lib/rapport/ressourcer.ts` og kunne kun rettes med en udrulning. Det er
kontoret der ved, hvad kommunen skal læse, så de rettes nu på `/materialer` —
åbent for `office` og `admin`, samme grænse som `materials_write` i RLS.

Tre stykker data bærer det:

- **`building_parts`** er rapportens fede overskrifter, og samtidig de knapper
 screeneren vælger imellem på prøven. `sort_order` **er** afsnittenes rækkefølge
 i rapporten. Var en enum; en enum kan ikke rettes uden en udrulning.
- **`materials`** har `report_name` og fem sætninger: én for genbrug, én for
  genanvendelse og **tre for bortskaffelse**. Se afsnittet nedenfor.
- **prøven** binder dem sammen: materiale + bygningsdel + håndtering.

Rapporten slår altså navnet op på materialet og sætningen på håndteringen, og
overskriften kommer fra bygningsdelen. `src/lib/rapport/ressourcer.ts` samler
linjerne og lægger mængderne sammen — den bestemmer intet om ordene.

**Materialer slettes ikke, de lukkes.** Prøver gemmer materialets *navn* som
tekst, så en sletning rører ikke historikken — men den tager sætningen med, og så
bliver en to år gammel rapport stille kortere. Et lukket materiale forsvinder
fra vælgeren i marken og bliver stående i de rapporter, der bruger det. Det
samme gælder bygningsdele.

**Seks materialer står med tomme sætninger med vilje.** Træ, Jern og metal,
Letbeton, Glas, Mursten og PVC har hver *flere* forskellige sætninger i kundens
skabelon, alt efter hvor materialet sad. Med sætningen på materialet er der kun
plads til én pr. håndtering, og at vælge for kontoret ville være at træffe en
faglig beslutning på deres vegne. Kundens ord til dem står som kommentar i
`20260825120500_saetninger_fra_skabelonen.sql`, så de ikke skal findes frem
igen. Skal flere af dem bruges samtidig, er svaret at oprette materialet præcist
— «Trægulve» ved siden af «Træ» — for det er også hvad de er.

**Opfind ikke en sætning i koden.** De 12 sætninger, der blev seedet fra
skabelonen, står med kundens egne ord — men *hvilken håndtering* hver af dem
hører til, er udledt af ordlyden: sætningen landede i den spalte, hvis ord står
først i den. Det er et gæt, og det står i migrationens kommentar frem for i
brugerfladen, fordi et flueben, en forklaring, en advarsel og en prik pr.
materiale gjorde panelet uoverskueligt.

Mangler sætningen, skriver rapporten navn og mængde og lover ingenting — det er
det rigtige svar, ikke et hul der skal fyldes med noget der lyder godt.

**Laboratoriesvaret afgør, hvor en linje lander — ikke screenerens vurdering.**
Det er den vigtigste regel i hele afsnittet, og den er kundens egen:

| Labsvar | Afsnit | Tekst |
| --- | --- | --- |
| Rent affald | Ressourcescreening, under sin bygningsdel | håndteringens sætning |
| Forurenet affald | Forureninger | materialets **forurenet** |
| Farligt affald | Forureninger | materialets **bortskaffelse** |
| Asbest påvist | Forureninger | materialets **asbest** |
| Afventer svar | ingen af dem, men tælles | — |

Håndteringen, screeneren valgte, bestemmer altså kun sætningen for de rene.
Skriver hun «genbrug» på en prøve, og kommer svaret tilbage gult eller rødt,
flytter linjen til Forureninger og får bortskaffelsesteksten. Det er meningen:
analysen validerer vurderingen, så en optimistisk screener ikke kan komme til at
love en kommune, at forurenet beton kan genbruges. Rør ikke den retning.

**Reglen står ét sted: `faktiskHandtering` i `src/lib/types.ts`.** Både
analyseskemaets kolonne «Ressourcehåndtering» og rapportens fordeling spørger
den. Sagde skemaet «Genbrug» på en linje, som forureningsafsnittet havde skrevet
bortskaffelse på, ville læseren ikke vide hvem der havde ret. Verifikationen
kører alle seksten kombinationer af valg og svar igennem og kontrollerer, at de
to er enige.

**Den gemte værdi på prøven overskrives ikke.** Skemaet viser det, reglen giver;
`samples.resource_handling` bliver ved med at være screenerens egen vurdering.
Det er værd at kunne se — det fortæller, at analysen fangede noget — og bliver et
labsvar rettet senere, flytter linjen tilbage af sig selv. Havde vi overskrevet
feltet, var begge dele væk.

**Vælger screeneren selv bortskaffelse, flytter prøven også** — et materiale der
skal bortskaffes er ikke en ressource, uanset hvad analysen siger. Ellers ville
en bortskaffelsessætning stå under en overskrift om materialer, der kan
genbruges.

**Bortskaffelsen har tre sætninger, ikke én.** De tre tilfælde kræver hver sit
af entreprenøren: forurenet affald skal udsorteres, farligt affald skal til et
godkendt modtageanlæg, og asbest skal befugtes, emballeres støvtæt og holdes
adskilt fra alt andet. Én fælles sætning måtte enten love for lidt om asbesten
eller for meget om det forurenede. Rangfølgen ligger i `bortskaffelsestekst` i
`src/lib/types.ts`, ved siden af `faktiskHandtering`:

| Situation | Felt |
| --- | --- |
| Asbest påvist | `sentence_asbest` |
| Screeneren valgte bortskaffelse | `sentence_bortskaffelse` |
| Farligt affald | `sentence_bortskaffelse` |
| Forurenet affald | `sentence_forurenet` |

Rækkefølgen **er** reglen, og de to øverste linjer er dem der overrasker.
**Asbest overruler alt**, også screenerens eget valg og alt andet der er fundet
i prøven — påvist asbest gør prøven rød, men en rød prøve er ikke nødvendigvis
asbest, og de to skal ikke sige det samme. Og **screenerens `bortskaffelse`
slår Eurofins**: hun stod ved materialet, og farligt affald og bortskaffelse er
den samme besked, så de deler felt.

`sentence_bortskaffelse` er den oprindelige og skiftede ikke betydning, da de to
andre kom til. Derfor ændrede ingen eksisterende rapport ordlyd.

Kontoret havde selv fundet en vej udenom, før felterne fandtes: asbestteksten
lagt på de materialer, der *hedder* noget med asbest. Det virker kun, hvis
screeneren ramte det rigtige navn i marken — svarer Eurofins «Påvist» på noget
registreret som «Eternit, asbestfri», skal asbestteksten frem alligevel. Det er
analysen der ved det, ikke navnet.

**Teksten er med i grupperingsnøglen.** To røde prøver af samme materiale, hvor
asbest kun er påvist i den ene, må ikke lægges sammen til én linje — så ville
den ene af de to sætninger forsvinde ud af rapporten.

**Forureningslinjen navngives med prøvenummeret, ikke materialet:** `P1, P2 –
200 kg i ringe stand, …`. Entreprenøren skal kunne slå den enkelte prøve op i
analyseskemaet og se målingerne bag; «Glasseret tegl» siger ikke hvilket af tre
stykker der var forurenet. Ressourceafsnittet beholder materialenavnene — det er
et overblik over hvad bygningen indeholder, og der er navnet hele pointen.

**En prøve uden analyser flyttes aldrig.** Der kommer intet svar på den, og
intet har vist andet end at den er ren. Prøver der stadig venter, tælles og
siges højt under ressourceafsnittet frem for bare at mangle.

Gult og rødt af samme materiale lægges **ikke** sammen til én linje: niveauet
står som et mærke ved siden af navnet i skemaets egne farver, og to niveauer i
én linje ville gøre mærket meningsløst. Ressourceafsnittet har ingen mærker —
alt i det er grønt, og et grønt mærke på hver linje betyder ingenting.

**Forureningsafsnittet står også, når der ingen fund er.** Skabelonens spørgsmål
skal besvares, og «Nej» er et svar — det er en kommune, der læser det. Men
sætningen om jordforureningsattesten er udeladt: appen kan ikke vedhæfte en
attest, og en rapport der henviser til et bilag, der ikke findes, er værre end
en der ikke nævner det.

**Screeneren taster ton, rapporten skriver kilo.** Ton er den enhed, en prøve og
en aflæsning i marken hænger sammen i; kilo er den enhed, kunden kender
rapporten i. Omregningen ligger ét sted, i `byggLinje`.

**Analyseskemaet får to kolonner mere** på en selektiv sag — Materiale stand og
Ressourcehåndtering, mellem Lokalitet og Est. ton, som i regnearket. Standen
står som et ciffer, fordi kolonnen ikke kan rumme ordet; skalaen forklares i
`SkemaForklaring` under skemaet.

Atten kolonner skal dele de samme 186 mm som seksten gjorde, og pladsen er
**ikke** taget fra tallene. Den er taget fra cellernes sideluft:
`.skema-selektiv` skruer `--skema-sideluft` fra 0,2 til 0,15 rem, og 0,05 rem
sparet i atten kolonners to sider giver 7,6 mm tilbage til indhold. Regnet
igennem har en analysekolonne 32,59 px til «< 2500» mod 32,58 px i det
almindelige skema — altså en hårsbredde mere plads, ikke mindre.
`npm run verify:ressourcer` regner det efter ved hver kørsel og læser
sideluften ud af `globals.css`, så CSS'en bliver ved med at være det ene sted
den står. Skruer du på bredderne, skal du **printe en rapport med et fuldt
skema** bagefter og se, om tallene stadig står på én linje.

Afsnittet deles i sider af `ressourceSider` af samme grund som metodeteksten er
delt i `RAPPORT_SIDER`: `.print-side` har `break-inside: avoid`, og hver side
skal bære mærket i hovedet.

## Bygningsoversigten

Rapportens «Projektets omfang» står på en selektiv sag og bygger på syv felter
pr. bygning. Fire kommer fra BBR — etager, ydervæggens materiale,
tagdækningsmaterialet og varmeinstallationen — og tre gør ikke og **kan ikke**:
bygningens anvendelse, dens konstruktion og stand, og hvad der skal ske med
den. «Bygningen er planlagt til delvis nedrivning» er en beslutning i
projektet, ikke en registrering om ejendommen. De tre skrives i hånden på
BBR-siden, i afsnittet under bygningsvalget.

**Koderne gemmes, ikke teksten.** BBR svarer «1» og ikke «Mursten». Ordlyden
ligger i kodelisterne i `src/lib/bbr/map.ts`, hentet ordret fra
bbr.dk/kodelister, så en rettet ordlyd gælder hver eksisterende sag med det
samme og ikke kun de næste. `usage_code` og `usage_text` står begge, men de er
ældre end denne beslutning.

**BBR kan rettes, men kun til en anden kode.** Etager, ydervægge, tag og
varmeforsyning kan ændres under «Ret» på hver bygning, fordi BBR ikke altid er
ajour — en plade kan være skiftet uden at nogen har indberettet det.
Materialefelterne er vælgere over kodelisten og ikke fri tekst: så bliver
«Fibercement herunder asbest» ved med at kunne genkendes af advarslen om asbest,
og rapporten skriver stadig BBR's egne ord. Mangler materialet i listen, er der
«Andet materiale».

**To af beskrivelserne forudfyldes af BBR.** «Bygningens anvendelse» får
anvendelsesteksten ordret — «Fritliggende enfamiliehus» — og «Konstruktion og
stand» får ydervæg og tag som «Ydervægge: Mursten. Tag: Tegl.». Screeneren retter
dem til en sætning og skriver standen, som BBR ikke kan vide noget om. Kun tomme
felter udfyldes: har nogen skrevet noget, røres det ikke — hverken når siden
indlæses, eller når BBR hentes igen.

**Kode 3 betyder asbest.** I både ydervæg og tagdækning hedder kode 3
«Fibercement herunder asbest», og kode 10 er den samme plade uden. BBR fortæller
altså før besøget, om der kan være asbest i facaden eller taget, og derfor står
advarslen på BBR-siden ved bygningen — ikke kun i den selektive beskrivelse. Den
gælder lige så meget en almindelig miljøscreening, for den afgør hvad screeneren
skal have med i bilen. BBR er ikke et bevis: pladen kan være skiftet uden at
nogen har indberettet det. Byt aldrig de to koder om.

**De skrevne noter overlever et nyt BBR-opslag.** `saveBuildings` sletter og
skriver alle bygninger op igen — det er med vilje, se «Lokalitet» nedenfor — men
den bærer nu noterne med over på den bygning, der har samme `bbr_building_id`.
Uden det ville tre afsnit skrevet stående i bygningen forsvinde, fordi nogen
trykkede «Hent fra BBR igen». Browseren gør det samme i sin egen liste. Manuelt
oprettede bygninger har ingen BBR-id og kan ikke genkendes på tværs af et
opslag; deres noter lever kun så længe siden ikke er genindlæst.

Afsnittet deles i sider af `bygningsSider`, og en bygning brækkes ikke over to
ark: dens oplysninger og dens beskrivelse hører sammen. Tre bygninger med alle
tre beskrivelser går på ét ark, som i skabelonen.

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
