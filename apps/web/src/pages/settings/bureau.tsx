import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "use-intl";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { bureauSettingsPage } from "@api/modules/settings/routes";
import { deleteBureauMember, moveBureauMember, setBureauMemberActive } from "@/api/settings";
import type { ActionResult } from "@/lib/api";
import { useApi } from "@/lib/query";
import { Link, useRouter } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsCard } from "@/components/settings/settings-card";
import { BureauFormModal, type BureauRow } from "@/components/settings/bureau-form";

type Data = Loaded<typeof bureauSettingsPage>;

/** /dashboard/settings/bureau — local bureau members shown on the public landing page (content.manage). */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("bureau"));
  return (
    <RequirePerm perm="content.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const t = useTranslations("settings.bureau");
  const query = useApi<Data>("/settings/bureau");
  const [editing, setEditing] = useState<BureauRow | "new" | null>(null);
  return (
    <SettingsCard
      title={t("title")}
      description={t("intro")}
      action={
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-2 hover:bg-surface-2">
            <ExternalLink className="size-4" /> {t("preview")}
          </Link>
          <Button onClick={() => setEditing("new")} data-testid="bureau-add">
            <Plus className="size-4" /> {t("add")}
          </Button>
        </div>
      }
    >
      <QueryView query={query}>{(data) => <BureauList rows={data.rows} onEdit={setEditing} onAdd={() => setEditing("new")} />}</QueryView>
      <BureauFormModal value={editing} onClose={() => setEditing(null)} />
    </SettingsCard>
  );
}

/** Icon button running an action quietly (toast only on error), then refreshing the list. */
function QuietAction({ action, label, children, disabled }: { action: () => Promise<ActionResult<unknown>>; label: string; children: React.ReactNode; disabled?: boolean }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) router.refresh();
          else toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
        })
      }
    >
      {!pending && children}
    </Button>
  );
}

function BureauList({ rows, onEdit, onAdd }: { rows: BureauRow[]; onEdit: (r: BureauRow) => void; onAdd: () => void }) {
  const t = useTranslations("settings.bureau");
  const tc = useTranslations("common");
  const locale = useLocale();
  if (!rows.length)
    return (
      <EmptyState
        compact
        title={t("empty")}
        description={t("emptyHint")}
        icon={<UsersRound className="size-4" />}
        action={
          <Button onClick={onAdd}>
            <Plus className="size-4" /> {t("add")}
          </Button>
        }
      />
    );
  return (
    <ol className="space-y-2.5" data-testid="bureau-list">
      {rows.map((r, i) => {
        const [main, other] = locale === "ar" ? [r.nameAr ?? r.name, r.nameAr ? r.name : null] : [r.name, r.nameAr];
        const position = locale === "ar" ? (r.positionAr ?? r.position) : r.position;
        return (
          <li key={r.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition sm:flex-nowrap", r.isActive ? "border-line bg-surface" : "border-dashed border-line bg-surface-2/60")}>
            <div className="flex flex-col">
              <QuietAction action={() => moveBureauMember(r.id, "up")} label={t("moveUp")} disabled={i === 0}>
                <ArrowUp className="size-4" />
              </QuietAction>
              <QuietAction action={() => moveBureauMember(r.id, "down")} label={t("moveDown")} disabled={i === rows.length - 1}>
                <ArrowDown className="size-4" />
              </QuietAction>
            </div>
            <Avatar name={r.name} src={r.photoUrl} size="lg" className={cn("ring-4 ring-leaf-soft", !r.isActive && "opacity-60 grayscale")} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <bdi className="truncate font-extrabold text-ink">{main}</bdi>
                <Badge tone={r.isActive ? "success" : "neutral"} dot>
                  {r.isActive ? t("shown") : t("hidden")}
                </Badge>
              </p>
              {other && (
                <p className="truncate text-sm text-ink-2">
                  <bdi>{other}</bdi>
                </p>
              )}
              <p className="truncate text-sm font-semibold text-muted">
                <bdi>{position}</bdi>
              </p>
            </div>
            <div className="flex basis-full items-center justify-end gap-1 border-t border-line pt-2 sm:ms-auto sm:basis-auto sm:border-0 sm:pt-0">
              <QuietAction action={() => setBureauMemberActive(r, !r.isActive)} label={r.isActive ? t("hide") : t("show")}>
                {r.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </QuietAction>
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label={tc("actions.edit")} title={tc("actions.edit")}>
                <Pencil className="size-4" />
              </Button>
              <ConfirmButton action={() => deleteBureauMember(r.id)} size="icon-sm" title={t("deleteTitle")} description={t("deleteText")} confirmLabel={tc("actions.delete")} ariaLabel={tc("actions.delete")}>
                <Trash2 className="size-4 text-red-600" />
              </ConfirmButton>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
