import { useTranslations } from "use-intl";
import { Navigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginForm } from "./login-form";

export function Component() {
  const { me } = useAuth();
  const next = useSearchParams().get("next") ?? undefined;
  const t = useTranslations("auth.login");
  usePageTitle(t("submit"));
  if (me) return <Navigate to={next?.startsWith("/dashboard") ? next : "/dashboard"} replace />;
  return (
    <AuthLayout sideTitle={t("sideTitle")} sideText={t("sideText")}>
      <h1 className="text-3xl font-extrabold text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>
      <LoginForm next={next} />
    </AuthLayout>
  );
}
