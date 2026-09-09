export type Captured = { blob: Blob; width: number; height: number };

/**
 * 1600 px pa laengste led rammer balancen: rigeligt til at dokumentere hvor en
 * prove er taget, og smat nok til at en sag med 40 fotos kan uploades over en
 * daarlig mobilforbindelse pa en byggeplads.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** Det stykke af kildebilledet, der skal med. */
export type Udsnit = { sx: number; sy: number; sw: number; sh: number };

function scaled(w: number, h: number) {
  const f = Math.min(1, MAX_EDGE / Math.max(w, h));
  return { w: Math.round(w * f), h: Math.round(h * f) };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kunne ikke kode billedet"))),
      "image/jpeg",
      QUALITY,
    );
  });
}

async function draw(
  source: CanvasImageSource,
  udsnit: Udsnit,
): Promise<Captured> {
  const { w, h } = scaled(udsnit.sw, udsnit.sh);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne billedet");
  ctx.drawImage(source, udsnit.sx, udsnit.sy, udsnit.sw, udsnit.sh, 0, 0, w, h);

  return { blob: await toBlob(canvas), width: w, height: h };
}

/**
 * Det stykke af kamerastrommen, screeneren FAKTISK ser i sogeren.
 *
 * Sogeren er en 4:3-kasse, og strommen er som regel 16:9. `object-fit: cover`
 * skalerer billedet op, til det fylder kassen, og skaerer resten af. Det er
 * meningen paa skaermen — men optagelsen tegnede hele billedet, og saa kom der
 * en fjerdedel mere bredde med i filen, end der stod i sogeren. Screeneren
 * ramte en prove ind i firkanten og fik en radiator og en spand med i siden.
 *
 * Det er ikke en skonhedsfejl. Billedet skal dokumentere hvor proven blev
 * taget, og det gor det kun, hvis det viser det, hun sigtede paa.
 *
 * Maalene tages af elementet selv (`clientWidth`/`clientHeight`) og ikke af et
 * tal her i filen. Saa kan CSS'en aendre sogerens form uden at det her
 * regnestykke tavst bliver forkert — det er praecis den slags to steder, fejlen
 * kom af.
 *
 * Formlen er `object-fit: cover`s egen: skaler med den STORSTE af de to
 * forhold, sa kassen bliver fyldt, og tag midten. `object-position` staar til
 * center begge steder, og det er derfor udsnittet centreres.
 */
export function synligtUdsnit(
  videoBredde: number,
  videoHoejde: number,
  kasseBredde: number,
  kasseHoejde: number,
): Udsnit {
  const helt = { sx: 0, sy: 0, sw: videoBredde, sh: videoHoejde };

  // Kender vi ikke kassen — elementet er skjult, eller layoutet er ikke lagt
  // endnu — er hele billedet det aerlige svar. Et gaet paa en form ville
  // skaere noget vaek, som ingen har bedt om.
  if (kasseBredde <= 0 || kasseHoejde <= 0) return helt;
  if (videoBredde <= 0 || videoHoejde <= 0) return helt;

  const skala = Math.max(kasseBredde / videoBredde, kasseHoejde / videoHoejde);
  const sw = Math.min(videoBredde, Math.round(kasseBredde / skala));
  const sh = Math.min(videoHoejde, Math.round(kasseHoejde / skala));

  return {
    sx: Math.round((videoBredde - sw) / 2),
    sy: Math.round((videoHoejde - sh) / 2),
    sw,
    sh,
  };
}

/** Fryser det, der staar i sogeren — ikke hele strommen. */
export function captureFromVideo(video: HTMLVideoElement): Promise<Captured> {
  return draw(
    video,
    synligtUdsnit(
      video.videoWidth,
      video.videoHeight,
      video.clientWidth,
      video.clientHeight,
    ),
  );
}

/**
 * Bruges nar getUserMedia ikke er tilgaengelig, og screeneren i stedet har
 * valgt et billede via systemets kamera.
 *
 * Her er der ingen soger at rette sig efter — hun har set billedet i systemets
 * eget kamera, som det er — sa filen kommer med i sin helhed.
 */
export async function compressImageFile(file: File): Promise<Captured> {
  const bitmap = await createImageBitmap(file);
  try {
    return await draw(bitmap, {
      sx: 0,
      sy: 0,
      sw: bitmap.width,
      sh: bitmap.height,
    });
  } finally {
    bitmap.close();
  }
}
