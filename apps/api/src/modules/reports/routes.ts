import { Router, type Request } from "express";
import { can, requirePermission, AuthError } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { getTranslations } from "@api/lib/i18n";
import { param, query, sendCsv } from "@api/lib/http";
import { toCsv, toDateInput } from "@onet/shared";
import { activitiesReport, eventsReport, financeSummary, membersReport, tripsReport } from "./queries";

/** reports module routes (mounted under /api). */
export const router = Router();

const tnd = (millimes: number) => (millimes / 1000).toFixed(3);

const reportsUser = () => requirePermission("reports.read", "members.read_all");

export async function membersReportPage() {
  await reportsUser();
  return membersReport();
}

export async function activitiesReportPage() {
  await reportsUser();
  return activitiesReport();
}

/** Money columns are only sent to finance.read holders (zeroed otherwise). */
export async function eventsReportPage() {
  const user = await reportsUser();
  const r = await eventsReport();
  const money = can(user, "finance.read");
  if (money) return { ...r, showMoney: true };
  return { rows: r.rows.map((e) => ({ ...e, expected: 0, revenue: 0 })), participants: r.participants, revenue: 0, showMoney: false };
}

export async function tripsReportPage() {
  const user = await reportsUser();
  const r = await tripsReport();
  const money = can(user, "finance.read");
  if (money) return { ...r, showMoney: true };
  return { rows: r.rows.map((x) => ({ ...x, expected: 0, revenue: 0, collectionRate: null })), participants: r.participants, capacity: r.capacity, expected: 0, revenue: 0, showMoney: false };
}

export async function financeReportPage() {
  const user = await reportsUser();
  if (!can(user, "finance.read")) return { showMoney: false as const, summary: null };
  return { showMoney: true as const, summary: await financeSummary() };
}

// CSV exports — registered before the JSON routes so "/reports/:report/export.csv" stays explicit.
router.get(
  "/reports/:report/export.csv",
  query(async (req: Request, res) => {
    const report = param(req, "report");
    const user = await reportsUser();
    const money = can(user, "finance.read");
    const t = await getTranslations("reports");
    const tc = await getTranslations("common");
    const day = toDateInput(new Date());

    let rows: (string | number | null | undefined)[][];
    if (report === "members") {
      const r = await membersReport();
      rows = [
        [t("members.perMonth"), t("members.childrenSeries"), t("members.othersSeries")],
        ...r.perMonth.map((m) => [m.key, m.children, m.others]),
        [],
        [t("members.byAge"), t("members.children")],
        ...r.byAge.map((b) => [b.bracket, b.count]),
        [],
        [t("members.byGroup"), t("members.children"), t("columns.capacity")],
        ...r.byGroup.map((g) => [g.id === "NONE" ? t("members.noGroup") : g.name, g.count, g.capacity]),
        [],
        [t("members.byGender"), t("members.children")],
        ...Object.entries(r.byGender).map(([k, v]) => [t(`members.gender.${k}`), v]),
        [],
        [t("members.byType"), t("members.total")],
        ...Object.entries(r.byType).map(([k, v]) => [tc(`enums.memberType.${k}`), v]),
        [],
        [t("members.byStatus"), t("members.total")],
        ...Object.entries(r.byStatus).map(([k, v]) => [tc(`status.${k}`), v]),
      ];
    } else if (report === "activities") {
      const r = await activitiesReport();
      rows = [
        [t("columns.name"), t("columns.category"), t("columns.group"), t("columns.participants"), t("columns.capacity"), t("activities.sessions"), t("columns.rate")],
        ...r.rows.map((a) => [a.title, tc(`enums.activityCategory.${a.category}`), a.group?.name, a.participants, a.capacity, a.total, a.rate == null ? "" : `${a.rate}%`]),
        [],
        [t("activities.byGroup"), t("activities.sessions"), t("columns.rate")],
        ...r.groupRates.map((g) => [g.name, g.total, g.rate == null ? "" : `${g.rate}%`]),
      ];
    } else if (report === "events") {
      const r = await eventsReport();
      rows = [
        [t("columns.name"), t("columns.date"), t("columns.status"), t("columns.participants"), t("columns.pending"), t("columns.capacity"), t("events.attended"), ...(money ? [`${t("columns.revenue")} (TND)`] : [])],
        ...r.rows.map((e) => [e.title, toDateInput(e.startAt), tc(`status.${e.status}`), e.participants, e.pending, e.capacity, e.attended, ...(money ? [tnd(e.revenue)] : [])]),
      ];
    } else if (report === "trips") {
      const r = await tripsReport();
      rows = [
        [t("columns.name"), t("columns.date"), t("columns.status"), t("columns.participants"), t("columns.pending"), t("columns.capacity"), ...(money ? [`${t("trips.expected")} (TND)`, `${t("trips.collected")} (TND)`, t("trips.collection")] : [])],
        ...r.rows.map((x) => [x.title, toDateInput(x.departAt), tc(`status.${x.status}`), x.participants, x.pending, x.capacity, ...(money ? [tnd(x.expected), tnd(x.revenue), x.collectionRate == null ? "" : `${x.collectionRate}%`] : [])]),
      ];
    } else {
      throw new AuthError("NOT_FOUND");
    }
    await audit(user.id, "export", "Report", report);
    sendCsv(res, `onet-rapport-${report}-${day}.csv`, toCsv(rows));
  }),
);

router.get("/reports/members", query(membersReportPage));
router.get("/reports/activities", query(activitiesReportPage));
router.get("/reports/events", query(eventsReportPage));
router.get("/reports/trips", query(tripsReportPage));
router.get("/reports/finance", query(financeReportPage));
