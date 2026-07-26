export type Captured = { blob: Blob; width: number; height: number };

/**
 * 1600 px pa laengste led rammer balancen: rigeligt til at dokumentere hvor en
 * prove er taget, og smat nok til at en sag med 40 fotos kan uploades over en
 * daarlig mobilforbindelse pa en byggeplads.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

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
  sw: number,
  sh: number,
): Promise<Captured> {
  const { w, h } = scaled(sw, sh);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke tegne billedet");
  ctx.drawImage(source, 0, 0, w, h);

  return { blob: await toBlob(canvas), width: w, height: h };
}

/** Fryser det aktuelle billede fra kamerastrommen. */
export function captureFromVideo(video: HTMLVideoElement): Promise<Captured> {
  return draw(video, video.videoWidth, video.videoHeight);
}

/**
 * Bruges nar getUserMedia ikke er tilgaengelig, og screeneren i stedet har
 * valgt et billede via systemets kamera.
 */
export async function compressImageFile(file: File): Promise<Captured> {
  const bitmap = await createImageBitmap(file);
  try {
    return await draw(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
