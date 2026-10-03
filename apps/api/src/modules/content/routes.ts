import { Router, type Request, type Response } from "express";
import { env } from "@api/env";
import { db } from "@api/lib/db";
import { AuthError, can, requirePermission } from "@api/lib/auth/guards";
import { mutation, param, qs, query } from "@api/lib/http";
import { featuredSongs, getSong, listSongs, relatedSongs, topSongs } from "./songs";
import { getGame, listGames, materialItems, ruleSteps } from "./games";
import { conferenceCutoff, extractLinks, getConference, listConferences } from "./conferences";
import { listResources, resourceCategories } from "./resources";
import { deleteSong, recordSongPlay, saveSong } from "./song-actions";
import { deleteGame, saveGame } from "./game-actions";
import { deleteConference, saveConference } from "./conference-actions";
import { deleteResource, saveResource } from "./resource-actions";

/** content module routes (mounted under /api). */
export const router = Router();

function paging(req: Request, pageSize: number) {
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// ── Songs ─────────────────────────────────────────────────────────────────────

/** Songs library: paginated list + (unfiltered only) featured carousel and most played. */
export async function songsPage(req: Request) {
  const user = await requirePermission("content.read");
  const filters = { q: qs(req, "q")?.trim() || undefined, category: qs(req, "category"), age: qs(req, "age"), lang: qs(req, "lang") };
  const filtered = !!(filters.q || filters.category || filters.age || filters.lang);
  const { page, pageSize, skip, take } = paging(req, 24);
  const [{ rows, total }, featured, top] = await Promise.all([
    listSongs({ ...filters, skip, take }),
    filtered ? Promise.resolve([]) : featuredSongs(),
    filtered ? Promise.resolve([]) : topSongs(5),
  ]);
  return { rows, total, page, pageSize, featured, top, filtered, canManage: can(user, "content.manage") };
}
router.get("/content/songs", query(songsPage));

/** Song page (also used by the edit form): the song + songs queued after it. */
export async function songPage(req: Request) {
  const user = await requirePermission("content.read");
  const song = await getSong(param(req, "id"));
  const related = await relatedSongs(song, 6);
  return { song, related, canManage: can(user, "content.manage") };
}
router.get("/content/songs/:id", query(songPage));

router.post("/content/songs", mutation((req) => saveSong(req.body)));
router.delete("/content/songs/:id", mutation((req) => deleteSong(param(req, "id"))));
/** Called by the player once each time a song starts playing. */
router.post("/content/songs/:id/play", mutation((req) => recordSongPlay(param(req, "id"))));

// ── Games ─────────────────────────────────────────────────────────────────────

export const GAME_PAGE_SIZE = 24;

export async function gamesPage(req: Request) {
  const user = await requirePermission("content.read");
  const players = Number(qs(req, "players")) || undefined;
  const filters = { q: qs(req, "q")?.trim() || undefined, category: qs(req, "category"), age: qs(req, "age"), players, duration: qs(req, "duration") };
  const filtered = Object.values(filters).some(Boolean);
  const { page, pageSize, skip, take } = paging(req, GAME_PAGE_SIZE);
  const { rows, total } = await listGames({ ...filters, skip, take });
  return { rows, total, page, pageSize, filtered, canManage: can(user, "content.manage") };
}
router.get("/content/games", query(gamesPage));

/** Game page, animation mode and edit form: the game + rules split into steps + materials list. */
export async function gamePage(req: Request) {
  const user = await requirePermission("content.read");
  const game = await getGame(param(req, "id"));
  return { game, steps: ruleSteps(game.rules), materials: materialItems(game.materials), canManage: can(user, "content.manage") };
}
router.get("/content/games/:id", query(gamePage));

router.post("/content/games", mutation((req) => saveGame(req.body)));
router.delete("/content/games/:id", mutation((req) => deleteGame(param(req, "id"))));

// ── Conferences ───────────────────────────────────────────────────────────────

export async function conferencesPage(req: Request) {
  const user = await requirePermission("content.read");
  const when = qs(req, "when") === "past" ? ("past" as const) : ("upcoming" as const);
  const filters = { q: qs(req, "q")?.trim() || undefined, category: qs(req, "category") };
  const { page, pageSize, skip, take } = paging(req, 12);
  const { rows, total, upcomingCount, pastCount } = await listConferences({ ...filters, when, skip, take });
  return { rows, total, upcomingCount, pastCount, page, pageSize, when, canManage: can(user, "content.manage") };
}
router.get("/content/conferences", query(conferencesPage));

/** RFC 5545 text escaping + 75-octet line folding. */
function icsEscape(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsFold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Public URL of the web app (links in the .ics point to the dashboard, not to the API). */
function webOrigin(req: Request) {
  const origin = req.get("origin");
  return origin && env.CORS_ORIGINS.includes(origin) ? origin : (env.CORS_ORIGINS[0] ?? "");
}

/** Downloads an .ics calendar invitation for a conference (default duration 2 h). */
router.get(
  "/content/conferences/:id/ics",
  query(async (req: Request, res: Response) => {
    await requirePermission("content.read");
    const c = await db.conference.findUnique({ where: { id: param(req, "id") } });
    if (!c) throw new AuthError("NOT_FOUND");
    const url = `${webOrigin(req)}/dashboard/content/conferences/${c.id}`;
    const start = new Date(c.date);
    const end = new Date(start.getTime() + 2 * 3600_000);
    const description = [c.speaker + (c.speakerBio ? ` — ${c.speakerBio}` : ""), c.description ?? "", url].filter(Boolean).join("\n\n");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ONET Teboulba//Conferences//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:conference-${c.id}@onet-teboulba.tn`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape(c.title)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      ...(c.location ? [`LOCATION:${icsEscape(c.location)}`] : []),
      `URL:${url}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(c.title)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const body = lines.map(icsFold).join("\r\n") + "\r\n";
    const slug = c.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "conference";
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.ics"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(body);
  }),
);

/** Conference page (also used by the edit form). */
export async function conferencePage(req: Request) {
  const user = await requirePermission("content.read");
  const conference = await getConference(param(req, "id"));
  const links = extractLinks(conference.description);
  const description = links.reduce((d, l) => d.replace(l, "").replace(/\s+$/gm, ""), conference.description ?? "").trim();
  return { conference, upcoming: conference.date >= conferenceCutoff(), links, description, canManage: can(user, "content.manage") };
}
router.get("/content/conferences/:id", query(conferencePage));

router.post("/content/conferences", mutation((req) => saveConference(req.body)));
router.delete("/content/conferences/:id", mutation((req) => deleteConference(param(req, "id"))));

// ── Resources ─────────────────────────────────────────────────────────────────

/** Resource library; the audience is enforced server-side (see allowedAudiences). */
export async function resourcesPage(req: Request) {
  const filters = { q: qs(req, "q")?.trim() || undefined, type: qs(req, "type"), audience: qs(req, "audience") };
  const { rows, canManage } = await listResources(filters);
  const categories = canManage ? await resourceCategories() : [];
  return { rows, canManage, categories, filtered: Object.values(filters).some(Boolean) };
}
router.get("/content/resources", query(resourcesPage));

router.post("/content/resources", mutation((req) => saveResource(req.body)));
router.delete("/content/resources/:id", mutation((req) => deleteResource(param(req, "id"))));
