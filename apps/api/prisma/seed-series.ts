// Demo data for the recurring programmes (series), their editions, teams, kids and team chats.
// Called once at the end of seed.ts main(), after people, events and conversations exist.
import type { PrismaClient } from "@prisma/client";
import { zonedTimeToDate } from "@onet/shared";
import { syncTeamChat } from "../src/modules/events/team-chat";

type TeamDef = { name: string; color: string; leader: string; members: string[] };
type EditionDef = {
  editionNumber: number;
  seasonYear: number;
  title?: string;
  start: [number, number, number];
  end: [number, number, number];
  location: string;
  description: string;
  teams: TeamDef[];
  /** Kids picked from the seeded CHILD members (by age), a share of them coming back from `returning`. */
  kids: { ageMin: number; ageMax: number; count: number; returningFrom?: string; returning?: number };
  key: string;
};
type SeriesDef = { name: string; nameAr: string; kind: string; color: string; description: string; sortOrder: number; editions: EditionDef[] };

// People are referenced by e-mail (all seeded staff / monitors / members have one).
const YASMINE = "moniteur@onet-teboulba.tn"; // demo monitor
const AMEL = "membre@onet-teboulba.tn"; // demo member
const KARIM = "karim.jaziri@onet-teboulba.tn";
const INES = "ines.bouzid@onet-teboulba.tn";
const WASSIM = "wassim.hamdi@onet-teboulba.tn";
const SALMA = "salma.ayari@onet-teboulba.tn";
const HELA = "gestion@onet-teboulba.tn";

const SERIES: SeriesDef[] = [
  {
    name: "Festival de l'enfance",
    nameAr: "تظاهرة الطفولة",
    kind: "FESTIVAL",
    color: "#E8A400",
    sortOrder: 1,
    description: "Notre grand rendez-vous de l'été : deux semaines de jeux, d'ateliers, de chants et de spectacles pour les enfants de Teboulba.",
    editions: [
      {
        key: "festival15",
        editionNumber: 15,
        seasonYear: 2025,
        start: [2025, 7, 14],
        end: [2025, 7, 27],
        location: "Maison de l'enfance, Teboulba",
        description: "15e édition : la mer et ses trésors. Ateliers, grands jeux, chorale et soirée de clôture.",
        teams: [
          { name: "فريق النجوم", color: "#E8A400", leader: YASMINE, members: [AMEL, WASSIM] },
          { name: "فريق الدلافين", color: "#1E9BD7", leader: KARIM, members: [SALMA] },
          { name: "فريق النخيل", color: "#12924A", leader: INES, members: [] },
        ],
        kids: { ageMin: 5, ageMax: 13, count: 18 },
      },
      {
        key: "festival16",
        editionNumber: 16,
        seasonYear: 2026,
        start: [2026, 7, 13],
        end: [2026, 7, 26],
        location: "Maison de l'enfance, Teboulba",
        description: "16e édition : « Teboulba, ma ville de demain ». Fresque géante, olympiades et spectacle final.",
        teams: [
          { name: "فريق النجوم", color: "#E8A400", leader: AMEL, members: [YASMINE, WASSIM] },
          { name: "فريق الدلافين", color: "#1E9BD7", leader: KARIM, members: [SALMA, INES] },
          { name: "فريق الأقمار", color: "#7C4DFF", leader: HELA, members: [] },
        ],
        kids: { ageMin: 5, ageMax: 14, count: 20, returningFrom: "festival15", returning: 11 },
      },
    ],
  },
  {
    name: "Club des enfants",
    nameAr: "نادي الأطفال",
    kind: "CLUB",
    color: "#12924A",
    sortOrder: 2,
    description: "Le club hebdomadaire des 6–11 ans : bricolage, jeux, contes et sorties, chaque samedi de l'année scolaire.",
    editions: [
      {
        key: "club2025",
        editionNumber: 1,
        seasonYear: 2025,
        start: [2025, 10, 4],
        end: [2026, 6, 27],
        location: "Salle A — Maison de l'enfance",
        description: "Saison 2025-2026 du club des enfants.",
        teams: [
          { name: "Les Curieux", color: "#00A3A3", leader: SALMA, members: [WASSIM] },
          { name: "Les Artistes", color: "#FF6B4A", leader: YASMINE, members: [AMEL] },
        ],
        kids: { ageMin: 6, ageMax: 11, count: 12 },
      },
      {
        key: "club2026",
        editionNumber: 2,
        seasonYear: 2026,
        start: [2026, 10, 3],
        end: [2027, 6, 26],
        location: "Salle A — Maison de l'enfance",
        description: "Saison 2026-2027 : nouveaux ateliers « petits jardiniers » et « cuisine du monde ».",
        teams: [
          { name: "Les Curieux", color: "#00A3A3", leader: SALMA, members: [WASSIM] },
          { name: "Les Artistes", color: "#FF6B4A", leader: YASMINE, members: [AMEL] },
        ],
        kids: { ageMin: 6, ageMax: 11, count: 14, returningFrom: "club2025", returning: 8 },
      },
    ],
  },
  {
    name: "Club des cadres",
    nameAr: "نادي الإطارات",
    kind: "CLUB",
    color: "#1E9BD7",
    sortOrder: 3,
    description: "La formation des futurs animateurs : animation de groupe, premiers secours, jeux et chants.",
    editions: [
      {
        key: "cadres2026",
        editionNumber: 1,
        seasonYear: 2026,
        start: [2026, 10, 7],
        end: [2027, 6, 30],
        location: "Club des jeunes",
        description: "Saison 2026-2027 du club des cadres (14–17 ans).",
        teams: [
          { name: "Promotion A", color: "#1E9BD7", leader: HELA, members: [KARIM] },
          { name: "Promotion B", color: "#7C4DFF", leader: INES, members: [AMEL] },
        ],
        kids: { ageMin: 13, ageMax: 17, count: 10 },
      },
    ],
  },
  {
    name: "Techno Club",
    nameAr: "نادي التكنولوجيا",
    kind: "CLUB",
    color: "#7C4DFF",
    sortOrder: 4,
    description: "Robotique, programmation et petites inventions pour les 10–16 ans.",
    editions: [
      {
        key: "techno2026",
        editionNumber: 1,
        seasonYear: 2026,
        start: [2026, 10, 7],
        end: [2027, 6, 30],
        location: "Club des jeunes — salle informatique",
        description: "Saison 2026-2027 : robots suiveurs de ligne et jeux vidéo en Scratch.",
        teams: [
          { name: "Robotique", color: "#00A3A3", leader: KARIM, members: [WASSIM] },
          { name: "Code", color: "#7C4DFF", leader: AMEL, members: [INES] },
        ],
        kids: { ageMin: 10, ageMax: 16, count: 10 },
      },
    ],
  },
];

