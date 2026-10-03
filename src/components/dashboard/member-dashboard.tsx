import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Bus, Check, Music, PartyPopper, Play } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { CATEGORY_COLORS } from "@/lib/constants";

import { memberDashboard } from "@/server/dashboard/member";
import { CoverArt } from "@/components/ui/cover-art";
import { Section } from "@/components/ui/section";
import { GreetingHeader } from "./greeting-header";
import { AgendaList, AnnouncementList, NotificationList, ScrollStrip, StripItem, dayLabel , hhmm } from "./widgets";

export async function MemberDashboard({ user }: { user: CurrentUser }) {
  const d = await memberDashboard(user);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const labels = await Promise.all(d.upcoming.map((u) => dayLabel(u.at)));

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingHeader name={user.name} subtitle={t("greeting.subtitle.member")} theme="member" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{t("member.upcoming")}</h2>
          <Link href="/dashboard/calendar" className="text-sm font-bold text-brand-600">
            {tc("actions.viewAll")}
          </Link>
        </div>
        {d.upcoming.length ? (
          <ScrollStrip>
            {d.upcoming.map((u, i) => (
              <StripItem key={u.id}>
                <Link href={u.href} className="card card-hover block h-full overflow-hidden">
                  <CoverArt seed={u.id} color={u.color} icon={u.kind === "trip" ? <Bus /> : <PartyPopper />} className="h-28">
                    <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-ink">{t(`kind.${u.kind}`)}</span>
                  </CoverArt>
                  <div className="p-4">
                    <p className="line-clamp-1 font-bold text-ink">{u.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {labels[i]} · {hhmm(u.at, locale)} {u.location && `· ${u.location}`}
                    </p>
                    {u.registration && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <Check className="size-3.5" /> {t("member.registered")}
                      </p>
                    )}
                  </div>
                </Link>
              </StripItem>
            ))}
          </ScrollStrip>
        ) : (
          <p className="card px-4 py-8 text-center text-sm text-muted">{t("empty.agenda")}</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title={t("member.sessions")} href="/dashboard/activities" actionLabel={tc("actions.viewAll")} className="lg:col-span-2">
          <AgendaList items={d.sessions} empty={t("empty.agenda")} />
        </Section>
        <Section title={t("member.songs")} href="/dashboard/content/songs" actionLabel={tc("actions.viewAll")}>
          <ul className="space-y-2">
            {d.songs.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/content/songs/${s.id}`} className="group flex items-center gap-3 rounded-2xl p-1.5 hover:bg-surface-2/70">
                  <CoverArt src={s.coverUrl} seed={s.id} color={CATEGORY_COLORS[s.category] ?? "#E8457C"} icon={<Music />} className="size-12 shrink-0 rounded-xl [&_svg]:!size-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{s.title}</span>
                    <span className="block truncate text-xs text-muted">{tc(`enums.songCategory.${s.category}`)}</span>
                  </span>
                  <Play className="size-4 text-brand-600 opacity-0 transition group-hover:opacity-100" fill="currentColor" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("sections.announcements")} href="/dashboard/announcements" actionLabel={tc("actions.viewAll")}>
          <AnnouncementList items={d.announcements} empty={t("empty.announcements")} />
        </Section>
        <Section title={t("sections.notifications")} href="/dashboard/notifications" actionLabel={tc("actions.viewAll")}>
          <NotificationList items={d.notifications} empty={t("empty.notifications")} />
        </Section>
      </div>
    </div>
  );
}
