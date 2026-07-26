"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Vaelger til lange lister.
 *
 * En native <select> med 55 materialer er reelt ubrugelig pa en telefon — man
 * scroller i blinde gennem et lille hjul. Her er der sogefelt, og de
 * muligheder screeneren lige har brugt pa sagen ligger overst, fordi prover
 * pa samme adresse naesten altid gentager de samme fa materialer.
 */
export function PickerField({
  label,
  value,
  items,
  recent = [],
  placeholder = "Vælg",
  onChange,
}: {
  label: string;
  value: string | null;
  items: string[];
  recent?: string[];
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex w-full items-center rounded-lg border border-border bg-surface px-3 py-2.5 text-left"
      >
        <span className={value ? "" : "text-muted"}>{value ?? placeholder}</span>
        <span className="ml-auto text-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <Sheet
          title={label}
          items={items}
          recent={recent}
          value={value}
          onClose={() => setOpen(false)}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Sheet({
  title,
  items,
  recent,
  value,
  onSelect,
  onClose,
}: {
  title: string;
  items: string[];
  recent: string[];
  value: string | null;
  onSelect: (v: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const { pinned, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => s.toLowerCase().includes(q);
    const filtered = q ? items.filter(match) : items;
    const recentSet = new Set(recent);
    return {
      pinned: q ? [] : recent.filter((r) => items.includes(r)),
      rest: filtered.filter((i) => (q ? true : !recentSet.has(i))),
    };
  }, [items, recent, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Luk"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="tap ml-auto -mr-2 px-2 text-muted"
          >
            Luk
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg"
            className="tap w-full rounded-lg border border-border bg-bg px-3 py-2.5"
          />
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain safe-b">
          {value && (
            <Option label="Ryd valg" muted onSelect={() => onSelect(null)} />
          )}

          {pinned.length > 0 && (
            <>
              <li className="px-4 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Senest brugt
              </li>
              {pinned.map((i) => (
                <Option
                  key={`recent-${i}`}
                  label={i}
                  selected={i === value}
                  onSelect={() => onSelect(i)}
                />
              ))}
              <li className="mt-1 border-t border-border" />
            </>
          )}

          {rest.length === 0 && pinned.length === 0 ? (
            <li className="px-4 py-6 text-center text-muted">Ingen træffere</li>
          ) : (
            rest.map((i) => (
              <Option
                key={i}
                label={i}
                selected={i === value}
                onSelect={() => onSelect(i)}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function Option({
  label,
  selected,
  muted,
  onSelect,
}: {
  label: string;
  selected?: boolean;
  muted?: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`tap flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left last:border-0 active:bg-surface-2 ${
          muted ? "text-muted" : ""
        } ${selected ? "font-medium text-primary" : ""}`}
      >
        {label}
        {selected && <span className="ml-auto">✓</span>}
      </button>
    </li>
  );
}
