import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="card">
      <EmptyState title={t("states.notFoundTitle")} description={t("states.notFoundDescription")} action={<LinkButton href="/dashboard">{t("actions.backToDashboard")}</LinkButton>} />
    </div>
  );
}
