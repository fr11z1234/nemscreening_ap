"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pdfTilSider, PdfSideFejl } from "@/lib/rapport/pdfsider";
import {
  MAKS_BYTES,
  PLANTEGNING_TYPER,
  RAPPORT_BUCKET,
  billedNavn,
  eurofinsPdfNavn,
  eurofinsSideNavn,
  rapportSti,
} from "@/lib/rapport/filer";

export type EurofinsBilag = {
  docId: string;
  filnavn: string | null;
  sider: number;
  plads: number;
};

export type Billede = { filnavn: string | null; url: string | null } | null;

export type RapportFilerState = {
  forsidebillede: Billede;
  plantegning: Billede;
  bilag: EurofinsBilag[];
};

/** De to billeder der hoerer til sagen, og hvad de hedder i storage. */
const BILLEDER = {
  forsidebillede: { stamme: "forsidebillede", hvad: "forsidebilledet" },
  plantegning: { stamme: "plantegning", hvad: "plantegningen" },
} as const;

type BilledeKind = keyof typeof BILLEDER;

/**
 * De bilag rapporten ikke selv kan lave.
 *
 * Plantegningen gemmes som den kommer — en plantegning er stregtegning, og en
 * omkodning ville lave hakker langs hver streg.
 *
 * Der kan vaere FLERE dokumenter fra Eurofins: analyserapporten og et
 * asbestappendiks kommer som hver sin fil. Hvert bilag faar sit eget doc_id
 * og sin egen mappe i storage, sa et af dem kan fjernes uden at de andre
 * folger med. Hvert bilag gemmes bade som PDF og som et billede pr. side; se
 * pdfsider.ts for hvorfor.
 *
 * Raekkefolgen ved upload er med vilje: alt nyt lander i storage FOR
 * databasen roeres, sa en upload der gaar galt undervejs ikke efterlader et
 * halvt bilag nogen kan komme til at sende ud.
 */
