import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { ageFrom } from "@onet/shared";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { AuthError, requirePermission } from "@api/lib/auth/guards";
import { param, qs } from "@api/lib/http";
import { memberSearchWhere } from "@api/modules/members/queries";
import { ACTIVE_KID_REG, assertCanSeeKids, canEditKid, kidScopeWhere, memberViewScope, myEditionIds, seesAllKids } from "@api/modules/events/access";
import { getEvent } from "@api/modules/events/queries";
import { editionVisibleWhere, seriesOptions, tunisYear } from "@api/modules/events/series";

/** Primary guardian first (then the oldest link): the parent contact shown on kid cards. */
const guardianInclude = {
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  take: 1,
  select: { relation: true, parent: { select: { id: true, firstName: true, lastName: true, phone: true, userId: true } } },
} satisfies Prisma.Member$parentLinksArgs;

const kidSelect = {
  id: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  photoUrl: true,
  dateOfBirth: true,
  gender: true,
  medicalNotes: true,
  membershipNumber: true,
  parentLinks: guardianInclude,
} satisfies Prisma.MemberSelect;

type KidRow = Prisma.MemberGetPayload<{ select: typeof kidSelect }>;

function guardianOf(m: KidRow) {
  const g = m.parentLinks[0];
  return g ? { id: g.parent.id, firstName: g.parent.firstName, lastName: g.parent.lastName, name: `${g.parent.firstName} ${g.parent.lastName}`, phone: g.parent.phone, relation: g.relation, hasLogin: !!g.parent.userId } : null;
}

function kidCard(m: KidRow) {
  const { parentLinks: _p, medicalNotes: _m, ...rest } = m;
  return { ...rest, age: ageFrom(m.dateOfBirth) };
}

// ───────────── Kids of one edition ─────────────

export type EditionKidFilters = { q?: string; teamId?: string };

export async function editionKids(eventId: string, f: EditionKidFilters = {}) {
  const regs = await db.eventRegistration.findMany({
    where: {
      eventId,
      ...ACTIVE_KID_REG,
      member: { type: "CHILD", ...memberSearchWhere(f.q) },
      ...(f.teamId === "none" ? { teamId: null } : f.teamId ? { teamId: f.teamId } : {}),
    },
    orderBy: [{ member: { firstName: "asc" } }, { member: { lastName: "asc" } }],
    select: { id: true, status: true, createdAt: true, team: { select: { id: true, name: true, color: true } }, member: { select: kidSelect } },
  });
  return regs.map((r) => ({
    registrationId: r.id,
    status: r.status,
    createdAt: r.createdAt,
    member: kidCard(r.member),
    team: r.team,
    guardian: guardianOf(r.member),
    medicalNotes: r.member.medicalNotes,
  }));
}

/** GET /events/:id/kids — kids of an edition (admins, and the members on one of its teams). */
export async function editionKidsPage(req: Request) {
  const user = await requirePermission("events.read");
  const id = param(req, "id");
  const e = await getEvent(user, id);
  const access = await assertCanSeeKids(user, id);
  const [rows, teams, total] = await Promise.all([
    editionKids(id, { q: qs(req, "q"), teamId: qs(req, "teamId") }),
    db.eventTeam.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, color: true, leaderId: true } }),
    db.eventRegistration.count({ where: { eventId: id, ...ACTIVE_KID_REG, member: { type: "CHILD" } } }),
  ]);
  return {
    edition: { id: e.id, title: e.title, editionNumber: e.editionNumber, seasonYear: e.seasonYear, series: e.series },
    rows,
    total,
    teams,
    canManage: access.manageKids,
    isAdmin: access.manage,
  };
}

type KidCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  photoUrl: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  membershipNumber: string | null;
  guardianName: string | null;
  lastEdition: { title: string; seasonYear: number | null } | null;
};

/**
 * GET /events/:id/kids/candidates?q= — existing kids (not yet in the edition) to add. The search covers every
 * kid: edition leaders only get the names and age (enough to pick the right one); photo, birth date, gender,
 * guardian and past editions are for the admins who see every kid.
 */
