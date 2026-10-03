import { requestCache } from "@api/lib/context";
import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";

/**
 * Public website reads. Everything here is anonymous: only public/published rows, never any
 * personal data (no member names, no participant lists — only aggregated counts).
 */

// ───────────── Visibility rules (single source of truth) ─────────────
export const PUBLIC_EVENT: Prisma.EventWhereInput = { isPublic: true, status: { in: ["PUBLISHED", "COMPLETED"] } };
export const PUBLIC_TRIP: Prisma.TripWhereInput = { isPublic: true, status: { not: "DRAFT" } };
export const PUBLIC_ACTIVITY: Prisma.ActivityWhereInput = { isPublic: true, status: "ACTIVE" };

const ACTIVE_REG = { status: { not: "CANCELLED" } };

function terms(q?: string) {
  return (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 4);
}

// ───────────── Organization profile ─────────────
export type OrgProfile = {
  name: string;
  fullName?: string;
  fullNameAr?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  foundedYear?: number;
};

export const getOrgProfile = requestCache("public.org", async (): Promise<OrgProfile> => {
  const fallback: OrgProfile = { name: "ONET Teboulba" };
  const row = await db.setting.findUnique({ where: { key: "organization.profile" } });
  if (!row) return fallback;
  try {
    const v = JSON.parse(row.value) as Partial<OrgProfile>;
    return { ...fallback, ...v, name: v.name || fallback.name };
  } catch {
    return fallback;
  }
});

// ───────────── Places left ─────────────
export function placesLeft(capacity: number, taken: number) {
  return Math.max(0, capacity - taken);
}

const eventSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  coverUrl: true,
  startAt: true,
  endAt: true,
  location: true,
  capacity: true,
  price: true,
  status: true,
  registrationDeadline: true,
  organizer: true,
  _count: { select: { registrations: { where: ACTIVE_REG } } },
} satisfies Prisma.EventSelect;

const tripSelect = {
  id: true,
  title: true,
  destination: true,
  category: true,
  description: true,
  coverUrl: true,
  departAt: true,
  returnAt: true,
  capacity: true,
  price: true,
  status: true,
  ageMin: true,
  ageMax: true,
  registrationDeadline: true,
  _count: { select: { registrations: { where: ACTIVE_REG } } },
} satisfies Prisma.TripSelect;

const activitySelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  coverUrl: true,
  ageMin: true,
  ageMax: true,
  durationMin: true,
  location: true,
  dayOfWeek: true,
  startTime: true,
  schedule: true,
} satisfies Prisma.ActivitySelect;

export type PublicEvent = Prisma.EventGetPayload<{ select: typeof eventSelect }> & { left: number };
export type PublicTrip = Prisma.TripGetPayload<{ select: typeof tripSelect }> & { left: number };
export type PublicActivity = Prisma.ActivityGetPayload<{ select: typeof activitySelect }>;

const withLeftE = <T extends { capacity: number; _count: { registrations: number } }>(e: T) => ({ ...e, left: placesLeft(e.capacity, e._count.registrations) });

// ───────────── Events ─────────────
export async function listPublicEvents(f: { q?: string; category?: string; when?: "upcoming" | "past"; skip?: number; take?: number }) {
  const now = new Date();
  const past = f.when === "past";
  const where: Prisma.EventWhereInput = {
    AND: [
      PUBLIC_EVENT,
      past ? { endAt: { lt: now } } : { endAt: { gte: now } },
      f.category ? { category: f.category } : {},
      ...terms(f.q).map((t) => ({ OR: [{ title: { contains: t } }, { description: { contains: t } }, { location: { contains: t } }] })),
    ],
  };
  const [rows, total] = await Promise.all([
    db.event.findMany({ where, select: eventSelect, orderBy: { startAt: past ? "desc" : "asc" }, skip: f.skip, take: f.take }),
    db.event.count({ where }),
  ]);
  return { rows: rows.map(withLeftE), total };
}

