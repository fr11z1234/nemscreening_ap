# Labsvar og grænseværdier

Eurofins' AllResults-fil læses direkte, og rapporten bygges af den. Det
regneark screenerne udfyldte i hånden er ikke længere kilden — men det er
stadig facit: kolonner, rækkefølge og forkortelser følger det, så en gammel
og en ny rapport kan lægges ved siden af hinanden.

## De elleve kolonner

`parametre.ts` er den eneste fil der ved, hvad vi måler og hvornår det er
for meget. Rækkefølgen dér **er** kolonnernes rækkefølge i skema og rapport.

| Vores kolonne | Eurofins-kolonne | Verificeret mod data |
| --- | --- | --- |
| Bly, Pb | `Bly (Pb)` | ja |
| Cadmium, Cd | `Cadmium (Cd)` | ja |
| Chrom total | `Chrom (Cr)` | ja |
| Kobber, Cu | `Kobber (Cu)` | ja |
| Kviksølv, Hg | `Kviksølv (Hg)` | ja |
| Nikkel, Ni | `Nikkel (Ni)` | ja |
| Zink, Zn | `Zink (Zn)` | ja |
| Asbest | `Asbest i materialeprøver` | **nej** — kolonnen findes, men vi har aldrig set en værdi i den |
| PCB total | `PCB total (sum af 7 PCB x 5)` | ja |
| Chlorerede paraffiner | `Spor af Chlorparaffiner` | ja |
| PAH total | `PAH sum` | **nej** — som asbest |

Kolonnerne findes **på navn, ikke på nummer**. Filen har to sæt PCB-kolonner
og to der begge hedder `Spor af Chlorparaffiner`, hvor kun det ene sæt er
udfyldt — og hvilket, afhænger af analysen. Parseren tager den første kolonne
med det rigtige navn der faktisk har en værdi.

## Værdier der ligner hinanden, men ikke er det

| I filen | Betyder | Vises som |
| --- | --- | --- |
| tom celle | analysen blev ikke bestilt | `I.a.` |
| `#` | Excel kunne ikke beregne summen, fordi hvert enkelt stof lå under detektionsgrænsen | `I.P.` |
| `Ikke påvist` | ikke påvist | `I.P.` |
| `< 0,05` | under detektionsgrænsen | ordret, `< 0,05` |

Tom og `#` ligner begge ingenting og betyder to vidt forskellige ting. Det er
forskellen på I.a. og I.P. i det gamle ark.

Værdien gemmes som **tekst**, ikke som tal. `< 0,05` siger noget andet end
`0,05`, og en række i `lab_results` skal kunne læses direkte af et menneske,
præcis som regnearket kunne.

## Prøvemærket

Eurofins returnerer prøven under det mærke vi sendte den med. Gamle sager blev
sendt som `1`, `2`, `3`; appen sender `P1`, `P3`. Begge former kobles.

## Grænseværdier

Fra Nemscreenings egen tabel, juli 2026. **To af dem er anderledes end i det
gamle regneark:** PCB gik fra 2.500 til 50 mg/kg, og nikkel fra 2.500 til
1.000 mg/kg. Rapporter farvelagt efter det gamle ark kan altså have været for
milde på netop de to.

## Asbestens tilstand

Grænsetabellen skelner mellem **påvist, ikke støvende** (forurenet) og
**påvist, støvende** (farligt affald). Eurofins oplyser kun *om* asbest er
påvist — resten er en menneskelig vurdering.

Den sættes derfor i hånden på resultatsiden og gemmes i
`lab_results.asbestos_dusty`. Indtil nogen tager stilling, står prøven som
forurenet og er markeret med `*` i skemaet. Vi gætter ikke: forskellen afgør,
hvordan affaldet håndteres på pladsen.

## Kulbrinter — bevidst udeladt

Grænsetabellen indeholder **Kulbrinter (sum C6-C35)**:

| Rent | Forurenet | Farligt |
| --- | --- | --- |
| < 100 mg/kg | 100–1.000 mg/kg | > 1.000 mg/kg |

Den er **ikke** implementeret, og det er med vilje. Kulbrinter har stået i
PDF-rapportens grænsetabel, men har aldrig været bestilt: analysen er ikke i
`eurofins/template.ts`' kortlægning, og den stod ikke i det regneark systemet
blev bygget efter. En kolonne der aldrig fyldes ud er værre end ingen kolonne
— den ser ud som om alt virker.

Skal den ind en dag, kræver det tre ting:

1. En AllResults-fil hvor kulbrinter faktisk er bestilt, så kolonnens navn kan
   læses direkte i stedet for gættes.
2. En kolonne på `screening.lab_results`.
3. En post i `LAB_PARAMETERS` med tallene ovenfor.

Det samme gælder opdelingen af klorerede paraffiner i kort- og mellemkædede:
tabellen har begge, vi bestiller ingen af dem, og Eurofins' samlede
`Spor af Chlorparaffiner` dækker begge med samme regel. Klorerede paraffiner
kan i øvrigt aldrig blive farligt affald — tabellen har ingen rød kolonne for
dem.

## Sådan tester du

```
npm run verify:lab
```

Dækker kolonnematch, de dublerede kolonner, `#` mod tom celle, begge
prøvemærkeformater, Windows-1252, grænserne på kanten, støv-eskaleringen og
turen gennem databasen og tilbage.
