import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { APP_TIME_ZONE } from "@onet/shared";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { param } from "@api/lib/http";
import { isStaffish } from "@api/modules/registrations/queries";
import { ACTIVE_KID_REG, canManageEditions, myTeams, onTeamWhere } from "./access";

/** Calendar year of an instant in Tunisian time. */
export function tunisYear(d: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, year: "numeric" }).format(d));
}

/** Default edition title: "تظاهرة الطفولة 16" for a festival, "نادي الأطفال 2026-2027" for a club season. */
export function defaultEditionTitle(series: { name: string; nameAr: string | null; kind: string }, editionNumber: number, seasonYear: number) {
  return series.kind === "FESTIVAL" ? `${series.nameAr || series.name} ${editionNumber}` : `${series.name} ${seasonYear}-${seasonYear + 1}`;
}

/** Editions (events) the user may see: managers all, others the non-draft public ones + those they are on a team of. */
export function editionVisibleWhere(user: CurrentUser): Prisma.EventWhereInput {
  if (canManageEditions(user)) return {};
  if (isStaffish(user)) return { status: { not: "DRAFT" } };
  return {
    status: { not: "DRAFT" },
    OR: [{ isPublic: true }, ...(user.memberId ? [{ teams: { some: onTeamWhere(user.memberId) } }] : [])],
  };
}

/** Kids of an edition: its non-cancelled registrations of CHILD members. */
export const KIDS_OF_EDITION: Prisma.EventRegistrationWhereInput = { ...ACTIVE_KID_REG, member: { type: "CHILD" } };

const seriesCardSelect = {
  id: true,
  name: true,
  nameAr: true,
  kind: true,
  description: true,
  coverUrl: true,
  color: true,
  sortOrder: true,
  isActive: true,
} satisfies Prisma.EventSeriesSelect;

const editionSummarySelect = {
  id: true,
  title: true,
  editionNumber: true,
  seasonYear: true,
  startAt: true,
  endAt: true,
  status: true,
  coverUrl: true,
  location: true,
} satisfies Prisma.EventSelect;

/** GET /series — active series as cards (+ how many events have no series, for the "other events" section). */
export async function seriesListPage(req: Request) {
  const user = await requirePermission("events.read");
  const manage = canManageEditions(user);
  const visible = editionVisibleWhere(user);
  const showInactive = manage && req.query.inactive === "1";
  const [rows, otherCount] = await Promise.all([
    db.eventSeries.findMany({
      where: showInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        ...seriesCardSelect,
        _count: { select: { editions: { where: visible } } },
        editions: { where: visible, orderBy: [{ startAt: "desc" }], take: 1, select: editionSummarySelect },
      },
    }),
    db.event.count({ where: { AND: [{ seriesId: null }, manage ? {} : isStaffish(user) ? { status: { not: "DRAFT" } } : { status: { not: "DRAFT" }, isPublic: true }] } }),
  ]);
  const series = rows.map(({ _count, editions, ...s }) => ({ ...s, editionsCount: _count.editions, latestEdition: editions[0] ?? null }));
  return { series, otherCount, manage };
}

/** GET /series/:id — the series and its editions grouped by season year (newest first). */
export async function seriesPage(req: Request) {
  const user = await requirePermission("events.read");
  const manage = canManageEditions(user);
  const s = await db.eventSeries.findUnique({
    where: { id: param(req, "id") },
    select: {
      ...seriesCardSelect,
      editions: {
        where: editionVisibleWhere(user),
        orderBy: [{ startAt: "desc" }],
        select: { ...editionSummarySelect, _count: { select: { teams: true, registrations: { where: KIDS_OF_EDITION } } } },
      },
    },
  });
  if (!s || (!s.isActive && !manage)) throw new AuthError("NOT_FOUND");
  const mine = new Set((await myTeams(user)).map((t) => t.eventId));
  const now = new Date();
  const { editions, ...series } = s;
  const rows = editions.map(({ _count, ...e }) => ({
    ...e,
    year: e.seasonYear ?? tunisYear(e.startAt),
    kidsCount: _count.registrations,
    teamsCount: _count.teams,
    isMine: mine.has(e.id),
    isCurrent: e.startAt <= now && e.endAt >= now,
    isPast: e.endAt < now,
  }));
  const byYear = new Map<number, typeof rows>();
  for (const e of rows) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
  const years = [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, editions: list }));
  return { series: { ...series, editionsCount: editions.length }, years, manage, next: manage ? await nextEditionDefaults(series) : null };
}

/** Prefill of the "new edition" form: next number, current season, default title, previous edition (for "copy teams"). */
export async function nextEditionDefaults(series: { id: string; name: string; nameAr: string | null; kind: string }) {
  const [max, previous] = await Promise.all([
    db.event.aggregate({ where: { seriesId: series.id }, _max: { editionNumber: true } }),
    db.event.findFirst({
      where: { seriesId: series.id },
      orderBy: [{ startAt: "desc" }],
      select: { id: true, title: true, editionNumber: true, _count: { select: { teams: true } } },
    }),
  ]);
  const editionNumber = (max._max.editionNumber ?? 0) + 1;
  const seasonYear = tunisYear();
  return {
    editionNumber,
    seasonYear,
    title: defaultEditionTitle(series, editionNumber, seasonYear),
    previous: previous ? { id: previous.id, title: previous.title, editionNumber: previous.editionNumber, teamsCount: previous._count.teams } : null,
  };
}

/** GET /series/:id/form — series edit form (admins). */
export async function seriesFormPage(req: Request) {
  await requirePermission("events.manage");
  const s = await db.eventSeries.findUnique({ where: { id: param(req, "id") }, select: seriesCardSelect });
  if (!s) throw new AuthError("NOT_FOUND");
  return s;
}

/** Light list for filters (kids directory, forms). */
export async function seriesOptions() {
  return db.eventSeries.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, nameAr: true, color: true, kind: true, isActive: true } });
}
