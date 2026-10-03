import { getLocale, getTranslations } from "next-intl/server";
import { Download, Mail, Phone, Plus } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { MEMBER_TYPES, MEMBERSHIP_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { ageFrom } from "@/lib/utils";
import { listMembers, groupOptions } from "@/server/members/queries";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, paging } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ImportMembersButton } from "./import-button";

type Row = Awaited<ReturnType<typeof listMembers>>["rows"][number];
type SP = Record<string, string | string[] | undefined>;

/** Shared directory used by /members, /children, /parents and /monitors. */
export async function MemberDirectory({ user, fixedType, basePath, searchParams }: { user: CurrentUser; fixedType?: string; basePath: string; searchParams: SP }) {
  const t = await getTranslations("people");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const str = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined);
  const { page, pageSize, skip, take } = paging(searchParams, 15);
  const filters = { q: str("q"), type: fixedType ?? str("type"), status: str("status"), groupId: str("group"), sort: str("sort") };
  const [{ rows, total }, groups] = await Promise.all([listMembers(user, { ...filters, skip, take }), groupOptions()]);
  const canManage = can(user, "members.manage");
  const showGroup = !fixedType || fixedType === "CHILD";

  const qs = new URLSearchParams(Object.entries({ ...filters, group: filters.groupId }).filter(([k, v]) => v && k !== "groupId" && k !== "sort") as [string, string][]).toString();

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: t("columns.member"),
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">
              {m.firstName} {m.lastName}
            </span>
            <span className="block truncate text-xs text-muted" dir={m.firstNameAr ? "rtl" : undefined}>
              {m.firstNameAr ? `${m.firstNameAr} ${m.lastNameAr ?? ""}` : m.membershipNumber}
            </span>
          </span>
        </span>
      ),
    },
    ...(!fixedType ? [{ key: "type", header: t("columns.type"), cell: (m: Row) => <Badge tone={m.type === "CHILD" ? "warning" : m.type === "PARENT" ? "violet" : m.type === "MONITOR" ? "info" : "neutral"}>{tc(`enums.memberType.${m.type}`)}</Badge> }] : []),
    ...(fixedType === "CHILD" || !fixedType ? [{ key: "age", header: t("columns.age"), hideBelow: "lg" as const, cell: (m: Row) => (m.dateOfBirth ? tc("fields.years", { count: ageFrom(m.dateOfBirth) ?? 0 }) : "—") }] : []),
    ...(showGroup
      ? [{ key: "group", header: t("columns.group"), cell: (m: Row) => (m.group ? <Badge color={m.group.color}>{m.group.name}</Badge> : m.monitoredGroups.length ? <span className="flex flex-wrap gap-1">{m.monitoredGroups.map((g) => <Badge key={g.groupId} color={g.group.color}>{g.group.name}</Badge>)}</span> : <span className="text-muted">—</span>) }]
      : []),
    ...(fixedType === "CHILD"
      ? [{ key: "parents", header: t("columns.parents"), hideBelow: "lg" as const, cell: (m: Row) => <span className="text-sm text-ink-2">{m.parentLinks.map((p) => `${p.parent.firstName} ${p.parent.lastName}`).join(", ") || "—"}</span> }]
      : []),
    ...(fixedType === "PARENT"
      ? [{ key: "children", header: t("columns.children"), cell: (m: Row) => (m.childrenLinks.length ? <span className="flex items-center gap-2"><AvatarStack people={m.childrenLinks.map((c) => c.child)} /><span className="text-xs text-muted">{m.childrenLinks.map((c) => c.child.firstName).join(", ")}</span></span> : "—") }]
      : []),
    ...(fixedType === "MONITOR"
      ? [{ key: "groups", header: t("columns.groups"), cell: (m: Row) => <span className="flex flex-wrap gap-1">{m.monitoredGroups.map((g) => <Badge key={g.groupId} color={g.group.color}>{g.group.name}</Badge>)}</span> }]
      : []),
    ...(fixedType !== "CHILD"
      ? [{ key: "contact", header: t("columns.contact"), hideBelow: "xl" as const, cell: (m: Row) => <span className="space-y-0.5 text-xs text-ink-2">{m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="size-3" /> {m.phone}</span>}{m.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {m.email}</span>}</span> }]
      : []),
    { key: "since", header: t("columns.since"), hideBelow: "xl", cell: (m) => <span className="text-sm text-muted">{formatDate(m.membershipDate, locale)}</span> },
    { key: "status", header: t("columns.status"), cell: (m) => <StatusBadge status={m.membershipStatus} /> },
  ];

  return (
    <>
      <Toolbar>
        <SearchBox />
        {!fixedType && <FilterSelect param="type" allLabel={t("filters.allTypes")} options={MEMBER_TYPES.map((v) => ({ value: v, label: tc(`enums.memberType.${v}`) }))} />}
        {showGroup && <FilterSelect param="group" allLabel={t("filters.allGroups")} options={groups.map((g) => ({ value: g.id, label: g.name }))} />}
        <FilterSelect param="status" allLabel={t("filters.allStatuses")} options={MEMBERSHIP_STATUSES.map((v) => ({ value: v, label: tc(`status.${v}`) }))} />
        <FilterSelect param="sort" allLabel={t("filters.sortName")} label={t("filters.sort")} options={[{ value: "recent", label: t("filters.sortRecent") }, { value: "age", label: t("filters.sortAge") }]} />
        <div className="flex gap-2 sm:ms-auto">
          {can(user, "members.export") && (
            <a href={`/api/members/export?${qs}`} className={buttonClasses("outline", "md")}>
              <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
            </a>
          )}
          {canManage && <ImportMembersButton />}
          {canManage && (
            <LinkButton href={`/dashboard/members/new${fixedType ? `?type=${fixedType}` : ""}`}>
              <Plus className="size-4" /> {t(`new.${fixedType ?? "MEMBER"}`)}
            </LinkButton>
          )}
        </div>
      </Toolbar>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(m) => m.id}
        rowHref={(m) => `/dashboard/members/${m.id}`}
        mobileCard={(m) => (
          <div className="flex items-center gap-3">
            <Avatar firstName={m.firstName} lastName={m.lastName} src={m.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">
                {m.firstName} {m.lastName}
              </p>
              <p className="text-xs text-muted">
                {tc(`enums.memberType.${m.type}`)}
                {m.dateOfBirth && ` · ${tc("fields.years", { count: ageFrom(m.dateOfBirth) ?? 0 })}`}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.group && <Badge color={m.group.color}>{m.group.name}</Badge>}
                <StatusBadge status={m.membershipStatus} />
              </div>
            </div>
          </div>
        )}
        empty={
          <div className="card">
            <EmptyState
              title={t("empty.title")}
              description={t("empty.description")}
              action={canManage ? <LinkButton href={`/dashboard/members/new${fixedType ? `?type=${fixedType}` : ""}`}><Plus className="size-4" /> {t(`new.${fixedType ?? "MEMBER"}`)}</LinkButton> : undefined}
            />
          </div>
        }
      />
      <Pagination page={page} pageSize={pageSize} total={total} basePath={basePath} searchParams={searchParams} />
    </>
  );
}
