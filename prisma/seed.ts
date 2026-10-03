/* eslint-disable no-console */
// Demo data for ONET Teboulba. All people, phones and e-mails are fictitious.
// Run: npm run db:seed   (resets the database content)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_COLORS, ROLE_KEYS } from "../src/lib/permissions";

const db = new PrismaClient();
const PASSWORD = "Onet2026!";

// Deterministic PRNG so the demo is stable across runs.
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const DAY = 86400_000;
const now = new Date();
const daysFromNow = (d: number, h = 10, m = 0) => {
  const x = new Date(now.getTime() + d * DAY);
  x.setHours(h, m, 0, 0);
  return x;
};
const dob = (age: number) => new Date(now.getFullYear() - age, int(0, 11), int(1, 28));
const TND = (v: number) => Math.round(v * 1000);

// ───────────── Demo media generated on the fly (no external assets needed) ─────────────
const PUB = path.join(process.cwd(), "public", "demo");
mkdirSync(path.join(PUB, "audio"), { recursive: true });
mkdirSync(path.join(PUB, "gallery"), { recursive: true });

/** Synthesises a short, cheerful melody as a 16-bit mono WAV. */
function writeMelody(file: string, notes: number[], bpm = 132) {
  const rate = 22050;
  const beat = 60 / bpm;
  const samples: number[] = [];
  for (const n of notes) {
    const freq = n === 0 ? 0 : 440 * Math.pow(2, (n - 69) / 12);
    const len = Math.floor(rate * beat);
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.min(1, i / 300) * Math.exp((-3 * i) / len);
      const v = freq ? (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(4 * Math.PI * freq * t) * 0.15) * env : 0;
      samples.push(v);
    }
  }
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767 * 0.8, 44 + i * 2));
  writeFileSync(path.join(PUB, "audio", file), buf);
  return { url: `/demo/audio/${file}`, duration: Math.round(notes.length * beat) };
}

const MELODIES = [
  [60, 62, 64, 65, 67, 67, 69, 67, 65, 64, 62, 60, 64, 67, 72, 0, 72, 71, 69, 67, 65, 64, 62, 60],
  [67, 67, 69, 67, 72, 71, 0, 67, 67, 69, 67, 74, 72, 0, 67, 67, 79, 76, 72, 71, 69, 0, 77, 77, 76, 72, 74, 72],
  [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 0, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60],
  [60, 60, 67, 67, 69, 69, 67, 0, 65, 65, 64, 64, 62, 62, 60, 0, 67, 67, 65, 65, 64, 64, 62, 0],
  [72, 71, 69, 67, 69, 71, 72, 0, 72, 74, 76, 74, 72, 71, 69, 0, 67, 69, 71, 72, 74, 72, 71, 69, 67],
  [62, 65, 69, 65, 62, 65, 69, 72, 0, 70, 69, 67, 65, 67, 69, 65, 62, 0, 62, 65, 69, 74, 72, 69, 65, 62],
];

