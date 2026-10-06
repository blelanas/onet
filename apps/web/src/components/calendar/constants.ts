/** Audiences offered for free calendar entries (GROUP is not supported: entries have no group). */
export const ENTRY_AUDIENCES = ["ALL", "PARENTS", "MONITORS", "KIDS", "STAFF"] as const;

/** Item kinds shown in the calendar (same list and colors as the API's calendar module). */
export const CAL_KINDS = ["activity", "group", "event", "trip", "conference", "entry"] as const;
export type CalKind = (typeof CAL_KINDS)[number];
export const KIND_COLORS: Record<CalKind, string> = { activity: "#7C4DFF", group: "#1E9BD7", event: "#E8457C", trip: "#2BB673", conference: "#FF6B4A", entry: "#64748B" };
