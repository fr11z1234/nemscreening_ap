import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Praecis sa meget ZIP som der skal til for at aabne en .xlsx, skifte et par
 * XML-dele ud, og lukke den igen.
 *
 * Pointen er hvad koden IKKE gor: alle andre dele kopieres over som de
 * komprimerede bytes de allerede var. Skabelonens skjulte ark, navngivne
 * omrader, SHA-512-beskyttelse og docProps overlever derfor uroert — vi kan
 * ikke komme til at oedelaegge noget vi aldrig pakker ud.
 */

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

const STORED = 0;
const DEFLATED = 8;

/** Bit 3: stoerrelser star i en data descriptor efter dataen, ikke i headeren. */
const FLAG_DATA_DESCRIPTOR = 0x08;

export type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  modTime: number;
  modDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  /** Dataen som den ligger i arkivet — komprimeret, hvis method er 8. */
  data: Buffer;
};

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/**
 * Laeser arkivet via det centrale katalog. Det er der de rigtige stoerrelser
 * star, ogsa nar en skriver har efterladt nuller i de lokale headere.
 */
export function readZip(buf: Buffer): ZipEntry[] {
  const eocd = findEocd(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL_SIG) {
      throw new Error(`ZIP: forventede en katalogpost ved ${p}`);
    }
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const modTime = buf.readUInt16LE(p + 12);
    const modDate = buf.readUInt16LE(p + 14);
    const crc = buf.readUInt32LE(p + 16);
    const compressedSize = buf.readUInt32LE(p + 20);
    const uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    if (buf.readUInt32LE(localOffset) !== LOCAL_SIG) {
      throw new Error(`ZIP: ${name} peger ikke pa en lokal header`);
    }
    const dataStart =
      localOffset +
      30 +
      buf.readUInt16LE(localOffset + 26) +
      buf.readUInt16LE(localOffset + 28);

    entries.push({
      name,
      flags: flags & ~FLAG_DATA_DESCRIPTOR,
      method,
      modTime,
      modDate,
      crc32: crc,
      compressedSize,
      uncompressedSize,
      data: buf.subarray(dataStart, dataStart + compressedSize),
    });

    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function writeZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(e.flags, 6);
    local.writeUInt16LE(e.method, 8);
    local.writeUInt16LE(e.modTime, 10);
    local.writeUInt16LE(e.modDate, 12);
    local.writeUInt32LE(e.crc32, 14);
    local.writeUInt32LE(e.compressedSize, 18);
    local.writeUInt32LE(e.uncompressedSize, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field
    chunks.push(local, name, e.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(CENTRAL_SIG, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(e.flags, 8);
    cd.writeUInt16LE(e.method, 10);
    cd.writeUInt16LE(e.modTime, 12);
    cd.writeUInt16LE(e.modDate, 14);
    cd.writeUInt32LE(e.crc32, 16);
    cd.writeUInt32LE(e.compressedSize, 20);
    cd.writeUInt32LE(e.uncompressedSize, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += local.length + name.length + e.data.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

/** Pakker en enkelt del ud. Kun de to metoder .xlsx-skrivere faktisk bruger. */
export function readPart(entry: ZipEntry): string {
  const raw =
    entry.method === STORED
      ? entry.data
      : entry.method === DEFLATED
        ? inflateRawSync(entry.data)
        : null;
  if (!raw) throw new Error(`ZIP: ${entry.name} bruger metode ${entry.method}`);
  return raw.toString("utf8");
}

/**
 * Skifter indholdet ud i navngivne dele og lader resten vaere.
 *
 * Kaster hvis en del ikke findes — sa opdager vi en aendret skabelon her,
 * i stedet for at sende en tom fil til laboratoriet.
 */
export function patchZip(
  entries: ZipEntry[],
  patches: Record<string, (xml: string) => string>,
): ZipEntry[] {
  const touched = new Set<string>();

  const result = entries.map((entry) => {
    const patch = patches[entry.name];
    if (!patch) return entry;
    touched.add(entry.name);

    const next = Buffer.from(patch(readPart(entry)), "utf8");
    const data = deflateRawSync(next, { level: 9 });
    return {
      ...entry,
      method: DEFLATED,
      crc32: crc32(next),
      compressedSize: data.length,
      uncompressedSize: next.length,
      data,
    };
  });

  for (const name of Object.keys(patches)) {
    if (!touched.has(name)) throw new Error(`ZIP: skabelonen mangler ${name}`);
  }
  return result;
}

function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new Error("ZIP: fandt ingen slutpost — filen er ikke et ZIP-arkiv");
}
