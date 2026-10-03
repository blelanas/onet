import type { Prisma } from "@prisma/client";
import { db } from "@api/lib/db";
import type { CurrentUser } from "@api/lib/auth/session";
import { can, hasRole } from "@api/lib/auth/guards";
import { memberScopeWhere, myChildren } from "@api/lib/auth/scope";
import { CATEGORY_COLORS } from "@api/lib/constants";
import { memberSearchWhere } from "@api/modules/members/queries";

export const SEARCH_SECTIONS = ["members", "groups", "activities", "events", "trips", "songs", "games", "conferences", "resources", "invoices"] as const;
export type SearchSection = (typeof SEARCH_SECTIONS)[number];

export type SearchHit = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  color?: string;
  /** i18n key in common (e.g. "enums.memberType.CHILD") or a status for StatusBadge */
  tag?: string;
  status?: string;
  date?: Date | null;
  amount?: number;
  avatar?: { firstName: string; lastName: string; photoUrl: string | null };
};
export type SearchResult = { section: SearchSection; count: number; hits: SearchHit[] };

/** AND over terms, each term OR'ed across the given fields (SQLite LIKE is case-insensitive for ASCII). */
function termsWhere<T>(q: string, fields: string[]): T {
  const terms = q.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return { AND: terms.map((t) => ({ OR: fields.map((f) => ({ [f]: { contains: t } })) })) } as T;
}

/** Sections the user may search — kids never get people or finance. */
export function allowedSections(user: CurrentUser): SearchSection[] {
  const kid = hasRole(user, "kid") && user.roles.length === 1;
  return SEARCH_SECTIONS.filter((s) => {
    switch (s) {
      case "members":
        return can(user, "members.read") && !kid;
      case "groups":
        return can(user, "groups.read");
      case "activities":
        return can(user, "activities.read");
      case "events":
        return can(user, "events.read");
      case "trips":
        return can(user, "trips.read");
      case "resources":
        return can(user, "content.read") && !kid;
      case "invoices":
        return !kid && (can(user, "finance.read") || can(user, "invoices.pay"));
      default:
        return can(user, "content.read");
    }
  });
}

/** Audience values of resources a user may see. */
function resourceAudiences(user: CurrentUser) {
  if (can(user, "content.manage") || can(user, "members.read_all")) return undefined;
  const a = ["ALL"];
  if (hasRole(user, "parent")) a.push("PARENTS");
  if (hasRole(user, "monitor")) a.push("MONITORS");
  if (hasRole(user, "kid")) a.push("KIDS");
  return a;
}

