import { useTransition } from "react";
import { useTranslations } from "use-intl";
import { useNavigate } from "react-router";
import { Check, Hourglass, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet } from "@/lib/api";
import { signOut, useMe, type Me } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { usePageTitle } from "@/lib/title";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitcher } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

/** Full-page screen shown instead of the dashboard while a self sign-up waits for approval. */
export function PendingApproval() {
  const me = useMe();
  const t = useTranslations("auth.pending");
  const tr = useTranslations("common.roles");
  const tc = useTranslations("common");
  const navigate = useNavigate();
  const [checking, startCheck] = useTransition();
  const [leaving, startLeave] = useTransition();
  usePageTitle(t("title"));
  const role = tr(me.requestedRole ?? "member");

  const steps = [
    { key: "created", icon: Check, state: "done" },
    { key: "review", icon: Hourglass, state: "current" },
    { key: "access", icon: Sparkles, state: "next" },
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas bg-confetti px-4 py-6 sm:px-8" data-testid="pending-approval">
      <div className="flex items-center justify-between">
        <Logo />
        <LocaleSwitcher />
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-sun-soft to-surface px-6 pt-8 pb-6 text-center sm:px-10">
            <span className="mx-auto grid size-16 animate-[var(--animate-float)] place-items-center rounded-3xl bg-sun text-ink shadow-[var(--shadow-soft)]">
              <Hourglass className="size-8" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">{t("title")}</h1>
            <p className="mt-3 text-ink-2">{t("text", { name: me.name.split(" ")[0] ?? me.name, role })}</p>
          </div>
          <div className="px-6 py-6 sm:px-10">
            <ol className="space-y-3">
              {steps.map(({ key, icon: Icon, state }) => (
                <li key={key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      state === "done" && "bg-leaf text-white",
                      state === "current" && "bg-sun text-ink ring-4 ring-sun-soft",
                      state === "next" && "bg-surface-2 text-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className={cn("text-sm font-bold", state === "next" ? "text-muted" : "text-ink")}>{t(`steps.${key}`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-2xl bg-surface-2/70 p-3 text-sm text-ink-2">{t("notice")}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                className="sm:flex-1"
                loading={checking}
                onClick={() =>
                  startCheck(async () => {
                    try {
                      const fresh = await apiGet<Me | null>("/auth/me");
                      queryClient.setQueryData(["/auth/me"], fresh);
                      if (fresh?.status === "PENDING") toast.info(t("stillPending"));
                    } catch (e) {
                      // Signed out (expired / revoked session): leave. Anything else (offline, 5xx): keep the user.
                      if (e instanceof ApiError && e.status === 401) queryClient.setQueryData(["/auth/me"], null);
                      else toast.error(tc("errors.unexpected"));
                    }
                  })
                }
              >
                <RefreshCw className="size-4" /> {t("check")}
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1"
                loading={leaving}
                onClick={() =>
                  startLeave(async () => {
                    await signOut();
                    navigate("/login");
                  })
                }
              >
                <LogOut className="rtl-flip size-4" /> {t("logout")}
              </Button>
            </div>
            <p className="mt-5 text-center text-xs text-muted">
              {t("signedInAs", { email: me.email })} · {t("help")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
