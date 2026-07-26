import { CASE_STATUS_LABEL, type CaseStatus } from "@/lib/types";

const TONE: Record<CaseStatus, string> = {
  oprettet: "bg-surface-2 text-muted border-border",
  under_screening: "bg-primary/10 text-primary border-primary/30",
  proever_taget: "bg-primary/10 text-primary border-primary/30",
  sendt_til_lab: "bg-warning/10 text-warning border-warning/30",
  afsluttet: "bg-surface-2 text-muted border-border",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      {CASE_STATUS_LABEL[status]}
    </span>
  );
}
