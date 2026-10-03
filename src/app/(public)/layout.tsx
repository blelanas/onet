import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrgProfile } from "@/server/public/queries";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, org, t] = await Promise.all([getCurrentUser(), getOrgProfile(), getTranslations("public.nav")]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] rounded-full bg-ink px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-3">
        {t("skip")}
      </a>
      <SiteHeader loggedIn={!!user} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter org={org} />
    </div>
  );
}
