import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Clock, EyeOff, MapPin } from "lucide-react";
import { formatMoney } from "@onet/shared";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CoverArt } from "@/components/ui/cover-art";
import { StatusBadge } from "@/components/ui/status-badge";
import { CategoryIcon, DateTile, PlacesMeter, categoryColor } from "@/components/registrations/visuals";
import { hm } from "@/components/registrations/format";

type EventCardData = {
  id: string;
  title: string;
  category: string;
  coverUrl: string | null;
  startAt: Date;
  endAt: Date;
  location: string | null;
  capacity: number;
  price: number;
  status: string;
  isPublic: boolean;
  _count: { registrations: number };
};

export function EventCard({ e, showMoney, family }: { e: EventCardData; showMoney: boolean; family?: { firstName: string; lastName: string; photoUrl: string | null; status: string }[] }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();
  const color = categoryColor(e.category);
  const left = Math.max(0, e.capacity - e._count.registrations);
  const past = e.endAt < new Date();
  return (
    <Link href={`/dashboard/events/${e.id}`} className="card card-hover group flex h-full flex-col overflow-hidden focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none">
      <CoverArt src={e.coverUrl} seed={e.id} color={color} icon={<CategoryIcon kind="event" category={e.category} />} className="h-40 shrink-0">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <DateTile date={e.startAt} locale={locale} />
          <div className="flex flex-col items-end gap-1.5">
            {showMoney && (
              <span className="rounded-full bg-surface/95 px-3 py-1 text-sm font-extrabold text-ink shadow-[var(--shadow-soft)]">{e.price > 0 ? formatMoney(e.price, locale) : tc("fields.free")}</span>
            )}
            {e.status !== "PUBLISHED" && <StatusBadge status={e.status} className="bg-surface/95" />}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
      </CoverArt>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color={color}>{tc(`enums.eventCategory.${e.category}`)}</Badge>
          {!e.isPublic && (
            <Badge tone="neutral">
              <EyeOff className="size-3" /> {t("card.internal")}
            </Badge>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg leading-snug font-extrabold text-ink group-hover:text-brand-700">{e.title}</h3>
        <div className="space-y-1 text-sm text-ink-2">
          <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted" />
            <span dir="ltr">
              {hm(e.startAt, locale)} – {hm(e.endAt, locale)}
            </span>
          </p>
          {e.location && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted" />
              <span className="truncate">{e.location}</span>
            </p>
          )}
        </div>
        <div className="mt-auto space-y-3 pt-1">
          {!past && e.status === "PUBLISHED" && <PlacesMeter taken={e._count.registrations} capacity={e.capacity} label={tc("fields.placesLeft", { count: left })} />}
          {family && family.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-leaf-soft px-2.5 py-1.5 text-xs font-bold text-emerald-800">
              <span className="flex -space-x-2 rtl:space-x-reverse">
                {family.slice(0, 3).map((m, i) => (
                  <Avatar key={i} firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} size="xs" ring />
                ))}
              </span>
              <span className="truncate">{t("card.registered", { names: family.map((m) => m.firstName).join(", ") })}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
