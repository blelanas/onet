import { useTranslations } from "use-intl";
import { FolderOpen } from "lucide-react";
import type { documentsLibraryPage } from "@api/modules/documents/routes";
import { can, useMe } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { DocumentLibrary } from "@/components/documents/document-library";
import { LibraryUploadButton } from "@/components/documents/library-upload-button";
import { PageHeader } from "@/components/ui/page-header";

type Data = Loaded<typeof documentsLibraryPage>;

/** /dashboard/documents — document library (?q, ?type, ?category, ?page). */
export function Component() {
  const t = useTranslations("documents");
  const tn = useTranslations("nav");
  usePageTitle(t("title"));
  const me = useMe();
  const sp = useSearchParamsObject();
  return (
    <RequirePerm perm="documents.read">
      <PageHeader
        title={t("title")}
        description={t("library.subtitle")}
        icon={<FolderOpen className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={can(me, "documents.manage") ? <LibraryUploadButton /> : undefined}
      />
      <Library sp={sp} />
    </RequirePerm>
  );
}

function Library({ sp }: { sp: Record<string, string | undefined> }) {
  const query = useApi<Data>("/documents", sp);
  return <QueryView query={query}>{(data) => <DocumentLibrary data={data} searchParams={sp} />}</QueryView>;
}
