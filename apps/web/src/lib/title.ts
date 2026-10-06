import { useEffect } from "react";
import { useTranslations } from "use-intl";

/** Sets document.title as "<title> · ONET Teboulba" (replaces Next.js generateMetadata). */
export function usePageTitle(title?: string | null) {
  const t = useTranslations("common.app");
  useEffect(() => {
    document.title = title ? `${title} · ${t("short")}` : t("title");
  }, [title, t]);
}
