"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STOV_LABEL } from "@/lib/lab/parametre";

export type StovProve = {
  sampleId: string;
  label: string;
  material: string | null;
  stovende: boolean | null;
};

/**
 * Asbestens tilstand.
 *
 * Eurofins oplyser kun OM asbest er pavist. Om den stover afgor forskellen
 * pa forurenet og farligt affald, og det kan kun et menneske sige. Sa laenge
 * ingen har taget stilling, bliver proven staende pa forurenet og markeret
 * med en stjerne i skemaet — vi gaetter ikke pa noget der afgor hvordan
 * affaldet skal handteres pa pladsen.
 */
export function Stovvurdering({
  prover,
  canEdit,
}: {
  prover: StovProve[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (prover.length === 0) return null;

  async function set(sampleId: string, stovende: boolean | null) {
    setBusy(sampleId);
    setError(null);
    const { error: dbError } = await supabase
      .from("lab_results")
      .update({ asbestos_dusty: stovende })
      .eq("sample_id", sampleId);
    setBusy(null);
    if (dbError) {
      setError(`Kunne ikke gemme: ${dbError.message}`);
      return;
    }
    router.refresh();
  }

  const mangler = prover.filter((p) => p.stovende === null);

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Asbest — støver den?</h2>
      <p className="mt-0.5 max-w-3xl text-sm text-muted">
        Laboratoriet oplyser kun, om asbest er påvist. Støvende asbest er
        farligt affald, ikke-støvende er forurenet — og den forskel kan kun
        vurderes af den, der har set materialet. Indtil den er sat, står prøven
        som forurenet og er markeret med <span className="font-bold">*</span> i
        skemaet.
      </p>

      {mangler.length > 0 && (
        <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          {mangler.length} prøve{mangler.length === 1 ? "" : "r"} med påvist
          asbest mangler en vurdering: {mangler.map((p) => p.label).join(", ")}.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {prover.map((p) => (
          <li
            key={p.sampleId}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3 py-2"
          >
            <span className="tabular w-10 shrink-0 font-semibold">{p.label}</span>
            <span className="max-w-64 truncate text-sm">
              {p.material ?? "Uden materiale"}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {p.stovende === null && (
                <span className="text-sm text-warning">Ikke vurderet</span>
              )}
              <Valg
                aktiv={p.stovende === false}
                disabled={!canEdit || busy === p.sampleId}
                tone="forurenet"
                onClick={() => set(p.sampleId, p.stovende === false ? null : false)}
              >
                {STOV_LABEL.nej}
              </Valg>
              <Valg
                aktiv={p.stovende === true}
                disabled={!canEdit || busy === p.sampleId}
                tone="farligt"
                onClick={() => set(p.sampleId, p.stovende === true ? null : true)}
              >
                {STOV_LABEL.ja}
              </Valg>
            </div>
          </li>
        ))}
      </ul>

      {!canEdit && (
        <p className="mt-3 text-sm text-muted">
          Kun kontoret kan sætte vurderingen.
        </p>
      )}
    </section>
  );
}

function Valg({
  aktiv,
  tone,
  disabled,
  onClick,
  children,
}: {
  aktiv: boolean;
  tone: "forurenet" | "farligt";
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const fill = tone === "farligt" ? "level-farligt" : "level-forurenet";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={aktiv}
      className={`tap rounded-lg px-3 text-sm font-medium disabled:opacity-50 ${
        aktiv ? fill : "bg-surface shadow-card"
      }`}
    >
      {children}
    </button>
  );
}