export async function kidCandidatesPage(req: Request) {
  const user = await requirePermission("events.read");
  const id = param(req, "id");
  await getEvent(user, id);
  const access = await assertCanSeeKids(user, id);
  if (!access.manageKids) throw new AuthError("FORBIDDEN");
  const q = qs(req, "q")?.trim();
  if (!q || q.length < 2) return { rows: [] as KidCandidate[] };
  const kids = await db.member.findMany({
    where: { type: "CHILD", ...memberSearchWhere(q), eventRegistrations: { none: { eventId: id, ...ACTIVE_KID_REG } } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 20,
    select: {
      ...kidSelect,
      eventRegistrations: { where: { ...ACTIVE_KID_REG, event: { seriesId: { not: null } } }, orderBy: { event: { startAt: "desc" } }, take: 1, select: { event: { select: { title: true, seasonYear: true } } } },
    },
  });
  const full = seesAllKids(user);
  const rows: KidCandidate[] = kids.map((k) => {
    const age = ageFrom(k.dateOfBirth);
    if (!full) return { id: k.id, firstName: k.firstName, lastName: k.lastName, age, photoUrl: null, dateOfBirth: null, gender: null, membershipNumber: null, guardianName: null, lastEdition: null };
    // Never the parent phone number here (only the name, to tell homonyms apart).
    return {
      id: k.id,
      firstName: k.firstName,
      lastName: k.lastName,
      age,
      photoUrl: k.photoUrl,
      dateOfBirth: k.dateOfBirth,
      gender: k.gender,
      membershipNumber: k.membershipNumber,
      guardianName: guardianOf(k)?.name ?? null,
      lastEdition: k.eventRegistrations[0]?.event ?? null,
    };
  });
  return { rows };
}

// ───────────── Global kids directory ─────────────

export type KidFilters = { q?: string; seriesId?: string; eventId?: string; year?: number; teamId?: string; skip?: number; take?: number };

function kidsWhere(user: CurrentUser, f: KidFilters): Prisma.MemberWhereInput {
  const reg: Prisma.EventRegistrationWhereInput = {
    ...ACTIVE_KID_REG,
    ...(f.eventId ? { eventId: f.eventId } : {}),
    ...(f.teamId ? { teamId: f.teamId } : {}),
    ...(f.seriesId || f.year ? { event: { ...(f.seriesId ? { seriesId: f.seriesId } : {}), ...(f.year ? { seasonYear: f.year } : {}) } } : {}),
  };
  const filtered = f.eventId || f.teamId || f.seriesId || f.year;
  return { AND: [{ type: "CHILD" }, kidScopeWhere(user), memberSearchWhere(f.q), filtered ? { eventRegistrations: { some: reg } } : {}] };
}

const directorySelect = {
  ...kidSelect,
  eventRegistrations: {
    where: { ...ACTIVE_KID_REG, event: { seriesId: { not: null } } },
    orderBy: { event: { startAt: "desc" } },
    take: 1,
    select: { event: { select: { id: true, title: true, editionNumber: true, seasonYear: true, startAt: true, series: { select: { id: true, name: true, nameAr: true, color: true } } } }, team: { select: { id: true, name: true, color: true } } },
  },
  _count: { select: { eventRegistrations: { where: { ...ACTIVE_KID_REG, event: { seriesId: { not: null } } } } } },
} satisfies Prisma.MemberSelect;

export async function listKids(user: CurrentUser, f: KidFilters) {
  const where = kidsWhere(user, f);
  const [rows, total] = await Promise.all([
    db.member.findMany({ where, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], skip: f.skip, take: f.take, select: directorySelect }),
    db.member.count({ where }),
  ]);
  return {
    rows: rows.map((m) => {
      const latest = m.eventRegistrations[0];
      return {
        member: kidCard(m),
        guardian: guardianOf(m),
        medicalNotes: m.medicalNotes,
        latestEdition: latest ? { ...latest.event, year: latest.event.seasonYear ?? tunisYear(latest.event.startAt), team: latest.team } : null,
        editionsCount: m._count.eventRegistrations,
      };
    }),
    total,
  };
}

export function kidFilters(req: Request): KidFilters {
  const year = Number(qs(req, "year"));
  return { q: qs(req, "q"), seriesId: qs(req, "seriesId"), eventId: qs(req, "eventId"), teamId: qs(req, "teamId"), year: Number.isInteger(year) && year > 1900 ? year : undefined };
}

const PAGE_SIZE = 24;

/**
 * GET /kids — CHILD members (scoped like the edition kids lists) with filters and the options to filter by.
 * Filter options: everything for the admins who see every kid; others get the active series, the editions
 * they may see (non-draft, public or with a team of theirs) and the teams of those editions.
 */
