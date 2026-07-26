"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { BbrBuilding } from "@/lib/bbr/map";
import { formatDecimal, parseDecimal } from "@/lib/format";
import { saveBuildings } from "./actions";

/** `key` er kun til Reacts liste — den folger ikke med i databasen. */
type Row = BbrBuilding & { key: string; selected: boolean; isManual?: boolean };

const field =
  "tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted";

const asRows = (buildings: BbrBuilding[]): Row[] =>
  buildings.map((b, i) => ({
    ...b,
    key: b.bbrBuildingId ?? `bbr-${i}`,
    selected: true,
  }));

function toBuilding(row: Row): BbrBuilding & { isManual?: boolean } {
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
}: {
  caseId: string;
  husnummerId: string | null;
  /** Gemte bygninger, eller — hvis der ingen er — dem serveren lige hentede. */
  initial: BbrBuilding[];
  fromBbr: boolean;
  attempted: boolean;
  fetchError: string | null;
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
      setRows(asRows(found));
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
          className="tap rounded-xl border border-border-strong px-4"
        >
          Tilføj bygning i hånden
        </button>

        {husnummerId && (
          <button
            type="button"
            onClick={fetchBbr}
            disabled={loading}
            className="tap text-sm text-muted disabled:opacity-60"
          >
            {loading ? "Henter fra BBR…" : "Hent fra BBR igen"}
          </button>
        )}
      </div>

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
          className="tap rounded-lg bg-primary px-4 font-medium text-primary-fg active:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "Gemmer…" : "Oplysningerne er korrekte"}
        </button>
        <Link
          href={`/sager/${caseId}`}
          className="tap flex items-center justify-center rounded-xl border border-border-strong px-4"
        >
          Tilbage
        </Link>
      </div>
    </div>
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
    ]
      .filter(Boolean)
      .join(" · ") || "Ingen oplysninger";

  return (
    <div
      className={`rounded-xl transition-colors ${
        row.selected
          ? "bg-primary-soft inset-ring inset-ring-primary-line"
          : "bg-surface shadow-card"
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
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="tap shrink-0 self-start px-2 text-sm text-primary"
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
            className="tap self-start text-sm text-danger"
          >
            Fjern bygningen
          </button>
        </div>
      )}
    </div>
  );
}
