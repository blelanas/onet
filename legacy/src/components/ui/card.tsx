import { cn } from "@/lib/utils";

export function Card({ className, hover, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={cn("card", hover && "card-hover", className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-lg leading-tight font-bold text-ink">{title}</h3>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