export async function kidsPage(req: Request) {
  const user = await requirePermission("members.read");
  const f = kidFilters(req);
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const all = seesAllKids(user);
  const visibleEditions: Prisma.EventWhereInput = all ? {} : editionVisibleWhere(user);
  const [{ rows, total }, series, editions, teams] = await Promise.all([
    listKids(user, { ...f, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    seriesOptions().then((list) => (all ? list : list.filter((s) => s.isActive))),
    db.event.findMany({
      where: { AND: [{ seriesId: f.seriesId ? f.seriesId : { not: null } }, visibleEditions, all ? {} : { series: { isActive: true } }] },
      orderBy: [{ startAt: "desc" }],
      select: { id: true, title: true, editionNumber: true, seasonYear: true, startAt: true, seriesId: true },
    }),
    f.eventId
      ? db.eventTeam.findMany({ where: { eventId: f.eventId, event: visibleEditions }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, color: true } })
      : Promise.resolve([]),
  ]);
  const years = [...new Set(editions.map((e) => e.seasonYear ?? tunisYear(e.startAt)))].sort((a, b) => b - a);
  return { rows, total, page, pageSize: PAGE_SIZE, series, editions, years, teams, seesAll: seesAllKids(user), canExport: true };
}

// ───────────── Kid history ─────────────

/**
 * Event registrations (grouped by season year, newest first) and trips of a kid. `onlyEditions`: restricts
 * the history to these editions, without trips (a kid seen only through an edition team).
 */
export async function kidHistory(kidId: string, onlyEditions?: Set<string>) {
  const kid = await db.member.findUnique({ where: { id: kidId }, select: { id: true, firstName: true, lastName: true, photoUrl: true, dateOfBirth: true, type: true } });
  if (!kid) throw new AuthError("NOT_FOUND");
  const [regs, trips] = await Promise.all([
    db.eventRegistration.findMany({
      where: { memberId: kidId, ...ACTIVE_KID_REG, ...(onlyEditions ? { eventId: { in: [...onlyEditions] } } : {}) },
      select: {
        id: true,
        status: true,
        team: { select: { id: true, name: true, color: true } },
        event: {
          select: {
            id: true,
            title: true,
            editionNumber: true,
            seasonYear: true,
            startAt: true,
            endAt: true,
            location: true,
            series: { select: { id: true, name: true, nameAr: true, kind: true, color: true } },
          },
        },
      },
    }),
    db.tripRegistration.findMany({
      where: { memberId: kidId, status: { not: "CANCELLED" }, ...(onlyEditions ? { id: { in: [] } } : {}) }, // team view: no trips
      select: { id: true, status: true, trip: { select: { id: true, title: true, destination: true, departAt: true, returnAt: true } } },
    }),
  ]);
  type Year = { year: number; editions: (typeof regs)[number][]; trips: (typeof trips)[number][] };
  const years = new Map<number, Year>();
  const at = (y: number) => years.get(y) ?? years.set(y, { year: y, editions: [], trips: [] }).get(y)!;
  for (const r of regs) at(r.event.seasonYear ?? tunisYear(r.event.startAt)).editions.push(r);
  for (const t of trips) at(tunisYear(t.trip.departAt)).trips.push(t);
  const list = [...years.values()].sort((a, b) => b.year - a.year);
  for (const y of list) {
    y.editions.sort((a, b) => +b.event.startAt - +a.event.startAt);
    y.trips.sort((a, b) => +b.trip.departAt - +a.trip.departAt);
  }
  return {
    kid: { ...kid, age: ageFrom(kid.dateOfBirth) },
    years: list,
    stats: { editions: regs.filter((r) => r.event.series).length, series: new Set(regs.map((r) => r.event.series?.id).filter(Boolean)).size, trips: trips.length },
  };
}

/**
 * GET /kids/:id/history — admins and the regular member scope (parents, group monitors) see everything;
 * the members on a team of one of the kid's editions only see those editions.
 */
export async function kidHistoryPage(req: Request) {
  const user = await requirePermission("members.read");
  const id = param(req, "id");
  const scope = await memberViewScope(user, id);
  if (!scope) throw new AuthError("FORBIDDEN");
  const history = await kidHistory(id, scope === "team" ? await myEditionIds(user) : undefined);
  return { ...history, teamView: scope === "team", canEdit: await canEditKid(user, id) };
}
