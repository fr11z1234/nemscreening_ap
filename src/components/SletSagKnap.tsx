"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SletDialog, type SletLag } from "@/components/SletDialog";
import { hentSletOverblik, sletSag, type SletOverblik } from "@/lib/cases/slet";

/**
 * Knappen der sletter en hel sag, med bekraeftelse af hvert lag den tager med.
 *
 * Tallene hentes forst nar nogen trykker. En sagsliste pa hundrede raekker
 * skulle ellers taelle prover, billeder og svar for hver eneste sag, for at
 * kunne vise en dialog der i de fleste tilfaelde aldrig abnes.
 */
export function SletSagKnap({
  caseId,
  /** Sagssiden findes ikke bagefter. Listen skal bare hentes igen. */
  gaaTilListen,
  className,
  children,
}: {
  caseId: string;
  gaaTilListen: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [overblik, setOverblik] = useState<SletOverblik | null>(null);
  const [aaben, setAaben] = useState(false);
  const [henter, setHenter] = useState(false);

  async function aabn() {
    setHenter(true);
    let fundet: SletOverblik | null = null;
    let borte = false;
    try {
      fundet = await hentSletOverblik(caseId);
      borte = fundet === null;
    } catch {
      // Tallene kunne ikke hentes. Sletningen skal stadig kunne bekraeftes —
      // bare uden at love praecis hvor meget der ligger under sagen.
      fundet = null;
    }
    setHenter(false);

    // Slettet i et andet vindue. Sa er der ikke noget at bekraefte.
    if (borte) {
      router.refresh();
      return;
    }
    setOverblik(fundet);
    setAaben(true);
  }

  async function bekraeft(): Promise<string | null> {
    try {
      const svar = await sletSag(caseId);
      if (!svar.ok) return svar.fejl;
    } catch (cause) {
      return cause instanceof Error
        ? `Sagen kunne ikke slettes: ${cause.message}`
        : "Sagen kunne ikke slettes.";
    }
    if (gaaTilListen) router.push("/sager");
    router.refresh();
    return null;
  }

  return (
    <>
      <button type="button" onClick={aabn} disabled={henter} className={className}>
        {henter ? "Åbner…" : children}
      </button>

      {aaben && (
        <SletDialog
          titel={overblik ? `Slet sagen ${overblik.navn}?` : "Slet sagen?"}
          indledning="Alt under sagen forsvinder med den, og det kan ikke fortrydes. Sæt flueben ved hvert lag for at bekræfte."
          lag={overblik ? lagene(overblik) : [UDEN_TAL]}
          sletTekst="Slet sagen"
          onSlet={bekraeft}
          onLuk={() => setAaben(false)}
        />
      )}
    </>
  );
}

/** Nar tallene ikke kunne hentes. Sa loves der ikke et antal. */
const UDEN_TAL: SletLag = {
  id: "alt",
  tekst:
    "Sagen og alt hvad der hører til den: bygninger, prøver, billeder, svar fra laboratoriet og rapportens bilag",
};

const tal = (n: number, ental: string, flertal: string) =>
  `${n} ${n === 1 ? ental : flertal}`;

/**
 * Et lag pr. ting der forsvinder, ovenfra og nedad.
 *
 * Tomme lag springes over: et flueben ved "0 billeder" laerer kun folk at
 * saette flueben uden at laese, og saa er hele dialogen spildt.
 */
function lagene(o: SletOverblik): SletLag[] {
  const lag: SletLag[] = [
    {
      id: "sag",
      tekst: `Sagen “${o.navn}” med kunde, adresse og BBR-oplysninger`,
    },
  ];

  if (o.bygninger) {
    lag.push({
      id: "bygninger",
      tekst: `${tal(o.bygninger, "bygning", "bygninger")} på sagen`,
    });
  }
  if (o.proever) {
    lag.push({
      id: "proever",
      tekst: `${tal(o.proever, "prøve", "prøver")} med materiale, mængde og valgte analyser`,
    });
  }
  if (o.billeder) {
    lag.push({
      id: "billeder",
      tekst: `${tal(o.billeder, "billede", "billeder")} taget i marken`,
    });
  }
  if (o.svar) {
    lag.push({
      id: "svar",
      tekst: `${tal(o.svar, "svar", "svar")} fra laboratoriet`,
    });
  }
  if (o.forsidebillede) {
    lag.push({ id: "forside", tekst: "Forsidebilledet til rapporten" });
  }
  if (o.plantegning) {
    lag.push({ id: "plantegning", tekst: "Plantegningen" });
  }
  if (o.eurofinsBilag) {
    lag.push({
      id: "bilag",
      tekst: `${tal(o.eurofinsBilag, "dokument", "dokumenter")} fra Eurofins med alle deres sider`,
    });
  }
  if (o.eksporter) {
    lag.push({
      id: "eksporter",
      tekst: `${tal(o.eksporter, "Eurofins-fil", "Eurofins-filer")} i loggen over hvad der er sendt`,
    });
  }

  return lag;
}
