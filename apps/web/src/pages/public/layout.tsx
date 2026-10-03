import { Suspense } from "react";
import { Outlet, ScrollRestoration, useMatches } from "react-router";
import { useTranslations } from "use-intl";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { PublicSkeleton } from "@/components/public/states";
import { useOrg } from "@/components/public/use-org";

/** Routes flagged with `handle: { bare: true }` (the branded 404) render without header/footer. */
type Handle = { bare?: boolean } | undefined;

/** Public website layout: skip link, header, main, footer. */
export function Component() {
  const t = useTranslations("public.nav");
  const { me } = useAuth();
  const org = useOrg();
  const bare = useMatches().some((m) => (m.handle as Handle)?.bare);

  if (bare)
    return (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollRestoration />
      <a href="#main" className="sr-only z-[60] rounded-full bg-ink px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-3">
        {t("skip")}
      </a>
      <SiteHeader loggedIn={!!me} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PublicSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter org={org} />
    </div>
  );
}
