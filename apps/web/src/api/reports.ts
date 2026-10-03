import { download } from "@/lib/api";

/** CSV export of one report tab (members, activities, events, trips). */
export const exportReport = (report: string) => download(`/reports/${report}/export.csv`);
