import { useTranslations } from "use-intl";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

export function Forbidden() {
  const t = useTranslations("common");
  return (
    <div className="card" data-testid="forbidden">
      <EmptyState icon={<ShieldAlert className="size-5" />} title={t("states.forbiddenTitle")} description={t("states.forbiddenDescription")} action={<LinkButton href="/dashboard">{t("actions.backToDashboard")}</LinkButton>} />
    </div>
  );
}

export function NotFound({ home = "/dashboard" }: { home?: string }) {
  const t = useTranslations("common");
  return (
    <div className="card" data-testid="not-found">
      <EmptyState title={t("states.notFoundTitle")} description={t("states.notFoundDescription")} action={<LinkButton href={home}>{t("actions.backToDashboard")}</LinkButton>} />
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="card" data-testid="error-state">
      <EmptyState
        title={t("states.errorTitle")}
        description={t("states.errorDescription")}
        action={
          onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="size-4" /> {t("actions.retry")}
            </Button>
          )
        }
      />
    </div>
  );
}

/**
 * Renders loading / error states for a useApi() query, then `children(data)`.
 * 403 → forbidden page, 404 → not found, others → retryable error.
 */
export function QueryView<T>({
  query,
  children,
  skeleton,
}: {
  query: { data: T | undefined; error: unknown; isLoading: boolean; refetch: () => unknown };
  children: (data: T) => React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  if (query.error instanceof ApiError) {
    if (query.error.status === 403) return <Forbidden />;
    if (query.error.status === 404) return <NotFound />;
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  if (query.error) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.isLoading || query.data === undefined) return <>{skeleton ?? <PageSkeleton />}</>;
  return <>{children(query.data)}</>;
}