const CHAT_MESSAGES: Record<string, [string, string, string, number][]> = {
  // edition key → [team name, sender e-mail (on that team), body, days ago]
  club2026: [
    ["Les Artistes", YASMINE, "Bonjour l'équipe ! Samedi on commence l'atelier peinture : pensez aux tabliers 🎨", 3],
    ["Les Artistes", AMEL, "Parfait, je m'occupe d'acheter les pinceaux.", 2],
  ],
  techno2026: [["Code", AMEL, "Les kits robotique sont arrivés, on les teste mercredi à 15h ?", 1]],
};

const DAY = 86400_000;

/** Whole years between a date of birth and a day (null without a birth date). */
function ageOn(dob: Date | null, at: Date) {
  if (!dob) return null;
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const m = at.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export async function seedSeries(db: PrismaClient) {
  console.log("→ series, editions & teams");
  // Re-runs: editions were deleted with the events by reset(); clear what remains.
  await db.eventTeamMember.deleteMany();
  await db.eventTeam.deleteMany();
  await db.eventSeries.deleteMany();

  const people = await db.member.findMany({ where: { email: { not: null }, type: { in: ["MEMBER", "MONITOR", "STAFF"] } }, select: { id: true, email: true, userId: true } });
  const memberOf = (email: string) => {
    const m = people.find((p) => p.email === email);
    if (!m) throw new Error(`seed-series: no member ${email}`);
    return m;
  };
  const admin = await db.user.findUniqueOrThrow({ where: { email: HELA } });
  const kids = await db.member.findMany({ where: { type: "CHILD", membershipStatus: "ACTIVE" }, orderBy: { membershipNumber: "asc" }, select: { id: true, dateOfBirth: true } });
  // The demo family's kids (enfant@ and siblings) come first so their history is rich.
  const demoKid = await db.member.findFirst({ where: { user: { email: "enfant@onet-teboulba.tn" } }, select: { id: true, parentLinks: { select: { parent: { select: { childrenLinks: { select: { childId: true } } } } } } } });
  const demoIds = new Set(demoKid?.parentLinks.flatMap((l) => l.parent.childrenLinks.map((c) => c.childId)) ?? []);
  const ordered = [...kids.filter((k) => demoIds.has(k.id)), ...kids.filter((k) => !demoIds.has(k.id))];

  const kidsByEdition = new Map<string, string[]>();
  const now = Date.now();
  for (const s of SERIES) {
    const series = await db.eventSeries.create({ data: { name: s.name, nameAr: s.nameAr, kind: s.kind, color: s.color, description: s.description, sortOrder: s.sortOrder } });
    for (const e of s.editions) {
      const startAt = zonedTimeToDate(e.start[0], e.start[1], e.start[2], 9, 0);
      const endAt = zonedTimeToDate(e.end[0], e.end[1], e.end[2], 18, 0);
      const title = e.title ?? (s.kind === "FESTIVAL" ? `${s.nameAr} ${e.editionNumber}` : `${s.name} ${e.seasonYear}-${e.seasonYear + 1}`);
      const event = await db.event.create({
        data: {
          seriesId: series.id,
          editionNumber: e.editionNumber,
          seasonYear: e.seasonYear,
          title,
          description: e.description,
          category: "CHILDREN",
          startAt,
          endAt,
          location: e.location,
          organizer: "ONET Teboulba",
          capacity: 120,
          status: +endAt < now ? "COMPLETED" : "PUBLISHED",
          isPublic: true,
          createdAt: new Date(+startAt - 30 * DAY),
        },
      });

      const teams = [];
      for (const t of e.teams) {
        const leader = memberOf(t.leader);
        const team = await db.eventTeam.create({
          data: { eventId: event.id, name: t.name, color: t.color, leaderId: leader.id, members: { create: t.members.map((m) => ({ memberId: memberOf(m).id })) } },
        });
        await syncTeamChat(db, team.id, admin.id);
        teams.push(team);
      }

      // Kids: some come back from the previous edition, the others are new faces of the right age — their
      // age on the edition's first day, not today (a 2025 edition had last year's ages).
      const eligible = ordered.filter((k) => {
        const age = ageOn(k.dateOfBirth, startAt);
        return age !== null && age >= e.kids.ageMin && age <= e.kids.ageMax;
      });
      const back = e.kids.returningFrom ? (kidsByEdition.get(e.kids.returningFrom) ?? []).filter((id) => eligible.some((k) => k.id === id)).slice(0, e.kids.returning ?? 0) : [];
      const fresh = eligible.filter((k) => !back.includes(k.id) && !(kidsByEdition.get(e.kids.returningFrom ?? "") ?? []).includes(k.id));
      const chosen = [...back, ...fresh.map((k) => k.id)].slice(0, e.kids.count);
      kidsByEdition.set(e.key, chosen);
      for (const [i, memberId] of chosen.entries()) {
        await db.eventRegistration.create({
          data: { eventId: event.id, memberId, status: "CONFIRMED", teamId: teams[i % teams.length].id, registeredById: admin.id, createdAt: new Date(+startAt - (10 + (i % 7)) * DAY) },
        });
      }

      for (const [i, [teamName, email, body, daysAgo]] of (CHAT_MESSAGES[e.key] ?? []).entries()) {
        const sender = memberOf(email);
        const team = teams.find((t) => t.name === teamName);
        const conv = team && (await db.eventTeam.findUniqueOrThrow({ where: { id: team.id }, select: { conversationId: true } }));
        if (!conv?.conversationId || !sender.userId) continue;
        const at = new Date(now - daysAgo * DAY + i * 60_000);
        await db.message.create({ data: { conversationId: conv.conversationId, senderId: sender.userId, body, createdAt: at } });
        await db.conversation.update({ where: { id: conv.conversationId }, data: { updatedAt: at } });
      }
    }
  }
}
