import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Baby, CalendarDays, EyeOff, MapPin } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CoverArt } from "@/components/ui/cover-art";
import { StatusBadge } from "@/components/ui/status-badge";
import { CategoryIcon, DateTile, PlacesMeter, categoryColor } from "@/components/registrations/visuals";

type TripCardData = {
  id: string;
  title: string;
  destination: string;
  category: string;
  coverUrl: string | null;
  departAt: Date;
  returnAt: Date;
  capacity: number;
  price: number;
  status: string;
  isPublic: boolean;
  ageMin: number | null;
  ageMax: number | null;
  _count: { registrations: number };
  monitors: { member: { id: string; firstName: string; lastName: string; photoUrl: string | null } }[];
};

export function tripDays(departAt: Date, returnAt: Date) {
  const a = new Date(departAt);
  a.setHours(0, 0, 0, 0);
  const b = new Date(returnAt);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400_000) + 1;
}

export async function TripCard({ trip, showMoney, family }: { trip: TripCardData; showMoney: boolean; family?: { firstName: string; lastName: string; photoUrl: string | null; status: string }[] }) {
  const t = await getTranslations("trips");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const color = categoryColor(trip.category);
  const left = Math.max(0, trip.capacity - trip._count.registrations);
  const days = tripDays(trip.departAt, trip.returnAt);
  const upcoming = trip.returnAt > new Date();
  return (
    <Link href={`/dashboard/trips/${trip.id}`} className="card card-hover group flex h-full flex-col overflow-hidden focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none">
      <CoverArt src={trip.coverUrl} seed={trip.id} color={color} icon={<CategoryIcon kind="trip" category={trip.category} />} className="h-44 shrink-0">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <DateTile date={trip.departAt} locale={locale} />
          <div className="flex flex-col items-end gap-1.5">
            {showMoney && <span className="rounded-full bg-surface/95 px-3 py-1 text-sm font-extrabold text-ink shadow-[var(--shadow-soft)]">{trip.price > 0 ? formatMoney(trip.price, locale) : tc("fields.free")}</span>}
            {trip.status !== "OPEN" && <StatusBadge status={trip.status} className="bg-surface/95" />}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/55 to-transparent p-3 pt-10">
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-white drop-shadow">
            <MapPin className="size-4" /> {trip.destination}
          </span>
        </div>
      </CoverArt>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color={color}>{tc(`enums.tripCategory.${trip.category}`)}</Badge>
          <Badge tone="neutral">
            <CalendarDays className="size-3" /> {t("card.days", { count: days })}
          </Badge>
          {(trip.ageMin != null || trip.ageMax != null) && (
            <Badge tone="warning">
              <Baby className="size-3" /> {t("card.ages", { min: trip.ageMin ?? 0, max: trip.ageMax ?? 99 })}
            </Badge>
          )}
          {!trip.isPublic && (
            <Badge tone="neutral">
              <EyeOff className="size-3" />
            </Badge>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg leading-snug font-extrabold text-ink group-hover:text-brand-700">{trip.title}</h3>
        <p className="text-sm text-ink-2">
          {days > 1 ? `${formatDate(trip.departAt, locale)} → ${formatDate(trip.returnAt, locale)}` : formatDate(trip.departAt, locale, "long")}
        </p>
        <div className="mt-auto space-y-3 pt-1">
          {upcoming && ["OPEN", "FULL"].includes(trip.status) && <PlacesMeter taken={trip._count.registrations} capacity={trip.capacity} label={tc("fields.placesLeft", { count: left })} />}
          <div className="flex items-center justify-between gap-2">
            {trip.monitors.length > 0 ? (
              <span className="flex items-center gap-2 text-xs text-muted">
                <AvatarStack people={trip.monitors.map((m) => m.member)} max={3} />
                {t("card.monitors", { count: trip.monitors.length })}
              </span>
            ) : (
              <span />
            )}
          </div>
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
