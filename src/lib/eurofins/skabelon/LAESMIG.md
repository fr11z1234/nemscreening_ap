# Eurofins-ordreskabelonen

`ordreskabelon.xlsx` er hentet uændret fra Eurofins' ordreportal 28. juli 2026.
Appen bygger **ikke** en ny projektmappe — den skriver kun i cellerne
`A4:B303` og `C4:S303` i arket `Sample_Data` og kopierer hver anden byte i
arkivet uændret over. Det er hele pointen: filen skal blive ved med at være
Eurofins' egen fil.

## Hvad der ligger i den

Seks ark, hvoraf fem er skjulte:

| Ark                  | Synlig | Indhold                                     |
| -------------------- | ------ | ------------------------------------------- |
| `Sample_Data`        | ja     | prøveskemaet, 300 tomme prøverækker (4–303) |
| `Order_Metadata`     | nej    | ordrenøglerne, se nedenfor                  |
| `OSIS_Products`      | nej    | matricelookup, 24 rækker                    |
| `OSIS_AF`            | nej    | tom                                         |
| `OSIS_ListOfChoices` | nej    | True/False                                  |
| `sandbox`            | ja     | tom                                         |

`Order_Metadata!B` er det, der binder filen til en ordre hos Eurofins:

| Celle | Værdi               | Betydning                                    |
| ----- | ------------------- | -------------------------------------------- |
| `B1`  | `A01466717NKH`      | kundenummer (Nemscreening ApS, Esbjerg V)     |
| `B2`  | `VL0001974001`      | kontrakt (620286 Nemscreening Rammeaftale)    |
| `B3`  | tom                 | ordrenummer — kun udfyldt på en åben ordre    |
| `B4`  | `YVD5SC230009`      | ordreskabelon (Byggematerialer & EUAA59 Std.) |
| `B5`  | `3U1L4QONS7\|EUAA59` | analysepakken bag ordreskabelonen            |
| `B6`  | `da`                | sprog                                        |

Filnavnet appen genererer bygges af `B1-B4-B2-dato` — præcis det navn
Eurofins selv giver skabelonen. De tre id'er læses ud af arket, ikke fra
konstanter i koden, så et skabelonskift følger automatisk med.

Ud over arkene indeholder filen fire navngivne områder
(`SampleDetailsRange`, `ProductList`, `Matrix`, `BooleanList`), SHA-512-
beskyttelse på projektmappe og ark, flettede celler i række 1, og en
validering på `C4:S303` af typen **whole**. Tal skal derfor skrives som `0`
og `1` — aldrig `0.0`.

## Sådan skifter du skabelonen ud

1. Hent en ny skabelon i Eurofins' ordreportal.
2. Læg den her som `ordreskabelon.xlsx` (behold navnet — appen genererer
   selv download-navnet ud fra `Order_Metadata`).
3. Kør `npm run verify:eurofins`.

Verifikationen fejler med det samme, hvis analysekolonnerne i række 2 ikke
længere svarer til `EUROFINS_ANALYSES` i `../template.ts`. Sker det, er der
kommet nye analyser i ordreskabelonen, og kortlægningen skal rettes, før der
sendes noget til laboratoriet.

## Ting der overrasker

- Regnearkene bruger namespace-præfikset `x:` på hvert element. Det er
  gyldig OOXML, men flere Node-biblioteker (bl.a. ExcelJS) kan ikke læse
  filen. Excel selv har ingen problemer. Det er en af grundene til, at vi
  redigerer XML'en direkte i stedet for at lade et bibliotek skrive filen om.
- Beskyttelsens SHA-512-hash og salt er nye ved hver download, og
  relations-id'erne i `_rels` er tilfældige. Eurofins validerer altså ikke på
  dem.
- `xl/worksheets/sheet1.xml` har en UTF-8 BOM, `sharedStrings.xml` har ikke.
  Begge dele bevares.
