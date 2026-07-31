"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AddressPick,
  AddressSuggestion,
} from "@/app/api/dawa/autocomplete/route";

/**
 * Adressesogning med forslag fra DAWA.
 *
 * Skriver ikke direkte i et formularfelt, men melder det valgte tilbage til
 * foraelderen, sa den kan udfylde bade sagsnavn, postnummer og by pa en gang.
 *
 * Soegningen er trinvis, fordi DAWA's er det: forst et vejnavn, sa et
 * husnummer. Kun det sidste er et valg — se autocomplete-ruten.
 */
export function AddressSearch({
  onSelect,
  defaultValue = "",
}: {
  onSelect: (s: AddressPick) => void;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Sikrer at et langsomt svar pa en gammel soegning ikke overskriver et nyere.
  const latest = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (s.slags === "vejnavn") {
      // Et vejnavn er en indsnaevring og ikke et valg. Teksten slutter med et
      // mellemrum, sa den naeste soegning rammer husnumrene — listen bliver
      // staaende og fyldes med adresser i stedet.
      setQuery(s.tekst);
      inputRef.current?.focus();
      return;
    }
    setQuery(s.tekst);
    setOpen(false);
    setResults([]);
    onSelect(s);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        placeholder="Søg adresse"
        autoComplete="off"
        className="tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted"
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          søger…
        </span>
      )}

      {open && visible.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl bg-surface shadow-raised inset-ring inset-ring-border">
          {visible.map((s) => (
            // Vejnavne har intet id — de skelnes pa teksten, som er unik
            // inden for det ene svar.
            <li key={s.slags === "adresse" ? s.id : `vej:${s.tekst}`}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="tap flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2 active:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate">{s.tekst}</span>
                {/* Uden det her ligner et vejnavn et valg der ikke virker. */}
                {s.slags === "vejnavn" && (
                  <span className="shrink-0 text-xs text-muted">
                    vælg husnummer
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
