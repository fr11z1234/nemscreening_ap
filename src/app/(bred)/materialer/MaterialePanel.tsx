"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { Besked, felt, GemKnap } from "@/components/PanelFelter";
import {
  Linjegruppe,
  Maerke,
  Overskrift,
  Standardtekster,
} from "@/components/rapport/Linjegruppe";
import { previewOversigt } from "@/lib/rapport/preview";
import { maerkerFor, TEKST_ORDEN } from "@/lib/rapport/ressourcer";
import {
  DISPOSAL_SENTENCE_FIELD,
  DISPOSAL_SENTENCE_HINT,
  DISPOSAL_SENTENCE_LABEL,
  RESOURCE_HANDLING_LABEL,
  SENTENCE_FIELD,
  type Bortskaffelsestekst,
  type Bortskaffelsestekster,
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
} from "./actions";
import type { PanelState } from "@/lib/panel";

export function MaterialePanel({
  materialer,
  bygningsdele,
  /**
   * De faelles bortskaffelsestekster, nar kontoret har slaaet dem til.
   *
   * Null er det, panelet altid har gjort: hvert materiale har sine egne tre.
   * Er de sat, skriver rapporten dem i stedet — og saa skal panelet vise DEM,
   * ikke felterne, der ligger og venter. Ellers retter kontoret en tekst, ingen
   * kommer til at laese.
   */
  faelles = null,
}: {
  materialer: Material[];
  bygningsdele: BuildingPart[];
  faelles?: Bortskaffelsestekster | null;
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
          <MaterialeForm
            key={valgt.id}
            m={valgt}
            bygningsdele={bygningsdele}
            faelles={faelles}
          />
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
 * gruppen nedenfor sammen med de tre andre bortskaffelsestekster — det er den
 * samme spalte i rapporten, og de fire skal kunne laeses op mod hinanden.
 */
const RESSOURCEHANDTERINGER: ResourceHandling[] = ["genbrug", "genanvendelse"];

/** Samme orden som teksterne staar i under rapportens linjer. */
const BORTSKAFFELSESTEKSTER: Bortskaffelsestekst[] = TEKST_ORDEN;

function MaterialeForm({
  m,
  bygningsdele,
  faelles,
}: {
  m: Material;
  bygningsdele: BuildingPart[];
  faelles: Bortskaffelsestekster | null;
}) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    gemMateriale,
    {},
  );
  const [viserPreview, setViserPreview] = useState(false);

  const [navn, setNavn] = useState(m.name);
  const [rapportnavn, setRapportnavn] = useState(m.report_name ?? "");
  // Nogle er feltnavnet i databasen, sa de seks tekstfelter kan deles om den
  // samme tilstand uden at skulle oversaettes frem og tilbage.
  const [saetninger, setSaetninger] = useState<Record<string, string>>({
    sentence_genbrug: m.sentence_genbrug ?? "",
    sentence_genanvendelse: m.sentence_genanvendelse ?? "",
    sentence_farligt: m.sentence_farligt ?? "",
    sentence_forurenet: m.sentence_forurenet ?? "",
    sentence_asbest: m.sentence_asbest ?? "",
    sentence_bortskaffelse: m.sentence_bortskaffelse ?? "",
  });

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
            />
          ))}
        </div>

        {/*
          Bortskaffelsen har fire tekster, og de skal staa samlet.

          Det er den samme spalte i rapporten — hvilken af dem der bliver
          skrevet, afgores af laboratoriesvaret og ikke af noget kontoret
          vaelger her. Derfor staar hvornar-forklaringen ved hvert felt: uden
          den er de fire kasser umulige at kende fra hinanden.
        */}
        <fieldset className="flex flex-col gap-3 rounded-xl border border-grid bg-surface-2 p-4">
          <legend className="label-xs px-1 uppercase tracking-wide">Bortskaffelse</legend>

          <p className="text-xs leading-relaxed text-muted">
            Laboratoriesvaret vælger teksten — også når screeneren selv havde
            valgt bortskaffelse. Er asbest påvist, bruges asbestteksten, uanset
            hvad der ellers er fundet.
          </p>

          {faelles ? (
            <FaellesTekster faelles={faelles} saetninger={saetninger} />
          ) : (
            BORTSKAFFELSESTEKSTER.map((t) => (
              <Saetningsfelt
                key={t}
                navn={DISPOSAL_SENTENCE_FIELD[t]}
                overskrift={DISPOSAL_SENTENCE_LABEL[t]}
                hjaelp={DISPOSAL_SENTENCE_HINT[t]}
                vaerdi={saetninger[DISPOSAL_SENTENCE_FIELD[t]]}
                onChange={(v) => saetFelt(DISPOSAL_SENTENCE_FIELD[t], v)}
              />
            ))
          )}
        </fieldset>

        <Besked state={state} />

        <div className="flex flex-wrap items-center gap-2">
          <GemKnap />
          {/* Previewet viser det, der staar i felterne — ikke det, der er gemt.
              Det er hele pointen: saetningen skal kunne ses, for den bliver
              til en rapport nogen sender til en kommune. */}
          <button
            type="button"
            onClick={() => setViserPreview(true)}
            className="tap rounded-lg border border-border-strong px-4 py-2 font-medium hover:bg-surface-2 active:bg-surface-2"
          >
            Vis i rapporten
          </button>
        </div>
      </form>

      {viserPreview && (
        <RapportPreview
          navn={navn}
          rapportnavn={rapportnavn}
          saetninger={saetninger}
          m={m}
          bygningsdele={bygningsdele}
          faelles={faelles}
          onLuk={() => setViserPreview(false)}
        />
      )}

      <form action={skiftMaterialeAdgang} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="active" value={m.active ? "false" : "true"} />
        <button
          className={`tap rounded-lg border px-3 py-2 text-sm ${
            m.active
              ? "border-danger/40 text-danger hover:bg-danger-soft"
              : "border-border-strong hover:bg-surface-2"
          }`}
        >
          {m.active ? "Luk materialet" : "Åbn materialet igen"}
        </button>
      </form>
    </section>
  );
}

