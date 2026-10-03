"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "next-intl";

// Categorical order validated for CVD separation (see dataviz validator): sky, red, amber, green, violet.
export const CHART_COLORS = ["#1683C0", "#E30613", "#D98B00", "#1E9460", "#7C4DFF"];

const axis = { fontSize: 12, fill: "#7a7390" };
const tooltipStyle = {
  contentStyle: { borderRadius: 14, border: "1px solid #f0e6df", boxShadow: "0 12px 28px -12px rgb(34 27 51 / .25)", fontSize: 13, fontFamily: "inherit" },
  labelStyle: { fontWeight: 800, color: "#221b33" },
  cursor: { fill: "rgb(227 6 19 / 0.05)" },
};

type Series = { key: string; label: string; color?: string };

export function TrendChart({ data, xKey, series, height = 260, format }: { data: Record<string, string | number>[]; xKey: string; series: Series[]; height?: number; format?: "money" | "number" }) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const fmt = (v: number) =>
    format === "money" ? new Intl.NumberFormat(locale === "ar" ? "ar-TN-u-nu-latn" : locale, { notation: "compact", maximumFractionDigits: 1 }).format(v) : String(v);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="#f0e6df" />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} reversed={isRtl} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44} tickFormatter={fmt} orientation={isRtl ? "right" : "left"} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: "#c9bfd9", strokeDasharray: 4 }} formatter={(v) => (format === "money" ? `${Number(v).toLocaleString()} TND` : String(v))} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? CHART_COLORS[i]} strokeWidth={2} fill={`url(#g-${s.key})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, xKey, series, height = 260, layout = "horizontal", stacked }: { data: Record<string, string | number>[]; xKey: string; series: Series[]; height?: number; layout?: "horizontal" | "vertical"; stacked?: boolean }) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="#f0e6df" />
        {vertical ? (
          <>
            <XAxis type="number" tick={axis} axisLine={false} tickLine={false} reversed={isRtl} allowDecimals={false} />
            <YAxis type="category" dataKey={xKey} tick={axis} axisLine={false} tickLine={false} width={110} orientation={isRtl ? "right" : "left"} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} reversed={isRtl} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={36} allowDecimals={false} orientation={isRtl ? "right" : "left"} />
          </>
        )}
        <Tooltip {...tooltipStyle} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? CHART_COLORS[i]}
            stackId={stacked ? "a" : undefined}
            radius={stacked ? 0 : vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={36}
            stroke="#fff"
            strokeWidth={stacked ? 2 : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 220, centerLabel, centerValue }: { data: { name: string; value: number; color?: string }[]; height?: number; centerLabel?: string; centerValue?: string | number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full max-w-[220px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2} cornerRadius={4}>
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-extrabold text-ink">{centerValue ?? total}</div>
            {centerLabel && <div className="text-xs font-bold text-muted">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="size-2.5 rounded-full" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
              {d.name}
            </span>
            <span className="font-bold text-ink tabular-nums">
              {d.value} <span className="text-xs font-semibold text-muted">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
