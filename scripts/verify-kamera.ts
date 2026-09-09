/**
 * Kontrollerer, at et billede viser det, der stod i sogeren.
 * Koeres med: npm run verify:kamera
 *
 * Fejlen den her fanger, var i appen i maaneder uden at nogen kunne se den paa
 * skaermen: sogeren viste strommen i en LIGGENDE 4:3-kasse med
 * `object-fit: cover`, og optagelsen tegnede hele strommen. En fjerdedel af
 * bredden laa uden for sogeren og kom alligevel med i filen.
 *
 * Og formen var forkert. Billedet ender enten paa rapportens forside eller i
 * provesidens ramme paa 89 x 130 mm, og begge er STAAENDE — et liggende billede
 * fylder 67 mm af de 130.
 *
 * Derfor to slags kontrol: at udsnittet er det, sogeren viser, og at sogeren er
 * den ramme, billedet ender i. Regnestykket er rent og kan proves uden browser;
 * formen maales paa elementet, sa den holdes op mod rapportens egne maal.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { synligtUdsnit } from "../src/lib/camera/compress";
import {
  genoptagelse,
  type Genoptagelse,
} from "../src/lib/camera/useCamera";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    console.error(`  FEJL: ${msg}`);
    failures++;
  }
};

const here = dirname(fileURLToPath(import.meta.url));
const fil = (...dele: string[]) =>
  readFileSync(join(here, "..", ...dele), "utf8");

// ---------------------------------------------------------------------------
// 1. Udsnittet er det, sogeren viser
// ---------------------------------------------------------------------------
/*
 * `object-fit: cover` skalerer med det STORSTE af de to forhold, sa kassen
 * bliver fyldt, og skaerer resten af. Udsnittet skal ramme praecis det samme.
 */

// Den fejl der blev meldt: 16:9 i en 4:3-soger. En fjerdedel af bredden laa
// udenfor, en ottendedel i hver side.
const bredStrom = synligtUdsnit(1920, 1080, 400, 300);
check(
  bredStrom.sw === 1440 && bredStrom.sh === 1080,
  `16:9 i en 4:3-soger gav ${bredStrom.sw}x${bredStrom.sh}, forventede 1440x1080`,
);
check(
  bredStrom.sx === 240 && bredStrom.sy === 0,
  `udsnittet blev taget ved ${bredStrom.sx},${bredStrom.sy} og ikke i midten`,
);
// Og det ER en fjerdedel. Star der pludselig et andet tal, er sogerens form
// aendret uden at nogen har regnet efter.
check(
  Math.abs(bredStrom.sw / 1920 - 0.75) < 0.001,
  `der kom ${((bredStrom.sw / 1920) * 100).toFixed(1)} % af bredden med, forventede 75 %`,
);

/*
 * De to former appen faktisk beder om og viser i.
 *
 * Strommen er staaende 1200x1600, sogerne er rapportens egne rammer. Hojden —
 * den dyre led paa et staaende ark — skal blive i behold begge steder; det er
 * bredden, der giver de faa procent.
 */
const proveramme = synligtUdsnit(1200, 1600, 89, 130);
check(
  proveramme.sh === 1600,
  `provebilledet mistede hojde: ${proveramme.sh} af 1600`,
);
check(
  proveramme.sw === 1095 && proveramme.sx === 53,
  `provebilledet blev ${proveramme.sw} bredt ved ${proveramme.sx}, forventede 1095 ved 53`,
);

const forsideramme = synligtUdsnit(1200, 1600, 210, 297);
check(
  forsideramme.sh === 1600,
  `forsidebilledet mistede hojde: ${forsideramme.sh} af 1600`,
);
check(
  forsideramme.sw === 1131 && forsideramme.sx === 35,
  `forsidebilledet blev ${forsideramme.sw} bredt ved ${forsideramme.sx}, forventede 1131 ved 35`,
);

