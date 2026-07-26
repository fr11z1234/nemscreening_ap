/**
 * Genererer PWA-ikonerne. Koeres med: node scripts/generate-icons.mjs
 *
 * Ingen afhaengigheder — en minimal PNG-encoder plus lidt rasterisering er
 * nok til et fladt maerke, og sa slipper projektet for et billedbibliotek
 * der kun bruges en gang.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bitdybde
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtertype "none"
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Blod kant over ca. en pixel, sa kanterne ikke trapper. */
const coverage = (dist) => clamp01(0.5 - dist);

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / len2);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToRoundedRect(px, py, size, radius) {
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2 - radius;
  const qx = Math.abs(px - cx) - half;
  const qy = Math.abs(py - cy) - half;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

/**
 * Groen flade med et hvidt flueben. Fluebenet er valgt fordi det laeses med det
 * samme i lille storrelse — en bygning eller et forstorrelsesglas bliver grod
 * ved 48 px pa en hjemmeskaerm.
 */
function drawIcon(size, { rounded, inset }) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = rounded ? size * 0.22 : 0;

  // Fluebenets tre punkter, skaleret ind i det sikre omrade for maskable-ikoner.
  const s = size;
  const m = inset;
  const pts = [
    [0.30 * s, 0.53 * s],
    [0.44 * s, 0.67 * s],
    [0.72 * s, 0.35 * s],
  ].map(([x, y]) => [
    s / 2 + (x - s / 2) * m,
    s / 2 + (y - s / 2) * m,
  ]);
  const stroke = size * 0.085 * m;

  const bg = [21, 128, 61];
  const fg = [255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      const bgA = rounded
        ? coverage(distToRoundedRect(px, py, size, radius))
        : 1;

      const d = Math.min(
        distToSegment(px, py, pts[0][0], pts[0][1], pts[1][0], pts[1][1]),
        distToSegment(px, py, pts[1][0], pts[1][1], pts[2][0], pts[2][1]),
      );
      const markA = coverage(d - stroke / 2);

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(bg[c] * (1 - markA) + fg[c] * markA);
      }
      rgba[i + 3] = Math.round(255 * bgA);
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT, { recursive: true });

const files = [
  ["icon-192.png", 192, { rounded: true, inset: 1 }],
  ["icon-512.png", 512, { rounded: true, inset: 1 }],
  // Maskable: fuld flade, motivet trukket ind i den sikre zone (ca. 80 %).
  ["icon-maskable-512.png", 512, { rounded: false, inset: 0.78 }],
  // iOS lagger selv afrunding pa, sa den skal vaere firkantet og uden alfa.
  ["apple-touch-icon.png", 180, { rounded: false, inset: 1 }],
];

for (const [name, size, opts] of files) {
  writeFileSync(join(OUT, name), drawIcon(size, opts));
  console.log(`${name} (${size}x${size})`);
}
