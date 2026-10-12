// Demo data of the members platform: the local bureau shown on the landing page, dances of the
// "baggage", and what members told at sign-up (occupation, date of birth). Called at the end of
// seed.ts main(). All people are fictitious.
import type { PrismaClient } from "@prisma/client";
import { SONG_TRACKS, trackInfo } from "./demo-media";
import { bureauPhotoUrl, danceImageUrl } from "./demo-media-members";

const DAY = 86400_000;
/** A date of birth (UTC midnight) giving exactly `age` today: the birthday was `ago` (≥ 30) days ago. */
const birth = (age: number, ago = 30) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate()) - Math.max(30, ago) * DAY);
};

/** Local bureau (أعضاء المكتب المحلي), in display order; portraits in demo-media-members.ts. */
const BUREAU = [
  { name: "Samia Trabelsi", nameAr: "سامية الطرابلسي", position: "Présidente du bureau", positionAr: "رئيسة المكتب" },
  { name: "Hichem Jaziri", nameAr: "هشام الجزيري", position: "Vice-président", positionAr: "نائب الرئيس" },
  { name: "Anis Mejri", nameAr: "أنيس الماجري", position: "Secrétaire général", positionAr: "الكاتب العام" },
  { name: "Kamel Bouzid", nameAr: "كمال بوزيد", position: "Trésorier", positionAr: "أمين المال" },
  { name: "Olfa Hamdi", nameAr: "ألفة حمدي", position: "Responsable des activités", positionAr: "مسؤولة الأنشطة" },
  { name: "Walid Sassi", nameAr: "وليد ساسي", position: "Responsable de la communication", positionAr: "مسؤول الإعلام" },
];

const DANCES = [
  {
    title: "رقصة الدبكة",
    description: "رقصة تراثية جماعية على إيقاع الطبل، يمسك فيها الراقصون بأيدي بعضهم في صفّ واحد.",
    steps: ["نقف في صف واحد ونمسك الأيدي، الكتف إلى الكتف.", "خطوة جانبية إلى اليمين ثم نضمّ القدم اليسرى.", "ضربة قوية بالقدم اليمنى على الأرض مع الإيقاع.", "قفزة صغيرة في المكان ثم نعيد الحركة إلى اليسار.", "قائد الصف يلوّح بالمنديل ويغيّر السرعة، والجميع يتبعه."],
    category: "TRADITIONAL",
    ageGroup: "8-12",
    durationMin: 6,
    audio: 4,
  },
  {
    title: "La danse des canards",
    description: "Une danse rigolote pour les plus petits : on imite le canard, on bat des ailes et on tourne !",
    steps: ["Les mains en bec de canard : on ouvre et on ferme quatre fois.", "Les coudes en ailes : on bat des ailes quatre fois.", "On se baisse en remuant la queue, puis on se relève.", "On tape quatre fois dans les mains.", "On prend la main d'un ami et on tourne en rond, puis on recommence."],
    category: "KIDS",
    ageGroup: "4-7",
    durationMin: 4,
    audio: 1,
  },
  {
    title: "حلقة الصداقة",
    description: "رقصة دائرية لكسر الجليد في بداية التظاهرات: كل طفل يقدّم اسمه بحركة.",
    steps: ["نشكّل دائرة كبيرة ونمسك الأيدي.", "ندور أربع خطوات إلى اليمين ثم أربع خطوات إلى اليسار.", "نتقدّم إلى وسط الدائرة ونرفع الأيدي عاليًا ثم نتراجع.", "يقول كل طفل اسمه مع حركة، ويكرّرها الجميع.", "نختم بتصفيقة جماعية كبيرة."],
    category: "GROUP",
    ageGroup: "ALL",
    durationMin: 10,
    audio: 2,
  },
  {
    title: "Flash mob ONET",
    description: "Une chorégraphie moderne et énergique à présenter par surprise lors des fêtes de l'association.",
    steps: ["Entrée un par un, en marchant au rythme, regard vers le public.", "Bloc 1 : pas chassés à droite et à gauche, bras qui balancent.", "Bloc 2 : quart de tour, saut groupé, bras en V.", "Bloc 3 : vague humaine d'un bout à l'autre de la ligne.", "Final : tous ensemble, pose figée et sourire !"],
    category: "MODERN",
    ageGroup: "13-17",
    durationMin: 5,
    audio: null,
  },
  {
    title: "عرض تونس في عيد",
    description: "لوحة استعراضية لحفل آخر السنة تجمع رقصات من جهات تونس وأزياءها التقليدية.",
    steps: ["افتتاح بالأعلام على أنغام النشيد.", "لوحة الساحل: حركات المناديل والقفز الخفيف.", "لوحة الجنوب: خطوات بطيئة وتمايل الأكتاف.", "لوحة الشمال: دوران ثنائي وتصفيق.", "الختام: كل الفرق على الركح وتحية الجمهور."],
    category: "SHOW",
    ageGroup: "8-12",
    durationMin: 12,
    audio: null,
  },
];

