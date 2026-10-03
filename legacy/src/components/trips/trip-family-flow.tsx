import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Backpack, Check, CheckCircle2, ClipboardList, CreditCard, Hourglass, MapPin, PartyPopper, Users, XCircle } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ageFrom, cn } from "@/lib/utils";
import type { FamilyEntry } from "@/server/registrations/queries";
import { cancelRegistrationAction } from "@/server/registrations/actions";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TripConsentForm } from "./trip-consent-form";
import { dateTime } from "@/components/registrations/format";

const STEP_KEYS = ["view", "child", "consent", "register", "pay", "confirmed", "info"] as const;

/**
 * Parent journey for a trip, as a 7-step stepper:
 * view → choose child → consent & price → register → pay → confirmation → practical info.
 */
export async function TripFamilyFlow({ trip, entries, selectedId, basePath, docs, full }: { trip: { id: string; title: string; price: number; departAt: Date; departureLocation: string }; entries: FamilyEntry[]; selectedId?: string; basePath: string; docs: string[]; full: boolean }) {
  const t = await getTranslations("trips");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  // Default selection: first child with a live registration, else the only eligible one.
  const live = (e: FamilyEntry) => !!e.registration && e.registration.status !== "CANCELLED";
  const eligible = entries.filter((e) => !e.reason);
  const selected = entries.find((e) => e.member.id === selectedId) ?? entries.find(live) ?? (eligible.length === 1 ? eligible[0] : undefined);
  const reg = selected && live(selected) ? selected.registration! : null;
  const inv = reg?.invoice ?? null;
  const paid = !!reg && (trip.price === 0 || inv?.status === "PAID");

  // Current step (0-based)
  let current = 1;
  if (selected) current = 2;
  if (reg) current = reg.status === "CONFIRMED" ? 6 : reg.status === "WAITLIST" ? 3 : paid ? 5 : 4;
  const doneUntil = current - 1;

  const priceLabel = trip.price > 0 ? formatMoney(trip.price, locale) : tc("fields.free");

  return (
    <section className="card overflow-hidden" id="inscription">
      <div className="border-b border-line bg-gradient-to-br from-brand-50 via-surface to-sun-soft/50 px-4 pt-4 pb-3 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-ink">{t("flow.title")}</h2>
          {entries.length > 1 && (
            <nav className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1" aria-label={t("flow.steps.child")}>
              {entries.map((e) => (
                <Link
                  key={e.member.id}
                  href={`${basePath}?child=${e.member.id}#inscription`}
                  scroll={false}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-full border py-1 ps-1 pe-3 text-sm font-bold transition", selected?.member.id === e.member.id ? "border-transparent bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-brand-200")}
                >
                  <Avatar firstName={e.member.firstName} lastName={e.member.lastName} src={e.member.photoUrl} size="xs" />
                  {e.member.firstName}
                  {live(e) && <Check className="size-3.5 text-emerald-500" />}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {/* Stepper */}
        <ol className="-mx-1 flex px-1 pb-1">
          {STEP_KEYS.map((k, i) => {
            const done = i <= doneUntil;
            const active = i === current;
            return (
              <li key={k} className="flex min-w-[2.5rem] flex-1 flex-col items-center text-center sm:min-w-[4.5rem]" aria-current={active ? "step" : undefined}>
                <div className="flex w-full items-center">
                  <span className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "opacity-0" : i <= doneUntil + 1 ? "bg-emerald-400" : "bg-line")} />
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition",
                      done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white shadow-[var(--shadow-brand)] ring-4 ring-brand-100" : "bg-surface text-muted ring-1 ring-line",
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className={cn("h-0.5 flex-1 rounded-full", i === STEP_KEYS.length - 1 ? "opacity-0" : i < doneUntil + 1 ? "bg-emerald-400" : "bg-line")} />
                </div>
                <span className={cn("mt-1.5 px-0.5 text-[11px] leading-tight font-bold whitespace-nowrap sm:whitespace-normal", active ? "text-brand-700" : done ? "hidden text-emerald-700 sm:block" : "hidden text-muted sm:block")}>{t(`flow.steps.${k}`)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="p-4 sm:p-6">
        {/* Step 2: choose a child */}
        {!selected && (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink-2">{t("flow.chooseChild")}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((e) => (
                <li key={e.member.id}>
                  <Link href={`${basePath}?child=${e.member.id}#inscription`} scroll={false} className={cn("card-hover flex items-center gap-3 rounded-2xl border p-3", e.reason && !live(e) ? "border-line bg-surface-2/50" : "border-line bg-surface hover:border-brand-200")}>
                    <Avatar firstName={e.member.firstName} lastName={e.member.lastName} src={e.member.photoUrl} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{e.member.firstName}</span>
                      <span className="block text-xs text-muted">{e.member.dateOfBirth && tc("fields.years", { count: ageFrom(e.member.dateOfBirth) ?? 0 })}</span>
                    </span>
                    {live(e) ? <StatusBadge status={e.registration!.status} /> : e.reason ? <span className="text-xs font-bold text-amber-700">{t(`eligibility.${e.reason}`)}</span> : <ArrowRight className="rtl-flip size-4 text-brand-600" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps 3-4: consent, price, register */}
        {selected && !reg && (
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-3">
              <div className="flex items-center gap-3">
                <Avatar firstName={selected.member.firstName} lastName={selected.member.lastName} src={selected.member.photoUrl} size="lg" />
                <div>
                  <p className="font-display text-xl font-extrabold text-ink">{selected.member.firstName}</p>
                  <p className="text-sm text-muted">{selected.member.dateOfBirth && tc("fields.years", { count: ageFrom(selected.member.dateOfBirth) ?? 0 })}</p>
                </div>
              </div>
              {selected.reason ? (
                <div className="flex gap-3 rounded-2xl bg-sun-soft p-4 text-sm text-amber-900">
                  <XCircle className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-bold">{t(`eligibility.${selected.reason}`)}</p>
                    <p className="mt-0.5">{t(`flow.reasonHint.${selected.reason}`)}</p>
                  </div>
                </div>
              ) : (
                <TripConsentForm tripId={trip.id} memberId={selected.member.id} childName={selected.member.firstName} tripTitle={trip.title} priceLabel={priceLabel} full={full} />
              )}
            </div>
            <div className="rounded-2xl border border-dashed border-line p-4 lg:col-span-2">
              <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
                <Backpack className="size-4 text-brand-600" /> {t("flow.toBring")}
              </p>
              <ul className="space-y-1.5 text-sm text-ink-2">
                {docs.map((d) => (
                  <li key={d} className="flex gap-2">
                    <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted" /> {d}
                  </li>
                ))}
                {!docs.length && <li className="text-muted">{t("flow.noDocs")}</li>}
              </ul>
              {full && <p className="mt-3 rounded-xl bg-grape-soft px-3 py-2 text-xs font-semibold text-violet-800">{t("flow.fullHint")}</p>}
            </div>
          </div>
        )}

        {/* Waitlist */}
        {reg?.status === "WAITLIST" && (
          <StateCard tone="violet" icon={<Hourglass className="size-6" />} title={t("flow.waitlistTitle", { name: selected!.member.firstName })} text={t("flow.waitlistText")}>
            <CancelButton id={reg.id} paid={false} label={tc("actions.cancel")} t={t} />
          </StateCard>
        )}

        {/* Step 5: pay */}
        {reg && reg.status !== "WAITLIST" && !paid && inv && (
          <StateCard tone="sun" icon={<CreditCard className="size-6" />} title={t("flow.payTitle", { name: selected!.member.firstName })} text={t("flow.payText")}>
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{formatMoney(inv.amount, locale)}</p>
                <p className="text-xs text-muted">
                  <span dir="ltr">{inv.number}</span> · <StatusBadge status={inv.status} />
                </p>
              </div>
              <LinkButton href={`/dashboard/finance/invoices/${inv.id}`} size="lg">
                <CreditCard className="size-5" /> {t("flow.payNow")}
              </LinkButton>
            </div>
            <CancelButton id={reg.id} paid={inv.status === "PARTIALLY_PAID"} label={t("flow.cancelRegistration")} t={t} />
          </StateCard>
        )}

        {/* Paid but awaiting confirmation (rare: staff confirms) */}
        {reg && reg.status === "PENDING" && paid && (
          <StateCard tone="sky" icon={<Hourglass className="size-6" />} title={t("flow.awaitingTitle")} text={t("flow.awaitingText")} />
        )}

        {/* Steps 6-7: confirmed + info */}
        {reg?.status === "CONFIRMED" && (
          <StateCard tone="leaf" icon={<PartyPopper className="size-6" />} title={t("flow.confirmedTitle", { name: selected!.member.firstName })} text={t("flow.confirmedText", { date: dateTime(trip.departAt, locale), place: trip.departureLocation })}>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "#program", icon: <ClipboardList className="size-4" />, label: t("flow.info.program") },
                { href: "#documents", icon: <Backpack className="size-4" />, label: t("flow.info.documents"), extra: reg.documentsStatus && <StatusBadge status={reg.documentsStatus} /> },
                { href: "#monitors", icon: <Users className="size-4" />, label: t("flow.info.monitors") },
                { href: "#meeting", icon: <MapPin className="size-4" />, label: t("flow.info.meeting") },
              ].map((x) => (
                <li key={x.href}>
                  <a href={x.href} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-bold text-ink shadow-[var(--shadow-soft)] hover:text-brand-700">
                    <span className="text-emerald-600">{x.icon}</span> <span className="flex-1">{x.label}</span> {x.extra}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> {t("flow.registeredOn", { date: formatDate(reg.createdAt, locale) })}
              </span>
              {inv && (
                <Link href={`/dashboard/finance/invoices/${inv.id}`} className="font-bold text-brand-700 hover:underline" dir="ltr">
                  {inv.number}
                </Link>
              )}
              <span className="ms-auto">
                <CancelButton id={reg.id} paid={inv?.status === "PAID"} label={t("flow.cancelRegistration")} t={t} />
              </span>
            </div>
          </StateCard>
        )}
      </div>
    </section>
  );
}

const TONES = {
  sun: "bg-sun-soft/70 text-amber-700",
  leaf: "bg-leaf-soft/70 text-emerald-700",
  violet: "bg-grape-soft/70 text-violet-700",
  sky: "bg-sky-soft/70 text-sky-700",
};

function StateCard({ tone, icon, title, text, children }: { tone: keyof typeof TONES; icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={cn("space-y-4 rounded-3xl p-4 sm:p-5", TONES[tone].split(" ")[0])}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-12 shrink-0 animate-[var(--animate-pop)] place-items-center rounded-2xl bg-surface shadow-[var(--shadow-soft)]", TONES[tone].split(" ")[1])}>{icon}</span>
        <div>
          <p className="font-display text-lg font-extrabold text-ink sm:text-xl">{title}</p>
          <p className="mt-0.5 text-sm text-ink-2">{text}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CancelButton({ id, paid, label, t }: { id: string; paid: boolean; label: string; t: (k: string) => string }) {
  return (
    <ConfirmButton action={cancelRegistrationAction.bind(null, "trip", id)} variant="ghost" size="sm" title={t("cancel.title")} description={t(paid ? "cancel.paidText" : "cancel.text")} confirmLabel={t("cancel.confirm")} successMessage="toast.cancelled">
      {label}
    </ConfirmButton>
  );
}
