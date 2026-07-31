/**
 * Rapportens faste tekst.
 *
 * Ordene er ikke vores: de star ordret som i de rapporter Nemscreening har
 * sendt ud, og de er skrevet med kundens og myndighedernes oje for. Ret dem
 * ikke for at gore dem paenere — de daekker et ansvar, og et ord der flytter
 * sig kan flytte det ansvar med.
 *
 * Teksten er data og ikke JSX, sa rapportsiden kan holdes til at handle om
 * hvordan siderne braekker.
 */

export type Afsnit = { overskrift: string; brodtekst: string[] };

/** Star under graensevaerditabellen, hvor farverne forklares. */
export const GRAENSE_NOTER = [
  "Indholdet af bly, zink og kobber summeres, for værdier over 1.000 mg/kg. Hvis den akkumulerede værdi er over 2.500 mg/kg klassificeres prøven som farligt affald.",
  "Resultaterne af de udførte analyser fremgår af ovenstående tabeller.",
];

export const GRAENSE_FARVER = [
  "Rent affald, er resultatet fremhævet med grøn markering.",
  "Forurenet affald, er resultatet fremhævet med gul markering.",
  "Farligt affald, er resultatet fremhævet med rød markering.",
];

export const GRAENSE_FARVER_INDLEDNING =
  "Hvis koncentrationen af PCB, KP, PAH, kulbrinter, tungmetaller eller asbest svarer til:";

export const GRAENSE_EFTERSKRIFT =
  "Samtlige prøver for PCB er screenet for klorerede paraffiner. Hvor der er fundet spor af KP'ere analyseres prøverne efterfølgende, hvis nødvendigt, for endelig klassificering af affald og håndtering.";

/**
 * Metodeafsnittet — rapportens sidste sider for bilaget.
 *
 * Delt i to grupper, en pr. side, praecis som i de rapporter der er sendt ud.
 * Delingen er ikke kun kosmetisk: hver side skal baere maerket i hovedet, og
 * et afsnit der selv braekker over to ark ville efterlade det andet uden.
 */
