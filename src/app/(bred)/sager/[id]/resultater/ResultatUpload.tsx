"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { classify, displayValue, LAB_PARAMETERS } from "@/lib/lab/parametre";
import {
  decodeLabFile,
  LabParseError,
  matchRows,
  parseLabFile,
  type LabFile,
  type LabRow,
} from "@/lib/lab/parse";

type Sample = {
  id: string;
  label: string;
  seq: number;
  /** Kun prover med analyse kan modtage et svar. */
  is_lab_sample: boolean;
};

type Matched = { row: LabRow; sample: Sample | null };

/**
 * Indlaesning af Eurofins' svarfil.
 *
 * Filen laeses og kobles til sagens prover i browseren, og koblingen vises
 * for der gemmes noget. Det er med vilje: et svar der lander pa den forkerte
 * prove er vaerre end intet svar, og det er billigere at opdage her end i en
 * rapport der er sendt til kunden.
 */
export function ResultatUpload({
  samples,
  canUpload,
}: {
  samples: Sample[];
  /** Databasen tillader kun kontoret at skrive resultater (is_office). */
  canUpload: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<LabFile | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const matched: Matched[] = useMemo(
    () => (file ? matchRows(file.rows, samples) : []),
    [file, samples],
  );
  const hits = matched.filter((m) => m.sample);
  const misses = matched.filter((m) => !m.sample);
  // Kortlagte prover uden analyse far aldrig et svar, sa de er ikke savnede.
  const untouched = samples.filter(
    (s) => s.is_lab_sample && !hits.some((m) => m.sample?.id === s.id),
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;

    setError(null);
    setFile(null);
    try {
      const text = decodeLabFile(await picked.arrayBuffer());
      setFile(parseLabFile(text));
      setFilename(picked.name);
    } catch (cause) {
      setFilename(picked.name);
      setError(
        cause instanceof LabParseError
          ? cause.message
          : "Filen kunne ikke læses. Er det den rigtige fil fra Eurofins?",
      );
    }
  }

  async function save() {
    if (!file || hits.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const rows = hits.map(({ row, sample }) => {
        const values = Object.fromEntries(
          LAB_PARAMETERS.map((p) => [p.key, displayValue(row.values[p.key])]),
        );
        return {
          ...values,
          sample_id: sample!.id,
          received_at: file.receivedAt,
          raw: {
            batch: file.batch,
            rapport: file.reportRef,
            sagsnavn: file.caseName,
            provereference: row.reference,
            provemaerke: row.mark,
            kolonner: row.raw,
          },
        };
      });

      const { error: dbError } = await supabase
        .from("lab_results")
        .upsert(rows, { onConflict: "sample_id" });

      if (dbError) {
        setError(`Kunne ikke gemme: ${dbError.message}`);
        return;
      }

      setFile(null);
      setFilename(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-semibold">Indlæs svar fra Eurofins</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">
            AllResults-filen, som den hentes i Eurofins Online. Deres 1 er vores
            P1. Kortlagte prøver uden analyse har aldrig været på laboratoriet
            og kobles derfor ikke.
          </p>
        </div>
        {canUpload ? (
          <>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="tap ml-auto rounded-xl border border-border-strong hover:bg-surface-2 px-4 font-medium disabled:opacity-50"
            >
              Vælg fil
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={onPick}
              className="hidden"
            />
          </>
        ) : (
          <p className="ml-auto max-w-72 text-sm text-muted">
            Kun kontoret kan indlæse svar. Du kan se resultaterne og hente
            rapporten.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {filename && <span className="font-medium">{filename}: </span>}
          {error}
        </p>
      )}

      {file && (
        <div className="mt-5">
          <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <Meta label="Fil" value={filename} />
            <Meta label="Batch" value={file.batch} />
            <Meta label="Rapport" value={file.reportRef} />
            <Meta label="Modtaget på lab" value={file.receivedAt} />
            <Meta label="Sagsnavn hos Eurofins" value={file.caseName} />
          </dl>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border-strong text-left">
                  <th className="px-2 py-2 font-medium">Prøvemærke</th>
                  <th className="px-2 py-2 font-medium">Kobles til</th>
                  {LAB_PARAMETERS.map((p) => (
                    <th key={p.key} className="px-2 py-2 text-right font-medium">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matched.map(({ row, sample }) => (
                  <tr key={row.reference} className="border-b border-border">
                    <td className="tabular px-2 py-1.5">{row.mark}</td>
                    <td className="px-2 py-1.5">
                      {sample ? (
                        <span className="font-semibold text-primary">
                          {sample.label}
                        </span>
                      ) : (
                        <span className="text-danger">
                          ingen P{row.mark} på sagen
                        </span>
                      )}
                    </td>
                    {LAB_PARAMETERS.map((p) => {
                      const value = row.values[p.key];
                      const level = classify(p, value);
                      return (
                        <td
                          key={p.key}
                          className={`tabular whitespace-nowrap px-2 py-1.5 text-right ${
                            level === "farligt"
                              ? "font-semibold text-danger"
                              : level === "forurenet"
                                ? "font-medium text-warning"
                                : "text-muted"
                          }`}
                        >
                          {displayValue(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {misses.length > 0 && (
            <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              {misses.length} række{misses.length === 1 ? "" : "r"} i filen (
              {misses.map((m) => m.row.mark).join(", ")}) passer ikke til nogen
              analyseret prøve på sagen — deres {misses[0].row.mark} skal svare
              til vores P{misses[0].row.mark}. De gemmes ikke. Er det den
              rigtige sag?
            </p>
          )}

          {untouched.length > 0 && (
            <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              {untouched.length} prøve{untouched.length === 1 ? "" : "r"} på
              sagen får intet svar fra denne fil:{" "}
              {untouched.map((s) => s.label).join(", ")}.
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy || hits.length === 0}
              className="tap rounded-xl bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-50"
            >
              {busy
                ? "Gemmer…"
                : `Gem ${hits.length} resultat${hits.length === 1 ? "" : "er"}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setFilename(null);
              }}
              disabled={busy}
              className="tap px-2 text-sm text-muted hover:text-fg disabled:opacity-50"
            >
              Fortryd
            </button>
            <p className="text-sm text-muted">
              Et gemt svar erstatter et tidligere svar på samme prøve.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="label-xs">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
