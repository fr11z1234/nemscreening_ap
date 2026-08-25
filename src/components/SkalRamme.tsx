"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logout } from "@/app/login/actions";

export type NavPunkt = { href: string; label: string };

/**
 * Appens ramme: navigation til venstre pa en skaerm, burgermenu pa en telefon.
 *
 * Sidehovedet var for laenge siden nok — der var én side. Nu er der en
 * materialeliste, og der kommer flere paneler, og en raekke sma links i et
 * hoved holder ikke til det: de bliver smallere for hver ny side, og pa en
 * telefon lober de ud over kanten.
 *
 * Navigationen er `print:hidden`, og rammen slipper sin breddegraense i print.
 * Rapporten skal komme ud af printeren praecis som for — den er bundet til A4,
 * og en menu i marginen ville flytte arket.
 */
export function SkalRamme({
  nav,
  navn,
  children,
}: {
  nav: NavPunkt[];
  navn: string;
  children: React.ReactNode;
}) {
  const sti = usePathname();
  const [aaben, setAaben] = useState(false);

  // Escape lukker, som alle andre paneler i appen.
  useEffect(() => {
    const paaTast = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAaben(false);
    };
    window.addEventListener("keydown", paaTast);
    return () => window.removeEventListener("keydown", paaTast);
  }, []);

  const erAktiv = (href: string) => sti === href || sti.startsWith(`${href}/`);

  /*
   * Skuffen lukkes pa klikket og ikke ved at holde oje med adressen.
   *
   * En effekt der kaldte setState nar `pathname` skiftede, ville virke — men den
   * ville ogsa lukke skuffen ved enhver anden navigation og koste en ekstra
   * gennemtegning hver gang. Skuffen abnes af et tryk og lukkes af et tryk;
   * det er de to steder, den skal vide noget.
   */
  const punkter = (
    <ul className="flex flex-col gap-1">
      {nav.map((p) => (
        <li key={p.href}>
          <Link
            href={p.href}
            onClick={() => setAaben(false)}
            aria-current={erAktiv(p.href) ? "page" : undefined}
            className={`tap flex items-center rounded-xl px-3 transition-colors ${
              erAktiv(p.href)
                ? "bg-primary-soft font-medium text-primary inset-ring inset-ring-primary-line"
                : "text-fg-2 hover:bg-surface-2"
            }`}
          >
            {p.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const bund = (
    <div className="mt-auto border-t border-border pt-3">
      <p className="truncate px-3 text-sm text-muted" title={navn}>
        {navn}
      </p>
      <form action={logout}>
        <button className="tap mt-1 flex w-full items-center rounded-xl px-3 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg">
          Log ud
        </button>
      </form>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 print:max-w-none print:block">
      {/* Skaermen. Klaeber, sa navigationen bliver staaende nar indholdet
          ruller — en liste med hundrede sager ma ikke tage menuen med sig. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border px-3 py-4 lg:flex print:hidden">
        <Link href="/sager" className="flex items-center gap-2.5 px-3 pb-5">
          <Logo className="h-7" />
          <span className="font-semibold tracking-tight">Nemscreening</span>
        </Link>
        {punkter}
        {bund}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Telefonen. Kun en burger og maerket — resten ligger i skuffen. */}
        <header className="safe-t sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setAaben(true)}
            aria-label="Åbn menuen"
            aria-expanded={aaben}
            className="tap -ml-2 px-2 text-xl leading-none text-muted hover:text-fg"
          >
            ☰
          </button>
          <Link href="/sager" className="font-semibold tracking-tight">
            Nemscreening
          </Link>
        </header>

        {children}
      </div>

      {/* Skuffen. Baggrunden er en knap, sa et tryk udenfor lukker — det er den
          bevaegelse, folk allerede laver. */}
      {aaben && (
        <>
          <button
            type="button"
            aria-label="Luk menuen"
            onClick={() => setAaben(false)}
            className="fixed inset-0 z-40 bg-fg/40 lg:hidden"
          />
          <div className="safe-t fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface px-3 py-4 lg:hidden">
            <div className="flex items-center gap-2.5 px-3 pb-5">
              <Logo className="h-7" />
              <span className="font-semibold tracking-tight">Nemscreening</span>
              <button
                type="button"
                onClick={() => setAaben(false)}
                aria-label="Luk menuen"
                className="tap ml-auto -mr-2 px-2 text-muted hover:text-fg"
              >
                ×
              </button>
            </div>
            {punkter}
            {bund}
          </div>
        </>
      )}
    </div>
  );
}