export function RapportFiler({
  caseId,
  canUploadLab,
  state,
}: {
  caseId: string;
  /**
   * Samme deling som RLS pa case_files: billeder er markarbejde og ma
   * skrives af ethvert medlem, mens Eurofins' dokumenter hoerer til
   * laboratoriesvaret og dermed til kontoret.
   */
  canUploadLab: boolean;
  state: RapportFilerState;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const forsideInput = useRef<HTMLInputElement>(null);
  const plantegningInput = useRef<HTMLInputElement>(null);
  const bilagInput = useRef<HTMLInputElement>(null);

  const [travl, setTravl] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);

  /** Forsidebilledet og plantegningen behandles ens: et billede pr. sag. */
  async function vaelgBillede(
    kind: BilledeKind,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const fil = e.target.files?.[0];
    e.target.value = "";
    if (!fil) return;

    const { stamme, hvad } = BILLEDER[kind];
    setFejl(null);
    if (!PLANTEGNING_TYPER.includes(fil.type)) {
      setFejl(`${stor(hvad)} skal være et billede: PNG, JPG eller WEBP.`);
      return;
    }
    if (fil.size > MAKS_BYTES) {
      setFejl("Filen er over 25 MB.");
      return;
    }

    setTravl(`Lægger ${hvad} op…`);
    try {
      const sti = rapportSti(caseId, billedNavn(stamme, fil.type));
      const op = await supabase.storage
        .from(RAPPORT_BUCKET)
        .upload(sti, fil, { contentType: fil.type, upsert: true });
      if (op.error) throw new Error(op.error.message);

      // Det gamle kan ligge under en anden endelse, sa det ryddes for sig.
      const { data: gamle } = await supabase
        .from("case_files")
        .select("storage_path")
        .eq("case_id", caseId)
        .eq("kind", kind)
        .returns<{ storage_path: string }[]>();

      await supabase
        .from("case_files")
        .delete()
        .eq("case_id", caseId)
        .eq("kind", kind);

      const { error } = await supabase.from("case_files").insert({
        case_id: caseId,
        kind,
        storage_path: sti,
        filename: fil.name,
        mime: fil.type,
        bytes: fil.size,
      });
      if (error) throw new Error(error.message);

      const forladte = (gamle ?? [])
        .map((g) => g.storage_path)
        .filter((p) => p !== sti);
      if (forladte.length) {
        await supabase.storage.from(RAPPORT_BUCKET).remove(forladte);
      }

      router.refresh();
    } catch (cause) {
      setFejl(beskeden(cause, `Kunne ikke gemme ${hvad}`));
    } finally {
      setTravl(null);
    }
  }

  async function tilfoejBilag(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    e.target.value = "";
    if (!fil) return;

    setFejl(null);
    if (fil.type !== "application/pdf") {
      setFejl("Bilaget skal være en PDF fra Eurofins.");
      return;
    }
    if (fil.size > MAKS_BYTES) {
      setFejl("Filen er over 25 MB.");
      return;
    }

    const docId = crypto.randomUUID();
    const plads =
      state.bilag.reduce((hoejest, b) => Math.max(hoejest, b.plads), 0) + 1;

    try {
      setTravl("Læser PDF'en…");
      const sider = await pdfTilSider(await fil.arrayBuffer());

      const pdfSti = rapportSti(caseId, eurofinsPdfNavn(docId));
      const pdfOp = await supabase.storage
        .from(RAPPORT_BUCKET)
        .upload(pdfSti, fil, { contentType: "application/pdf", upsert: true });
      if (pdfOp.error) throw new Error(pdfOp.error.message);

      const sideStier: string[] = [];
      for (const s of sider) {
        setTravl(`Lægger side ${s.side} af ${sider.length} op…`);
        const sti = rapportSti(caseId, eurofinsSideNavn(docId, s.side));
        const op = await supabase.storage
          .from(RAPPORT_BUCKET)
          .upload(sti, s.blob, { contentType: "image/jpeg", upsert: true });
        if (op.error) throw new Error(op.error.message);
        sideStier.push(sti);
      }

      // Forst nu roeres databasen: hele bilaget ligger i storage.
      const { error } = await supabase.from("case_files").insert([
        {
          case_id: caseId,
          kind: "eurofins_pdf",
          doc_id: docId,
          doc_order: plads,
          storage_path: pdfSti,
          filename: fil.name,
          mime: "application/pdf",
          bytes: fil.size,
        },
        ...sider.map((s, i) => ({
          case_id: caseId,
          kind: "eurofins_side",
          doc_id: docId,
          doc_order: plads,
          storage_path: sideStier[i],
          mime: "image/jpeg",
          bytes: s.blob.size,
          width: s.width,
          height: s.height,
          sort_order: s.side,
        })),
      ]);
      if (error) throw new Error(error.message);

      router.refresh();
    } catch (cause) {
      setFejl(beskeden(cause, "Kunne ikke gemme bilaget"));
    } finally {
      setTravl(null);
    }
  }

  async function fjernBilag(docId: string) {
    setFejl(null);
    setTravl("Fjerner bilaget…");
    try {
      const { data: rows } = await supabase
        .from("case_files")
        .select("storage_path")
        .eq("case_id", caseId)
        .eq("doc_id", docId)
        .returns<{ storage_path: string }[]>();

      const { error } = await supabase
        .from("case_files")
        .delete()
        .eq("case_id", caseId)
        .eq("doc_id", docId);
      if (error) throw new Error(error.message);

      const stier = (rows ?? []).map((r) => r.storage_path);
      if (stier.length) {
        await supabase.storage.from(RAPPORT_BUCKET).remove(stier);
      }
      router.refresh();
    } catch (cause) {
      setFejl(beskeden(cause, "Kunne ikke fjerne bilaget"));
    } finally {
      setTravl(null);
    }
  }

  /** Bytter to bilag om. Bade PDF'en og dens sider skal folge med. */
  async function byt(a: EurofinsBilag, b: EurofinsBilag) {
    setFejl(null);
    setTravl("Flytter bilaget…");
    try {
      for (const [bilag, plads] of [
        [a, b.plads],
        [b, a.plads],
      ] as const) {
        const { error } = await supabase
          .from("case_files")
          .update({ doc_order: plads })
          .eq("case_id", caseId)
          .eq("doc_id", bilag.docId);
        if (error) throw new Error(error.message);
      }
      router.refresh();
    } catch (cause) {
      setFejl(beskeden(cause, "Kunne ikke flytte bilaget"));
    } finally {
      setTravl(null);
    }
  }

  async function fjernBillede(kind: BilledeKind) {
    const { hvad } = BILLEDER[kind];
    setFejl(null);
    setTravl(`Fjerner ${hvad}…`);
    try {
      const { data: rows } = await supabase
        .from("case_files")
        .select("storage_path")
        .eq("case_id", caseId)
        .eq("kind", kind)
        .returns<{ storage_path: string }[]>();

      const { error } = await supabase
        .from("case_files")
        .delete()
        .eq("case_id", caseId)
        .eq("kind", kind);
      if (error) throw new Error(error.message);

      const stier = (rows ?? []).map((r) => r.storage_path);
      if (stier.length) {
        await supabase.storage.from(RAPPORT_BUCKET).remove(stier);
      }
      router.refresh();
    } catch (cause) {
      setFejl(beskeden(cause, `Kunne ikke fjerne ${hvad}`));
    } finally {
      setTravl(null);
    }
  }

  const optaget = !!travl;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-semibold">Bilag til rapporten</h2>
        <p className="text-sm text-muted">
          Forsidebilledet er baggrund på forsiden, plantegningen får sin egen
          side, og Eurofins&nbsp;dokumenter lægges bagest i den rækkefølge de
          står her. Uden dem laves rapporten stadig — siderne springes bare
          over.
        </p>
      </div>

      {fejl && (
        <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {fejl}
        </p>
      )}

      {travl && (
        <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-muted">
          {travl}
        </p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <BilledeFelt
          titel="Forsidebillede"
          hjaelp="Baggrund på rapportens forside. Tages normalt, når sagen oprettes."
          tom="Intet forsidebillede lagt op"
          billede={state.forsidebillede}
          canUpload={true}
          optaget={optaget}
          onVaelg={() => forsideInput.current?.click()}
          onFjern={() => fjernBillede("forsidebillede")}
        />

        <BilledeFelt
          titel="Plantegning"
          hjaelp="PNG, JPG eller WEBP. Får sin egen side."
          tom="Ingen plantegning lagt op"
          billede={state.plantegning}
          canUpload={true}
          optaget={optaget}
          onVaelg={() => plantegningInput.current?.click()}
          onFjern={() => fjernBillede("plantegning")}
        />

        <div className="rounded-xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Dokumenter fra Eurofins</span>
            {state.bilag.length > 0 && (
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                {state.bilag.length} bilag
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Analyserapporten, asbestappendikset — læg dem op hver for sig.
          </p>

          {state.bilag.length === 0 ? (
            <p className="mt-2 text-sm">Ingen bilag lagt op</p>
          ) : (
            <ol className="mt-2 flex flex-col gap-1.5">
              {state.bilag.map((b, i) => (
                <li
                  key={b.docId}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2"
                >
                  <span className="tabular shrink-0 text-sm text-muted">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {b.filnavn ?? "Dokument"}
                  </span>
                  <span className="tabular shrink-0 text-xs text-muted">
                    {b.sider} side{b.sider === 1 ? "" : "r"}
                  </span>
                  {canUploadLab && (
                    <span className="flex shrink-0 items-center">
                      <Pil
                        retning="op"
                        disabled={optaget || i === 0}
                        onClick={() => byt(b, state.bilag[i - 1])}
                      />
                      <Pil
                        retning="ned"
                        disabled={optaget || i === state.bilag.length - 1}
                        onClick={() => byt(b, state.bilag[i + 1])}
                      />
                      <Tekstknap
                        onClick={() => fjernBilag(b.docId)}
                        disabled={optaget}
                      >
                        Fjern
                      </Tekstknap>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {canUploadLab && (
            <div className="mt-3">
              <Knap onClick={() => bilagInput.current?.click()} disabled={optaget}>
                Tilføj bilag
              </Knap>
            </div>
          )}
        </div>
      </div>

      <input
        ref={forsideInput}
        type="file"
        accept={PLANTEGNING_TYPER.join(",")}
        onChange={(e) => vaelgBillede("forsidebillede", e)}
        className="hidden"
      />
      <input
        ref={plantegningInput}
        type="file"
        accept={PLANTEGNING_TYPER.join(",")}
        onChange={(e) => vaelgBillede("plantegning", e)}
        className="hidden"
      />
      <input
        ref={bilagInput}
        type="file"
        accept="application/pdf,.pdf"
        onChange={tilfoejBilag}
        className="hidden"
      />

      {!canUploadLab && (
        <p className="mt-3 text-sm text-muted">
          Kun kontoret kan lægge bilag op.
        </p>
      )}
    </section>
  );
}

function BilledeFelt({
  titel,
  hjaelp,
  tom,
  billede,
  canUpload,
  optaget,
  onVaelg,
  onFjern,
}: {
  titel: string;
  hjaelp: string;
  tom: string;
  billede: Billede;
  canUpload: boolean;
  optaget: boolean;
  onVaelg: () => void;
  onFjern: () => void;
}) {
  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{titel}</span>
        {billede && (
          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
            Klar
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">{hjaelp}</p>
      <p className="mt-2 truncate text-sm">
        {billede ? (billede.filnavn ?? titel) : tom}
      </p>

      {billede?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={billede.url}
          alt={titel}
          className="mt-3 max-h-40 w-full rounded-lg bg-surface object-contain"
        />
      )}

      {canUpload && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Knap onClick={onVaelg} disabled={optaget}>
            {billede ? "Skift fil" : "Vælg fil"}
          </Knap>
          {billede && (
            <Tekstknap onClick={onFjern} disabled={optaget}>
              Fjern
            </Tekstknap>
          )}
        </div>
      )}
    </div>
  );
}

/** Stort begyndelsesbogstav, sa "plantegningen" kan starte en saetning. */
function stor(ord: string): string {
  return ord.charAt(0).toUpperCase() + ord.slice(1);
}

function beskeden(cause: unknown, indledning: string): string {
  if (cause instanceof PdfSideFejl) return cause.message;
  if (cause instanceof Error) return `${indledning}: ${cause.message}`;
  return `${indledning}.`;
}

function Knap({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap rounded-xl bg-surface px-4 text-sm font-medium shadow-card hover:bg-bg active:bg-bg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Tekstknap({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap px-2 text-sm text-muted hover:text-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Pil({
  retning,
  disabled,
  onClick,
}: {
  retning: "op" | "ned";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={retning === "op" ? "Flyt op" : "Flyt ned"}
      className="tap w-8 text-muted hover:text-fg disabled:opacity-30"
    >
      {retning === "op" ? "↑" : "↓"}
    </button>
  );
}