// Passer strommen til sogeren, skal der ikke skaeres noget vaek overhovedet.
const passer = synligtUdsnit(1600, 1200, 400, 300);
check(
  passer.sw === 1600 && passer.sh === 1200 && passer.sx === 0 && passer.sy === 0,
  "en 4:3-strom i en 4:3-soger blev beskaaret",
);

// En staaende strom — telefonen holdt lodret pa Android — i den samme liggende
// soger. Sa er det hojden, der skaeres af, og udsnittet skal folge med.
const staaende = synligtUdsnit(1080, 1920, 400, 300);
check(
  staaende.sw === 1080 && staaende.sh === 810,
  `en staaende strom gav ${staaende.sw}x${staaende.sh}, forventede 1080x810`,
);
check(
  staaende.sx === 0 && staaende.sy === 555,
  `det staaende udsnit blev taget ved ${staaende.sx},${staaende.sy} og ikke i midten`,
);

// Udsnittet maa aldrig raekke ud over billedet — sa tegner canvas sort kant.
for (const [vb, vh, kb, kh] of [
  [1920, 1080, 400, 300],
  [1080, 1920, 400, 300],
  [1600, 1200, 400, 300],
  [640, 480, 1000, 1000],
  [1920, 1080, 300, 400],
  // De to sogere appen faktisk har, med en staaende og en liggende strom.
  [1200, 1600, 89, 130],
  [1200, 1600, 210, 297],
  [1600, 1200, 89, 130],
] as const) {
  const u = synligtUdsnit(vb, vh, kb, kh);
  check(
    u.sx >= 0 && u.sy >= 0 && u.sx + u.sw <= vb && u.sy + u.sh <= vh,
    `udsnittet ${u.sx},${u.sy} ${u.sw}x${u.sh} ligger uden for ${vb}x${vh}`,
  );
  check(u.sw > 0 && u.sh > 0, `udsnittet af ${vb}x${vh} blev tomt`);
  // Formen skal vaere sogerens, ellers er billedet stadig ikke det man saa.
  check(
    Math.abs(u.sw / u.sh - kb / kh) < 0.01,
    `udsnittet af ${vb}x${vh} fik formen ${(u.sw / u.sh).toFixed(3)}, sogeren er ${(kb / kh).toFixed(3)}`,
  );
}

// Kender vi ikke sogeren — elementet er skjult, eller layoutet er ikke lagt
// endnu — er hele billedet det aerlige svar. Et gaet paa en form ville skaere
// noget vaek, som ingen har bedt om.
for (const [kb, kh] of [
  [0, 0],
  [0, 300],
  [400, 0],
] as const) {
  const u = synligtUdsnit(1920, 1080, kb, kh);
  check(
    u.sx === 0 && u.sy === 0 && u.sw === 1920 && u.sh === 1080,
    `en ukendt soger (${kb}x${kh}) gav et udsnit i stedet for hele billedet`,
  );
}
// Det samme, naar strommen ikke er begyndt endnu.
const ingenStrom = synligtUdsnit(0, 0, 400, 300);
check(
  ingenStrom.sw === 0 && ingenStrom.sh === 0,
  "en tom strom gav et udsnit med indhold",
);

// ---------------------------------------------------------------------------
// 1b. Hvad der skal til for at faa sogeren i gang igen
// ---------------------------------------------------------------------------
/*
 * Sogeren frøs, naar man slettede et billede. `window.confirm` suspenderer
 * siden, og browseren saetter videoen paa pause — men STROMMEN LEVER VIDERE.
 * Kontrollen var «lever sporet?», og den sagde ja, saa der skete ingenting.
 * Screeneren maatte ud af proven og ind igen, for saa blev komponenten
 * monteret forfra.
 *
 * De tre tilfaelde kraever hver sit, og det er derfor reglen findes: et doet
 * spor skal have en ny stroem, et nymonteret element skal have den tildelt, og
 * en video paa pause skal bare afspilles.
 */
