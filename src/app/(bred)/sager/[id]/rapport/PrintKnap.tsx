"use client";

/**
 * Printdialogen kan kun abnes fra browseren, sa knappen er det eneste her
 * der behover at vaere en klientkomponent. Resten af rapporten hentes og
 * saettes op pa serveren.
 */
export function PrintKnap() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="tap rounded-xl bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
    >
      Gem som PDF
    </button>
  );
}