export async function globalSearch(user: CurrentUser, q: string, opts: { only?: SearchSection; take?: number } = {}): Promise<SearchResult[]> {
  const take = opts.take ?? 5;
  const sections = allowedSections(user).filter((s) => !opts.only || s === opts.only);
  const staffEvents = can(user, "events.manage");
  const staffTrips = can(user, "trips.manage");

  const run: Record<SearchSection, () => Promise<SearchResult>> = {
    members: async () => {
      const where: Prisma.MemberWhereInput = { AND: [await memberScopeWhere(user), memberSearchWhere(q)] };
      const [count, rows] = await Promise.all([
        db.member.count({ where }),
        db.member.findMany({ where, take, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, photoUrl: true, type: true, membershipNumber: true, group: { select: { name: true, color: true } } } }),
      ]);
      return { section: "members", count, hits: rows.map((m) => ({ id: m.id, title: `${m.firstName} ${m.lastName}`, subtitle: m.group?.name ?? m.membershipNumber, href: `/dashboard/members/${m.id}`, color: m.group?.color, tag: `enums.memberType.${m.type}`, avatar: m }) ) };
    },
    groups: async () => {
      const where = termsWhere<Prisma.GroupWhereInput>(q, ["name", "description", "location"]);
      const [count, rows] = await Promise.all([db.group.count({ where }), db.group.findMany({ where, take, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, schedule: true, _count: { select: { children: true } } } })]);
      return { section: "groups", count, hits: rows.map((g) => ({ id: g.id, title: g.name, subtitle: g.schedule, href: `/dashboard/groups/${g.id}`, color: g.color })) };
    },
    activities: async () => {
      const where: Prisma.ActivityWhereInput = { AND: [termsWhere(q, ["title", "description", "location"]), can(user, "activities.manage") ? {} : { status: { not: "DRAFT" } }] };
      const [count, rows] = await Promise.all([db.activity.count({ where }), db.activity.findMany({ where, take, orderBy: { title: "asc" }, select: { id: true, title: true, category: true, schedule: true, status: true } })]);
      return { section: "activities", count, hits: rows.map((a) => ({ id: a.id, title: a.title, subtitle: a.schedule, href: `/dashboard/activities/${a.id}`, color: CATEGORY_COLORS[a.category], tag: `enums.activityCategory.${a.category}` })) };
    },
    events: async () => {
      const where: Prisma.EventWhereInput = { AND: [termsWhere(q, ["title", "description", "location"]), staffEvents ? {} : { status: { not: "DRAFT" } }] };
      const [count, rows] = await Promise.all([db.event.count({ where }), db.event.findMany({ where, take, orderBy: { startAt: "desc" }, select: { id: true, title: true, category: true, startAt: true, location: true, status: true } })]);
      return { section: "events", count, hits: rows.map((e) => ({ id: e.id, title: e.title, subtitle: e.location, date: e.startAt, href: `/dashboard/events/${e.id}`, color: CATEGORY_COLORS[e.category], tag: `enums.eventCategory.${e.category}` })) };
    },
    trips: async () => {
      const where: Prisma.TripWhereInput = { AND: [termsWhere(q, ["title", "destination", "description"]), staffTrips ? {} : { status: { not: "DRAFT" } }] };
      const [count, rows] = await Promise.all([db.trip.count({ where }), db.trip.findMany({ where, take, orderBy: { departAt: "desc" }, select: { id: true, title: true, category: true, departAt: true, destination: true } })]);
      return { section: "trips", count, hits: rows.map((t) => ({ id: t.id, title: t.title, subtitle: t.destination, date: t.departAt, href: `/dashboard/trips/${t.id}`, color: CATEGORY_COLORS[t.category], tag: `enums.tripCategory.${t.category}` })) };
    },
    songs: async () => {
      const where = termsWhere<Prisma.SongWhereInput>(q, ["title", "lyrics", "author", "tags"]);
      const [count, rows] = await Promise.all([db.song.count({ where }), db.song.findMany({ where, take, orderBy: [{ featured: "desc" }, { title: "asc" }], select: { id: true, title: true, category: true, author: true } })]);
      return { section: "songs", count, hits: rows.map((s) => ({ id: s.id, title: s.title, subtitle: s.author, href: `/dashboard/content/songs/${s.id}`, color: CATEGORY_COLORS[s.category], tag: `enums.songCategory.${s.category}` })) };
    },
    games: async () => {
      const where = termsWhere<Prisma.GameWhereInput>(q, ["name", "description", "rules"]);
      const [count, rows] = await Promise.all([db.game.count({ where }), db.game.findMany({ where, take, orderBy: { name: "asc" }, select: { id: true, name: true, category: true, description: true } })]);
      return { section: "games", count, hits: rows.map((g) => ({ id: g.id, title: g.name, subtitle: g.description, href: `/dashboard/content/games/${g.id}`, color: CATEGORY_COLORS[g.category], tag: `enums.gameCategory.${g.category}` })) };
    },
    conferences: async () => {
      const where = termsWhere<Prisma.ConferenceWhereInput>(q, ["title", "speaker", "description", "location"]);
      const [count, rows] = await Promise.all([db.conference.count({ where }), db.conference.findMany({ where, take, orderBy: { date: "desc" }, select: { id: true, title: true, speaker: true, category: true, date: true } })]);
      return { section: "conferences", count, hits: rows.map((c) => ({ id: c.id, title: c.title, subtitle: c.speaker, date: c.date, href: `/dashboard/content/conferences/${c.id}`, color: CATEGORY_COLORS[c.category], tag: `enums.conferenceCategory.${c.category}` })) };
    },
    resources: async () => {
      const aud = resourceAudiences(user);
      const where: Prisma.ResourceWhereInput = { AND: [termsWhere(q, ["title", "description", "category"]), aud ? { audience: { in: aud } } : {}] };
      const [count, rows] = await Promise.all([db.resource.count({ where }), db.resource.findMany({ where, take, orderBy: { title: "asc" }, select: { id: true, title: true, type: true, description: true } })]);
      return { section: "resources", count, hits: rows.map((r) => ({ id: r.id, title: r.title, subtitle: r.description, href: `/dashboard/content/resources?q=${encodeURIComponent(r.title)}`, color: "#00A3A3", tag: `enums.resourceType.${r.type}` })) };
    },
    invoices: async () => {
      let scope: Prisma.InvoiceWhereInput = {};
      if (!can(user, "finance.read")) {
        // Parents: only invoices they pay, or concerning their own children.
        const kids = (await myChildren(user)).map((k) => k.id);
        scope = { OR: [{ payerId: user.memberId ?? "__none__" }, { childId: { in: kids } }] };
      }
      const terms = termsWhere<Prisma.InvoiceWhereInput>(q, ["number", "description"]);
      const people = memberSearchWhere(q);
      const where: Prisma.InvoiceWhereInput = { AND: [scope, { OR: [terms, { payer: people }, { child: people }] }] };
      const [count, rows] = await Promise.all([
        db.invoice.count({ where }),
        db.invoice.findMany({ where, take, orderBy: { issuedAt: "desc" }, select: { id: true, number: true, description: true, amount: true, status: true, issuedAt: true, payer: { select: { firstName: true, lastName: true } } } }),
      ]);
      return { section: "invoices", count, hits: rows.map((i) => ({ id: i.id, title: i.description, subtitle: `${i.number} · ${i.payer.firstName} ${i.payer.lastName}`, href: `/dashboard/finance/invoices/${i.id}`, status: i.status, amount: i.amount, date: i.issuedAt })) };
    },
  };

  return Promise.all(sections.map((s) => run[s]()));
}
