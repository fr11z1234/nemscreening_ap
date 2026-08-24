"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  tagTekst,
  varmeTekst,
  ydervaegTekst,
  type BbrBuilding,
  type BygningsNoter,
} from "@/lib/bbr/map";
import { formatDecimal, parseDecimal } from "@/lib/format";
import { saveBuildings } from "./actions";

type Bygning = BbrBuilding & BygningsNoter;

/** `key` er kun til Reacts liste — den folger ikke med i databasen. */
type Row = Bygning & { key: string; selected: boolean; isManual?: boolean };

const field =
  "tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted";

const asRows = (buildings: Bygning[]): Row[] =>
  buildings.map((b, i) => ({
    ...b,
    key: b.bbrBuildingId ?? `bbr-${i}`,
    selected: true,
  }));

function toBuilding(row: Row): Bygning & { isManual?: boolean } {
  return {
    bbrBuildingId: row.bbrBuildingId,
    buildingNo: row.buildingNo,
    label: row.label,
    usageCode: row.usageCode,
    usageText: row.usageText,
    builtYear: row.builtYear,
    rebuiltYear: row.rebuiltYear,
    areaBuilt: row.areaBuilt,
    areaTotal: row.areaTotal,
    areaResidential: row.areaResidential,
    floors: row.floors,
    wallMaterialCode: row.wallMaterialCode,
    roofMaterialCode: row.roofMaterialCode,
    heatingCode: row.heatingCode,
    usageNote: row.usageNote,
    constructionNote: row.constructionNote,
    planNote: row.planNote,
    isManual: row.isManual,
  };
}

