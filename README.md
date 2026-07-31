# Nemscreening — screening-app

Bygningsscreening fra første besøg til færdig rapport. En screener går rundt i
en bygning der skal rives ned eller renoveres, fotograferer og udtager prøver
af materialer, sender prøverne til Eurofins, og laver en rapport ud af svaret.

Appen dækker hele den kæde. Før den fandtes, blev prøverne skrevet ned i
marken, tastet ind i et regneark, sendt som en fil til laboratoriet, og
svarene tastet tilbage i hånden.

## Kæden

```
Opret sag ──► Hent bygninger fra BBR ──► Prøvetagning i marken
                                              │
                                              ▼
                                    Eurofins-fil (.xlsx)
                                              │
                                     upload hos Eurofins
                                              │
                                              ▼
              Rapport (PDF) ◄── Resultatskema ◄── AllResults-svar (.csv)
```

Første halvdel foregår på en telefon, ofte uden dækning. Anden halvdel
foregår på kontorets pc. De to har hvert sit layout — se nedenfor.

Ud over analysesvaret lægger kontoret bilag på sagen: et forsidebillede af
ejendommen, en plantegning, og de PDF'er Eurofins sender med —
analyserapporten og typisk et asbestappendiks. Alle er frivillige og havner i
den færdige rapport: forsidebilledet på side 2, plantegningen på sin egen
side, Eurofins-dokumenterne bagest i den rækkefølge kontoret sætter dem.

## Kom i gang

```bash
npm install
cp .env.example .env.local     # udfyld nøglerne
npm run dev
```

`.env.local` skal have Supabase-URL og publishable key, samt en API-nøgle til
Datafordeleren hvis BBR-opslag skal virke. Uden `.env.local` kan appen ikke nå
databasen — men verifikationsscriptene nedenfor kører fint uden.

Login er e-mail og kodeord. Adgang kræver en aktiv række i
`screening.app_users`; det er ikke nok at have en konto i Supabase Auth.

## Kontrol

```bash
npm run verify:eurofins   # eksportfilen mod Eurofins' skabelon
npm run verify:lab        # indlæsning af labsvar og farvelægning
npm run lint
npx tsc --noEmit
npm run build
```

De to `verify`-scripts er projektets egentlige testdækning. De kører uden
database og uden browser, og de dækker præcis de steder hvor en fejl er dyr:
en importfil Eurofins afviser, eller et analysesvar der får den forkerte
farve. **Kør dem efter enhver ændring i `src/lib/eurofins/` eller
`src/lib/lab/`.**

## Hvor tingene ligger

| Sti | Hvad |
| --- | --- |
| `src/app/(app)/` | Marken. Smal kolonne, bygget til en telefon. |
| `src/app/(bred)/` | Kontoret. Bredt bord til resultatskema og rapport. |
| `src/app/(app)/sager/[id]/proever/` | Prøvetagning: kamera, formular, offline-kø. |
| `src/lib/offline/` | IndexedDB-kø og synkronisering mod Supabase. |
| `src/lib/eurofins/` | Eksport til laboratoriet. Se `skabelon/LAESMIG.md`. |
| `src/lib/lab/` | Indlæsning af svar og grænseværdier. Se `LAESMIG.md`. |
| `src/lib/rapport/` | Rapportens bilag og faste tekst. |
| `src/lib/bbr/` | Opslag i BBR via Datafordelerens GraphQL. |
| `scripts/` | Verifikation. Køres med `npm run verify:*`. |

De to `LAESMIG.md`-filer er ikke pynt. De indeholder det, filerne fra Eurofins
har lært os, og som ikke kan læses ud af koden — hvorfor skabelonen ikke må
genopbygges, hvad `#` betyder i et labsvar, og hvilke kolonner der bevidst
ikke er implementeret.

## Databasen

Alt ligger i skemaet `screening`, ikke i `public`. Supabase-klienten er sat op
med `db: { schema: "screening" }`, så `.from("samples")` rammer
`screening.samples`.

| Tabel | Noter |
| --- | --- |
| `cases` | Sagen. `status` styrer hvad appen viser. |
| `case_buildings` | Bygninger, typisk hentet fra BBR. |
| `samples` | Prøver. `label` og `is_lab_sample` er genererede kolonner. |
| `sample_photos` | Fotos. Filerne ligger i storage-bucket'en `screening-photos`, som er privat. |
| `exports` | Log over genererede Eurofins-filer. |
| `lab_results` | Ét svar pr. prøve. Værdier gemmes som tekst. |
| `case_files` | Rapportens bilag: forsidebillede, plantegning og et vilkårligt antal Eurofins-PDF'er. Filerne ligger i bucket'en `screening-rapport`, som er privat. |
| `app_users` | Medlemskab og rolle: `screener`, `office`, `admin`. |

RLS er slået til overalt. Læsning kræver `screening.is_member()`. Skrivning
til `lab_results` kræver `screening.is_office()` — altså `office` eller
`admin`. En screener kan se resultater og hente rapporten, men ikke indlæse
svar.

## Statusforløbet

`oprettet` → `under_screening` → `proever_taget` → `sendt_til_lab` →
`afsluttet`.

Statussen er ikke kun en etiket: fra `sendt_til_lab` skifter sagssiden
primærhandling fra prøvetagning til resultater, fordi arbejdet er flyttet fra
marken til kontoret.
