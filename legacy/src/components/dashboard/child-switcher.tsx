import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type Kid = { id: string; firstName: string; lastName: string; photoUrl: string | null; group?: { color: string } | null };

/** Child pills (URL-driven `?child=`), horizontally scrollable on phones. */
export async function ChildSwitcher({ kids, selectedId, basePath, onDark }: { kids: Kid[]; selectedId?: string | null; basePath: string; onDark?: boolean }) {
  const t = await getTranslations("dashboard.parent");
  if (kids.length < 2) return null;
  return (
    <nav aria-label={t("switchChild")} className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {kids.map((k) => {
        const active = k.id === selectedId;
        return (
          <Link
            key={k.id}
            href={`${basePath}?child=${k.id}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full py-1 ps-1 pe-4 text-sm font-bold transition",
              onDark
                ? active
                  ? "bg-white text-ink shadow-lg"
                  : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                : active
                  ? "bg-ink text-white shadow-md"
                  : "border border-line bg-surface text-ink-2 hover:border-brand-200",
            )}
          >
            <span className="relative">
              <Avatar firstName={k.firstName} lastName={k.lastName} src={k.photoUrl} size="sm" ring={active} />
              {k.group && <span className="absolute -end-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white" style={{ background: k.group.color }} aria-hidden />}
            </span>
            {k.firstName}
          </Link>
        );
      })}
    </nav>
  );
}
