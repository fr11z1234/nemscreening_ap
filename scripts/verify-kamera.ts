/**
 * Kontrollerer, at et billede viser det, der stod i sogeren.
 * Koeres med: npm run verify:kamera
 *
 * Fejlen den her fanger, var i appen i maaneder uden at nogen kunne se den paa
 * skaermen: sogeren viser strommen i en 4:3-kasse med `object-fit: cover`, og
 * optagelsen tegnede hele strommen. Var den 16:9, laa en fjerdedel af bredden
 * uden for sogeren og kom alligevel med i filen. Screeneren ramte proven ind i
 * firkanten og fik en radiator med i siden — og opdagede det forst i rapporten,
 * som viser billedet med `object-contain`.
 *
 * Regnestykket er rent og kan proves uden browser. Selve sogerens form kan det
 * ikke: den kommer fra CSS'en og maales paa elementet. Derfor kontrolleres det
 * ogsa her, at de to kameraer i appen faktisk staar i den kasse, udsnittet
 * regnes ud fra.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { synligtUdsnit } from "../src/lib/camera/compress";

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

for (const [navn, sti] of kameraer) {
  const kilde = fil(sti);
  const soeger = kilde.match(
    /<video[\s\S]{0,400}?className="([^"]*)"/,
  );
  check(soeger !== null, `fandt ikke sogeren i ${navn}`);
  check(
    soeger?.[1]?.includes("object-cover") ?? false,
    `sogeren i ${navn} bruger ikke object-cover — sa beskaerer optagelsen forkert`,
  );
  // Rigeligt vindue: der staar en forklaring mellem kassen og elementet i
  // Forsidebillede, og kommentarer skal kunne skrives uden at braekke en
  // kontrol.
  check(
    /aspect-4\/3[\s\S]{0,800}?<video/.test(kilde),
    `sogeren i ${navn} staar ikke laengere i en 4:3-kasse`,
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
  /aspectRatio:\s*\{\s*ideal:\s*4\s*\/\s*3\s*\}/.test(kamera),
  "strommen bestilles ikke i 4:3 — sogerens egen form",
);
check(
  !/width:\s*\{\s*ideal:\s*1920\s*\}/.test(kamera),
  "strommen bestilles stadig som 1920 bred, altsa 16:9",
);

console.log(failures === 0 ? "OK — søger og optagelse viser det samme" : `${failures} fejl.`);
process.exit(failures === 0 ? 0 : 1);
