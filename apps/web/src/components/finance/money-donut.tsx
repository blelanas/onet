import { useLocale } from "use-intl";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { formatMoney } from "@onet/shared";

/** Donut of money amounts (millimes) with a formatted legend. */
export function MoneyDonut({ data, centerLabel, height = 200, stacked }: { data: { key: string; name: string; value: number; color: string }[]; centerLabel?: string; height?: number; stacked?: boolean }) {
  const locale = useLocale();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={stacked ? "flex flex-col items-center gap-5" : "flex flex-col items-center gap-5 sm:flex-row sm:gap-8"}>
      <div className="relative shrink-0" style={{ width: height, height }}>
          <PieChart width={height} height={height}>
            <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={2} stroke="#fff" strokeWidth={2} cornerRadius={4}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatMoney(Number(v), locale)}
              contentStyle={{ borderRadius: 14, border: "1px solid #f0e6df", boxShadow: "0 12px 28px -12px rgb(34 27 51 / .25)", fontSize: 13 }}
            />
          </PieChart>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-lg font-extrabold text-ink tabular-nums">
              {formatMoney(total, locale, { compact: total >= 100_000_000 })}
            </div>
            {centerLabel && <div className="text-xs font-bold text-muted">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 font-bold text-ink tabular-nums">
              {formatMoney(d.value, locale)} <span className="text-xs font-semibold text-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