/** Colourful SVG "photo" placeholder for the gallery. */
function writeGallerySvg(file: string, color: string, accent: string, emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="660" cy="110" r="150" fill="#fff" opacity=".13"/><circle cx="120" cy="520" r="190" fill="#fff" opacity=".1"/><circle cx="220" cy="120" r="14" fill="#FFB400"/><circle cx="600" cy="460" r="10" fill="#fff" opacity=".8"/><rect x="520" y="200" width="22" height="22" rx="5" fill="#fff" opacity=".6" transform="rotate(25 530 210)"/><text x="400" y="350" font-size="190" text-anchor="middle">${emoji}</text></svg>`;
  writeFileSync(path.join(PUB, "gallery", file), svg);
  return `/demo/gallery/${file}`;
}

// ───────────── Names ─────────────
const BOYS = [
  ["Adam", "آدم"], ["Youssef", "يوسف"], ["Amine", "أمين"], ["Iyed", "إياد"], ["Rayen", "ريان"], ["Aziz", "عزيز"], ["Skander", "إسكندر"],
  ["Mehdi", "مهدي"], ["Hamza", "حمزة"], ["Ilyes", "إلياس"], ["Omar", "عمر"], ["Yassine", "ياسين"], ["Nour", "نور"], ["Firas", "فراس"],
  ["Ahmed", "أحمد"], ["Malek", "مالك"], ["Ziad", "زياد"], ["Taha", "طه"], ["Wassim", "وسيم"], ["Karim", "كريم"],
] as const;
const GIRLS = [
  ["Mariem", "مريم"], ["Yasmine", "ياسمين"], ["Eya", "آية"], ["Lina", "لينا"], ["Sarra", "سارة"], ["Nour", "نور"], ["Farah", "فرح"],
  ["Rahma", "رحمة"], ["Ines", "إيناس"], ["Salma", "سلمى"], ["Malak", "ملاك"], ["Amira", "أميرة"], ["Chaima", "شيماء"], ["Asma", "أسماء"],
  ["Hiba", "هبة"], ["Jannet", "جنات"], ["Ranim", "ريم"], ["Tasnim", "تسنيم"], ["Dorra", "درة"], ["Emna", "آمنة"],
] as const;
const ADULT_M = [["Mohamed", "محمد"], ["Hichem", "هشام"], ["Sami", "سامي"], ["Nabil", "نبيل"], ["Ridha", "رضا"], ["Fathi", "فتحي"], ["Lotfi", "لطفي"], ["Mourad", "مراد"], ["Kamel", "كمال"], ["Walid", "وليد"], ["Anis", "أنيس"], ["Bilel", "بلال"]] as const;
const ADULT_F = [["Leila", "ليلى"], ["Samia", "سامية"], ["Hela", "هالة"], ["Sonia", "سنية"], ["Rim", "ريم"], ["Najet", "نجاة"], ["Olfa", "ألفة"], ["Imen", "إيمان"], ["Wafa", "وفاء"], ["Fatma", "فاطمة"], ["Amel", "أمل"], ["Monia", "منية"]] as const;
const LAST = [
  ["Gharbi", "الغربي"], ["Ben Salah", "بن صالح"], ["Trabelsi", "الطرابلسي"], ["Jaziri", "الجزيري"], ["Mejri", "الماجري"], ["Bouzid", "بوزيد"],
  ["Hamdi", "حمدي"], ["Sassi", "ساسي"], ["Khelifi", "الخليفي"], ["Chaabane", "شعبان"], ["Dridi", "الدريدي"], ["Mansouri", "المنصوري"],
  ["Ayari", "العياري"], ["Ferchichi", "الفرشيشي"], ["Zouari", "الزواري"], ["Baccouche", "بكوش"], ["Lassoued", "الأسود"], ["Kefi", "الكافي"],
  ["Ben Amor", "بن عمر"], ["Hadj Ali", "الحاج علي"], ["Mabrouk", "مبروك"], ["Nasri", "النصري"],
] as const;
const STREETS = ["Rue Habib Bourguiba", "Avenue de la République", "Rue de la Plage", "Rue Ibn Khaldoun", "Avenue Farhat Hached", "Rue des Oliviers", "Rue Ali Belhouane"];

async function reset() {
  // Order matters because of FK constraints.
  const tables = [
    "AuditLog", "Session", "Notification", "Message", "ConversationParticipant", "Conversation", "Announcement", "Document", "CalendarEntry", "Task",
    "Payment", "EventRegistration", "TripRegistration", "Invoice", "Expense", "Attendance", "ActivityParticipant", "ActivityReport", "Activity",
    "GalleryItem", "Event", "TripMonitor", "Trip", "MemberBadge", "Badge", "Guardianship", "GroupMonitor", "Member", "Group", "Song", "Game",
    "Conference", "Resource", "NewsPost", "JoinRequest", "ContactMessage", "UserRole", "RolePermission", "Permission", "Role", "User", "Setting",
  ];
  for (const t of tables) await db.$executeRawUnsafe(`DELETE FROM "${t}"`);
}

async function main() {
  console.log("↺ resetting…");
  await reset();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── RBAC ──
  console.log("→ roles & permissions");
  const perms = await Promise.all(
    ALL_PERMISSIONS.map((key) => db.permission.create({ data: { key, module: PERMISSIONS[key] } })),
  );
  const permId = Object.fromEntries(perms.map((p) => [p.key, p.id]));
  const ROLE_NAMES: Record<string, string> = {
    super_admin: "Super administrateur", admin: "Administrateur", accountant: "Comptable", monitor: "Moniteur",
    parent: "Parent", member: "Membre", kid: "Enfant",
  };
  const roles: Record<string, string> = {};
  for (const key of ROLE_KEYS) {
    const r = await db.role.create({
      data: {
        key,
        name: ROLE_NAMES[key],
        color: ROLE_COLORS[key],
        isSystem: true,
        permissions: { create: DEFAULT_ROLE_PERMISSIONS[key].map((p) => ({ permissionId: permId[p] })) },
      },
    });
    roles[key] = r.id;
  }

  let memberSeq = 1;
  const nextNumber = () => `ONT-${String(memberSeq++).padStart(4, "0")}`;

  async function makeUser(email: string, name: string, roleKeys: string[], locale = "fr") {
    return db.user.create({
      data: { email, name, passwordHash, locale, roles: { create: roleKeys.map((k) => ({ roleId: roles[k] })) } },
    });
  }

  // ── Staff & demo accounts ──
  console.log("→ staff & accounts");
  const uSuper = await makeUser("admin@onet-teboulba.tn", "Sami Ben Salah", ["super_admin"]);
  const uAdmin = await makeUser("gestion@onet-teboulba.tn", "Hela Zouari", ["admin"]);
  const uAcc = await makeUser("comptable@onet-teboulba.tn", "Nabil Mansouri", ["accountant"]);
  const uMember = await makeUser("membre@onet-teboulba.tn", "Amel Kefi", ["member"]);
  await db.member.createMany({
    data: [
      { type: "STAFF", firstName: "Sami", lastName: "Ben Salah", firstNameAr: "سامي", lastNameAr: "بن صالح", gender: "M", membershipNumber: nextNumber(), userId: uSuper.id, email: uSuper.email, phone: "+216 73 000 101", dateOfBirth: dob(46), membershipDate: daysFromNow(-3000) },
      { type: "STAFF", firstName: "Hela", lastName: "Zouari", firstNameAr: "هالة", lastNameAr: "الزواري", gender: "F", membershipNumber: nextNumber(), userId: uAdmin.id, email: uAdmin.email, phone: "+216 73 000 102", dateOfBirth: dob(38), membershipDate: daysFromNow(-2200) },
      { type: "STAFF", firstName: "Nabil", lastName: "Mansouri", firstNameAr: "نبيل", lastNameAr: "المنصوري", gender: "M", membershipNumber: nextNumber(), userId: uAcc.id, email: uAcc.email, phone: "+216 73 000 103", dateOfBirth: dob(41), membershipDate: daysFromNow(-1500) },
      { type: "MEMBER", firstName: "Amel", lastName: "Kefi", firstNameAr: "أمل", lastNameAr: "الكافي", gender: "F", membershipNumber: nextNumber(), userId: uMember.id, email: uMember.email, phone: "+216 98 111 204", dateOfBirth: dob(29), membershipDate: daysFromNow(-700) },
    ],
  });

  // Monitors
  const monitorDefs = [
    { first: "Yasmine", firstAr: "ياسمين", last: "Trabelsi", lastAr: "الطرابلسي", g: "F", email: "moniteur@onet-teboulba.tn", login: true },
    { first: "Karim", firstAr: "كريم", last: "Jaziri", lastAr: "الجزيري", g: "M", email: "karim.jaziri@onet-teboulba.tn", login: true },
    { first: "Ines", firstAr: "إيناس", last: "Bouzid", lastAr: "بوزيد", g: "F", email: "ines.bouzid@onet-teboulba.tn", login: true },
    { first: "Wassim", firstAr: "وسيم", last: "Hamdi", lastAr: "حمدي", g: "M", email: "wassim.hamdi@onet-teboulba.tn", login: false },
    { first: "Salma", firstAr: "سلمى", last: "Ayari", lastAr: "العياري", g: "F", email: "salma.ayari@onet-teboulba.tn", login: false },
  ];
  const monitors: Awaited<ReturnType<typeof db.member.create>>[] = [];
  for (const m of monitorDefs) {
    const user = m.login ? await makeUser(m.email, `${m.first} ${m.last}`, ["monitor"]) : null;
    monitors.push(
      await db.member.create({
        data: {
          type: "MONITOR", firstName: m.first, lastName: m.last, firstNameAr: m.firstAr, lastNameAr: m.lastAr, gender: m.g,
          email: m.email, phone: `+216 2${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`, dateOfBirth: dob(int(21, 34)),
          membershipNumber: nextNumber(), membershipDate: daysFromNow(-int(300, 2000)), userId: user?.id,
          address: `${pick(STREETS)}, Teboulba`,
        },
      }),
    );
  }

  // Groups
  console.log("→ groups");
  const groupDefs = [
    { name: "Les Étoiles", description: "Éveil et jeux pour les plus petits.", color: "#FFB400", icon: "star", ageMin: 4, ageMax: 7, capacity: 18, day: 6, time: "09:30", schedule: "Samedi 09:30 – 11:30", location: "Salle A — Maison de l'enfance" },
    { name: "Les Explorateurs", description: "Découverte, sciences et créativité.", color: "#1E9BD7", icon: "compass", ageMin: 8, ageMax: 10, capacity: 22, day: 6, time: "14:00", schedule: "Samedi 14:00 – 16:30", location: "Salle B — Maison de l'enfance" },
    { name: "Les Aventuriers", description: "Sorties, sport et esprit d'équipe.", color: "#2BB673", icon: "mountain", ageMin: 11, ageMax: 13, capacity: 22, day: 0, time: "09:00", schedule: "Dimanche 09:00 – 12:00", location: "Terrain municipal" },
    { name: "Jeunes Leaders", description: "Citoyenneté, projets et leadership.", color: "#7C4DFF", icon: "rocket", ageMin: 14, ageMax: 17, capacity: 20, day: 3, time: "17:00", schedule: "Mercredi 17:00 – 19:00", location: "Club des jeunes" },
    { name: "Chorale ONET", description: "Chant, rythme et spectacles.", color: "#E8457C", icon: "music", ageMin: 7, ageMax: 15, capacity: 25, day: 5, time: "16:00", schedule: "Vendredi 16:00 – 17:30", location: "Salle de musique" },
  ];
  const groups: Awaited<ReturnType<typeof db.group.create>>[] = [];
  for (const [i, g] of groupDefs.entries()) {
    groups.push(
      await db.group.create({
        data: {
          name: g.name, description: g.description, color: g.color, icon: g.icon, ageMin: g.ageMin, ageMax: g.ageMax, capacity: g.capacity,
          meetingDay: g.day, meetingTime: g.time, schedule: g.schedule, location: g.location,
          monitors: { create: [{ memberId: monitors[i].id, isLead: true }] },
        },
      }),
    );
  }
  // second monitor on two groups
  await db.groupMonitor.create({ data: { groupId: groups[1].id, memberId: monitors[3].id } });
  await db.groupMonitor.create({ data: { groupId: groups[2].id, memberId: monitors[4].id } });
  // Yasmine (demo monitor) also co-leads the choir
  await db.groupMonitor.create({ data: { groupId: groups[4].id, memberId: monitors[0].id } });

  const groupForAge = (age: number) => (age <= 7 ? groups[0] : age <= 10 ? groups[1] : age <= 13 ? groups[2] : groups[3]);

  // Families
  console.log("→ families");
  const families: { parentIds: string[]; children: { id: string; age: number; userId?: string }[]; payerId: string; lastName: string }[] = [];
  const usedLast = new Set<number>();
  for (let f = 0; f < 18; f++) {
    let li = int(0, LAST.length - 1);
    while (usedLast.has(li) && usedLast.size < LAST.length) li = (li + 1) % LAST.length;
    usedLast.add(li);
    const [last, lastAr] = f === 0 ? LAST[0] : LAST[li];
    const isDemo = f === 0;
    const [fFirst, fFirstAr] = isDemo ? ADULT_M[0] : pick(ADULT_M);
    const [mFirst, mFirstAr] = isDemo ? ADULT_F[0] : pick(ADULT_F);
    const address = `${int(1, 90)} ${pick(STREETS)}, Teboulba`;
    const parentUser = isDemo
      ? await makeUser("parent@onet-teboulba.tn", `${fFirst} ${last}`, ["parent"])
      : f < 8
        ? await makeUser(`${fFirst.toLowerCase()}.${last.toLowerCase().replace(/\s/g, "")}${f}@example.tn`, `${fFirst} ${last}`, ["parent"], pick(["fr", "ar", "fr"]))
        : null;
    const father = await db.member.create({
      data: {
        type: "PARENT", firstName: fFirst, lastName: last, firstNameAr: fFirstAr, lastNameAr: lastAr, gender: "M", dateOfBirth: dob(int(34, 52)),
        phone: `+216 ${pick(["20", "22", "50", "55", "98", "97"])} ${int(100, 999)} ${int(100, 999)}`, email: parentUser?.email ?? null,
        address, membershipNumber: nextNumber(), membershipDate: daysFromNow(-int(60, 1500)), userId: parentUser?.id,
      },
    });
    const parentIds = [father.id];
    if (f % 3 !== 2) {
      const mother = await db.member.create({
        data: {
          type: "PARENT", firstName: mFirst, lastName: last, firstNameAr: mFirstAr, lastNameAr: lastAr, gender: "F", dateOfBirth: dob(int(30, 48)),
          phone: `+216 ${pick(["20", "24", "52", "92", "99"])} ${int(100, 999)} ${int(100, 999)}`, address,
          membershipNumber: nextNumber(), membershipDate: father.membershipDate,
        },
      });
      parentIds.push(mother.id);
    }
    const nKids = isDemo ? 3 : int(1, 3);
    const children: { id: string; age: number; userId?: string }[] = [];
    for (let k = 0; k < nKids; k++) {
      const girl = isDemo ? k === 1 : rnd() < 0.5;
      const [first, firstAr] = isDemo ? (k === 0 ? BOYS[0] : k === 1 ? GIRLS[0] : BOYS[1]) : girl ? pick(GIRLS) : pick(BOYS);
      const age = isDemo ? [11, 8, 5][k] : int(4, 17);
      const kidUser = isDemo && k === 0 ? await makeUser("enfant@onet-teboulba.tn", `${first} ${last}`, ["kid"]) : null;
      const status = rnd() < 0.9 ? "ACTIVE" : pick(["PENDING", "INACTIVE"]);
      const child = await db.member.create({
        data: {
          type: "CHILD", firstName: first, lastName: last, firstNameAr: firstAr, lastNameAr: lastAr, gender: girl ? "F" : "M", dateOfBirth: dob(age),
          address, membershipNumber: nextNumber(), membershipStatus: status, membershipDate: daysFromNow(-int(30, 1200)),
          groupId: groupForAge(age).id, emergencyName: `${fFirst} ${last}`, emergencyPhone: father.phone, userId: kidUser?.id,
          medicalNotes: rnd() < 0.12 ? pick(["Asthme léger — inhalateur dans le sac.", "Allergie aux arachides.", "Porte des lunettes."]) : null,
          points: int(20, 260),
        },
      });
      children.push({ id: child.id, age, userId: kidUser?.id });
      for (const [pi, pid] of parentIds.entries())
        await db.guardianship.create({ data: { parentId: pid, childId: child.id, relation: pi === 0 ? "FATHER" : "MOTHER", isPrimary: pi === 0 } });
    }
    families.push({ parentIds, children, payerId: father.id, lastName: last });
  }
  const allChildren = families.flatMap((f) => f.children.map((c) => ({ ...c, payerId: f.payerId })));
  const childIds = allChildren.map((c) => c.id);
  // Choir members drawn from all groups
  const choir = allChildren.filter((c) => c.age >= 7 && c.age <= 15).slice(0, 14);

  // Badges
  console.log("→ badges");
  const badgeDefs = [
    { key: "first_step", name: "Premier pas", description: "Première activité réalisée", icon: "footprints", color: "#2BB673", points: 10 },
    { key: "explorer", name: "Explorateur", description: "3 sorties effectuées", icon: "compass", color: "#1E9BD7", points: 30 },
    { key: "singer", name: "Petite voix d'or", description: "A participé à la chorale", icon: "music", color: "#E8457C", points: 20 },
    { key: "team_player", name: "Esprit d'équipe", description: "Victoire en jeu collectif", icon: "users", color: "#FFB400", points: 25 },
    { key: "assiduous", name: "Toujours présent", description: "10 présences consécutives", icon: "calendar-check", color: "#7C4DFF", points: 40 },
    { key: "artist", name: "Artiste", description: "Œuvre exposée à la fête de fin d'année", icon: "palette", color: "#FF6B4A", points: 25 },
    { key: "green_hero", name: "Héros de la planète", description: "Opération plage propre", icon: "leaf", color: "#5CAE2E", points: 30 },
    { key: "star", name: "Étoile ONET", description: "Comportement exemplaire", icon: "star", color: "#E30613", points: 50 },
  ];
  const badges = await Promise.all(badgeDefs.map((b) => db.badge.create({ data: b })));
  for (const c of allChildren) {
    const n = c.userId ? 5 : int(0, 4);
    const chosen = [...badges].sort(() => rnd() - 0.5).slice(0, n);
    for (const b of chosen) await db.memberBadge.create({ data: { memberId: c.id, badgeId: b.id, awardedAt: daysFromNow(-int(5, 200)) } });
  }

  // ── Activities ──
  console.log("→ activities");
  const activityDefs = [
    { title: "Football des Aventuriers", category: "SPORTS", group: 2, monitor: 2, day: 0, time: "09:00", dur: 90, loc: "Terrain municipal de Teboulba", ages: [10, 14], mat: "Tenue de sport, gourde, baskets", desc: "Entraînement ludique, fair-play et petits tournois entre équipes." },
    { title: "Atelier peinture & collage", category: "CREATIVE", group: 0, monitor: 0, day: 6, time: "10:00", dur: 75, loc: "Salle A — Maison de l'enfance", ages: [4, 8], mat: "Tablier, vieux t-shirt", desc: "Couleurs, formes et matières : chaque enfant crée son petit chef-d'œuvre." },
    { title: "Chorale : chants de la mer", category: "SONGS", group: 4, monitor: 0, day: 5, time: "16:00", dur: 90, loc: "Salle de musique", ages: [7, 15], mat: "Carnet de paroles", desc: "Répertoire de chants tunisiens et chansons de la mer pour le spectacle du printemps." },
    { title: "Petits scientifiques", category: "EDUCATIONAL", group: 1, monitor: 1, day: 6, time: "14:00", dur: 90, loc: "Salle B — Maison de l'enfance", ages: [8, 11], mat: "Aucun", desc: "Expériences amusantes : volcans, aimants, eau colorée et fusées à air." },
    { title: "Théâtre & expression", category: "CULTURAL", group: 3, monitor: 3, day: 3, time: "17:00", dur: 120, loc: "Club des jeunes", ages: [13, 17], mat: "Tenue confortable", desc: "Improvisation, prise de parole et création d'une pièce collective." },
    { title: "Grands jeux en plein air", category: "OUTDOOR", group: 2, monitor: 4, day: 0, time: "10:30", dur: 90, loc: "Forêt de Teboulba", ages: [9, 14], mat: "Casquette, crème solaire, gourde", desc: "Jeux de piste, chasse au trésor et défis nature." },
    { title: "Atelier robotique junior", category: "WORKSHOP", group: 3, monitor: 1, day: 3, time: "15:00", dur: 90, loc: "Club des jeunes — salle informatique", ages: [12, 17], mat: "Aucun (kits fournis)", desc: "Initiation à la programmation et montage de petits robots." },
    { title: "Rythmes & percussions", category: "MUSIC", group: 4, monitor: 3, day: 2, time: "17:30", dur: 60, loc: "Salle de musique", ages: [7, 14], mat: "Aucun", desc: "Darbouka, bendir et percussions corporelles." },
    { title: "Jeux coopératifs", category: "GAMES", group: 0, monitor: 0, day: 6, time: "11:00", dur: 45, loc: "Cour de la Maison de l'enfance", ages: [4, 7], mat: "Aucun", desc: "Jeux où l'on gagne ensemble : parachute, relais et rondes." },
    { title: "Club lecture & conte", category: "EDUCATIONAL", group: 1, monitor: 3, day: 4, time: "16:30", dur: 60, loc: "Bibliothèque municipale", ages: [7, 11], mat: "Un livre préféré", desc: "Lecture à voix haute, conte tunisien et petits débats." },
  ];
  const activities: Awaited<ReturnType<typeof db.activity.create>>[] = [];
  for (const a of activityDefs) {
    const g = groups[a.group];
    const act = await db.activity.create({
      data: {
        title: a.title, description: a.desc, category: a.category, ageMin: a.ages[0], ageMax: a.ages[1], durationMin: a.dur, location: a.loc,
        materials: a.mat, dayOfWeek: a.day, startTime: a.time, schedule: `${["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][a.day]} ${a.time}`,
        startDate: daysFromNow(-120), endDate: daysFromNow(200), capacity: int(15, 25), status: "ACTIVE", monitorId: monitors[a.monitor].id, groupId: g.id,
      },
    });
    activities.push(act);
    const pool = a.group === 4 ? choir : allChildren.filter((c) => c.age >= a.ages[0] - 1 && c.age <= a.ages[1] + 1);
    for (const c of pool.slice(0, act.capacity)) await db.activityParticipant.create({ data: { activityId: act.id, memberId: c.id } });
  }

  // A few dedicated choir kids have the choir as their main group.
  const demoKidIds = new Set(families[0].children.map((c) => c.id));
  for (const c of choir.filter((c) => !demoKidIds.has(c.id)).slice(0, 8)) await db.member.update({ where: { id: c.id }, data: { groupId: groups[4].id } });

  // ── Attendance: last 8 weekly sessions per group ──
  console.log("→ attendance");
  const monitorUser = await db.user.findUnique({ where: { email: "moniteur@onet-teboulba.tn" } });
  for (const g of groups) {
    const members = g.name === "Chorale ONET" ? choir.map((c) => c.id) : (await db.member.findMany({ where: { groupId: g.id }, select: { id: true } })).map((m) => m.id);
    for (let w = 1; w <= 8; w++) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      const diff = (d.getDay() - (g.meetingDay ?? 6) + 7) % 7 || 7;
      d.setDate(d.getDate() - diff - (w - 1) * 7);
      for (const m of members) {
        const r = rnd();
        await db.attendance.create({
          data: {
            date: d, memberId: m, groupId: g.id, contextKey: `group:${g.id}`, recordedById: monitorUser?.id,
            status: r < 0.8 ? "PRESENT" : r < 0.88 ? "LATE" : r < 0.94 ? "EXCUSED" : "ABSENT",
          },
        });
      }
    }
  }

  // ── Events ──
  console.log("→ events");
  const eventDefs = [
    { title: "Fête de l'enfance — Journée portes ouvertes", cat: "CELEBRATION", d: 12, h: 9, len: 7, loc: "Place de la municipalité, Teboulba", cap: 300, price: 0, desc: "Stands, jeux géants, maquillage, spectacle de la chorale et présentation des clubs. Ouvert à toutes les familles !" },
    { title: "Concours de dessin « Ma ville en couleurs »", cat: "COMPETITION", d: 20, h: 10, len: 3, loc: "Maison de l'enfance", cap: 60, price: 5, desc: "Les enfants dessinent Teboulba de demain. Exposition et remise des prix le jour même." },
    { title: "Spectacle de la chorale ONET", cat: "CULTURAL", d: 34, h: 17, len: 2, loc: "Maison de la culture de Teboulba", cap: 180, price: 8, desc: "Les voix de nos enfants : chants tunisiens, chansons de la mer et surprises musicales." },
    { title: "Atelier parents : écrans et enfants", cat: "WORKSHOP", d: 9, h: 18, len: 2, loc: "Club des jeunes", cap: 40, price: 0, desc: "Échange animé par une psychologue sur l'usage équilibré des écrans en famille." },
    { title: "Tournoi inter-clubs de mini-foot", cat: "COMPETITION", d: 45, h: 9, len: 6, loc: "Terrain municipal", cap: 96, price: 10, desc: "Équipes mixtes de 8 à 14 ans, médailles pour tous et goûter offert." },
    { title: "Réunion générale des moniteurs", cat: "MEETING", d: 5, h: 18, len: 2, loc: "Siège ONET Teboulba", cap: 25, price: 0, desc: "Bilan du trimestre, planning des sorties et formation premiers secours.", isPublic: false },
    { title: "Carnaval d'automne", cat: "CHILDREN", d: -18, h: 15, len: 3, loc: "Avenue Habib Bourguiba", cap: 200, price: 0, desc: "Déguisements, défilé et goûter collectif." },
    { title: "Journée mondiale de l'enfance", cat: "PUBLIC", d: -40, h: 9, len: 6, loc: "Maison de la culture", cap: 250, price: 0, desc: "Ateliers sur les droits de l'enfant, théâtre et fresque collective." },
  ];
  const events: Awaited<ReturnType<typeof db.event.create>>[] = [];
  for (const e of eventDefs) {
    const start = daysFromNow(e.d, e.h);
    events.push(
      await db.event.create({
        data: {
          title: e.title, description: e.desc, category: e.cat, startAt: start, endAt: new Date(start.getTime() + e.len * 3600_000), location: e.loc,
          capacity: e.cap, organizer: "ONET Teboulba", registrationDeadline: e.d > 2 ? daysFromNow(e.d - 2, 23, 59) : null, price: TND(e.price),
          requiresPayment: e.price > 0, status: e.d < 0 ? "COMPLETED" : "PUBLISHED", isPublic: e.isPublic ?? true,
        },
      }),
    );
  }
  await db.activity.update({ where: { id: activities[2].id }, data: { eventId: events[2].id } });

  // ── Trips ──
  console.log("→ trips");
  const tripDefs = [
    { title: "Découverte de Kairouan", dest: "Kairouan", cat: "CULTURAL", d: 26, days: 1, price: 35, cap: 45, ages: [9, 15], desc: "Grande Mosquée, bassins des Aghlabides et atelier de tapis traditionnel.", program: "07:00 | Départ de la Maison de l'enfance\n09:30 | Visite de la Grande Mosquée\n11:30 | Bassins des Aghlabides\n12:30 | Déjeuner\n14:00 | Atelier tapis & makroudh\n16:30 | Retour à Teboulba" },
    { title: "Camp nature à Aïn Draham", dest: "Aïn Draham", cat: "CAMPING", d: 58, days: 3, price: 180, cap: 36, ages: [11, 17], desc: "Trois jours en forêt : randonnées, veillées, orientation et vie en équipe.", program: "Jour 1 | Voyage, installation, veillée\nJour 2 | Randonnée & jeu d'orientation\nJour 3 | Atelier nature, retour" },
    { title: "Musée du Bardo & Sidi Bou Saïd", dest: "Tunis", cat: "EDUCATIONAL", d: 40, days: 1, price: 45, cap: 50, ages: [8, 16], desc: "Mosaïques romaines au Bardo puis balade dans le village bleu et blanc.", program: "06:30 | Départ\n09:30 | Musée du Bardo\n12:30 | Pique-nique\n14:30 | Sidi Bou Saïd\n17:00 | Retour" },
    { title: "Journée plage propre à Monastir", dest: "Monastir", cat: "OUTDOOR", d: 15, days: 1, price: 10, cap: 60, ages: [7, 17], desc: "Opération de nettoyage de plage, jeux de sable et sensibilisation à la mer.", program: "08:30 | Départ\n09:30 | Nettoyage de la plage\n12:00 | Déjeuner\n13:30 | Jeux de plage\n16:00 | Retour" },
    { title: "Amphithéâtre d'El Jem", dest: "El Jem", cat: "EXCURSION", d: -25, days: 1, price: 25, cap: 45, ages: [8, 15], desc: "Visite du Colisée d'El Jem et du musée archéologique.", program: "08:00 | Départ\n10:00 | Amphithéâtre\n12:30 | Déjeuner\n14:00 | Musée\n16:00 | Retour", status: "COMPLETED" },
    { title: "Oasis de Tozeur (séjour régional)", dest: "Tozeur", cat: "REGIONAL", d: 95, days: 4, price: 290, cap: 30, ages: [12, 17], desc: "Palmeraie, Chebika, Tamerza et nuit étoilée dans le désert.", program: "Jour 1 | Voyage & palmeraie\nJour 2 | Oasis de montagne\nJour 3 | Ong Jemel & dunes\nJour 4 | Retour" },
  ];
  const trips: Awaited<ReturnType<typeof db.trip.create>>[] = [];
  for (const [i, t] of tripDefs.entries()) {
    const dep = daysFromNow(t.d, 7);
    const ret = new Date(dep.getTime() + (t.days - 1) * DAY);
    ret.setHours(18, 0, 0, 0);
    trips.push(
      await db.trip.create({
        data: {
          title: t.title, destination: t.dest, category: t.cat, description: t.desc, program: t.program, departureLocation: "Maison de l'enfance, Teboulba",
          departAt: dep, returnAt: ret, capacity: t.cap, price: TND(t.price), ageMin: t.ages[0], ageMax: t.ages[1],
          requiredDocuments: t.days > 1 ? "Autorisation parentale signée\nCopie de la carte d'identité / extrait de naissance\nFiche sanitaire" : "Autorisation parentale signée",
          registrationDeadline: t.d > 3 ? daysFromNow(t.d - 5, 23, 59) : null, status: t.status ?? "OPEN",
          monitors: { create: [{ memberId: monitors[i % monitors.length].id }, { memberId: monitors[(i + 2) % monitors.length].id }] },
        },
      }),
    );
  }

  // ── Invoices, registrations & payments ──
  console.log("→ registrations & finance");
  let invSeq = 1;
  const year = now.getFullYear();
  const invNumber = () => `ONET-${year}-${String(invSeq++).padStart(4, "0")}`;
  const accUserId = uAcc.id;

  async function invoiceFor(opts: { payerId: string; childId?: string; amount: number; description: string; eventId?: string; tripId?: string; activityId?: string; issued: Date; due: Date; payState: "paid" | "partial" | "none" }) {
    const inv = await db.invoice.create({
      data: { number: invNumber(), payerId: opts.payerId, childId: opts.childId, amount: opts.amount, description: opts.description, eventId: opts.eventId, tripId: opts.tripId, activityId: opts.activityId, issuedAt: opts.issued, dueDate: opts.due, status: "PENDING" },
    });
    let paid = 0;
    if (opts.payState !== "none") {
      const amount = opts.payState === "paid" ? opts.amount : Math.round(opts.amount / 2 / 1000) * 1000;
      const method = pick(["CASH", "CASH", "BANK_TRANSFER", "ONLINE"]);
      const paidAt = new Date(Math.min(now.getTime(), opts.issued.getTime() + int(1, 12) * DAY));
      await db.payment.create({
        data: { invoiceId: inv.id, amount, method, paidAt, recordedById: accUserId, provider: method === "ONLINE" ? "mock" : "manual", reference: method === "BANK_TRANSFER" ? `VIR-${int(10000, 99999)}` : method === "ONLINE" ? `MOCK-${int(100000, 999999)}` : null },
      });
      paid = amount;
    }
    const status = paid >= opts.amount ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : opts.due < now ? "OVERDUE" : "PENDING";
    return db.invoice.update({ where: { id: inv.id }, data: { status, paidAt: status === "PAID" ? new Date(Math.min(now.getTime(), opts.issued.getTime() + 5 * DAY)) : null } });
  }

  // Annual membership fees (spread over the last 6 months)
  for (const fam of families) {
    for (const c of fam.children) {
      const issued = daysFromNow(-int(10, 170));
      const r = rnd();
      await invoiceFor({ payerId: fam.payerId, childId: c.id, amount: TND(60), description: `Cotisation annuelle ${year}-${year + 1}`, issued, due: new Date(issued.getTime() + 30 * DAY), payState: r < 0.7 ? "paid" : r < 0.82 ? "partial" : "none" });
    }
  }

  // Trip registrations
  for (const [ti, trip] of trips.entries()) {
    const eligible = allChildren.filter((c) => c.age >= (trip.ageMin ?? 0) && c.age <= (trip.ageMax ?? 99));
    const n = Math.min(eligible.length, Math.floor(trip.capacity * (ti === 3 ? 0.9 : 0.55)));
    for (const c of eligible.sort(() => rnd() - 0.5).slice(0, n)) {
      const r = rnd();
      const payState = trip.status === "COMPLETED" ? "paid" : r < 0.5 ? "paid" : r < 0.65 ? "partial" : "none";
      const issued = daysFromNow(-int(1, 20));
      const inv = trip.price > 0 ? await invoiceFor({ payerId: c.payerId, childId: c.id, amount: trip.price, description: `Sortie : ${trip.title}`, tripId: trip.id, issued, due: trip.registrationDeadline ?? trip.departAt, payState }) : null;
      await db.tripRegistration.create({
        data: {
          tripId: trip.id, memberId: c.id, invoiceId: inv?.id, status: payState === "paid" ? "CONFIRMED" : "PENDING", parentConsent: payState !== "none" || rnd() < 0.5,
          documentsStatus: payState === "paid" ? "COMPLETE" : pick(["MISSING", "PARTIAL"]), registeredById: uAdmin.id,
        },
      });
    }
  }

  // Event registrations
  for (const ev of events.filter((e) => e.isPublic)) {
    const n = Math.min(childIds.length, Math.floor(ev.capacity * (ev.price ? 0.25 : 0.12)));
    for (const c of [...allChildren].sort(() => rnd() - 0.5).slice(0, n)) {
      const r = rnd();
      const payState = ev.status === "COMPLETED" ? "paid" : r < 0.6 ? "paid" : "none";
      const inv = ev.price > 0 ? await invoiceFor({ payerId: c.payerId, childId: c.id, amount: ev.price, description: `Événement : ${ev.title}`, eventId: ev.id, issued: daysFromNow(-int(1, 10)), due: ev.registrationDeadline ?? ev.startAt, payState }) : null;
      await db.eventRegistration.create({
        data: { eventId: ev.id, memberId: c.id, invoiceId: inv?.id, status: !ev.price || payState === "paid" ? "CONFIRMED" : "PENDING", registeredById: uAdmin.id },
      });
    }
  }
  // Demo family: ensure clear, varied states for the parent dashboard
  const demo = families[0];
  const k1 = await db.tripRegistration.findUnique({ where: { tripId_memberId: { tripId: trips[0].id, memberId: demo.children[0].id } } });
  if (!k1) {
    const inv = await invoiceFor({ payerId: demo.payerId, childId: demo.children[0].id, amount: trips[0].price, description: `Sortie : ${trips[0].title}`, tripId: trips[0].id, issued: daysFromNow(-3), due: trips[0].registrationDeadline!, payState: "none" });
    await db.tripRegistration.create({ data: { tripId: trips[0].id, memberId: demo.children[0].id, invoiceId: inv.id, status: "PENDING", registeredById: (await db.user.findUnique({ where: { email: "parent@onet-teboulba.tn" } }))!.id } });
  }

  // Expenses (6 months)
  const expenseDefs = [
    ["TRANSPORT", "Location bus — sortie El Jem", "Transports Sahel Voyages", 650, trips[4].id, null],
    ["FOOD", "Goûter carnaval d'automne", "Pâtisserie Ennour", 280, null, events[6].id],
    ["MATERIALS", "Peinture, pinceaux, papier", "Librairie El Amel", 185, null, null],
    ["RENT", "Location salle de spectacle", "Maison de la culture", 300, null, events[2].id],
    ["EQUIPMENT", "Ballons & chasubles", "Sport Plus Monastir", 240, null, null],
    ["UTILITIES", "Électricité & eau — siège", "STEG / SONEDE", 160, null, null],
    ["COMMUNICATION", "Impression affiches fête de l'enfance", "Imprimerie Teboulba", 120, null, events[0].id],
    ["FOOD", "Déjeuners — journée de l'enfance", "Traiteur Dar Zmen", 540, null, events[7].id],
    ["MATERIALS", "Kits robotique junior", "TechKids Sousse", 890, null, null],
    ["ACCOMMODATION", "Acompte camp Aïn Draham", "Centre de camping Aïn Draham", 1200, trips[1].id, null],
    ["TRANSPORT", "Acompte bus Kairouan", "Transports Sahel Voyages", 300, trips[0].id, null],
    ["OTHER", "Trousse de premiers secours", "Pharmacie centrale Teboulba", 95, null, null],
  ] as const;
  for (const [i, [category, description, supplier, amount, tripId, eventId]] of expenseDefs.entries()) {
    await db.expense.create({ data: { category, description, supplier, amount: TND(amount), date: daysFromNow(-int(2, 170) + (i % 3)), tripId, eventId, createdById: uAcc.id } });
  }
  for (let m = 0; m < 6; m++) {
    await db.expense.create({ data: { category: "RENT", description: "Loyer local du club", supplier: "Municipalité de Teboulba", amount: TND(250), date: daysFromNow(-30 * m - 2), createdById: uAcc.id } });
  }

  // ── Content ──
  console.log("→ content");
  const songDefs = [
    { title: "نشيد المنظمة — Hymne de l'ONET", category: "ANTHEM", ageGroup: "ALL", author: "Chorale ONET Teboulba", language: "ar", featured: true, tags: "hymne,organisation,fierté",
      lyrics: "نحن أطفال تونس الخضراء\nنحمل الحلم في قلوبنا\nيدًا بيد نبني الغد\nبالعلم والحب والوفاء\n\nيا منظمة الطفولة\nأنتِ بيتنا الكبير\nنلعب، نتعلم، نغني\nونرسم مستقبلًا منير" },
    { title: "Teboulba, ma ville au bord de l'eau", category: "CHILDREN", ageGroup: "4-7", author: "Atelier chant — Les Étoiles", language: "fr", featured: true, tags: "ville,mer,enfants",
      lyrics: "Teboulba, ma ville au bord de l'eau,\nLes bateaux dansent sur les flots,\nLes oliviers chantent au vent,\nEt nous on court en riant !\n\nLa la la, le soleil est là,\nLa la la, viens chanter avec moi !" },
    { title: "يا بحر — Ô mer", category: "FOLK", ageGroup: "8-12", author: "Arrangement Chorale ONET", language: "ar", featured: true, tags: "mer,tradition,sahel",
      lyrics: "يا بحر يا بحر الزين\nموجك يلعب بين اليدين\nالفلوكة ماشية ماشية\nوالصياد يغني للعين" },
    { title: "La chanson des couleurs", category: "EDUCATIONAL", ageGroup: "4-7", author: "ONET Teboulba", language: "fr", tags: "couleurs,apprendre",
      lyrics: "Rouge comme une fraise,\nJaune comme le soleil,\nBleu comme la mer immense,\nVert comme l'olivier pareil !" },
    { title: "Autour du feu de camp", category: "CAMP", ageGroup: "13-17", author: "Tradition scoute", language: "fr", featured: true, tags: "camp,veillée,amitié",
      lyrics: "Autour du feu, on se retrouve,\nLes étoiles pour seul toit,\nUne chanson, une épaule,\nL'amitié guide nos pas." },
    { title: "Happy Birthday ONET!", category: "CELEBRATION", ageGroup: "ALL", author: "Club anglais", language: "en", tags: "fête,anniversaire",
      lyrics: "Clap your hands and stamp your feet,\nONET friends are here to meet,\nSing it loud and sing it proud,\nHappy day for all the crowd!" },
    { title: "حقوقي — Mes droits", category: "EDUCATIONAL", ageGroup: "8-12", author: "Atelier droits de l'enfant", language: "ar", tags: "droits,citoyenneté",
      lyrics: "من حقي أن أتعلم\nمن حقي أن ألعب\nمن حقي أن أُحَب\nوأن أعيش في أمان" },
    { title: "Les sons de la nature", category: "CHILDREN", ageGroup: "4-7", author: "Les Étoiles", language: "fr", tags: "animaux,nature",
      lyrics: "Le chat fait miaou, le chien fait ouaf,\nLa vache fait meuh dans le grand champ,\nEt l'oiseau chante cui-cui-cui,\nViens, on imite tous les bruits !" },
  ];
  for (const [i, sd] of songDefs.entries()) {
    const audio = writeMelody(`song-${i + 1}.wav`, MELODIES[i % MELODIES.length], 120 + (i % 3) * 14);
    await db.song.create({ data: { ...sd, audioUrl: audio.url, durationSec: audio.duration, plays: int(12, 480) } });
  }

  const gameDefs = [
    { name: "La chasse au trésor", category: "OUTDOOR", ageGroup: "8-12", minPlayers: 8, maxPlayers: 30, durationMin: 60, materials: "Indices imprimés, petit trésor, plan", description: "Les équipes suivent des indices cachés pour découvrir le trésor.", rules: "1. Former des équipes de 4 à 6.\n2. Chaque indice mène au suivant.\n3. Interdit de courir sur la route.\n4. La première équipe qui trouve le trésor gagne… mais tout le monde partage le goûter !", instructions: "Préparer 6 à 8 indices adaptés à l'âge. Placer un moniteur à chaque étape." },
    { name: "Le béret", category: "TEAM", ageGroup: "8-12", minPlayers: 10, maxPlayers: 24, durationMin: 20, materials: "Un foulard", description: "Jeu de rapidité classique : attraper le béret et revenir sans être touché.", rules: "Deux équipes face à face, chaque joueur a un numéro. L'animateur appelle un numéro : les deux joueurs foncent vers le béret." },
    { name: "Le parachute arc-en-ciel", category: "INDOOR", ageGroup: "4-7", minPlayers: 6, maxPlayers: 20, durationMin: 25, materials: "Parachute coloré, balles légères", description: "Jeu coopératif : faire sauter les balles et changer de place sous le parachute.", rules: "Tout le monde tient le bord. On monte, on descend, on fait des vagues ; à l'appel d'une couleur on change de place." },
    { name: "Ninja", category: "ENERGIZER", ageGroup: "13-17", minPlayers: 5, maxPlayers: 20, durationMin: 10, materials: "Aucun", description: "Jeu d'adresse et de réflexes pour réveiller le groupe.", rules: "En cercle, chacun à son tour tente de toucher la main d'un voisin en un seul mouvement. Main touchée = main dans le dos." },
    { name: "Qui suis-je ?", category: "ICEBREAKER", ageGroup: "ALL", minPlayers: 4, maxPlayers: 30, durationMin: 15, materials: "Post-it, feutres", description: "Deviner le personnage collé sur son front en posant des questions fermées.", rules: "On ne répond que par oui ou non. 10 questions maximum." },
    { name: "Quiz de l'environnement", category: "EDUCATIONAL", ageGroup: "8-12", minPlayers: 4, maxPlayers: 30, durationMin: 30, materials: "Cartes questions, buzzer", description: "Questions ludiques sur la mer, le tri et la nature tunisienne.", rules: "Équipes de 4. Bonne réponse : 2 points ; bonus si l'équipe explique la réponse." },
    { name: "Le relais des sacs", category: "OUTDOOR", ageGroup: "4-7", minPlayers: 8, maxPlayers: 24, durationMin: 20, materials: "Sacs en toile, plots", description: "Course en sac par équipes, rires garantis.", rules: "Chaque joueur fait l'aller-retour en sautant puis passe le sac au suivant." },
    { name: "Le jeu du miroir", category: "ICEBREAKER", ageGroup: "ALL", minPlayers: 2, maxPlayers: 30, durationMin: 10, materials: "Aucun", description: "Par deux, l'un imite les gestes de l'autre comme dans un miroir.", rules: "Mouvements lents, pas de contact. On inverse les rôles toutes les 2 minutes." },
  ];
  for (const g of gameDefs) await db.game.create({ data: g });

  const confDefs = [
    { title: "Les droits de l'enfant expliqués aux enfants", speaker: "Mme Najet Ferchichi", speakerBio: "Juriste, déléguée à la protection de l'enfance", category: "CHILD_RIGHTS", d: 18, loc: "Maison de la culture", desc: "Une conférence interactive pour comprendre la Convention internationale des droits de l'enfant." },
    { title: "Nutrition et sport chez l'enfant", speaker: "Dr. Lotfi Baccouche", speakerBio: "Pédiatre, médecin du sport", category: "HEALTH", d: 37, loc: "Club des jeunes", desc: "Bien manger, bien bouger : conseils pratiques pour les familles." },
    { title: "Accompagner l'adolescent", speaker: "Mme Rim Lassoued", speakerBio: "Psychologue clinicienne", category: "PARENTING", d: -14, loc: "Siège ONET Teboulba", desc: "Communication, confiance et autonomie : comment accompagner les 13-17 ans.", media: true },
    { title: "Protéger notre littoral", speaker: "M. Anis Kefi", speakerBio: "Biologiste marin", category: "ENVIRONMENT", d: -45, loc: "Port de pêche de Teboulba", desc: "La Méditerranée, ses trésors et les gestes pour la protéger.", media: true },
    { title: "Initiation au numérique responsable", speaker: "M. Walid Nasri", speakerBio: "Ingénieur et formateur", category: "TECHNOLOGY", d: 65, loc: "Club des jeunes — salle informatique", desc: "Sécurité en ligne, réseaux sociaux et esprit critique." },
  ];
  for (const [i, c] of confDefs.entries()) {
    const media = c.media ? writeMelody(`conference-${i + 1}.wav`, MELODIES[(i + 2) % MELODIES.length], 100) : null;
    await db.conference.create({
      data: { title: c.title, speaker: c.speaker, speakerBio: c.speakerBio, category: c.category, date: daysFromNow(c.d, 18), location: c.loc, description: c.desc, mediaUrl: media?.url, mediaType: media ? "AUDIO" : null },
    });
  }

  const resDefs = [
    { title: "Guide du moniteur ONET", type: "PDF", category: "Formation", audience: "MONITORS", url: "/demo/resources/guide-moniteur.pdf", description: "Rôle, sécurité, animation et gestion de groupe." },
    { title: "Fiche sanitaire de liaison", type: "PDF", category: "Formulaires", audience: "PARENTS", url: "/demo/resources/fiche-sanitaire.pdf", description: "À remplir et remettre avant chaque sortie." },
    { title: "Autorisation parentale de sortie", type: "PDF", category: "Formulaires", audience: "PARENTS", url: "/demo/resources/autorisation-parentale.pdf", description: "Modèle d'autorisation pour les sorties et camps." },
    { title: "Convention des droits de l'enfant (UNICEF)", type: "LINK", category: "Éducation", audience: "ALL", url: "https://www.unicef.org/fr/convention-relative-aux-droits-de-lenfant", description: "Texte de la Convention, version adaptée." },
    { title: "100 jeux pour animer un groupe", type: "PDF", category: "Animation", audience: "MONITORS", url: "/demo/resources/100-jeux.pdf", description: "Recueil de jeux classés par âge et durée." },
    { title: "Premiers secours : les bons gestes", type: "VIDEO", category: "Sécurité", audience: "MONITORS", url: "https://www.youtube.com/results?search_query=premiers+secours+enfants", description: "Vidéo de formation aux gestes de premiers secours." },
  ];
  mkdirSync(path.join(PUB, "resources"), { recursive: true });
  for (const r of resDefs) {
    if (r.url.startsWith("/demo/resources/")) {
      // Minimal valid one-page PDF with the resource title.
      const title = r.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[()\\]/g, "");
      const content = `BT /F1 22 Tf 60 760 Td (${title}) Tj ET BT /F1 12 Tf 60 730 Td (ONET Teboulba - document de demonstration) Tj ET`;
      const objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      ];
      let pdf = "%PDF-1.4\n";
      const offsets: number[] = [];
      objs.forEach((o, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      writeFileSync(path.join(process.cwd(), "public", r.url), pdf);
    }
    await db.resource.create({ data: r });
  }

  // News & gallery
  const news = [
    { title: "Rentrée des clubs : les inscriptions sont ouvertes !", excerpt: "Chorale, théâtre, robotique, sport… découvrez le programme de l'année.", body: "Les clubs de l'ONET Teboulba reprennent leurs activités. Cette année, nous accueillons un nouveau club de robotique junior et une chorale élargie. Les inscriptions se font en ligne ou à la Maison de l'enfance tous les samedis matin.\n\nNos moniteurs ont suivi une formation renforcée en animation et en premiers secours pour accueillir vos enfants dans les meilleures conditions.", cat: "NEWS", d: -6 },
    { title: "Retour en images sur le carnaval d'automne", excerpt: "Plus de 150 enfants déguisés ont défilé dans les rues de Teboulba.", body: "Quelle fête ! Princesses, super-héros, pêcheurs et poissons multicolores ont animé l'avenue Habib Bourguiba. Merci aux parents bénévoles et à la municipalité pour leur soutien.", cat: "EVENT", d: -16 },
    { title: "Nos Aventuriers champions du tournoi régional", excerpt: "L'équipe des 11-13 ans remporte la coupe du fair-play.", body: "Lors du tournoi régional de Monastir, nos Aventuriers ont brillé par leur esprit d'équipe et ont remporté la coupe du fair-play. Bravo à tous les joueurs et à leurs moniteurs !", cat: "NEWS", d: -28 },
    { title: "Opération plage propre : rejoignez-nous", excerpt: "Une journée pour protéger notre littoral, en famille.", body: "Dans le cadre de notre programme environnement, nous organisons une grande opération de nettoyage de la plage. Gants et sacs fournis ; goûter offert aux participants.", cat: "ANNOUNCEMENT", d: -2 },
  ];
  for (const n of news) {
    await db.newsPost.create({
      data: { title: n.title, slug: n.title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70), excerpt: n.excerpt, body: n.body, category: n.cat, publishedAt: daysFromNow(n.d), authorId: uAdmin.id },
    });
  }
  const galleryDefs = [
    ["#E30613", "#FF6B4A", "🎭", "Carnaval d'automne", "EVENTS", events[6].id, null],
    ["#1E9BD7", "#00A3A3", "🏖️", "Plage de Monastir", "TRIPS", null, trips[3].id],
    ["#FFB400", "#FF6B4A", "🎨", "Atelier peinture", "ACTIVITIES", null, null],
    ["#2BB673", "#5CAE2E", "⚽", "Tournoi des Aventuriers", "ACTIVITIES", null, null],
    ["#7C4DFF", "#E8457C", "🎤", "Répétition de la chorale", "ACTIVITIES", null, null],
    ["#E8457C", "#FFB400", "🎂", "Journée mondiale de l'enfance", "EVENTS", events[7].id, null],
    ["#00A3A3", "#1E9BD7", "🏛️", "Amphithéâtre d'El Jem", "TRIPS", null, trips[4].id],
    ["#5CAE2E", "#2BB673", "🌳", "Grands jeux en forêt", "ACTIVITIES", null, null],
    ["#FF6B4A", "#E30613", "🤖", "Robotique junior", "ACTIVITIES", null, null],
  ] as const;
  for (const [i, [c1, c2, emoji, caption, album, eventId, tripId]] of galleryDefs.entries()) {
    await db.galleryItem.create({ data: { imageUrl: writeGallerySvg(`photo-${i + 1}.svg`, c1, c2, emoji), caption, album, eventId, tripId, createdAt: daysFromNow(-i * 5) } });
  }

  // ── Communication ──
  console.log("→ communication");
  const parentUser = (await db.user.findUnique({ where: { email: "parent@onet-teboulba.tn" } }))!;
  const kidUser = (await db.user.findUnique({ where: { email: "enfant@onet-teboulba.tn" } }))!;
  const annDefs = [
    { title: "Inscriptions ouvertes : sortie à Kairouan", body: "Les inscriptions pour la sortie culturelle à Kairouan sont ouvertes jusqu'à la date limite. Places limitées !", audience: "PARENTS", priority: "IMPORTANT", isPinned: true, d: -3 },
    { title: "Répétition générale de la chorale", body: "Répétition générale vendredi à 16h à la salle de musique. Merci d'être à l'heure.", audience: "GROUP", groupId: groups[4].id, priority: "NORMAL", d: -1 },
    { title: "Formation premiers secours obligatoire", body: "Tous les moniteurs doivent participer à la session de formation premiers secours lors de la prochaine réunion générale.", audience: "MONITORS", priority: "URGENT", d: -4 },
    { title: "Bienvenue à tous les enfants !", body: "Une nouvelle année pleine de jeux, de chants et de découvertes commence. Amusez-vous bien !", audience: "KIDS", priority: "NORMAL", isPinned: true, d: -20 },
    { title: "Horaires d'été du siège", body: "Le siège est ouvert du lundi au samedi de 9h à 13h et de 16h à 19h.", audience: "ALL", priority: "NORMAL", d: -10 },
  ];
  for (const a of annDefs) {
    await db.announcement.create({ data: { title: a.title, body: a.body, audience: a.audience, groupId: a.groupId, priority: a.priority, isPinned: a.isPinned ?? false, publishedAt: daysFromNow(a.d), authorId: uAdmin.id } });
  }

  const allUsers = await db.user.findMany({ include: { roles: { include: { role: true } } } });
  for (const u of allUsers) {
    const rk = u.roles.map((r) => r.role.key);
    const list: { type: string; title: string; body: string; link: string; read: boolean; d: number }[] = [
      { type: "ANNOUNCEMENT", title: "Nouvelle annonce publiée", body: "Horaires d'été du siège", link: "/dashboard/announcements", read: true, d: -10 },
      { type: "EVENT_NEW", title: "Nouvel événement : Fête de l'enfance", body: "Journée portes ouvertes sur la place de la municipalité.", link: "/dashboard/events", read: false, d: -2 },
    ];
    if (rk.includes("parent")) {
      list.push(
        { type: "PAYMENT_REMINDER", title: "Rappel de paiement", body: "Une facture arrive bientôt à échéance.", link: "/dashboard/finance/invoices", read: false, d: -1 },
        { type: "TRIP_REGISTRATION", title: "Inscription enregistrée", body: "Inscription à la sortie « Découverte de Kairouan » reçue.", link: "/dashboard/trips", read: false, d: -3 },
        { type: "ATTENDANCE", title: "Absence signalée", body: "Une absence a été enregistrée samedi dernier.", link: "/dashboard/my-children", read: true, d: -6 },
      );
    }
    if (rk.includes("accountant") || rk.includes("super_admin")) list.push({ type: "PAYMENT_CONFIRMED", title: "Paiement reçu", body: "Paiement en ligne de 35 TND reçu.", link: "/dashboard/finance/payments", read: false, d: -1 });
    if (rk.includes("monitor")) list.push({ type: "ACTIVITY", title: "Rappel : feuille de présence", body: "Pensez à faire l'appel de votre groupe ce samedi.", link: "/dashboard/attendance", read: false, d: 0 });
    if (rk.includes("kid")) list.push({ type: "ACTIVITY", title: "Nouveau badge débloqué ! ⭐", body: "Tu as gagné le badge « Explorateur ».", link: "/dashboard/achievements", read: false, d: -1 });
    await db.notification.createMany({ data: list.map((n) => ({ userId: u.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.read ? daysFromNow(n.d) : null, createdAt: daysFromNow(n.d, 9 + int(0, 8)) })) });
  }

  // Conversation parent ↔ monitor
  const conv = await db.conversation.create({
    data: {
      subject: "Sortie à Kairouan — Adam",
      participants: { create: [{ userId: parentUser.id, lastReadAt: daysFromNow(-1) }, { userId: monitorUser!.id, lastReadAt: daysFromNow(-1) }] },
    },
  });
  const msgs = [
    [parentUser.id, "Bonjour Mme Yasmine, Adam peut-il prendre son appareil photo pour la sortie à Kairouan ?", -2],
    [monitorUser!.id, "Bonjour M. Gharbi, oui bien sûr ! Il en sera responsable. Pensez aussi à la casquette 😊", -2],
    [parentUser.id, "Parfait, merci beaucoup. L'autorisation signée sera déposée samedi.", -1],
  ] as const;
  for (const [sender, body, d] of msgs) await db.message.create({ data: { conversationId: conv.id, senderId: sender, body, createdAt: daysFromNow(d, 18) } });
  const conv2 = await db.conversation.create({
    data: { subject: "Budget sortie Aïn Draham", participants: { create: [{ userId: uSuper.id }, { userId: uAcc.id }] } },
  });
  await db.message.create({ data: { conversationId: conv2.id, senderId: uAcc.id, body: "Le devis du centre de camping est arrivé : 1 200 TND d'acompte. Je valide ?", createdAt: daysFromNow(-1, 11) } });

  // Calendar entries & tasks
  await db.calendarEntry.createMany({
    data: [
      { title: "Conseil d'administration", type: "MEETING", startAt: daysFromNow(7, 18), endAt: daysFromNow(7, 20), location: "Siège ONET", audience: "STAFF", createdById: uSuper.id },
      { title: "Vacances scolaires", type: "HOLIDAY", startAt: daysFromNow(50, 0), endAt: daysFromNow(57, 0), allDay: true, audience: "ALL", createdById: uAdmin.id },
      { title: "Date limite des cotisations", type: "IMPORTANT", startAt: daysFromNow(21, 0), allDay: true, audience: "PARENTS", createdById: uAcc.id },
    ],
  });
  await db.task.createMany({
    data: [
      { title: "Préparer la liste des enfants pour Kairouan", status: "IN_PROGRESS", dueDate: daysFromNow(10), assigneeId: monitorUser!.id, groupId: groups[1].id },
      { title: "Collecter les autorisations parentales", status: "TODO", dueDate: daysFromNow(12), assigneeId: monitorUser!.id },
      { title: "Répétition costumes chorale", status: "TODO", dueDate: daysFromNow(20), assigneeId: monitorUser!.id, groupId: groups[4].id },
      { title: "Rapport d'activité du mois", status: "DONE", dueDate: daysFromNow(-3), assigneeId: monitorUser!.id },
    ],
  });

  // Join requests & contact
  await db.joinRequest.createMany({
    data: [
      { parentName: "Fatma Sassi", email: "fatma.sassi@example.tn", phone: "+216 22 345 678", childName: "Lina Sassi", childDob: dob(6), message: "Ma fille aimerait rejoindre l'atelier peinture." },
      { parentName: "Kamel Dridi", email: "kamel.dridi@example.tn", phone: "+216 50 111 222", childName: "Ziad Dridi", childDob: dob(12), message: "Intéressé par le football et les sorties." },
      { parentName: "Olfa Nasri", email: "olfa.nasri@example.tn", phone: "+216 98 765 432", childName: "Tasnim Nasri", childDob: dob(9), createdAt: daysFromNow(-1) },
    ],
  });
  await db.contactMessage.create({ data: { name: "Mourad Khelifi", email: "mourad.k@example.tn", subject: "Bénévolat", body: "Bonjour, je souhaite proposer mon aide comme bénévole pour les sorties." } });

  // Settings
  const settings: Record<string, unknown> = {
    "organization.profile": {
      name: "ONET Teboulba",
      fullName: "Organisation Nationale de l'Enfance Tunisienne — Comité local de Teboulba",
      fullNameAr: "المنظمة التونسية للطفولة — الهيئة المحلية بطبلبة",
      email: "contact@onet-teboulba.tn",
      phone: "+216 73 000 100",
      address: "Maison de l'enfance, Avenue Habib Bourguiba, 5080 Teboulba, Monastir",
      facebook: "https://facebook.com/",
      instagram: "https://instagram.com/",
      foundedYear: 1985,
    },
    "notifications.channels": ["IN_APP"],
    "payments.methods": ["CASH", "BANK_TRANSFER", "ONLINE", "CHECK"],
    "payments.bank": { bank: "Banque de démonstration", rib: "00 000 0000000000000 00", holder: "ONET Teboulba" },
    "finance.membershipFee": 60000,
  };
  for (const [key, value] of Object.entries(settings)) await db.setting.create({ data: { key, value: JSON.stringify(value) } });

  const counts = await Promise.all([db.member.count(), db.invoice.count(), db.payment.count(), db.attendance.count()]);
  console.log(`✓ seeded: ${counts[0]} members, ${counts[1]} invoices, ${counts[2]} payments, ${counts[3]} attendance rows`);
  console.log(`\nDemo accounts (password: ${PASSWORD})`);
  for (const e of ["admin", "gestion", "comptable", "moniteur", "parent", "enfant", "membre"]) console.log(`  ${e}@onet-teboulba.tn`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
