"use client";

import { useFormStatus } from "react-dom";
import type { PanelState } from "@/lib/panel";

/*
 * Felterne i kontorets paneler.
 *
 * Feltet er hvidt med en kant, ikke en gra tone.
 *
 * Resten af appen adskiller flader med tone og skygge, og det virker, fordi
 * felterne der ligger pa et hvidt kort. Panelerne har ikke noget kort — de gar
 * direkte pa sidens bone — og bone-200 pa bone-100 er tre procents forskel.
 * Kanten er det, der gor en kasse til et felt, man kan skrive i.
 *
 * Kanten er --grid og ikke --border-strong af samme grund som i skemaet:
 * bone-300 pa hvid er 1,4:1 og forsvinder, bone-400 er 1,9:1 og ses. Det er
 * ogsa den forskel, globals.css beskriver ved de to tokens.
 */
export const felt =
  "w-full rounded-lg border border-grid bg-surface px-3 py-2 outline-none placeholder:text-muted focus:border-primary focus:inset-ring-2 focus:inset-ring-primary-line";

export function GemKnap({ tekst = "Gem" }: { tekst?: string }) {
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

export function Besked({ state }: { state: PanelState }) {
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
