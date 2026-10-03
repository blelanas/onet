import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { visibleMemberIds } from "@/lib/auth/scope";

/**
 * Library scope, consistent with canAccessEntityDocs():
 *  - documents.manage → every document
 *  - otherwise: GENERAL + EVENT/TRIP/ACTIVITY (shared material) + documents of members the user
 *    can see + documents of invoices they pay (all invoices for finance staff).
 */
export async function documentScopeWhere(user: CurrentUser): Promise<Prisma.DocumentWhereInput> {
  if (user.permissions.has("documents.manage")) return {};
  if (!user.permissions.has("documents.read")) return { id: "__none__" };
  const or: Prisma.DocumentWhereInput[] = [{ entityType: { in: ["GENERAL", "EVENT", "TRIP", "ACTIVITY"] } }];
  const members = await visibleMemberIds(user);
  if (members === "all") or.push({ entityType: "MEMBER" });
  else if (members.length) or.push({ entityType: "MEMBER", entityId: { in: members } });
  if (user.permissions.has("finance.read")) or.push({ entityType: "INVOICE" });
  else if (user.memberId) {
    const invoices = await db.invoice.findMany({ where: { payerId: user.memberId }, select: { id: true } });
    if (invoices.length) or.push({ entityType: "INVOICE", entityId: { in: invoices.map((i) => i.id) } });
  }
  return { OR: or };
}

export type DocumentFilters = { q?: string; entityType?: string; category?: string; skip?: number; take?: number };

export async function listDocuments(user: CurrentUser, f: DocumentFilters) {
  const where: Prisma.DocumentWhereInput = {
    AND: [await documentScopeWhere(user), f.q ? { name: { contains: f.q } } : {}, f.entityType ? { entityType: f.entityType } : {}, f.category ? { category: f.category } : {}],
  };
  const [rows, total, byType] = await Promise.all([
    db.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: f.skip, take: f.take, include: { uploadedBy: { select: { name: true } } } }),
    db.document.count({ where }),
    db.document.groupBy({ by: ["entityType"], where: await documentScopeWhere(user), _count: { _all: true } }),
  ]);
  const entities = await resolveEntities(rows);
  return {
    rows: rows.map((d) => ({ ...d, entity: d.entityId ? (entities.get(`${d.entityType}:${d.entityId}`) ?? null) : null })),
    total,
    countsByType: Object.fromEntries(byType.map((b) => [b.entityType, b._count._all])) as Record<string, number>,
  };
}

/** Human label + link of the record a document is attached to. */
async function resolveEntities(rows: { entityType: string; entityId: string | null }[]) {
  const ids = (type: string) => [...new Set(rows.filter((r) => r.entityType === type && r.entityId).map((r) => r.entityId!))];
  const [members, events, trips, invoices, activities] = await Promise.all([
    db.member.findMany({ where: { id: { in: ids("MEMBER") } }, select: { id: true, firstName: true, lastName: true } }),
    db.event.findMany({ where: { id: { in: ids("EVENT") } }, select: { id: true, title: true } }),
    db.trip.findMany({ where: { id: { in: ids("TRIP") } }, select: { id: true, title: true } }),
    db.invoice.findMany({ where: { id: { in: ids("INVOICE") } }, select: { id: true, number: true } }),
    db.activity.findMany({ where: { id: { in: ids("ACTIVITY") } }, select: { id: true, title: true } }),
  ]);
  const map = new Map<string, { label: string; href: string }>();
  members.forEach((m) => map.set(`MEMBER:${m.id}`, { label: `${m.firstName} ${m.lastName}`, href: `/dashboard/members/${m.id}?tab=documents` }));
  events.forEach((e) => map.set(`EVENT:${e.id}`, { label: e.title, href: `/dashboard/events/${e.id}` }));
  trips.forEach((t) => map.set(`TRIP:${t.id}`, { label: t.title, href: `/dashboard/trips/${t.id}` }));
  invoices.forEach((i) => map.set(`INVOICE:${i.id}`, { label: i.number, href: `/dashboard/finance/invoices/${i.id}` }));
  activities.forEach((a) => map.set(`ACTIVITY:${a.id}`, { label: a.title, href: `/dashboard/activities/${a.id}` }));
  return map;
}
