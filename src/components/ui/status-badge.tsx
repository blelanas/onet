import { useTranslations } from "next-intl";
import { Badge, type Tone } from "./badge";

// One mapping for every status-like enum in the app.
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "success",
  PENDING: "warning",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
  DRAFT: "neutral",
  PUBLISHED: "success",
  OPEN: "success",
  FULL: "violet",
  CLOSED: "neutral",
  COMPLETED: "info",
  CANCELLED: "danger",
  CONFIRMED: "success",
  WAITLIST: "violet",
  PAID: "success",
  PARTIALLY_PAID: "info",
  OVERDUE: "danger",
  FAILED: "danger",
  REFUNDED: "violet",
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "info",
  MISSING: "danger",
  PARTIAL: "warning",
  COMPLETE: "success",
  APPROVED: "success",
  REJECTED: "danger",
  TODO: "neutral",
  IN_PROGRESS: "info",
  DONE: "success",
  NORMAL: "neutral",
  IMPORTANT: "warning",
  URGENT: "danger",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations("common.status");
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} dot className={className}>
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}