export const RAPPORT_SIDER: Afsnit[][] = [
  [
  {
    overskrift: "Formål",
    brodtekst: [
      "Formålet med denne undersøgelse er at identificere potentielt miljøskadelige stoffer i bygningens materialer samt vurdere risiciene ved nedrivning eller byggearbejde. Dette omfatter – men er ikke begrænset til – stoffer som asbest, PCB, tungmetaller (bly, cadmium, krom, kobber, nikkel, zink og kviksølv), PAH'er og klorerede paraffiner. Miljøscreeningen danner grundlag for at fastlægge korrekt og sikker håndtering af disse materialer samt nødvendige forholdsregler til beskyttelse af mennesker og miljø. Undersøgelsen omfatter ikke terrænbelægninger på grunden.",
      "Der tages forbehold for tastefejl, fejl og mangler i rapporten, og alle vurderinger baserer sig på de modtagne analysesvar fra Eurofins. Eventuelle angivne mængder og tonnager er estimerede.",
    ],
  },
  {
    overskrift: "Strategi",
    brodtekst: [
      "Der er udtaget prøver af byggematerialer, der vurderes at kunne indeholde miljøskadelige stoffer, baseret på bygningens alder og materialevalg. Undersøgelsen er af orienterende karakter og kan ikke anses som en fuldstændig registrering af alle forekomster. Vurderingen omfatter alene tilgængelige og synlige forhold, og der kan forekomme skjulte materialer i bygningsdele, som ikke er konstateret ved undersøgelsen. Resultaterne giver dog en væsentlig indikation af potentielle risici. Nemscreening ApS anbefaler, at Nedriver foretager en grundig besigtigelse af ejendommen inden tilbudsgivning for at sikre korrekt omfangsforståelse samt identificere forhold, der ikke nødvendigvis fremgår af rapporten.",
    ],
  },
  {
    overskrift: "Prøvetagningsmetode",
    brodtekst: [
      "Prøvetagningen udføres som destruktive stikprøver af relevante bygningsmaterialer med henblik på laboratorieanalyse for miljøfarlige stoffer. Prøverne udtages således, at de er repræsentative for det undersøgte materiale og den aktuelle konstruktion. Ved undersøgelse for bly, tungmetaller, PCB eller andre miljøfarlige stoffer udtages skrabeprøver af maling og overfladebehandlinger. Prøven udtages ved hjælp af kniv, spartel eller andet egnet værktøj, så alle malingslag inkluderes helt ned til det underliggende materiale. Prøven opsamles i mærket prøveemballage og fremsendes til analyse.",
      "Prøver af fugemasser udtages ved udskæring af et repræsentativt stykke fuge med tilhørende kontaktflader, hvor det er relevant. Prøven udtages typisk til analyse for PCB, klorerede paraffiner eller andre organiske miljøfremmede stoffer. Prøver af gulvbelægninger udtages ved udskæring af et repræsentativt stykke af belægningen. Afhængigt af formålet kan prøven omfatte både gulvbelægning, lim og underliggende spartellag, da miljøfarlige stoffer ofte forekommer i lim- og spartelprodukter.",
      "Prøver af fliseklæb udtages ved bore-, mejsel- eller skrabemetode, så det relevante materiale isoleres mest muligt. Prøverne anvendes ofte til analyse for asbest, PCB eller tungmetaller. Loft- og vægplade prøver udtages ved udskæring eller brud af mindre repræsentative stykker af pladematerialet. Ved mistanke om asbestholdige materialer anvendes metoder, der begrænser støvspredning mest muligt. Tag- og facadeplader prøver udtages ved afklipning eller brud af mindre materialestykker. Prøverne analyseres typisk for asbestindhold.",
      "Prøver af isolering udtages ved åbning af konstruktionen og udtagning af en repræsentativ materialemængde. Ved mistanke om asbest, mineraluld eller andre problematiske stoffer anvendes passende værnemidler og støvbegrænsende foranstaltninger. Beton, mørtel og murværk: prøver udtages ved boring, mejsling eller kerneboring afhængigt af analyseformålet. Materialet opsamles og emballeres separat for at undgå krydskontaminering. Jordprøver udtages som punktprøver eller sammensatte prøver fra relevante dybder ved brug af jordspyd, håndbor eller gravemaskine. Prøveplacering og dybde fastlægges på baggrund af historiske oplysninger og visuelle observationer.",
      "Alle prøver mærkes med unikt prøvenummer og registreres med beskrivelse af materiale, placering og prøvetagningsdato. Prøvetagningen udføres med rent værktøj, og prøver emballeres særskilt for at minimere risikoen for krydskontaminering. Prøverne fremsendes til akkrediteret laboratorium for analyse efter relevante standardmetoder.",
    ],
  },
  {
    overskrift: "Håndtering af materialer",
    brodtekst: [
      "Materialer med PCB eller bly i forurenede koncentrationer skal behandles som PCB-holdigt affald og bortskaffes efter gældende regler. Alt forurenet affald – herunder PCB, tungmetaller og asbest – kræver omhyggelig og ansvarlig håndtering i overensstemmelse med analyseresultater og lovgivning. Angivne mængder er estimerede.",
    ],
  },
  ],
  [
  {
    overskrift: "PCB",
    brodtekst: [
      "Materialer, der indeholder PCB, bør fjernes korrekt, så affaldet kan bortskaffes separat som PCB-holdigt affald. Efter afrensning af PCB-holdig maling skal tilstødende materialer som puds, beton og mursten undersøges for eventuelle rester.",
    ],
  },
  {
    overskrift: "Tungmetaller",
    brodtekst: [
      "Tungmetalholdige malinger og fliser skal fjernes og bortskaffes som tungmetalholdigt affald i henhold til analyser og gældende lovgivning. Dette reducerer risikoen for miljøforurening og sundhedspåvirkninger.",
    ],
  },
  {
    overskrift: "Asbest",
    brodtekst: [
      "Asbestholdige materialer såsom tagplader, skifereternitplader, fliseklæb og visse gulvbelægninger skal håndteres som farligt affald og fjernes under strenge sikkerhedsprocedurer i henhold til gældende regler.",
    ],
  },
  {
    overskrift: "Håndtering og sikkerhed",
    brodtekst: [
      "Entreprenøren eller arbejdsgiveren skal sikre, at medarbejdere er korrekt uddannet og instrueret i sikker håndtering af PCB, tungmetaller og asbest samt følger lovgivning og relevante sikkerhedsforskrifter.",
    ],
  },
  {
    overskrift: "Bortskaffelse og affaldshåndtering",
    brodtekst: [
      "Alt affald – herunder PCB-, bly- og asbestholdigt affald – skal anmeldes til kommunen, inden arbejdet påbegyndes. Bortskaffelsen skal ske efter retningslinjer fra Branchearbejdsmiljørådet (BAR), Dansk Asbestforening og kommunens forskrifter.",
    ],
  },
  {
    overskrift: "Generelt",
    brodtekst: [
      "Kommunen og Arbejdstilsynet skal orienteres om sundhedsfarlige forhold på arbejdspladsen. Der skal opsættes tydelig skiltning ved materialer, der indeholder PCB, tungmetaller og asbest, så alle involverede kan tage nødvendige forholdsregler og sikre et sikkert arbejdsmiljø.",
    ],
  },
  ],
];
