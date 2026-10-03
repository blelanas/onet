import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";
import { can, requirePagePermission } from "@/lib/auth/guards";
import { DocumentLibrary } from "@/components/documents/document-library";
import { LibraryUploadButton } from "@/components/documents/library-upload-button";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata() {
  const t = await getTranslations("documents");
  return { title: t("title") };
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission("documents.read");
  const t = await getTranslations("documents");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("library.subtitle")}
        icon={<FolderOpen className="size-6" />}
        breadcrumbs={[{ label: tn("items.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={can(user, "documents.manage") ? <LibraryUploadButton /> : undefined}
      />
      <DocumentLibrary user={user} searchParams={await searchParams} />
    </>
  );
}
