import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for a tab panel (each tab loads its own data). */
export function TabSkeleton() {
  return <Skeleton className="h-64 rounded-2xl" />;
}

/** Loading state for card-grid pages (groups, activities, calendar, attendance). */
export function GridSkeleton({ cards = 6, kpis = 0, tall }: { cards?: number; kpis?: number; tall?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-[60vw]" />
        </div>
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: kpis }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      {tall ? (
        <Skeleton className="h-[32rem] rounded-2xl" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
