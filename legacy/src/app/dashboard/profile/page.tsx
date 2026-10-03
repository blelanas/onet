import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Mail, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { myProfile } from "@/server/profile/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InfoList, Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { PasswordForm, ProfileForm } from "@/components/dashboard/profile-forms";
import { hhmm } from "@/components/dashboard/widgets";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const current = await requireUser();
  const { user, sessions } = await myProfile(current.id);
  const t = await getTranslations("dashboard.profile");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const m = user.member;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} icon={<UserRound className="size-6" />} breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t("personal")}>
            <ProfileForm defaults={{ name: user.name, phone: user.phone ?? m?.phone ?? null, avatarUrl: user.avatarUrl, locale: user.locale }} />
          </Section>
          <Section title={t("security")}>
            <PasswordForm />
          </Section>
        </div>
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="bg-confetti h-16 bg-gradient-to-br from-brand-600 to-coral rtl:bg-gradient-to-bl" aria-hidden />
            <div className="-mt-9 flex flex-col items-center px-5 pb-5 text-center">
              <Avatar name={user.name} src={user.avatarUrl} size="xl" ring className="shadow-lg" />
              <p className="mt-2 text-lg font-extrabold text-ink">{user.name}</p>
              <p className="flex items-center gap-1 text-sm text-muted">
                <Mail className="size-3.5" /> {user.email}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {user.roles.map((r) => (
                  <Badge key={r.role.key} color={r.role.color}>
                    {tc(`roles.${r.role.key}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
          <Section title={t("account")}>
            <InfoList
              items={[
                { icon: <Mail className="size-4" />, label: t("email"), value: <span className="break-all">{user.email}</span> },
                { icon: <ShieldCheck className="size-4" />, label: t("lastLogin"), value: user.lastLoginAt ? `${formatDate(user.lastLoginAt, locale)} · ${hhmm(user.lastLoginAt, locale)}` : "—" },
                { icon: <MonitorSmartphone className="size-4" />, label: t("sessions"), value: sessions },
              ]}
            />
          </Section>
          {m && (
            <Section title={t("memberCard")}>
              <InfoList
                items={[
                  { label: t("profileType"), value: tc(`enums.memberType.${m.type}`) },
                  { label: tc("fields.status"), value: <StatusBadge status={m.membershipStatus} /> },
                  { label: t("number"), value: <span dir="ltr">{m.membershipNumber}</span> },
                  { label: t("memberSince"), value: formatDate(m.membershipDate, locale) },
                  ...(m.group ? [{ label: tc("fields.group"), value: <Badge color={m.group.color}>{m.group.name}</Badge> }] : []),
                ]}
              />
              {current.permissions.has("members.read") && (
                <Link href={`/dashboard/members/${m.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
                  {tc("actions.details")} <ArrowRight className="rtl-flip size-4" />
                </Link>
              )}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
