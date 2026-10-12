import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { EVENT_CATEGORIES, SERIES_KINDS } from "@api/lib/constants";
import { defaultEditionTitle, tunisYear } from "./series";
import { syncTeamChat } from "./team-chat";
import { TEAM_ELIGIBLE } from "./teams";

/** The (seriesId, editionNumber) unique index refused a row: that number is already taken in the series. */
export function isEditionNumberClash(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && JSON.stringify(e.meta ?? {}).includes("editionNumber");
}

/** "#12924A"-style colour (empty → the default green). */
export const hexColor = z.preprocess((v) => (v === "" || v == null ? "#12924A" : String(v).trim()), z.string().regex(/^#[0-9a-fA-F]{6}$/, "errors.validation"));

/** Checkbox that may be absent: undefined stays undefined (keep the current value). Forms send a hidden "0" before the box. */
const optBool = z.preprocess((v) => (v === undefined || v === null || v === "" ? undefined : v === true || v === "true" || v === "on" || v === "1"), z.boolean().optional());

const seriesSchema = z.object({
  id: zs.optId,
  name: zs.reqStr(120),
  nameAr: zs.optStr,
  kind: z.enum(SERIES_KINDS),
  description: zs.optStr,
  coverUrl: zs.optStr,
  color: hexColor,
  sortOrder: zs.optInt,
  isActive: optBool,
});

/** Create / update a series (admins). */
export async function saveSeries(fd: FormData | Record<string, unknown>) {
  return runAction(seriesSchema, formToObject(fd), async ({ id, ...d }) => {
    const user = await requirePermission("events.manage");
    const data = {
      name: d.name,
      nameAr: d.nameAr ?? null,
      kind: d.kind,
      description: d.description ?? null,
      coverUrl: d.coverUrl ?? null,
      color: d.color,
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    };
    if (id && !(await db.eventSeries.findUnique({ where: { id }, select: { id: true } }))) throw new ActionError("errors.notFound");
    const s = id ? await db.eventSeries.update({ where: { id }, data }) : await db.eventSeries.create({ data });
    await audit(user.id, id ? "update" : "create", "EventSeries", s.id, { name: s.name, kind: s.kind });
    return { id: s.id };
  });
}

/** Delete a series — refused while it still has editions (errors.inUse). */
export async function deleteSeries(id: string) {
  return runAction(zs.id, id, async (seriesId) => {
    const user = await requirePermission("events.manage");
    const s = await db.eventSeries.findUnique({ where: { id: seriesId }, select: { name: true, _count: { select: { editions: true } } } });
    if (!s) throw new ActionError("errors.notFound");
    if (s._count.editions > 0) throw new ActionError("errors.inUse");
    await db.eventSeries.delete({ where: { id: seriesId } });
    await audit(user.id, "delete", "EventSeries", seriesId, { name: s.name });
  });
}

const editionSchema = z
  .object({
    seriesId: zs.id,
    editionNumber: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(9999).optional()),
    seasonYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1990).max(2100).optional()),
    title: zs.optStr,
    startAt: zs.reqDate,
    endAt: zs.reqDate,
    location: zs.optStr,
    description: zs.optStr,
    coverUrl: zs.optStr,
    category: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(EVENT_CATEGORIES).optional()),
    capacity: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
    isPublic: optBool,
    copyTeams: zs.bool,
  })
  .refine((d) => d.endAt >= d.startAt, { path: ["endAt"], message: "errors.validation" })
  .refine((d) => !d.title || d.title.length <= 160, { path: ["title"], message: "errors.validation" });

/**
 * POST /series/:id/editions — creates the next edition (an Event of the series): number = max + 1 unless
 * given, season = current year unless given, title from the series kind unless given. `copyTeams` copies
 * the previous edition's teams (name, colour, leader, members — not the kids) with fresh group chats.
 */
export async function createEdition(fd: FormData | Record<string, unknown>) {
  return runAction(editionSchema, formToObject(fd), async (d) => {
    const user = await requirePermission("events.manage");
    const series = await db.eventSeries.findUnique({ where: { id: d.seriesId }, select: { id: true, name: true, nameAr: true, kind: true } });
    if (!series) throw new ActionError("errors.notFound");
    const max = await db.event.aggregate({ where: { seriesId: series.id }, _max: { editionNumber: true } });
    const editionNumber = d.editionNumber ?? (max._max.editionNumber ?? 0) + 1;
    if (d.editionNumber && (await db.event.count({ where: { seriesId: series.id, editionNumber: d.editionNumber } }))) throw new ActionError("errors.inUse");
    const seasonYear = d.seasonYear ?? tunisYear();
    const title = d.title ?? defaultEditionTitle(series, editionNumber, seasonYear);
    // The edition the teams are copied from: the closest lower number, else the most recent one.
    const previous = d.copyTeams
      ? ((await db.event.findFirst({ where: { seriesId: series.id, editionNumber: { lt: editionNumber } }, orderBy: { editionNumber: "desc" }, select: { id: true } })) ??
        (await db.event.findFirst({ where: { seriesId: series.id }, orderBy: { startAt: "desc" }, select: { id: true } })))
      : null;

    // Two concurrent creations may pick the same number: the unique index refuses the second one.
    const result = await db.$transaction(async (tx) => {
      const e = await tx.event.create({
        data: {
          seriesId: series.id,
          editionNumber,
          seasonYear,
          title,
          description: d.description ?? null,
          coverUrl: d.coverUrl ?? null,
          category: d.category ?? "CHILDREN",
          startAt: d.startAt,
          endAt: d.endAt,
          location: d.location ?? null,
          organizer: "ONET Teboulba",
          capacity: d.capacity ?? 100,
          price: 0,
          requiresPayment: false,
          status: "PUBLISHED",
          isPublic: d.isPublic ?? true,
        },
      });
      let copied = 0;
      if (previous) {
        const teams = await tx.eventTeam.findMany({ where: { eventId: previous.id }, orderBy: { createdAt: "asc" }, select: { name: true, color: true, leaderId: true, members: { select: { memberId: true } } } });
        // People suspended (or whose login was disabled) since the previous edition are not carried over.
        const ids = [...new Set(teams.flatMap((t) => [...(t.leaderId ? [t.leaderId] : []), ...t.members.map((m) => m.memberId)]))];
        const ok = new Set((await tx.member.findMany({ where: { id: { in: ids }, ...TEAM_ELIGIBLE }, select: { id: true } })).map((m) => m.id));
        for (const t of teams) {
          const leaderId = t.leaderId && ok.has(t.leaderId) ? t.leaderId : null;
          const team = await tx.eventTeam.create({
            data: { eventId: e.id, name: t.name, color: t.color, leaderId, members: { create: t.members.filter((m) => m.memberId !== leaderId && ok.has(m.memberId)).map((m) => ({ memberId: m.memberId })) } },
          });
          await syncTeamChat(tx, team.id, user.id);
          copied++;
        }
      }
      return { id: e.id, copied };
    }).catch((e: unknown) => {
      if (isEditionNumberClash(e)) throw new ActionError("errors.inUse");
      throw e;
    });
    await audit(user.id, "create", "Event", result.id, { title, seriesId: series.id, editionNumber, seasonYear, copiedTeams: result.copied });
    return { id: result.id, editionNumber, seasonYear, title, copiedTeams: result.copied };
  });
}
