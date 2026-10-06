import { Router, type Request } from "express";
import { ACTIVITY_CATEGORIES } from "@onet/shared";
import { AuthError } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import {
  galleryAlbums,
  getHomeData,
  getOrgProfile,
  getPublicEvent,
  getPublicNews,
  getPublicStats,
  getPublicTrip,
  listGallery,
  listPublicActivities,
  listPublicConferences,
  listPublicEvents,
  listPublicGroups,
  listPublicNews,
  listPublicSongs,
  listPublicTrips,
  newsCategories,
} from "./queries";
import { submitContactMessage, submitJoinRequest } from "./actions";

/**
 * Public website routes (mounted under /api). Anonymous by design: no auth, only public /
 * published rows and aggregated counts — never personal data. The queries module owns the
 * visibility rules (PUBLIC_EVENT, PUBLIC_TRIP, PUBLIC_ACTIVITY, published news, isPublic…).
 */
export const router = Router();

const PAGE_SIZE = 9;

function pageOf(req: Request) {
  const page = Math.max(1, Math.floor(Number(qs(req, "page"))) || 1);
  return { page, pageSize: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

const whenOf = (req: Request) => (qs(req, "when") === "past" ? "past" : "upcoming") as "upcoming" | "past";

// Organisation profile (header/footer, contact page). Only public contact details.
export async function publicOrg() {
  return getOrgProfile();
}
router.get("/public/org", query(publicOrg));

export async function publicHome() {
  const [data, org] = await Promise.all([getHomeData(), getOrgProfile()]);
  return { ...data, org };
}
router.get("/public/home", query(publicHome));

export async function publicAbout() {
  const [org, groups, stats] = await Promise.all([getOrgProfile(), listPublicGroups(), getPublicStats()]);
  return { org, groups, stats };
}
router.get("/public/about", query(publicAbout));

export async function publicActivities(req: Request) {
  const category = qs(req, "category");
  const ageRaw = Number(qs(req, "age"));
  const age = Number.isInteger(ageRaw) && ageRaw >= 3 && ageRaw <= 18 ? ageRaw : undefined;
  const rows = await listPublicActivities({
    q: qs(req, "q"),
    category: category && (ACTIVITY_CATEGORIES as readonly string[]).includes(category) ? category : undefined,
    age,
  });
  return { rows };
}
router.get("/public/activities", query(publicActivities));

export async function publicEvents(req: Request) {
  const { page, pageSize, skip, take } = pageOf(req);
  const when = whenOf(req);
  const { rows, total } = await listPublicEvents({ q: qs(req, "q"), category: qs(req, "category"), when, skip, take });
  return { rows, total, page, pageSize, when };
}
router.get("/public/events", query(publicEvents));

export async function publicEvent(req: Request) {
  const data = await getPublicEvent(param(req, "id"));
  if (!data) throw new AuthError("NOT_FOUND");
  return data;
}
router.get("/public/events/:id", query(publicEvent));

export async function publicTrips(req: Request) {
  const { page, pageSize, skip, take } = pageOf(req);
  const when = whenOf(req);
  const { rows, total } = await listPublicTrips({ q: qs(req, "q"), category: qs(req, "category"), when, skip, take });
  return { rows, total, page, pageSize, when };
}
router.get("/public/trips", query(publicTrips));

export async function publicTrip(req: Request) {
  const data = await getPublicTrip(param(req, "id"));
  if (!data) throw new AuthError("NOT_FOUND");
  return data;
}
router.get("/public/trips/:id", query(publicTrip));

export async function publicNewsList(req: Request) {
  const { page, pageSize, skip, take } = pageOf(req);
  const [cats, { rows, total }] = await Promise.all([newsCategories(), listPublicNews({ q: qs(req, "q"), category: qs(req, "category"), skip, take })]);
  return { rows, total, page, pageSize, cats };
}
router.get("/public/news", query(publicNewsList));

export async function publicNewsArticle(req: Request) {
  const data = await getPublicNews(param(req, "slug"));
  if (!data) throw new AuthError("NOT_FOUND");
  return data;
}
router.get("/public/news/:slug", query(publicNewsArticle));

export async function publicGallery(req: Request) {
  const [albums, items] = await Promise.all([galleryAlbums(), listGallery({ album: qs(req, "album"), take: 200 })]);
  return { albums, items };
}
router.get("/public/gallery", query(publicGallery));

export async function publicSongs(req: Request) {
  const rows = await listPublicSongs({ q: qs(req, "q"), category: qs(req, "category") });
  return { rows };
}
router.get("/public/songs", query(publicSongs));

export async function publicConferences(req: Request) {
  return listPublicConferences({ category: qs(req, "category") });
}
router.get("/public/conferences", query(publicConferences));

// Anonymous forms: zod validation + honeypot + per-IP rate limit (see actions.ts).
router.post("/public/join", mutation((req) => submitJoinRequest(req.body)));
router.post("/public/contact", mutation((req) => submitContactMessage(req.body)));
