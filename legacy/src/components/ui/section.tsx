import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Titled block used on dashboards and detail pages. */
export function Section({ title, action, href, actionLabel, children, className }: { title: React.ReactNode; action?: React.ReactNode; href?: string; actionLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {action ??
          (href && (
            <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
              {actionLabel}
              <ArrowRight className="rtl-flip size-4" />
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

/** Key/value detail list. */
export function InfoList({ items, className }: { items: { label: React.ReactNode; value: React.ReactNode; icon?: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="flex items-center gap-2 text-muted">
            {it.icon}
            {it.label}
          </dt>
          <dd className="text-end font-semibold text-ink">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
