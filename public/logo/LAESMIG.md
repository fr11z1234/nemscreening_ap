# Logoet

De to filer her er **midlertidige**. De har firmanavnet, men ikke husmærket —
med vilje, så en rapport med pladsholderen ikke kan forveksles med en færdig.

Læg de rigtige filer ind under de samme navne:

| Fil | Bruges hvor |
| --- | --- |
| `nemscreening.svg` | Sidehovedet på alle rapportens sider. Mørk tekst, lys baggrund. |
| `nemscreening-hvid.svg` | Rapportens forside. Hvid udgave, navy baggrund. |

Krav til filerne:

- **SVG**, så mærket er skarpt i en PDF uanset zoom. En PNG bliver grynet i
  print, hvor rapporten ender.
- **Ingen fast bredde og højde** på `<svg>`-elementet, kun `viewBox`.
  Komponenten sætter højden (`h-7` i sidehovedet, `h-11` på forsiden) og
  regner bredden ud fra `viewBox`. Med hårdkodede mål vil mærket enten blive
  klippet eller stå i den forkerte størrelse.
- Beskær tomrummet væk omkring mærket, ellers står det og flyder i hovedet.

Filerne bruges gennem `src/components/Logo.tsx` og ingen andre steder.
Fejler en af dem, viser browseren alt-teksten «Nem Screening» — en rapport med
firmanavnet i skrift er bedre end en med et tomt hul.
