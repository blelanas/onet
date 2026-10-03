"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => console.error(error), [error]);
  return (
    <div className="card">
      <EmptyState
        title={t("states.errorTitle")}
        description={t("states.errorDescription")}
        action={
          <Button onClick={reset}>
            <RefreshCw className="size-4" /> {t("actions.retry")}
          </Button>
        }
      />
    </div>
  );
}
