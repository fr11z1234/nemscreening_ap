"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { gemForureningsnote, type ForureningState } from "./forurening";

function Knap({ aendret }: { aendret: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !aendret}
      className="tap rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-50"
    >
      {pending ? "Gemmer…" : "Gem"}
    </button>
  );
}

/**
 * Skabelonens andet sporgsmal i forureningsafsnittet.
 *
 * Det forste — om der er materialer, der kan skabe risiko — svarer rapporten
 * selv pa ud fra analyserne. Det her kan den ikke: svaret afhaenger af hvad der
 * konkret er fundet, og hvilke regler der gaelder for det.
 *
 * Knappen er slaaet fra, indtil der er aendret noget. Et felt med en gemmeknap,
 * der altid kan trykkes, giver ingen besked om hvorvidt det man ser er det, der
 * staar i databasen.
 */
export function Forureningsnote({
  caseId,
  gemt,
  maaSkrive,
}: {
  caseId: string;
  gemt: string | null;
  maaSkrive: boolean;
}) {
  const [state, formAction] = useActionState<ForureningState, FormData>(
    gemForureningsnote,
    {},
  );
  const [tekst, setTekst] = useState(gemt ?? "");
  const aendret = tekst.trim() !== (gemt ?? "").trim();

  if (!maaSkrive) {
    return gemt ? (
      <div>
        <h3 className="label-xs uppercase tracking-wide">
          Håndtering af forureningerne
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{gemt}</p>
      </div>
    ) : null;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="case_id" value={caseId} />

      <h3 className="label-xs uppercase tracking-wide">
        Håndtering af forureningerne
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Hvordan skal disse materialer håndteres i forbindelse med nedrivningen —
        fx asbestregler, korrekt emballering, bortskaffelse som farligt affald?
        Står i rapporten under spørgsmålet om risiko for forurening.
      </p>

      <textarea
        name="tekst"
        rows={8}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        className="mt-3 w-full rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:inset-ring-2 focus:inset-ring-primary-line"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Knap aendret={aendret} />
        {state.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
        {state.ok && !aendret && (
          <span className="text-sm font-medium text-primary">Gemt.</span>
        )}
        {!gemt && !tekst.trim() && (
          <span className="text-sm text-muted">
            Uden tekst springer rapporten spørgsmålet over.
          </span>
        )}
      </div>
    </form>
  );
}
