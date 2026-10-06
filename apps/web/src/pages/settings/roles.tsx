import { useTranslations } from "use-intl";
import { Link } from "@/lib/router";
import { Lock, ShieldCheck, Trash2 } from "lucide-react";
import type { rolesSettingsPage } from "@api/modules/settings/routes";
import { ROLE_KEYS } from "@onet/shared";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/query";
import { useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { deleteRole } from "@/api/settings";
import { QueryView } from "@/components/states/page-state";
import { RequirePerm } from "@/components/states/guards";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { NewRoleButton, PermissionToggle } from "@/components/settings/role-forms";

type Data = Loaded<typeof rolesSettingsPage>;

/** /dashboard/settings/roles (?role=<key> picks the role shown on phones) */
export function Component() {
  const tn = useTranslations("settings.nav");
  usePageTitle(tn("roles"));
  return (
    <RequirePerm perm="roles.manage">
      <Page />
    </RequirePerm>
  );
}

function Page() {
  const query = useApi<Data>("/settings/roles");
  return <QueryView query={query}>{(data) => <RolesSettings data={data} />}</QueryView>;
}

function RolesSettings({ data }: { data: Data }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { roles, permissions } = data;
  const roleParam = useSearchParams().get("role") ?? undefined;

  const roleLabel = (r: { key: string; name: string }) => ((ROLE_KEYS as readonly string[]).includes(r.key) ? tc(`roles.${r.key}`) : r.name);
  const permLabel = (key: string) => (t.has(`perms.${key}`) ? t(`perms.${key}`) : key);
  const moduleLabel = (m: string) => (t.has(`modules.${m}`) ? t(`modules.${m}`) : m);
  const grants = new Map(roles.map((r) => [r.id, new Set(r.permissions.map((p) => p.permission.key))]));
  const modules = [...new Set(permissions.map((p) => p.module))].map((m) => ({ module: m, perms: permissions.filter((p) => p.module === m) }));
  const mobileRole = roles.find((r) => r.key === roleParam) ?? roles.find((r) => r.key !== "super_admin") ?? roles[0];

  return (
    <div className="space-y-5">
      <SettingsCard title={t("roles.title")} description={t("roles.intro")} action={<NewRoleButton roles={roles.map((r) => ({ id: r.id, key: r.key, label: roleLabel(r) }))} />}>
        <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {roles.map((r) => (
            <li key={r.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-line p-3.5 ps-4">
              <span className="absolute inset-y-0 start-0 w-1" style={{ background: r.color }} aria-hidden />
              <div className="flex items-start gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `${r.color}1A`, color: r.color }}>
                  <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold leading-tight text-ink">{roleLabel(r)}</p>
                  <p className="font-mono text-[11px] text-muted" dir="ltr">
                    {r.key}
                  </p>
                </div>
                {!r.isSystem && r._count.users === 0 && (
                  <ConfirmButton action={() => deleteRole(r.id)} size="icon-sm" ariaLabel={t("roles.deleteRole")} description={t("roles.deleteHint")}>
                    <Trash2 className="size-4 text-red-600" />
                  </ConfirmButton>
                )}
              </div>
              {r.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink-2">{r.description}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5 text-xs font-semibold text-muted">
                {r.isSystem ? <Badge tone="neutral">{t("roles.system")}</Badge> : <Badge tone="violet">{t("roles.custom")}</Badge>}
                <span>
                  {t("roles.users", { count: r._count.users })} · {t("roles.permissions", { count: r.key === "super_admin" ? permissions.length : r.permissions.length })}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Lock className="size-3.5" /> {t("roles.locked")}
        </p>
      </SettingsCard>

      {/* Desktop: full matrix */}
      <section className="card hidden overflow-hidden lg:block">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20">
              <tr>
                <th scope="col" className="sticky start-0 z-30 min-w-64 border-b border-line bg-surface-2 px-4 py-3 text-start text-xs font-extrabold tracking-wide text-muted uppercase">
                  {t("roles.permission")}
                </th>
                {roles.map((r) => (
                  <th key={r.id} scope="col" className="border-b border-line bg-surface-2 px-2 py-3 text-center">
                    <span className="inline-flex max-w-24 flex-col items-center gap-1">
                      <span className="size-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="text-xs leading-tight font-extrabold text-ink">{roleLabel(r)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <ModuleRows key={m.module} label={moduleLabel(m.module)} span={roles.length + 1}>
                  {m.perms.map((p) => (
                    <tr key={p.id} className="group">
                      <th scope="row" className="sticky start-0 z-10 border-b border-line bg-surface px-4 py-2 text-start font-normal group-hover:bg-brand-50/40">
                        <span className="block text-sm font-semibold text-ink">{permLabel(p.key)}</span>
                        <span className="block font-mono text-[11px] text-muted" dir="ltr">
                          {p.key}
                        </span>
                      </th>
                      {roles.map((r) => (
                        <td key={r.id} className="border-b border-line px-2 py-2 text-center group-hover:bg-brand-50/40">
                          <span className="inline-grid">
                            <PermissionToggle roleId={r.id} permission={p.key} granted={r.key === "super_admin" || grants.get(r.id)!.has(p.key)} disabled={r.key === "super_admin"} color={r.color} label={`${roleLabel(r)} — ${p.key}`} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </ModuleRows>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Phones / tablets: one role at a time */}
      <section className="space-y-4 lg:hidden">
        <div>
          <p className="mb-2 text-sm font-bold text-ink-2">{t("roles.pickRole")}</p>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {roles.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/settings/roles?role=${r.key}`}
                scroll={false}
                className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition", r.id === mobileRole?.id ? "border-transparent text-white shadow-sm" : "border-line bg-surface text-ink-2")}
                style={r.id === mobileRole?.id ? { background: r.color } : undefined}
              >
                {r.id !== mobileRole?.id && <span className="size-2 rounded-full" style={{ background: r.color }} />}
                {roleLabel(r)}
              </Link>
            ))}
          </div>
        </div>
        {mobileRole &&
          modules.map((m) => (
            <div key={m.module} className="card p-3">
              <h3 className="px-1 pb-2 text-xs font-extrabold tracking-wide text-muted uppercase">{moduleLabel(m.module)}</h3>
              <ul className="divide-y divide-line">
                {m.perms.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{permLabel(p.key)}</span>
                      <span className="block font-mono text-[11px] text-muted" dir="ltr">
                        {p.key}
                      </span>
                    </span>
                    <PermissionToggle
                      roleId={mobileRole.id}
                      permission={p.key}
                      granted={mobileRole.key === "super_admin" || grants.get(mobileRole.id)!.has(p.key)}
                      disabled={mobileRole.key === "super_admin"}
                      color={mobileRole.color}
                      label={`${roleLabel(mobileRole)} — ${p.key}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>
    </div>
  );
}

function ModuleRows({ label, span, children }: { label: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <th colSpan={span} scope="colgroup" className="sticky start-0 border-b border-line bg-canvas px-4 pt-4 pb-2 text-start text-xs font-extrabold tracking-wide text-brand-700 uppercase">
          {label}
        </th>
      </tr>
      {children}
    </>
  );
}
