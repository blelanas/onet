import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requirePermission } from "@/lib/auth/guards";

export type ConferenceFilters = { q?: string; category?: string; when: "upcoming" | "past"; skip?: number; take?: number };

/** A conference stays "upcoming" until 3 hours after its start. */
export function conferenceCutoff() {
  return new Date(Date.now() - 3 * 3600_000);
}

function conferenceWhere(f: Omit<ConferenceFilters, "when">): Prisma.ConferenceWhereInput {
  const where: Prisma.ConferenceWhereInput = {};
  if (f.category) where.category = f.category;
  if (f.q) {
    const q = f.q.slice(0, 100);
    where.OR = [{ title: { contains: q } }, { speaker: { contains: q } }, { location: { contains: q } }, { description: { contains: q } }];
  }
  return where;
}

export async function listConferences(f: ConferenceFilters) {
  await requirePermission("content.read");
  const cutoff = conferenceCutoff();
  const base = conferenceWhere(f);
  const where = { ...base, date: f.when === "upcoming" ? { gte: cutoff } : { lt: cutoff } };
  const [rows, total, upcomingCount, pastCount] = await Promise.all([
    db.conference.findMany({ where, orderBy: { date: f.when === "upcoming" ? "asc" : "desc" }, skip: f.skip, take: f.take }),
    db.conference.count({ where }),
    db.conference.count({ where: { ...base, date: { gte: cutoff } } }),
    db.conference.count({ where: { ...base, date: { lt: cutoff } } }),
  ]);
  return { rows, total, upcomingCount, pastCount };
}

export async function getConference(id: string) {
  await requirePermission("content.read");
  const c = await db.conference.findUnique({ where: { id } });
  if (!c) throw new AuthError("NOT_FOUND");
  return c;
}

/** http(s) links mentioned in a free-text description, shown as resources. */
export function extractLinks(text?: string | null): string[] {
  if (!text) return [];
  const found = text.match(/https?:\/\/[^\s<>"')]+/g) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;:!?]+$/, "")))].slice(0, 10);
}