const genoptagelser: [boolean, boolean, boolean, Genoptagelse, string][] = [
  [false, false, false, "start", "doet spor uden element"],
  [false, true, false, "start", "doet spor, selvom elementet har stroemmen"],
  [false, true, true, "start", "doet spor paa pause"],
  [true, false, false, "tildel", "levende spor, elementet mangler stroemmen"],
  [true, false, true, "tildel", "nymonteret element paa pause"],
  // Den her ER fejlen. Alt lever, og alligevel staar billedet stille.
  [true, true, true, "afspil", "systemdialogen satte videoen paa pause"],
  [true, true, false, "intet", "alt korer allerede"],
];

for (const [spor, tildelt, pause, forventet, hvad] of genoptagelser) {
  const fik = genoptagelse(spor, tildelt, pause);
  check(fik === forventet, `${hvad}: fik "${fik}", forventede "${forventet}"`);
}

// Der maa ALDRIG svares «intet», naar der er noget at se paa. Det var praecis
// det, den gamle kontrol gjorde.
for (const [spor, tildelt, pause] of genoptagelser) {
  const staarStille = !spor || !tildelt || pause;
  check(
    (genoptagelse(spor, tildelt, pause) === "intet") === !staarStille,
    `en soger der staar stille (spor=${spor} tildelt=${tildelt} pause=${pause}) blev ladt i fred`,
  );
}

// Og de tre steder, der aabner en systemdialog, skal bede om det. Pause-lytteren
// tager den som regel selv, men den bygger paa et event, vi ikke kontrollerer.
const dialoger: [string, string][] = [
  ["provetagningen", join("src", "app", "(app)", "sager", "[id]", "proever", "SamplingView.tsx")],
  ["forsidebilledet", join("src", "components", "Forsidebillede.tsx")],
];
for (const [navn, sti] of dialoger) {
  const kilde = fil(sti);
  const kalder = (kilde.match(/\bresume(?:Camera)?\(\)/g) ?? []).length;
  const dialogRegex = /window\.confirm\(|\.click\(\)/g;
  const antalDialoger = (kilde.match(dialogRegex) ?? []).length;
  check(
    antalDialoger === 0 || kalder > 0,
    `${navn} aabner en systemdialog uden at genoptage sogeren bagefter`,
  );
}

// ---------------------------------------------------------------------------
// 2. Sogeren i appen er den, regnestykket gaar ud fra
// ---------------------------------------------------------------------------
// Udsnittet maales paa elementet, sa CSS'en kan aendre sig uden at det her
// bliver forkert. Men sker det ved et uheld — en soger der bliver kvadratisk,
// eller et `object-contain` — er billedet noget andet end for, og saa skal det
// vaere et VALG og ikke en overraskelse. Derfor staar formen naevnt her.
const kameraer: [string, string][] = [
  ["provetagningen", join("src", "app", "(app)", "sager", "[id]", "proever", "SamplingView.tsx")],
  ["forsidebilledet", join("src", "components", "Forsidebillede.tsx")],
];

/** Formen paa den kasse, videoen staar i. */
const soegerform = (kilde: string): number | null => {
  // Rigeligt vindue: der staar en forklaring mellem kassen og elementet i
  // begge filer, og kommentarer skal kunne skrives uden at braekke en kontrol.
  const fundet = kilde.match(/aspect-(\d+)\/(\d+)[\s\S]{0,900}?<video/);
  return fundet ? Number(fundet[1]) / Number(fundet[2]) : null;
};

const former: Record<string, number | null> = {};

for (const [navn, sti] of kameraer) {
  const kilde = fil(sti);
  const soeger = kilde.match(/<video[\s\S]{0,400}?className="([^"]*)"/);
  check(soeger !== null, `fandt ikke sogeren i ${navn}`);
  check(
    soeger?.[1]?.includes("object-cover") ?? false,
    `sogeren i ${navn} bruger ikke object-cover — sa beskaerer optagelsen forkert`,
  );

  const form = soegerform(kilde);
  former[navn] = form;
  check(form !== null, `fandt ikke sogerens form i ${navn}`);
  // Staaende. Papiret er staaende, og begge steder billedet ender er det ogsa.
  check(
    form === null || form < 1,
    `sogeren i ${navn} er liggende (${form?.toFixed(3)}) — billedet ender paa et staaende ark`,
  );
}

