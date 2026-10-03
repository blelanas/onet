import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { IdCard, Lock, Power, PowerOff } from "lucide-react";
import type { usersSettingsPage } from "@api/modules/settings/routes";
import { relativeTime } from "@onet/shared";
import { ROLE_KEYS } from "@onet/shared";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { setUserActive } from "@/api/settings";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ConfirmButton } from "@/components/ui/confirm-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { SettingsCard } from "@/components/settings/settings-card";
import { EditRolesButton, NewUserButton, ResetPasswordButton } from "@/components/settings/user-forms";

type Data = Loaded<typeof usersSettingsPage>;
type Row = Data["rows"][number];

/** /dashboard/settings/users */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("users"));
  return (
    <RequirePerm perm="users.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const sp = useSearchParamsObject();
  const query = useApi<Data>("/settings/users", sp);
  return <QueryView query={query}>{(data) => <UsersSettings data={data} sp={sp} />}</QueryView>;
}

function UsersSettings({ data, sp }: { data: Data; sp: Record<string, string | undefined> }) {
  const t = useTranslations("settings.users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { rows, total, page, pageSize, roles, canPrivileged } = data;
  const me = { id: data.meId };
  const roleOptions = roles;
  const roleLabel = (r: { key: string; name: string }) => ((ROLE_KEYS as readonly string[]).includes(r.key) ? tc(`roles.${r.key}`) : r.name);
  const manageable = (u: Row) => canPrivileged || !u.roles.some((r) => ["super_admin", "admin", "accountant"].includes(r.role.key));

  const actions = (u: Row) => {
    const isSelf = u.id === me.id;
    if (!manageable(u))
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted" title={t("lockedRole")}>
          <Lock className="size-3.5" />
        </span>
      );
    return (
      <span className="flex items-center justify-end gap-0.5">
        <EditRolesButton userId={u.id} userName={u.name} roles={roleOptions} selected={u.roles.map((r) => r.role.key)} canPrivileged={canPrivileged} isSelf={isSelf} />
        <ResetPasswordButton userId={u.id} userName={u.name} />
        {!isSelf &&
          (u.isActive ? (
            <ConfirmButton action={() => setUserActive(u.id, false)} size="icon-sm" ariaLabel={t("deactivate")} description={t("deactivateConfirm")} confirmLabel={t("deactivate")} successMessage="toast.saved">
              <PowerOff className="size-4 text-red-600" />
            </ConfirmButton>
          ) : (
            <ActionButton action={() => setUserActive(u.id, true)} variant="ghost" size="icon-sm" ariaLabel={t("activate")}>
              <Power className="size-4 text-emerald-600" />
            </ActionButton>
          ))}
      </span>
    );
  };

  const columns: Column<Row>[] = [
    {
      key: "user",
      header: t("columns.user"),
      cell: (u) => (
        <span className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatarUrl} className={u.isActive ? undefined : "grayscale"} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-bold text-ink">
              <span className="truncate">{u.name}</span>
              {u.id === me.id && <Badge tone="brand">{t("you")}</Badge>}
            </span>
            <span className="block truncate text-xs text-muted" dir="ltr">
              {u.email}
            </span>
          </span>
        </span>
      ),
    },
    { key: "roles", header: t("columns.roles"), cell: (u) => <span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r.role.id} color={r.role.color}>{roleLabel(r.role)}</Badge>)}</span> },
    { key: "status", header: t("columns.status"), cell: (u) => (u.isActive ? <Badge tone="success" dot>{t("active")}</Badge> : <Badge tone="neutral" dot>{t("inactive")}</Badge>) },
    { key: "last", header: t("columns.lastLogin"), hideBelow: "xl", cell: (u) => <span className="text-sm text-muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt, locale) : t("never")}</span> },
    {
      key: "member",
      header: "",
      hideBelow: "lg",
      cell: (u) =>
        u.member ? (
          <Link href={`/dashboard/members/${u.member.id}`} className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-bold whitespace-nowrap text-brand-600 hover:bg-brand-50 hover:text-brand-700" title={t("linkedMember")}>
            <IdCard className="size-4" /> <span className="sr-only">{t("linkedMember")}</span>
          </Link>
        ) : null,
    },
    { key: "actions", header: t("columns.actions"), align: "end", cell: actions },
  ];

  return (
    <SettingsCard title={t("title")} description={t("count", { count: total })} action={<NewUserButton roles={roleOptions} canPrivileged={canPrivileged} />}>
      <Toolbar>
        <SearchBox />
        <FilterSelect param="role" allLabel={t("allRoles")} options={roles.map((r) => ({ value: r.key, label: roleLabel(r) }))} />
        <FilterSelect param="status" allLabel={t("allStatuses")} options={[{ value: "active", label: t("active") }, { value: "inactive", label: t("inactive") }]} />
      </Toolbar>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(u) => u.id}
        empty={<EmptyState compact title={t("empty")} />}
        mobileCard={(u) => (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={u.name} src={u.avatarUrl} size="lg" className={u.isActive ? undefined : "grayscale"} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{u.name}</p>
                <p className="truncate text-xs text-muted" dir="ltr">
                  {u.email}
                </p>
              </div>
              {u.isActive ? <Badge tone="success" dot>{t("active")}</Badge> : <Badge tone="neutral" dot>{t("inactive")}</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r.role.id} color={r.role.color}>
                    {roleLabel(r.role)}
                  </Badge>
                ))}
              </span>
              {actions(u)}
            </div>
          </div>
        )}
      />
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/dashboard/settings/users" searchParams={sp} />
    </SettingsCard>
  );
}