/**
 * De faelles tekster, vist i stedet for materialets tre felter.
 *
 * Rettes paa /indstillinger og ikke her: teksten er den samme for alle
 * materialer, og et felt pr. materiale ville lade kontoret rette den for beton
 * og undre sig over, at tagpap ikke fulgte med.
 *
 * DE SKJULTE FELTER ER IKKE PYNT. `gemMateriale` laeser alle seks saetninger ud
 * af formularen, og et felt der ikke staar der, bliver læst som tomt og
 * gemt som null. Uden dem ville et enkelt tryk paa «Gem» — paa et helt andet
 * felt — tomme materialets fire bortskaffelsestekster, og saa ville de vaere
 * vaek den dag, kontakten blev slaaet fra igen.
 */
function FaellesTekster({
  faelles,
  saetninger,
}: {
  faelles: Bortskaffelsestekster;
  saetninger: Record<string, string>;
}) {
  return (
    <>
      {BORTSKAFFELSESTEKSTER.map((t) => (
        <input
          key={DISPOSAL_SENTENCE_FIELD[t]}
          type="hidden"
          name={DISPOSAL_SENTENCE_FIELD[t]}
          value={saetninger[DISPOSAL_SENTENCE_FIELD[t]]}
        />
      ))}

      <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed">
        Teksten er <span className="font-medium">fælles for alle materialer</span>{" "}
        og rettes under{" "}
        <Link href="/indstillinger" className="underline hover:text-fg">
          Indstillinger
        </Link>
        . Materialets egne sætninger står gemt og bruges igen, hvis den fælles
        tekst slås fra.
      </p>

      <dl className="flex flex-col gap-2 text-sm leading-relaxed">
        {BORTSKAFFELSESTEKSTER.map((t) => (
          <div key={t} className="flex flex-col gap-0.5">
            <dt className="flex flex-wrap items-center gap-1">
              {maerkerFor(t).map((mk) => (
                <Maerke key={mk} maerke={mk} />
              ))}
            </dt>
            <dd className={faelles[t] ? "" : "text-muted"}>
              {faelles[t] ?? "Ingen tekst skrevet. Rapporten lover ingenting."}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Et tekstfelt til en af materialets seks saetninger. */
function Saetningsfelt({
  navn,
  overskrift,
  hjaelp,
  vaerdi,
  onChange,
}: {
  navn: string;
  overskrift: string;
  hjaelp?: string;
  vaerdi: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{overskrift}</span>
      {hjaelp && <span className="text-xs text-muted">{hjaelp}</span>}
      <textarea
        name={navn}
        rows={3}
        value={vaerdi}
        onChange={(e) => onChange(e.target.value)}
        className={`${felt} resize-y text-sm leading-relaxed`}
      />
    </label>
  );
}

/**
 * Materialets saetninger, som de kommer til at staa i rapporten.
 *
 * Laeser felterne og ikke det gemte: saetningen skal kunne ses, FOR den bliver
 * til en rapport, nogen sender til en kommune.
 */
function RapportPreview({
  navn,
  rapportnavn,
  saetninger,
  m,
  bygningsdele,
  faelles,
  onLuk,
}: {
  navn: string;
  rapportnavn: string;
  saetninger: Record<string, string>;
  m: Material;
  bygningsdele: BuildingPart[];
  faelles: Bortskaffelsestekster | null;
  onLuk: () => void;
}) {
  const overskriftId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLuk();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLuk]);

  const materialenavn = navn.trim() || m.name;
  const tekst = (felt: keyof Material) =>
    (saetninger[felt] ?? "").trim() || null;

  // En rigtig bygningsdel og ikke en opfundet: overskriften i rapporten ER
  // bygningsdelen, og en opdigtet en ville vise en form, kontoret ikke kender.
  const del: BuildingPart = bygningsdele.find((b) => b.active) ??
    bygningsdele[0] ?? {
      id: "preview",
      name: "Bygningsdel",
      sort_order: 0,
      active: true,
    };

  const materiale: Material = {
    ...m,
    name: materialenavn,
    report_name: rapportnavn.trim() || null,
    sentence_genbrug: tekst("sentence_genbrug"),
    sentence_genanvendelse: tekst("sentence_genanvendelse"),
    sentence_farligt: tekst("sentence_farligt"),
    sentence_forurenet: tekst("sentence_forurenet"),
    sentence_asbest: tekst("sentence_asbest"),
    sentence_bortskaffelse: tekst("sentence_bortskaffelse"),
  };

  const { oversigt, skrevne, tomme } = previewOversigt(materiale, del, faelles);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={overskriftId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-3"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-bg shadow-sheet">
        <div className="flex items-center justify-between gap-4 border-b border-grid px-5 py-3">
          <h2 id={overskriftId} className="font-semibold">
            {materialenavn} i rapporten
          </h2>
          <button
            type="button"
            onClick={onLuk}
            className="tap rounded-lg border border-border-strong px-4 py-1.5 text-sm hover:bg-surface-2 active:bg-surface-2"
          >
            Luk
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <p className="mx-auto mb-4 max-w-[21cm] text-xs leading-relaxed text-muted">
            Det, der står i felterne — ikke det, der er gemt. Mængde og stand er
            et eksempel; på en sag kommer de fra prøven, og overskriften er den
            bygningsdel, prøven står på.
          </p>

          {skrevne.length > 0 ? (
            <div className="print-side">
              {oversigt.ressourcer.length > 0 && (
                <>
                  <Overskrift>Ressourcescreening</Overskrift>
                  {oversigt.ressourcer.map((g) => (
                    <Linjegruppe key={g.overskrift} gruppe={g} />
                  ))}
                </>
              )}

              {oversigt.forureninger.length > 0 && (
                <>
                  <Overskrift>Forureninger</Overskrift>
                  {oversigt.forureninger.map((g) => (
                    <Linjegruppe key={g.overskrift} gruppe={g} visProvenumre />
                  ))}
                  {/* Er teksten faelles, staar den her og ikke paa linjerne —
                      og saa skal previewet ogsa vise den, ellers ser panelet
                      ud som om rapporten intet lover. */}
                  <Standardtekster raekker={oversigt.standardtekster} />
                </>
              )}
            </div>
          ) : (
            <p className="mx-auto max-w-[21cm] rounded-xl border border-grid bg-surface p-4 text-sm leading-relaxed text-muted">
              Der er ingen sætninger skrevet endnu. Rapporten skriver så navn og
              mængde og lover ikke andet.
            </p>
          )}

          {tomme.length > 0 && skrevne.length > 0 && (
            <p className="mx-auto mt-4 max-w-[21cm] text-xs leading-relaxed text-muted">
              Uden tekst:{" "}
              {tomme.map((r) => r.navn).join(", ")}
              . De linjer skriver kun navn og mængde.
            </p>
          )}
        </div>
      </div>
    </div>
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
                  className={`tap rounded-lg border px-2.5 py-1 text-sm ${
                    d.active
                      ? "border-danger/40 text-danger hover:bg-danger-soft"
                      : "border-border-strong hover:bg-surface-2"
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
