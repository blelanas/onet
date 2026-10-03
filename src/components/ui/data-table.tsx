import Link from "next/link";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hidden below the lg breakpoint (keeps the desktop table readable on tablets). */
  hideBelow?: "md" | "lg" | "xl";
  align?: "start" | "end" | "center";
};

/**
 * Responsive table: a real <table> from md up, stacked cards on phones.
 * Server component — cell renderers run on the server.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  mobileCard,
  empty,
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  /** Custom phone layout; defaults to label/value pairs. */
  mobileCard?: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (!rows.length) return <>{empty}</>;
  const hide = { md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" };
  const align = { start: "text-start", end: "text-end", center: "text-center" };
  return (
    <div className={className}>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/70">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-4 py-3 text-xs font-extrabold tracking-wide text-muted uppercase", align[c.align ?? "start"], c.hideBelow && hide[c.hideBelow], c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={cn("transition-colors hover:bg-brand-50/40", rowHref && "relative")}>
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", align[c.align ?? "start"], c.hideBelow && hide[c.hideBelow], c.className)}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(r)} className="after:absolute after:inset-0 focus:outline-none">
                        {c.cell(r)}
                      </Link>
                    ) : (
                      <div className={rowHref ? "relative z-10" : undefined}>{c.cell(r)}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const content = mobileCard ? (
            mobileCard(r)
          ) : (
            <dl className="space-y-1.5">
              {columns.map((c, i) =>
                i === 0 ? (
                  <div key={c.key} className="mb-2">
                    {c.cell(r)}
                  </div>
                ) : (
                  <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-muted">{c.header}</dt>
                    <dd className="text-end font-semibold">{c.cell(r)}</dd>
                  </div>
                ),
              )}
            </dl>
          );
          return (
            <li key={rowKey(r)} className="card relative p-4">
              {rowHref ? (
                <Link href={rowHref(r)} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
