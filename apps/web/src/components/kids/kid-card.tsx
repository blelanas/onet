import { useTranslations } from "use-intl";
import { HeartPulse, Phone } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

/** Print rules: only the kid cards are printed, as a clean A4 grid (3 per row), with their team colours. */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .kid-print, .kid-print * { visibility: visible !important; }
  .kid-print { position: absolute !important; inset: 0 0 auto 0 !important; margin: 0 !important; padding: 0 !important; display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 5mm !important; }
  .kid-print > * { break-inside: avoid; page-break-inside: avoid; }
  .kid-print .kid-card { box-shadow: none !important; border: 1px solid #d9d2cc !important; border-radius: 4mm !important; }
  .kid-print .print-color { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .kid-print a { text-decoration: none !important; color: inherit !important; }
  .no-print { display: none !important; }
}`;

export type KidCardData = {
  member: { id: string; firstName: string; lastName: string; firstNameAr?: string | null; lastNameAr?: string | null; photoUrl: string | null; age: number | null };
  team: { name: string; color: string } | null;
  guardian: { name: string; phone: string | null; relation: string } | null;
  medicalNotes?: string | null;
};

/** One kid card: photo, full name, age, team colour band, parent name + phone. */
export function KidCard({ kid, caption, link = true }: { kid: KidCardData; caption?: string | null; link?: boolean }) {
  const t = useTranslations("kids");
  const tc = useTranslations("common");
  const color = kid.team?.color ?? "#7A7390";
  const m = kid.member;
  const name = `${m.firstName} ${m.lastName}`;
  return (
    <article className="kid-card card flex h-full flex-col overflow-hidden">
      <div className="print-color flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-extrabold text-white" style={{ background: color }}>
        <span className="truncate" dir="auto">
          {kid.team?.name ?? t("cards.noTeam")}
        </span>
        {caption && (
          <span className="truncate font-bold opacity-90" dir="auto">
            {caption}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 p-3">
        {m.photoUrl ? (
          <img src={assetUrl(m.photoUrl)} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
        ) : (
          <Avatar firstName={m.firstName} lastName={m.lastName} size="xl" className="print-color rounded-2xl" />
        )}
        <div className="min-w-0 flex-1">
          {link ? (
            <Link href={`/dashboard/members/${m.id}`} className="block font-display text-lg leading-tight font-extrabold text-ink hover:text-brand-700">
              {name}
            </Link>
          ) : (
            <p className="font-display text-lg leading-tight font-extrabold text-ink">{name}</p>
          )}
          {m.firstNameAr && (
            <p className="truncate text-sm text-muted" dir="rtl" lang="ar">
              {m.firstNameAr} {m.lastNameAr ?? ""}
            </p>
          )}
          {m.age !== null && <p className="mt-0.5 text-sm font-bold text-ink-2">{tc("fields.years", { count: m.age })}</p>}
          {kid.medicalNotes && (
            <p className="mt-1 flex items-start gap-1 text-xs text-ink-2" title={kid.medicalNotes}>
              <HeartPulse className="mt-0.5 size-3.5 shrink-0" style={{ color }} />
              <span className="line-clamp-2">{kid.medicalNotes}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-line px-3 py-2 text-xs">
        {kid.guardian ? (
          <>
            <p className="truncate text-ink-2">
              <span className="font-bold text-muted">{t("cards.parent")} · </span>
              {kid.guardian.name} ({tc(`enums.relation.${kid.guardian.relation}`)})
            </p>
            {kid.guardian.phone && (
              <a href={`tel:${kid.guardian.phone.replace(/\s/g, "")}`} className="mt-0.5 inline-flex items-center gap-1 font-extrabold text-ink" dir="ltr">
                <Phone className="size-3.5" /> {kid.guardian.phone}
              </a>
            )}
          </>
        ) : (
          <p className="text-muted">{t("noParent")}</p>
        )}
      </div>
    </article>
  );
}

/** Responsive grid of kid cards; printing (window.print) gives an A4 grid of the cards only. */
export function KidCardsGrid({ kids, caption, className }: { kids: (KidCardData & { key: string; caption?: string | null })[]; caption?: string | null; className?: string }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <ul className={cn("kid-print grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
        {kids.map((k) => (
          <li key={k.key}>
            <KidCard kid={k} caption={k.caption ?? caption} />
          </li>
        ))}
      </ul>
    </>
  );
}
