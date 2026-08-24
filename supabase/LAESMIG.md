# Databasens skema

Her ligger de migrationer, der bygger `screening`-skemaet op fra bunden. De er
hentet ud af den kørende database, ikke skrevet fra hukommelsen.

## Hvorfor mappen først findes nu

Skemaet blev bygget direkte mod Supabase — gennem dashboardet og gennem
værktøjer, der registrerer migrationen i databasen, men ikke skriver en fil.
Historikken har altså hele tiden eksisteret i tabellen
`supabase_migrations.schema_migrations`; den har bare ikke ligget i git.

Det betød, at skemaet fandtes præcis ét sted: den kørende produktionsdatabase.
Gik den i stykker, var der intet at bygge op fra. Det er den risiko, mappen her
fjerner.

## Hvad der er med — og hvad der ikke er

Projektet i Supabase huser **to** apps. Websitet nemscreening.dk bor i `public`
med sine leads, bookings og indlæg. Screening-appen bor i `screening`. De 24
migrationer, der hører til websitet, ligger **bevidst ikke her** — de tilhører
websitets eget repo, og to steder at rette den samme tabel er værre end ingen.

De to skemaer kan skilles rent ad: der går ingen fremmednøgle fra `screening`
ind i `public`. Den eneste binding ud af skemaet er `app_users → auth.users`.

**`auth` er fælles med websitet.** En kunde, der logger ind på hjemmesiden, er
allerede en gyldig `authenticated`-bruger her. Derfor må adgang aldrig hvile på
`authenticated` alene, men altid på medlemskab i `screening.app_users`. Det er
hele grunden til, at `is_member()`, `is_office()` og `is_admin()` findes.

## Hvordan de er hentet ud

Med rene `SELECT`-forespørgsler mod `schema_migrations` — ikke med `db pull`,
som kører værktøj mod produktionsprojektet. Hver fil er derefter kontrolleret
mod databasens egen md5 af den SQL, der faktisk blev kørt. Alle elleve matcher
byte for byte.

Derudover er alle 121 kolonner i det kørende skema slået op i filerne. Ingen af
dem mangler, så der er ikke rettet noget i SQL-editoren, som aldrig blev
registreret.

Det er en navnekontrol, ikke en fuld skemasammenligning — den ville ikke fange
en ændret datatype eller en droppet constraint. Det endelige bevis er at køre
migrationerne op på en tom database og sammenligne. Det sker første gang, der
oprettes en Supabase-branch.

## Kør dem ikke mod produktion

Produktionen **har** dem allerede; dens migrationstabel nævner alle elleve. Filerne
her er til at bygge et *nyt* miljø op: en preview-branch, et lokalt stak, eller
produktionen igen hvis den en dag skal genskabes.

## Hvad en Supabase-branch faktisk er

Ikke en kopi. En branch er en **tom** Postgres, der køres op forfra: alle
migrationer i rækkefølge, derefter `seed.sql`. Produktionsdata følger ikke med,
og det gør filerne i Storage heller ikke — en branch starter med tomme buckets.
Brugerne følger heller ikke med, så der skal seedes en, man kan logge ind som.

Sletter man branchen, er alt i den væk. Det er netop pointen, når man vil kunne
starte forfra — men det betyder også, at intet i en branch må være det eneste
sted, noget findes.
