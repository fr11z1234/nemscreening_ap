"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ressourceLinjeTekst } from "@/lib/rapport/ressourcer";
import {
  RESOURCE_HANDLINGS,
  RESOURCE_HANDLING_LABEL,
  type BuildingPart,
  type Material,
  type ResourceHandling,
} from "@/lib/types";
import {
  flytBygningsdel,
  gemBygningsdel,
  gemMateriale,
  opretBygningsdel,
  opretMateriale,
  skiftBygningsdelAdgang,
  skiftMaterialeAdgang,
  type PanelState,
} from "./actions";

const felt =
  "w-full rounded-lg bg-surface-2 px-3 py-2 outline-none focus:inset-ring-2 focus:inset-ring-primary-line";

function GemKnap({ tekst = "Gem" }: { tekst?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
    >
      {pending ? "Gemmer…" : tekst}
    </button>
  );
}

function Besked({ state }: { state: PanelState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary">
        {state.ok}
      </p>
    );
  return null;
}

export function MaterialePanel({
  materialer,
  bygningsdele,
}: {
  materialer: Material[];
  bygningsdele: BuildingPart[];
}) {
  const [valgtId, setValgtId] = useState<string | null>(
    materialer[0]?.id ?? null,
  );
  const [soeg, setSoeg] = useState("");

  const fundne = useMemo(() => {
    const q = soeg.trim().toLowerCase();
    if (!q) return materialer;
    return materialer.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.report_name ?? "").toLowerCase().includes(q),
    );
  }, [materialer, soeg]);

  const valgt = materialer.find((m) => m.id === valgtId) ?? null;

  return (
    <>
      {/* To ruder: listen til venstre, det valgte til hojre. Bygget til en
          skaerm med plads — panelet bruges pa kontoret, ikke i marken. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="flex min-w-0 flex-col">
          <input
            type="search"
            value={soeg}
            onChange={(e) => setSoeg(e.target.value)}
            placeholder="Søg i materialer…"
            className={felt}
            aria-label="Søg i materialer"
          />

          <p className="mt-2 text-xs text-muted">
            {fundne.length} af {materialer.length}
          </p>

          <ul className="mt-2 flex max-h-128 flex-col gap-1 overflow-y-auto pr-1">
            {fundne.map((m) => {
              const aktiv = m.id === valgtId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setValgtId(m.id)}
                    aria-current={aktiv}
                    className={`tap flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      aktiv
                        ? "bg-primary-soft font-medium text-primary inset-ring inset-ring-primary-line"
                        : "bg-surface shadow-card hover:bg-surface-2"
                    }`}
                  >
                    <span className={`min-w-0 flex-1 truncate ${m.active ? "" : "text-muted line-through"}`}>
                      {m.name}
                    </span>
                  </button>
                </li>
              );
            })}
            {fundne.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Ingen træffere.</li>
            )}
          </ul>

          <NytMateriale />
        </section>

        {/* key: formularen skal bygges forfra, nar der skiftes materiale.
            Ellers ville felterne blive staaende med det forriges tekst. */}
        {valgt ? (
          <MaterialeForm key={valgt.id} m={valgt} />
        ) : (
          <p className="text-sm text-muted">Vælg et materiale til venstre.</p>
        )}
      </div>

      <Bygningsdele dele={bygningsdele} />
    </>
  );
}

