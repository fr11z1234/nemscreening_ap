"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { skiftKodeord, type KodeordState } from "./actions";

const field =
  "tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none";

function Knap() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
    >
      {pending ? "Skifter…" : "Skift kodeord"}
    </button>
  );
}

export function KodeordForm() {
  const [state, formAction] = useActionState<KodeordState, FormData>(
    skiftKodeord,
    {},
  );

  if (state.ok) {
    return (
      <div className="mt-6">
        <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
          Kodeordet er skiftet.
        </p>
        <Link
          href="/sager"
          className="tap mt-4 inline-flex items-center rounded-xl border border-border-strong px-4 py-2.5 hover:bg-surface-2"
        >
          Til sagerne
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex max-w-sm flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nyt kodeord</span>
        <input
          name="kodeord"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={field}
        />
        <span className="text-xs text-muted">Mindst 10 tegn.</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Gentag</span>
        <input
          name="gentag"
          type="password"
          autoComplete="new-password"
          required
          className={field}
        />
      </label>

      <Knap />

      {/* Sagt hojt frem for at blive opdaget bagefter: kontoen er den samme to
          steder, fordi auth deles med hjemmesiden. */}
      <p className="text-xs leading-relaxed text-muted">
        Har du også en konto på nemscreening.dk med den samme e-mail, er det det
        samme login — så gælder det nye kodeord også dér.
      </p>
    </form>
  );
}
