import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { activitiesReport, eventsReport, membersReport, tripsReport } from "@/server/reports/queries";

const tnd = (millimes: number) => (millimes / 1000).toFixed(3);

export async function GET(_req: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  if (!can(user, "reports.read", "members.read_all")) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
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
      ...Object.entries(r.byGender).map(([k, v]) => [t(`members.gender.${k}` as "members.gender.M"), v]),
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
    return NextResponse.json({ error: "errors.notFound" }, { status: 404 });
  }
  await audit(user.id, "export", "Report", report);
  return csvResponse(`onet-rapport-${report}-${day}.csv`, rows);
}