/** Occupation of the seeded members and monitors (by e-mail), then a default for the others. */
const OCCUPATIONS_BY_EMAIL: Record<string, { occupation: string; occupationDetail: string }> = {
  "membre@onet-teboulba.tn": { occupation: "WORKER", occupationDetail: "Institutrice — école primaire de Teboulba" },
  "moniteur@onet-teboulba.tn": { occupation: "STUDENT", occupationDetail: "Université de Monastir — Licence en sciences de l'éducation" },
  "karim.jaziri@onet-teboulba.tn": { occupation: "WORKER", occupationDetail: "Professeur d'éducation physique" },
  "ines.bouzid@onet-teboulba.tn": { occupation: "STUDENT", occupationDetail: "Faculté de médecine de Monastir — 3e année" },
  "wassim.hamdi@onet-teboulba.tn": { occupation: "STUDENT", occupationDetail: "Lycée de Teboulba — Bac sciences" },
  "salma.ayari@onet-teboulba.tn": { occupation: "OTHER", occupationDetail: "Diplômée en design, en recherche d'emploi" },
};
const DEFAULT_OCCUPATIONS = [
  { occupation: "STUDENT", occupationDetail: "ISET Mahdia — Informatique" },
  { occupation: "WORKER", occupationDetail: "Infirmière" },
  { occupation: "OTHER", occupationDetail: "Bénévole associatif" },
];

/** People waiting for approval: what they answered at sign-up. */
const PENDING_PROFILES: Record<string, { dateOfBirth: Date; occupation: string; occupationDetail: string }> = {
  "rania.ferchichi@example.tn": { dateOfBirth: birth(19, 120), occupation: "STUDENT", occupationDetail: "ISET Mahdia — Informatique" },
  "bilel.lassoued@example.tn": { dateOfBirth: birth(24, 45), occupation: "WORKER", occupationDetail: "Menuisier" },
};

async function nextMembershipNumber(db: PrismaClient) {
  const rows = await db.$queryRaw<{ n: bigint | number | null }[]>`SELECT MAX(CAST(SUBSTR(membershipNumber, 5) AS INTEGER)) AS n FROM "Member" WHERE membershipNumber LIKE 'ONT-%'`;
  return `ONT-${String(Number(rows[0]?.n ?? 0) + 1).padStart(4, "0")}`;
}

export async function seedMembersContent(db: PrismaClient) {
  console.log("→ local bureau, dances, member profiles");

  // Local bureau (landing page).
  await db.bureauMember.deleteMany();
  await db.bureauMember.createMany({ data: BUREAU.map((b, i) => ({ ...b, photoUrl: bureauPhotoUrl(i), sortOrder: i, isActive: true })) });

  // Dances (baggage).
  await db.dance.deleteMany();
  const admin = await db.user.findUnique({ where: { email: "admin@onet-teboulba.tn" }, select: { id: true } });
  for (const [i, d] of DANCES.entries()) {
    await db.dance.create({
      data: {
        title: d.title,
        description: d.description,
        steps: d.steps.join("\n"),
        category: d.category,
        ageGroup: d.ageGroup,
        durationMin: d.durationMin,
        imageUrl: danceImageUrl(i),
        audioUrl: d.audio != null ? trackInfo(SONG_TRACKS[d.audio]).url : null,
        isPublic: i !== 3,
        createdById: admin?.id ?? null,
        createdAt: new Date(Date.now() - (DANCES.length - i) * 7 * DAY),
      },
    });
  }

  // Members and monitors: occupation (+ school / job) and a date of birth, as asked at sign-up.
  const people = await db.member.findMany({ where: { type: { in: ["MEMBER", "MONITOR"] } }, orderBy: { membershipNumber: "asc" }, select: { id: true, email: true, dateOfBirth: true } });
  for (const [i, m] of people.entries()) {
    const occ = (m.email && OCCUPATIONS_BY_EMAIL[m.email]) || DEFAULT_OCCUPATIONS[i % DEFAULT_OCCUPATIONS.length];
    await db.member.update({ where: { id: m.id }, data: { ...occ, dateOfBirth: m.dateOfBirth ?? birth(20 + (i % 12), 30 + ((i * 37) % 300)) } });
  }

  // Sign-ups waiting for approval request the member role and keep their answers on a PENDING Member
  // (what the self sign-up now does).
  const pending = await db.user.findMany({ where: { status: "PENDING" }, select: { id: true, name: true, email: true, phone: true, member: { select: { id: true } } } });
  for (const u of pending) {
    await db.user.update({ where: { id: u.id }, data: { requestedRole: "member" } });
    if (u.member) continue;
    const [firstName, ...rest] = u.name.split(" ");
    const profile = PENDING_PROFILES[u.email] ?? { dateOfBirth: birth(22, 90), occupation: "OTHER", occupationDetail: "Bénévole" };
    await db.member.create({
      data: { type: "MEMBER", firstName, lastName: rest.join(" ") || firstName, email: u.email, phone: u.phone, userId: u.id, membershipNumber: await nextMembershipNumber(db), membershipStatus: "PENDING", ...profile },
    });
  }
  // Invitation links and the pre-approved list now only grant the member role.
  await db.invitation.updateMany({ where: { role: "monitor" }, data: { role: "member" } });
  await db.preapprovedPerson.updateMany({ where: { role: "monitor", usedById: null }, data: { role: "member" } });
}
