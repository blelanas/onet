"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, RotateCcw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("public");
  const tc = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <div className="card">
        <EmptyState
          title={t("error.title")}
          description={t("error.text")}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={reset} className="rounded-full">
                <RotateCcw className="size-4" /> {tc("actions.retry")}
              </Button>
              <Link href="/" className={buttonClasses("outline", "md", "rounded-full")}>
                <Home className="size-4" /> {t("notFound.home")}
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
