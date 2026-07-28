"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AddressSearch } from "@/components/AddressSearch";
import { createCase, type CreateCaseState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
    >
      {pending ? "Opretter…" : "Opret sag"}
    </button>
  );
}

const field =
  "tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted";

export function NewCaseForm() {
  const [state, formAction] = useActionState<CreateCaseState, FormData>(
    createCase,
    {},
  );

  // Sagsnavnet er som regel bare adressen, sa det udfyldes automatisk ved valg
  // — men screeneren kan altid rette det, fx til "Nørrebrogade 12, bagbygning".
  const [caseName, setCaseName] = useState("");
  const [address, setAddress] = useState({
    text: "",
    id: "",
    postnr: "",
    city: "",
  });
  const [showCustomer, setShowCustomer] = useState(false);

  return (
    <form action={formAction} className="px-4 pb-10 flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Adresse</label>
        <AddressSearch
          onSelect={(s) => {
            setAddress({
              text: s.tekst,
              id: s.id,
              postnr: s.postnr,
              city: s.postnrnavn,
            });
            setCaseName((prev) => (prev.trim() ? prev : s.tekst));
          }}
        />
        <p className="text-xs text-muted">
          Bruges til at hente bygningsdata fra BBR bagefter.
        </p>
      </div>

      <input type="hidden" name="address_text" value={address.text} />
      <input type="hidden" name="dawa_adgangsadresse_id" value={address.id} />
      <input type="hidden" name="postnr" value={address.postnr} />
      <input type="hidden" name="city" value={address.city} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="case_name" className="text-sm font-medium">
          Sagsnavn
        </label>
        <input
          id="case_name"
          name="case_name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          required
          className={field}
        />
        <p className="text-xs text-muted">
          Står som Sagsnavn på alle prøver i Eurofins-filen.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowCustomer((v) => !v)}
          className="tap text-sm font-medium text-primary hover:underline"
        >
          {showCustomer ? "Skjul kundeoplysninger" : "Tilføj kundeoplysninger"}
        </button>

        {showCustomer && (
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Kunde</span>
              <input name="customer_name" className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Kontaktperson</span>
              <input name="customer_contact" className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">E-mail</span>
              <input
                name="customer_email"
                type="email"
                inputMode="email"
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Telefon</span>
              <input
                name="customer_phone"
                type="tel"
                inputMode="tel"
                className={field}
              />
            </label>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Note</span>
        <textarea name="note" rows={3} className={`${field} min-h-24`} />
      </label>

      <div className="flex flex-col gap-3 mt-2">
        <SubmitButton />
        <Link
          href="/sager"
          className="tap inline-flex items-center justify-center rounded-xl border border-border-strong hover:bg-surface-2 px-4"
        >
          Annullér
        </Link>
      </div>
    </form>
  );
}
