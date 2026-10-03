import { useLocale, useTranslations } from "use-intl";
import { Download, Mail, Phone, Plus } from "lucide-react";
import type { membersPage } from "@api/modules/members/routes";
import { can, useMe } from "@/lib/auth";
import { download } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useSearchParamsObject } from "@/lib/router";
import type { Loaded } from "@/lib/types";
import { QueryView } from "@/components/states/page-state";
import { MEMBER_TYPES, MEMBERSHIP_STATUSES } from "@onet/shared";
import { formatDate } from "@onet/shared";
import { ageFrom } from "@/lib/utils";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect, SearchBox, Toolbar } from "@/components/ui/toolbar";
import { ImportMembersButton } from "./import-button";

type Data = Loaded<typeof membersPage>;
type Row = Data["rows"][number];

/** Shared directory used by /members, /children, /parents and /monitors. */
export function MemberDirectory({ fixedType, basePath }: { fixedType?: string; basePath: string }) {
  const searchParams = useSearchParamsObject();
  const query = useApi<Data>("/members", { ...searchParams, type: fixedType ?? searchParams.type });
  return <QueryView query={query}>{(data) => <Directory data={data} fixedType={fixedType} basePath={basePath} searchParams={searchParams} />}</QueryView>;
}

function Directory({ data, fixedType, basePath, searchParams }: { data: Data; fixedType?: string; basePath: string; searchParams: Record<string, string | undefined> }) {
  const user = useMe();
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { rows, total, groups, page, pageSize } = data;
  const filters = { q: searchParams.q, type: fixedType ?? searchParams.type, status: searchParams.status, groupId: searchParams.group, sort: searchParams.sort };
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
            <Button variant="outline" onClick={() => download("/members/export.csv", Object.fromEntries(new URLSearchParams(qs)))}>
              <Download className="size-4" /> <span className="hidden sm:inline">{tc("actions.exportCsv")}</span>
            </Button>
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
