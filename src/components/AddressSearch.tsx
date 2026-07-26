"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/app/api/dawa/autocomplete/route";

/**
 * Adressesogning med forslag fra DAWA.
 *
 * Skriver ikke direkte i et formularfelt, men melder det valgte tilbage til
 * foraelderen, sa den kan udfylde bade sagsnavn, postnummer og by pa en gang.
 */
export function AddressSearch({
  onSelect,
  defaultValue = "",
}: {
  onSelect: (s: AddressSuggestion) => void;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Sikrer at et langsomt svar pa en gammel soegning ikke overskriver et nyere.
  const latest = useRef(0);

  // For korte soegninger filtreres bort ved render i stedet for at nulstille
  // state i effekten — en afledt vaerdi frem for en ekstra rendercyklus.
  const visible = query.trim().length < 2 ? [] : results;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const seq = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dawa/autocomplete?q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as AddressSuggestion[];
        if (seq === latest.current) {
          setResults(data);
          setOpen(true);
        }
      } catch {
        if (seq === latest.current) setResults([]);
      } finally {
        if (seq === latest.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function choose(s: AddressSuggestion) {
    setQuery(s.tekst);
    setOpen(false);
    setResults([]);
    onSelect(s);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        placeholder="Søg adresse"
        autoComplete="off"
        className="tap w-full rounded-lg border border-border bg-surface px-3 py-2.5"
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          søger…
        </span>
      )}

      {open && visible.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {visible.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="tap block w-full px-3 py-2.5 text-left active:bg-surface-2 border-b border-border last:border-0"
              >
                {s.tekst}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
