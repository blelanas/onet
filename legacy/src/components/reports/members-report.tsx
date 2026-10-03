import { getLocale, getTranslations } from "next-intl/server";
import { Baby, BadgeCheck, UserPlus, Users } from "lucide-react";
import { membersReport } from "@/server/reports/queries";
import { BarsChart, DonutChart } from "@/components/ui/charts";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { ChartCard, monthLabel } from "./chart-card";

const TYPE_COLORS: Record<string, string> = { CHILD: "#D98B00", PARENT: "#7C4DFF", MONITOR: "#1683C0", MEMBER: "#1E9460", STAFF: "#E30613" };
const STATUS_COLORS: Record<string, string> = { ACTIVE: "#1E9460", PENDING: "#D98B00", INACTIVE: "#94A3B8", SUSPENDED: "#E30613" };

export async function MembersReport() {
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const r = await membersReport();
  const maxGroup = Math.max(1, ...r.byGroup.map((g) => Math.max(g.capacity, g.count)));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("members.total")} value={r.total} icon={<Users className="size-5" />} accent="brand" />
        <KpiCard label={t("members.children")} value={r.children} icon={<Baby className="size-5" />} accent="sun" />
        <KpiCard label={t("members.active")} value={r.active} icon={<BadgeCheck className="size-5" />} accent="leaf" hint={t("members.inactiveHint", { count: r.inactive })} />
        <KpiCard label={t("members.newThisMonth")} value={r.newThisMonth} icon={<UserPlus className="size-5" />} accent="sky" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title={t("members.perMonth")} hint={t("members.perMonthHint")} className="lg:col-span-2">
          <BarsChart
            data={r.perMonth.map((m) => ({ month: monthLabel(m.date, locale), children: m.children, others: m.others }))}
            xKey="month"
            stacked
            series={[
              { key: "children", label: t("members.childrenSeries"), color: "#D98B00" },
              { key: "others", label: t("members.othersSeries"), color: "#1683C0" },
            ]}
          />
        </ChartCard>
        <ChartCard title={t("members.byStatus")}>
          <DonutChart data={Object.entries(r.byStatus).map(([k, v]) => ({ name: tc(`status.${k}`), value: v, color: STATUS_COLORS[k] }))} centerLabel={t("members.total")} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title={t("members.byAge")}>
          <BarsChart data={r.byAge.map((b) => ({ bracket: b.bracket === "UNKNOWN" ? t("members.unknown") : t("members.years", { range: b.bracket.replace("-", "–") }), count: b.count }))} xKey="bracket" series={[{ key: "count", label: t("members.children"), color: "#D98B00" }]} height={240} />
        </ChartCard>
        <ChartCard title={t("members.byGender")}>
          <DonutChart
            data={Object.entries(r.byGender).map(([k, v]) => ({ name: t(`members.gender.${k}` as "members.gender.M"), value: v, color: k === "F" ? "#E8457C" : k === "M" ? "#1683C0" : "#94A3B8" }))}
            centerLabel={t("members.children")}
          />
        </ChartCard>
        <ChartCard title={t("members.byType")}>
          <DonutChart data={Object.entries(r.byType).map(([k, v]) => ({ name: tc(`enums.memberType.${k}`), value: v, color: TYPE_COLORS[k] }))} centerLabel={t("members.total")} />
        </ChartCard>
      </div>

      <ChartCard title={t("members.byGroup")}>
        <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {r.byGroup.map((g) => (
            <li key={g.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-bold text-ink">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                  <span className="truncate">{g.id === "NONE" ? t("members.noGroup") : g.name}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
                  {g.count}
                  {g.capacity ? ` / ${g.capacity}` : ""}
                </span>
              </div>
              <Progress value={g.count} max={g.capacity || maxGroup} color={g.color} label={g.name} />
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}