// ---------------------------------------------------------------------------
// 3. Sogeren er den ramme, billedet ender i
// ---------------------------------------------------------------------------
/*
 * Det er ikke nok, at sogeren er staaende. Den skal have samme form som det
 * sted, billedet havner — ellers beskaerer eller lader rapporten det, og
 * screeneren kan ikke se paa firkanten, hvad kunden faar.
 *
 * Maalene staar to steder hver, og de to skal folges ad. Derfor holdes de op
 * mod hinanden her frem for at staa som et tal, nogen skal huske at rette med.
 */

// Provebilledet: rapporten giver det 89 mm bredde og 13 cm hojde.
const rapport = fil("src", "app", "(bred)", "sager", "[id]", "rapport", "page.tsx");
const hoejde = rapport.match(/className="h-\[(\d+)cm\][^"]*object-contain"/);
check(hoejde !== null, "fandt ikke provebilledets hojde i rapporten");
if (hoejde && former["provetagningen"] !== null) {
  const mm = Number(hoejde[1]) * 10;
  const forventet = 89 / mm;
  check(
    Math.abs(former["provetagningen"]! - forventet) < 0.005,
    `sogeren i provetagningen er ${former["provetagningen"]!.toFixed(3)}, men rapportens ramme er 89x${mm} mm (${forventet.toFixed(3)})`,
  );
}

// Forsidebilledet: hele arket.
const css = fil("src", "app", "globals.css");
const ark = css.match(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/);
check(ark !== null, "fandt ikke forsidens format i globals.css");
if (ark && former["forsidebilledet"] !== null) {
  const forventet = Number(ark[1]) / Number(ark[2]);
  check(
    Math.abs(former["forsidebilledet"]! - forventet) < 0.005,
    `sogeren til forsidebilledet er ${former["forsidebilledet"]!.toFixed(3)}, men forsiden er ${ark[1]}x${ark[2]} (${forventet.toFixed(3)})`,
  );
}

// Regnestykket skal ogsa VAERE koblet paa. Det var praecis det, der manglede:
// funktionen kan vaere nok saa rigtig, hvis optagelsen tegner hele strommen
// udenom den.
const komprimering = fil("src", "lib", "camera", "compress.ts");
check(
  /captureFromVideo[\s\S]{0,400}?synligtUdsnit\([\s\S]{0,200}?video\.clientWidth/.test(
    komprimering,
  ),
  "captureFromVideo maaler ikke sogeren — sa tegner den hele strommen igen",
);
check(
  /ctx\.drawImage\(\s*source,\s*udsnit\.sx/.test(komprimering),
  "optagelsen tegner ikke udsnittet, men hele kilden",
);

// Og strommen bestilles i sogerens egen form, sa der helst ikke er noget at
// skaere vaek. `ideal` er et onske — svarer browseren noget andet, redder
// udsnittet ovenfor billedet, men saa er der brugt pixels paa ingenting.
const kamera = fil("src", "lib", "camera", "useCamera.ts");
check(
  /aspectRatio:\s*\{\s*ideal:\s*3\s*\/\s*4\s*\}/.test(kamera),
  "strommen bestilles ikke staaende — sogerne er staaende, og det er papiret ogsaa",
);
check(
  !/width:\s*\{\s*ideal:\s*1920\s*\}/.test(kamera),
  "strommen bestilles stadig som 1920 bred, altsa 16:9",
);

console.log(failures === 0 ? "OK — søger og optagelse viser det samme" : `${failures} fejl.`);
process.exit(failures === 0 ? 0 : 1);
