import { cn } from "@/lib/utils";

/** Friendly empty state with a small ONET-style illustration (balloons + stars). */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <div className="relative mb-4">
        <svg width={compact ? 88 : 120} height={compact ? 70 : 96} viewBox="0 0 120 96" aria-hidden className="animate-[var(--animate-float)]">
          <ellipse cx="60" cy="90" rx="34" ry="5" fill="#F0E6DF" />
          <path d="M44 58 C40 70 46 78 42 88" stroke="#C9BFD9" strokeWidth="1.5" fill="none" />
          <path d="M76 52 C80 66 74 76 79 88" stroke="#C9BFD9" strokeWidth="1.5" fill="none" />
          <ellipse cx="44" cy="40" rx="17" ry="20" fill="#FFB400" />
          <ellipse cx="78" cy="34" rx="18" ry="21" fill="#E30613" />
          <ellipse cx="38" cy="33" rx="4" ry="6" fill="#fff" opacity=".45" />
          <ellipse cx="72" cy="26" rx="4" ry="6" fill="#fff" opacity=".45" />
          <circle cx="102" cy="14" r="4" fill="#1E9BD7" />
          <circle cx="16" cy="22" r="3" fill="#2BB673" />
          <path d="M100 60l2 4 4.5.6-3.3 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.3-3.1 4.5-.6z" fill="#7C4DFF" />
        </svg>
        {icon && <div className="absolute -end-2 -bottom-1 grid size-9 place-items-center rounded-full bg-surface text-brand-600 shadow-[var(--shadow-soft)]">{icon}</div>}
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
