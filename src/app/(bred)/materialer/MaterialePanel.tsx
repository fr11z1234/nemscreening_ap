"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ressourceLinjeHale } from "@/lib/rapport/ressourcer";
import {
  DISPOSAL_SENTENCE_FIELD,
  DISPOSAL_SENTENCE_HINT,
  DISPOSAL_SENTENCE_LABEL,
  RESOURCE_HANDLING_LABEL,
  SENTENCE_FIELD,
  type Bortskaffelsestekst,
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

/**
 * De to handteringer, screeneren vaelger for et materiale, der ER en ressource.
 *
 * «Bortskaffelse» er ogsa et valg i marken, men dens saetning hoerer hjemme i
 * gruppen nedenfor sammen med de to andre bortskaffelsestekster — det er den
 * samme spalte i rapporten, og de tre skal kunne laeses op mod hinanden.
 */
const RESSOURCEHANDTERINGER: ResourceHandling[] = ["genbrug", "genanvendelse"];

const BORTSKAFFELSESTEKSTER: Bortskaffelsestekst[] = [
  "bortskaffelse",
  "forurenet",
  "asbest",
];

function MaterialeForm({ m }: { m: Material }) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    gemMateriale,
    {},
  );

  const [navn, setNavn] = useState(m.name);
  const [rapportnavn, setRapportnavn] = useState(m.report_name ?? "");
  // Nogle er feltnavnet i databasen, sa de fem tekstfelter kan deles om den
  // samme tilstand uden at skulle oversaettes frem og tilbage.
  const [saetninger, setSaetninger] = useState<Record<string, string>>({
    sentence_genbrug: m.sentence_genbrug ?? "",
    sentence_genanvendelse: m.sentence_genanvendelse ?? "",
    sentence_bortskaffelse: m.sentence_bortskaffelse ?? "",
    sentence_forurenet: m.sentence_forurenet ?? "",
    sentence_asbest: m.sentence_asbest ?? "",
  });

  const linjenavn = rapportnavn.trim() || navn.trim() || "Materiale";

  const saetFelt = (felt: string, vaerdi: string) =>
    setSaetninger((s) => ({ ...s, [felt]: vaerdi }));

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
          {RESSOURCEHANDTERINGER.map((h) => (
            <Saetningsfelt
              key={h}
              navn={SENTENCE_FIELD[h]}
              overskrift={RESOURCE_HANDLING_LABEL[h]}
              vaerdi={saetninger[SENTENCE_FIELD[h]]}
              onChange={(v) => saetFelt(SENTENCE_FIELD[h], v)}
              hoved={linjenavn}
            />
          ))}
        </div>

        {/*
          Bortskaffelsen har tre tekster, og de skal staa samlet.

          Det er den samme spalte i rapporten — hvilken af dem der bliver
          skrevet, afgores af laboratoriesvaret og ikke af noget kontoret
          vaelger her. Derfor staar hvornar-forklaringen ved hvert felt: uden
          den er de tre kasser umulige at kende fra hinanden.
        */}
        <fieldset className="flex flex-col gap-3 rounded-xl bg-surface-2/50 p-4">
          <legend className="label-xs px-1">Bortskaffelse</legend>

          <p className="text-xs leading-relaxed text-muted">
            Laboratoriesvaret vælger teksten. Er asbest påvist, bruges
            asbestteksten — uanset hvad screeneren valgte, og uanset hvad der
            ellers er fundet.
          </p>

          {BORTSKAFFELSESTEKSTER.map((t) => (
            <Saetningsfelt
              key={t}
              navn={DISPOSAL_SENTENCE_FIELD[t]}
              overskrift={DISPOSAL_SENTENCE_LABEL[t]}
              hjaelp={DISPOSAL_SENTENCE_HINT[t]}
              vaerdi={saetninger[DISPOSAL_SENTENCE_FIELD[t]]}
              onChange={(v) => saetFelt(DISPOSAL_SENTENCE_FIELD[t], v)}
              // Forureningsafsnittet navngiver linjen med provenummeret og ikke
              // materialet. Eksemplet skal vise det, kunden faar — ellers
              // skriver kontoret en saetning, der laener sig pa et navn, der
              // ikke staar der.
              hoved="P1"
            />
          ))}
        </fieldset>

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

/**
 * Et tekstfelt med et eksempel paa linjen, som kunden faar den at se.
 *
 * Eksemplet fanger det, en tom tekstboks ikke kan vise: at saetningen laener
 * sig paa maengden og standen, og at den derfor hverken skal begynde med stort
 * eller gentage det, der staar foran den. Uden ramme og daempet — den er et
 * ekko af feltet ovenfor, ikke et felt i sig selv.
 */
function Saetningsfelt({
  navn,
  overskrift,
  hjaelp,
  vaerdi,
  onChange,
  hoved,
}: {
  navn: string;
  overskrift: string;
  hjaelp?: string;
  vaerdi: string;
  onChange: (v: string) => void;
  /** Linjens forreste led i eksemplet: materialets navn eller «P1». */
  hoved: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{overskrift}</span>
      {hjaelp && <span className="text-xs text-muted">{hjaelp}</span>}
      <textarea
        name={navn}
        rows={2}
        value={vaerdi}
        onChange={(e) => onChange(e.target.value)}
        className={felt}
      />
      {vaerdi.trim() && (
        <span className="text-xs leading-relaxed text-muted opacity-70">
          {hoved}{" "}
          {ressourceLinjeHale({
            navn: hoved,
            kg: 12000,
            condition: 2,
            handling: null,
            saetning: vaerdi.trim(),
            niveau: null,
            labels: [],
          })}
        </span>
      )}
    </label>
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
