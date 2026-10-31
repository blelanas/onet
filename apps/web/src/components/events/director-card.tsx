import { useTranslations } from "use-intl";
import { Phone, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type Director = { id: string; name: string; firstName: string; lastName: string; photoUrl: string | null; phone: string | null; active: boolean };

/** The event's director (name, avatar; the phone only when the API sends it: admins, the edition's teams and director). */
export function DirectorCard({ director, color }: { director: Director; color: string }) {
  const t = useTranslations("events.director");
  return (
    <section className="card flex items-center gap-3 p-4" aria-label={t("label")}>
      <Avatar firstName={director.firstName} lastName={director.lastName} src={director.photoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[11px] font-extrabold tracking-wide uppercase" style={{ color }}>
          <ShieldCheck className="size-3.5" /> {t("label")}
        </p>
        <p className="truncate font-bold text-ink">{director.name}</p>
        {director.phone && (
          <p className="text-xs text-muted" dir="ltr">
            {director.phone}
          </p>
        )}
        {!director.active && <p className="text-xs font-semibold text-amber-700">{t("inactive")}</p>}
      </div>
      {director.phone && (
        <a
          href={`tel:${director.phone.replace(/\s/g, "")}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition hover:bg-brand-600 hover:text-white"
          aria-label={t("call", { name: director.name })}
          title={t("call", { name: director.name })}
        >
          <Phone className="size-4" />
        </a>
      )}
    </section>
  );
}
