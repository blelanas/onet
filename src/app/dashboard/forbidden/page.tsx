import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function Forbidden() {
  const t = await getTranslations("common");
  return (
    <div className="card">
      <EmptyState icon={<ShieldAlert className="size-5" />} title={t("states.forbiddenTitle")} description={t("states.forbiddenDescription")} action={<LinkButton href="/dashboard">{t("actions.backToDashboard")}</LinkButton>} />
    </div>
  );
}