export function BbrPicker({
  caseId,
  husnummerId,
  initial,
  fromBbr,
  attempted,
  fetchError,
  erSelektiv,
}: {
  caseId: string;
  husnummerId: string | null;
  /** Gemte bygninger, eller — hvis der ingen er — dem serveren lige hentede. */
  initial: Bygning[];
  fromBbr: boolean;
  attempted: boolean;
  fetchError: string | null;
  /**
   * Om sagen er en selektiv nedrivning.
   *
   * Kun da beder vi om de tre beskrivelser: de star i den selektive rapports
   * bygningsoversigt og ingen andre steder. Tre tekstfelter pr. bygning pa en
   * almindelig miljoscreening ville vaere arbejde, der aldrig blev laest.
   */
  erSelektiv: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => asRows(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(fetchError);
  // Serveren har allerede slaet op, sa formularen er klar med det samme.
  const [touched, setTouched] = useState(initial.length > 0 || attempted);
  const [saving, startSaving] = useTransition();

  const selected = useMemo(() => rows.filter((r) => r.selected), [rows]);

  /**
   * Arkhovedets felter udledes under render frem for i en effekt, sa de folger
   * afkrydsningerne med det samme. Screenerens egne rettelser gemmes separat
   * og vinder, sa et nyt BBR-opslag ikke overskriver dem.
   */
  const derived = useMemo(() => {
    const numbers = (values: (number | null)[]) =>
      values.filter((n): n is number => n != null);

    const areas = numbers(selected.map((b) => b.areaTotal ?? b.areaBuilt));
    const built = numbers(selected.map((b) => b.builtYear));
    const rebuilt = numbers(selected.map((b) => b.rebuiltYear));

    return {
      area: areas.length ? formatDecimal(areas.reduce((a, b) => a + b, 0)) : "",
      // Aeldste opforelsesar er det relevante: det afgor om der kan vaere PCB,
      // asbest og bly i spil.
      built: built.length ? String(Math.min(...built)) : "",
      rebuilt: rebuilt.length ? String(Math.max(...rebuilt)) : "",
    };
  }, [selected]);

  const [edited, setEdited] = useState<{
    area?: string;
    built?: string;
    rebuilt?: string;
  }>({});

  const areaText = edited.area ?? derived.area;
  const builtText = edited.built ?? derived.built;
  const rebuiltText = edited.rebuilt ?? derived.rebuilt;

  async function fetchBbr() {
    if (!husnummerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bbr/bygninger?husnummer=${encodeURIComponent(husnummerId)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Opslaget mislykkedes.");
      const found = body as BbrBuilding[];
      if (found.length === 0) {
        setError("BBR har ingen bygninger på adressen. Opret dem i hånden.");
      }
      // BBR svarer ikke med vores egne beskrivelser, sa de baeres over pa den
      // bygning der har samme id. Uden det ville et tryk pa «Hent fra BBR
      // igen» tomme tre tekstfelter, nogen har skrevet staaende i bygningen.
      // Serveren gor det samme mod databasen; se saveBuildings.
      setRows((tidligere) => {
        const noter = new Map(
          tidligere
            .filter((r) => r.bbrBuildingId)
            .map((r) => [r.bbrBuildingId!, r]),
        );
        return asRows(
          found.map((b) => {
            const gammel = b.bbrBuildingId ? noter.get(b.bbrBuildingId) : null;
            return {
              ...b,
              usageNote: gammel?.usageNote ?? null,
              constructionNote: gammel?.constructionNote ?? null,
              planNote: gammel?.planNote ?? null,
            };
          }),
        );
      });
      setTouched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaget mislykkedes.");
    } finally {
      setLoading(false);
    }
  }

  function addManual() {
    const n = rows.length + 1;
    setRows((r) => [
      ...r,
      {
        key: `manuel-${crypto.randomUUID()}`,
        bbrBuildingId: null,
        buildingNo: String(n),
        label: `Bygning ${n}`,
        usageCode: null,
        usageText: null,
        builtYear: null,
        rebuiltYear: null,
        areaBuilt: null,
        areaTotal: null,
        areaResidential: null,
        floors: null,
        wallMaterialCode: null,
        roofMaterialCode: null,
        heatingCode: null,
        usageNote: null,
        constructionNote: null,
        planNote: null,
        selected: true,
        isManual: true,
      },
    ]);
    setTouched(true);
  }

  function onSave() {
    startSaving(async () => {
      await saveBuildings({
        caseId,
        buildings: selected.map(toBuilding),
        areaM2: parseDecimal(areaText),
        builtYear: parseDecimal(builtText),
        rebuiltYear: parseDecimal(rebuiltText),
      });
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-12">
      {!husnummerId && (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          Sagen har ingen adresse fra adressesøgningen, så BBR kan ikke slås op
          automatisk. Opret bygningerne i hånden nedenfor.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <section>
          <h2 className="font-semibold">Hvilke bygninger er med i sagen?</h2>
          {fromBbr && !error && (
            <p className="mt-1 text-sm text-muted">
              Hentet fra BBR. Fjern fluebenet ved dem sagen ikke omfatter.
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((b, i) => (
              <li key={b.key}>
                <BuildingRow
                  row={b}
                  onChange={(patch) =>
                    setRows((r) =>
                      r.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                    )
                  }
                  onRemove={() =>
                    setRows((r) => r.filter((_, j) => j !== i))
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={addManual}
          className="tap rounded-xl border border-border-strong hover:bg-surface-2 px-4"
        >
          Tilføj bygning i hånden
        </button>

        {husnummerId && (
          <button
            type="button"
            onClick={fetchBbr}
            disabled={loading}
            className="tap text-sm text-muted hover:text-fg disabled:opacity-60"
          >
            {loading ? "Henter fra BBR…" : "Hent fra BBR igen"}
          </button>
        )}
      </div>

      {/* Beskrivelserne staar for sig og ikke bag "Ret" pa hver bygning: de er
          et trin i arbejdet, ikke en rettelse af BBR. Kun de valgte bygninger
          er med — det er dem, der kommer i rapporten. */}
      {erSelektiv && selected.length > 0 && (
        <section>
          <h2 className="font-semibold">Beskriv bygningerne</h2>
          <p className="mt-1 text-sm text-muted">
            Står i rapportens afsnit «Projektets omfang», én blok pr. bygning.
            BBR-tallene til højre er hentet — de tre felter skal skrives.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {rows.map((b, i) =>
              b.selected ? (
                <li key={b.key}>
                  <Beskrivelse
                    row={b}
                    onChange={(patch) =>
                      setRows((r) =>
                        r.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                      )
                    }
                  />
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      {touched && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">Er oplysningerne korrekte?</h2>
            <p className="mt-1 text-sm text-muted">
              Udfyldt ud fra {selected.length} valgt
              {selected.length === 1 ? " bygning" : "e bygninger"}. Ret frit.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Areal (m²)</span>
            <input
              type="text"
              inputMode="decimal"
              value={areaText}
              onChange={(e) =>
                setEdited((v) => ({ ...v, area: e.target.value }))
              }
              className={field}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Byggeår</span>
              <input
                type="text"
                inputMode="numeric"
                value={builtText}
                onChange={(e) =>
                  setEdited((v) => ({ ...v, built: e.target.value }))
                }
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Ombygningsår</span>
              <input
                type="text"
                inputMode="numeric"
                value={rebuiltText}
                onChange={(e) =>
                  setEdited((v) => ({ ...v, rebuilt: e.target.value }))
                }
                className={field}
              />
            </label>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !touched}
          className="tap rounded-lg bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "Gemmer…" : "Oplysningerne er korrekte"}
        </button>
        <Link
          href={`/sager/${caseId}`}
          className="tap flex items-center justify-center rounded-xl border border-border-strong hover:bg-surface-2 px-4"
        >
          Tilbage
        </Link>
      </div>
    </div>
  );
}

/**
 * En bygning som rapporten beskriver den: BBR's tal, og de tre saetninger
 * screeneren skriver.
 *
 * Tallene staar fremme og ikke bag et panel, fordi de er det, teksten skrives
 * ud fra: man skriver "traditionel muret konstruktion med tegltag" mens man
 * kan se "Ydervægge: Mursten" og "Tag: Tegl" ved siden af.
 */
function Beskrivelse({
  row,
  onChange,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
}) {
  const fakta: [string, string | number | null][] = [
    ["Opført", row.builtYear],
    ["Etager", row.floors],
    ["Samlet areal", row.areaTotal ? `${formatDecimal(row.areaTotal)} m²` : null],
    ["Ydervægge", ydervaegTekst(row.wallMaterialCode)],
    ["Tag", tagTekst(row.roofMaterialCode)],
    ["Varmeforsyning", varmeTekst(row.heatingCode)],
  ];

  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{row.label}</span>
        {row.usageText && (
          <span className="text-sm text-muted">{row.usageText}</span>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {fakta.map(([navn, vaerdi]) => (
          <div key={navn} className="flex gap-1.5">
            <dt className="text-muted">{navn}:</dt>
            <dd className={vaerdi ? "font-medium" : "text-muted"}>
              {vaerdi ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-col gap-3">
        <NoteFelt
          label="Bygningens anvendelse"
          hint="Fx privat bolig, erhverv, lager, værksted, institution."
          value={row.usageNote}
          onChange={(v) => onChange({ usageNote: v })}
        />
        <NoteFelt
          label="Konstruktion og stand"
          hint="Fx «opført som traditionel muret konstruktion med tegltag, fremstår i ældre stand»."
          value={row.constructionNote}
          onChange={(v) => onChange({ constructionNote: v })}
        />
        <NoteFelt
          label="Hvad skal der ske?"
          hint="Fx «bygningen er planlagt til fuldstændig nedrivning»."
          value={row.planNote}
          onChange={(v) => onChange({ planNote: v })}
        />
      </div>
    </div>
  );
}

function NoteFelt({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <textarea
        rows={2}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-xl bg-surface-2 px-3.5 py-2.5 outline-none"
      />
      <span className="text-xs text-muted">{hint}</span>
    </label>
  );
}

/**
 * Tal-felt der holder sin egen tekst.
 *
 * Uden det ville "1,5" forsvinde midt i indtastningen: efter komma'et kan
 * teksten ikke parses til et tal endnu, og feltet ville rydde sig selv.
 */
function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => formatDecimal(value));
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseDecimal(e.target.value));
      }}
      className={field}
    />
  );
}

/**
 * En bygning i listen: flueben til om den er med i sagen, og et foldbart
 * panel til at rette BBR's oplysninger.
 *
 * BBR er ikke altid ajour — en bygning kan vaere revet ned, bygget om uden at
 * det er indberettet, eller have et areal der ikke passer. Screeneren star med
 * bygningen foran sig og ved bedre.
 */
function BuildingRow({
  row,
  onChange,
  onRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  const summary =
    [
      row.usageText,
      row.builtYear ? `opført ${row.builtYear}` : null,
      row.rebuiltYear ? `ombygget ${row.rebuiltYear}` : null,
      row.areaBuilt ? `${formatDecimal(row.areaBuilt)} m² bebygget` : null,
      ydervaegTekst(row.wallMaterialCode),
      tagTekst(row.roofMaterialCode),
    ]
      .filter(Boolean)
      .join(" · ") || "Ingen oplysninger";

  /*
   * Fibercement med asbest er kode 3 i BBR — bade for ydervaeg og for tag.
   * Kode 10 er den samme plade uden asbest.
   *
   * Det staar her og ikke kun i den selektive beskrivelse, fordi det ikke
   * handler om rapporten: det afgor hvad screeneren skal have med i bilen, og
   * det gaelder lige sa meget en almindelig miljoscreening. BBR er ikke et
   * bevis — pladen kan vaere skiftet uden at nogen har indberettet det — men en
   * registrering der peger pa asbest skal ses for besoget og ikke bagefter.
   */
  const asbestmistanke =
    row.wallMaterialCode === "3" || row.roofMaterialCode === "3";

  return (
    <div
      className={`rounded-xl transition-colors ${
        row.selected
          ? "bg-primary-soft inset-ring inset-ring-primary-line"
          : "bg-surface shadow-card hover:bg-surface-2"
      }`}
    >
      <div className="flex gap-3 p-3">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          aria-label={`${row.label} er med i sagen`}
          className="mt-1 size-5 shrink-0 accent-current"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{row.label}</span>
            {row.isManual && (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                manuel
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-muted">{summary}</div>
          {asbestmistanke && (
            <p className="mt-1.5 rounded-lg bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
              BBR angiver fibercement <strong>herunder asbest</strong> — tag
              værnemidler med.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="tap shrink-0 self-start px-2 text-sm text-primary hover:underline"
        >
          {open ? "Færdig" : "Ret"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border/70 p-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-xs">Navn</span>
            <input
              type="text"
              value={row.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className={field}
            />
            <span className="text-xs text-muted">
              Står som lokalitet på prøverne. Fx &quot;Stuehus&quot; eller
              &quot;Lade&quot;.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Anvendelse</span>
            <input
              type="text"
              value={row.usageText ?? ""}
              onChange={(e) => onChange({ usageText: e.target.value || null })}
              className={field}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Byggeår</span>
              <NumberInput
                value={row.builtYear}
                onChange={(v) => onChange({ builtYear: v })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Ombygningsår</span>
              <NumberInput
                value={row.rebuiltYear}
                onChange={(v) => onChange({ rebuiltYear: v })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Bebygget m²</span>
              <NumberInput
                value={row.areaBuilt}
                onChange={(v) => onChange({ areaBuilt: v })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Samlet m²</span>
              <NumberInput
                value={row.areaTotal}
                onChange={(v) => onChange({ areaTotal: v })}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="tap self-start text-sm text-danger hover:underline"
          >
            Fjern bygningen
          </button>
        </div>
      )}
    </div>
  );
}