function MaterialeForm({ m }: { m: Material }) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    gemMateriale,
    {},
  );

  const [navn, setNavn] = useState(m.name);
  const [rapportnavn, setRapportnavn] = useState(m.report_name ?? "");
  const [saetninger, setSaetninger] = useState<
    Record<ResourceHandling, string>
  >({
    genbrug: m.sentence_genbrug ?? "",
    genanvendelse: m.sentence_genanvendelse ?? "",
    bortskaffelse: m.sentence_bortskaffelse ?? "",
  });

  const linjenavn = rapportnavn.trim() || navn.trim() || "Materiale";

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={m.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="label-xs">Navn</span>
            <input
              name="name"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              required
              className={felt}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-xs">Navn i rapporten</span>
            <input
              name="report_name"
              value={rapportnavn}
              onChange={(e) => setRapportnavn(e.target.value)}
              placeholder={navn}
              className={felt}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          {RESOURCE_HANDLINGS.map((h) => (
            <label key={h} className="flex flex-col gap-1.5">
              <span className="label-xs">{RESOURCE_HANDLING_LABEL[h]}</span>
              <textarea
                name={`sentence_${h}`}
                rows={2}
                value={saetninger[h]}
                onChange={(e) =>
                  setSaetninger((s) => ({ ...s, [h]: e.target.value }))
                }
                className={felt}
              />
              {/* Linjen som kunden faar den at se. Den fanger det, en
                  tekstboks ikke kan vise: at saetningen laener sig pa maengden,
                  og at materialenavnet ikke skal gentages i den.
                  Uden ramme og daempet: den er et ekko af feltet ovenfor, ikke
                  et felt i sig selv, og skal ikke kappes om opmaerksomheden. */}
              {saetninger[h].trim() && (
                <span className="text-xs leading-relaxed text-muted opacity-70">
                  {ressourceLinjeTekst({
                    navn: linjenavn,
                    kg: 12000,
                    condition: 2,
                    handling: h,
                    saetning: saetninger[h].trim(),
                    niveau: null,
                    labels: [],
                  })}
                </span>
              )}
            </label>
          ))}
        </div>

        <Besked state={state} />

        <div>
          <GemKnap />
        </div>
      </form>

      <form action={skiftMaterialeAdgang} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="active" value={m.active ? "false" : "true"} />
        <button
          className={`tap rounded-lg px-3 py-2 text-sm ${
            m.active
              ? "text-danger hover:underline"
              : "border border-border-strong hover:bg-surface-2"
          }`}
        >
          {m.active ? "Luk materialet" : "Åbn materialet igen"}
        </button>
      </form>
    </section>
  );
}

function NytMateriale() {
  const [state, formAction] = useActionState<PanelState, FormData>(
    opretMateriale,
    {},
  );
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
      <span className="label-xs">Nyt materiale</span>
      <div className="flex gap-2">
        <input name="name" required placeholder="Navn" className={felt} />
        <GemKnap tekst="Opret" />
      </div>
      <Besked state={state} />
    </form>
  );
}

/**
 * Bygningsdelene — rapportens fede overskrifter.
 *
 * Raekkefolgen her ER overskrifternes orden i rapporten, nedefra og op gennem
 * bygningen. Derfor kan de flyttes.
 */
function Bygningsdele({ dele }: { dele: BuildingPart[] }) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    opretBygningsdel,
    {},
  );

  return (
    <section className="mt-10 max-w-3xl border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Bygningsdele</h2>

      <ul className="mt-4 flex flex-col gap-2">
        {dele.map((d, i) => (
          <li
            key={d.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg p-2 ${
              d.active ? "bg-surface shadow-card" : "bg-surface-2"
            }`}
          >
            <span className="tabular w-6 shrink-0 text-center text-xs text-muted">
              {i + 1}
            </span>

            <BygningsdelNavn d={d} />

            <div className="ml-auto flex items-center gap-1">
              <form action={flytBygningsdel}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="retning" value="op" />
                <button
                  disabled={i === 0}
                  aria-label={`Flyt ${d.name} op`}
                  className="tap rounded-lg px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-25"
                >
                  ↑
                </button>
              </form>
              <form action={flytBygningsdel}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="retning" value="ned" />
                <button
                  disabled={i === dele.length - 1}
                  aria-label={`Flyt ${d.name} ned`}
                  className="tap rounded-lg px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-25"
                >
                  ↓
                </button>
              </form>
              <form action={skiftBygningsdelAdgang}>
                <input type="hidden" name="id" value={d.id} />
                <input
                  type="hidden"
                  name="active"
                  value={d.active ? "false" : "true"}
                />
                <button
                  className={`tap rounded-lg px-2.5 py-1 text-sm ${
                    d.active ? "text-danger hover:underline" : "hover:bg-surface-2"
                  }`}
                >
                  {d.active ? "Luk" : "Åbn"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={formAction} className="mt-4 flex flex-col gap-2">
        <span className="label-xs">Ny bygningsdel</span>
        <div className="flex max-w-md gap-2">
          <input name="name" required placeholder="Navn" className={felt} />
          <GemKnap tekst="Opret" />
        </div>
        <Besked state={state} />
      </form>
    </section>
  );
}

function BygningsdelNavn({ d }: { d: BuildingPart }) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    gemBygningsdel,
    {},
  );
  return (
    <form action={formAction} className="flex min-w-0 flex-1 items-center gap-2">
      <input type="hidden" name="id" value={d.id} />
      <input
        name="name"
        defaultValue={d.name}
        className={`${felt} min-w-0 flex-1 ${d.active ? "" : "text-muted"}`}
        aria-label={`Navn på ${d.name}`}
      />
      <button className="tap rounded-lg border border-border-strong px-3 py-2 text-sm hover:bg-surface-2">
        Gem
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