export async function getPublicEvent(id: string) {
  const e = await db.event.findFirst({ where: { id, ...PUBLIC_EVENT }, select: eventSelect });
  if (!e) return null;
  const [photos, related] = await Promise.all([
    db.galleryItem.findMany({ where: { eventId: id, isPublic: true }, select: { id: true, imageUrl: true, caption: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.event.findMany({ where: { ...PUBLIC_EVENT, id: { not: id }, endAt: { gte: new Date() } }, select: eventSelect, orderBy: { startAt: "asc" }, take: 3 }),
  ]);
  return { event: withLeftE(e), photos, related: related.map(withLeftE) };
}

// ───────────── Trips ─────────────
export async function listPublicTrips(f: { q?: string; category?: string; when?: "upcoming" | "past"; skip?: number; take?: number }) {
  const now = new Date();
  const past = f.when === "past";
  const where: Prisma.TripWhereInput = {
    AND: [
      PUBLIC_TRIP,
      past ? { returnAt: { lt: now } } : { returnAt: { gte: now } },
      f.category ? { category: f.category } : {},
      ...terms(f.q).map((t) => ({ OR: [{ title: { contains: t } }, { destination: { contains: t } }, { description: { contains: t } }] })),
    ],
  };
  const [rows, total] = await Promise.all([
    db.trip.findMany({ where, select: tripSelect, orderBy: { departAt: past ? "desc" : "asc" }, skip: f.skip, take: f.take }),
    db.trip.count({ where }),
  ]);
  return { rows: rows.map(withLeftE), total };
}

export async function getPublicTrip(id: string) {
  const t = await db.trip.findFirst({
    where: { id, ...PUBLIC_TRIP },
    select: { ...tripSelect, program: true, requiredDocuments: true, departureLocation: true },
  });
  if (!t) return null;
  const [photos, related] = await Promise.all([
    db.galleryItem.findMany({ where: { tripId: id, isPublic: true }, select: { id: true, imageUrl: true, caption: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.trip.findMany({ where: { ...PUBLIC_TRIP, id: { not: id }, returnAt: { gte: new Date() } }, select: tripSelect, orderBy: { departAt: "asc" }, take: 3 }),
  ]);
  return { trip: withLeftE(t), photos, related: related.map(withLeftE) };
}

// ───────────── Activities ─────────────
export async function listPublicActivities(f: { q?: string; category?: string; age?: number; take?: number }) {
  const where: Prisma.ActivityWhereInput = {
    AND: [
      PUBLIC_ACTIVITY,
      f.category ? { category: f.category } : {},
      f.age ? { AND: [{ OR: [{ ageMin: null }, { ageMin: { lte: f.age } }] }, { OR: [{ ageMax: null }, { ageMax: { gte: f.age } }] }] } : {},
      ...terms(f.q).map((t) => ({ OR: [{ title: { contains: t } }, { description: { contains: t } }, { location: { contains: t } }] })),
    ],
  };
  return db.activity.findMany({ where, select: activitySelect, orderBy: [{ updatedAt: "desc" }], take: f.take });
}

/** Category counts for public activities (for chips/landing). */
export async function activityCategoryCounts() {
  const rows = await db.activity.groupBy({ by: ["category"], where: PUBLIC_ACTIVITY, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Record<string, number>;
}

// ───────────── News ─────────────
const newsSelect = { id: true, title: true, slug: true, excerpt: true, coverUrl: true, category: true, publishedAt: true } satisfies Prisma.NewsPostSelect;
export type PublicNews = Prisma.NewsPostGetPayload<{ select: typeof newsSelect }>;

function newsWhere(): Prisma.NewsPostWhereInput {
  return { isPublished: true, publishedAt: { lte: new Date() } };
}

export async function listPublicNews(f: { q?: string; category?: string; skip?: number; take?: number }) {
  const where: Prisma.NewsPostWhereInput = {
    AND: [newsWhere(), f.category ? { category: f.category } : {}, ...terms(f.q).map((t) => ({ OR: [{ title: { contains: t } }, { excerpt: { contains: t } }, { body: { contains: t } }] }))],
  };
  const [rows, total] = await Promise.all([
    db.newsPost.findMany({ where, select: newsSelect, orderBy: { publishedAt: "desc" }, skip: f.skip, take: f.take }),
    db.newsPost.count({ where }),
  ]);
  return { rows, total };
}

export async function newsCategories() {
  const rows = await db.newsPost.groupBy({ by: ["category"], where: newsWhere() });
  return rows.map((r) => r.category);
}

export async function getPublicNews(slug: string) {
  const post = await db.newsPost.findFirst({ where: { slug, ...newsWhere() }, select: { ...newsSelect, body: true } });
  if (!post) return null;
  const related = await db.newsPost.findMany({ where: { ...newsWhere(), id: { not: post.id } }, select: newsSelect, orderBy: { publishedAt: "desc" }, take: 3 });
  return { post, related };
}

// ───────────── Gallery ─────────────
export async function listGallery(f: { album?: string; take?: number }) {
  return db.galleryItem.findMany({
    where: { isPublic: true, ...(f.album ? { album: f.album } : {}) },
    select: { id: true, imageUrl: true, caption: true, album: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: f.take,
  });
}

export async function galleryAlbums() {
  const rows = await db.galleryItem.groupBy({ by: ["album"], where: { isPublic: true }, _count: { _all: true } });
  return rows.map((r) => ({ album: r.album, count: r._count._all }));
}

// ───────────── Songs ─────────────
const songSelect = { id: true, title: true, lyrics: true, audioUrl: true, coverUrl: true, category: true, ageGroup: true, author: true, language: true, durationSec: true, featured: true } satisfies Prisma.SongSelect;
export type PublicSong = Prisma.SongGetPayload<{ select: typeof songSelect }>;

export async function listPublicSongs(f: { category?: string; q?: string; featuredFirst?: boolean; take?: number }) {
  return db.song.findMany({
    where: {
      AND: [
        { isPublic: true },
        f.category ? { category: f.category } : {},
        ...terms(f.q).map((t) => ({ OR: [{ title: { contains: t } }, { author: { contains: t } }, { lyrics: { contains: t } }, { tags: { contains: t } }] })),
      ],
    },
    select: songSelect,
    orderBy: f.featuredFirst ? [{ featured: "desc" }, { plays: "desc" }] : [{ featured: "desc" }, { title: "asc" }],
    take: f.take,
  });
}

// ───────────── Conferences ─────────────
const confSelect = { id: true, title: true, speaker: true, speakerBio: true, description: true, category: true, date: true, location: true, coverUrl: true, mediaUrl: true, mediaType: true } satisfies Prisma.ConferenceSelect;
export type PublicConference = Prisma.ConferenceGetPayload<{ select: typeof confSelect }>;

export async function listPublicConferences(f: { category?: string }) {
  const now = new Date();
  const base: Prisma.ConferenceWhereInput = { isPublic: true, ...(f.category ? { category: f.category } : {}) };
  const [upcoming, past] = await Promise.all([
    db.conference.findMany({ where: { ...base, date: { gte: now } }, select: confSelect, orderBy: { date: "asc" } }),
    db.conference.findMany({ where: { ...base, date: { lt: now } }, select: confSelect, orderBy: { date: "desc" } }),
  ]);
  return { upcoming, past };
}

// ───────────── Groups (age sections, for the About page) ─────────────
export async function listPublicGroups() {
  return db.group.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true, color: true, ageMin: true, ageMax: true, schedule: true, location: true },
    orderBy: [{ ageMin: "asc" }, { name: "asc" }],
  });
}

// ───────────── Stats (aggregates only) ─────────────
export const getPublicStats = requestCache("public.stats", async () => {
  const [children, monitors, activities, events, trips, songs] = await Promise.all([
    db.member.count({ where: { type: "CHILD", membershipStatus: "ACTIVE" } }),
    db.member.count({ where: { type: "MONITOR", membershipStatus: "ACTIVE" } }),
    db.activity.count({ where: PUBLIC_ACTIVITY }),
    db.event.count({ where: PUBLIC_EVENT }),
    db.trip.count({ where: PUBLIC_TRIP }),
    db.song.count({ where: { isPublic: true } }),
  ]);
  return { children, monitors, activities, events, trips, songs };
});

// ───────────── Home ─────────────
export async function getHomeData() {
  const [events, trips, activities, songs, news, gallery, stats] = await Promise.all([
    listPublicEvents({ when: "upcoming", take: 3 }),
    listPublicTrips({ when: "upcoming", take: 3 }),
    listPublicActivities({ take: 6 }),
    listPublicSongs({ featuredFirst: true, take: 4 }),
    listPublicNews({ take: 3 }),
    listGallery({ take: 6 }),
    getPublicStats(),
  ]);
  return { events: events.rows, trips: trips.rows, activities, songs, news: news.rows, gallery, stats };
}
