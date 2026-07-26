import { CASE_STATUS_LABEL, type CaseStatus } from "@/lib/types";

/**
 * Kun de statusser der kraever handling far farve. Havde alle fem en kulør,
 * ville ingen af dem betyde noget.
 */
const TONE: Record<CaseStatus, string> = {
  oprettet: "bg-surface-2 text-muted",
  under_screening: "bg-primary-soft text-primary",
  proever_taget: "bg-primary-soft text-primary",
  sendt_til_lab: "bg-warning-soft text-warning",
  afsluttet: "bg-surface-2 text-muted",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${TONE[status]}`}
    >
      {CASE_STATUS_LABEL[status]}
    </span>
  );
}
