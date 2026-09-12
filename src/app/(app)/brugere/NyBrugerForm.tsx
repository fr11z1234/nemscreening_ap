"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  USER_ROLES,
  USER_ROLE_BESKRIVELSE,
  USER_ROLE_LABEL,
} from "@/lib/types";
import { opretBruger, type BrugerState } from "./actions";

const field =
  "tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted";

function Knap() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
    >
      {pending ? "Opretter…" : "Opret bruger"}
    </button>
  );
}

export function NyBrugerForm() {
  const [state, formAction] = useActionState<BrugerState, FormData>(
    opretBruger,
    {},
  );

  return (
    <section className="mt-6">
      <h2 className="label-xs uppercase tracking-wide">Ny bruger</h2>

      {state.error && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      {/*
       * Kodeordet vises én gang og gemmes ingen steder.
       *
       * Der er ingen "vis igen"-knap, og det er med vilje: kan det hentes frem,
       * er det ikke laengere midlertidigt. Er det taget forkert ned, oprettes
       * brugeren igen — eller adgangen lukkes og aabnes.
       */}
      {state.oprettet && (
        <div className="mt-2 rounded-xl bg-primary-soft px-4 py-3 text-sm">
          <p className="font-medium text-primary">{state.oprettet.besked}</p>
          <p className="mt-1 text-primary/80">{state.oprettet.email}</p>
          {state.oprettet.kodeord && (
            <>
              <p className="tabular mt-2 select-all text-lg font-semibold tracking-wide text-primary">
                {state.oprettet.kodeord}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-primary/80">
                Skriv det ned nu — det vises ikke igen. Personen bør skifte det
                under «Kodeord», når de er logget ind.
              </p>
            </>
          )}
        </div>
      )}

      <form action={formAction} className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            required
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Navn</span>
          <input name="full_name" type="text" className={field} />
          <span className="text-xs text-muted">
            Står som «udarbejdet af» på rapporterne.
          </span>
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">Rolle</legend>
          <div className="mt-1 flex flex-col gap-2">
            {USER_ROLES.map((r, i) => (
              <label
                key={r}
                className="tap flex cursor-pointer items-start gap-3 rounded-xl bg-surface px-3.5 py-2.5 shadow-card hover:bg-surface-2 has-checked:bg-primary-soft has-checked:text-primary"
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  defaultChecked={i === 0}
                  className="mt-1 size-4 shrink-0 accent-current"
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {USER_ROLE_LABEL[r]}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug opacity-80">
                    {USER_ROLE_BESKRIVELSE[r]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Knap />
      </form>
    </section>
  );
}
