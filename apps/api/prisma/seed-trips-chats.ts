// Demo data for trip managers (participant lists, payments, a finalized list) and member chat groups.
// Called once at the end of seed.ts → main(). All people and phone numbers are fictitious.
import type { PrismaClient } from "@prisma/client";
import { formatMoney } from "@onet/shared";

const DAY = 86400_000;

export async function seedTripsAndChats(db: PrismaClient) {
  console.log("→ trip managers & chat groups");
  const now = new Date();
  const ago = (days: number, h = 10, m = 0) => {
    const d = new Date(now.getTime() - days * DAY);
    d.setHours(h, m, 0, 0);
    // "Today at 9:30" must not end up in the future when the seed runs early in the morning.
    return d > now ? new Date(now.getTime() - 20 * 60_000) : d;
  };
  const dob = (age: number, month = 3, day = 14) => new Date(now.getFullYear() - age, month, day);

  const user = (email: string) => db.user.findUnique({ where: { email }, include: { member: { select: { id: true } } } });
  const [amel, yasmine, karim, ines, accountant, gestion] = await Promise.all([
    user("membre@onet-teboulba.tn"),
    user("moniteur@onet-teboulba.tn"),
    user("karim.jaziri@onet-teboulba.tn"),
    user("ines.bouzid@onet-teboulba.tn"),
    user("comptable@onet-teboulba.tn"),
    user("gestion@onet-teboulba.tn"),
  ]);
  if (!amel?.member || !yasmine?.member || !karim?.member || !ines || !accountant || !gestion) {
    console.warn("  (demo accounts missing: trip managers & chat groups skipped)");
    return;
  }

  // ── Numbering helpers (same formats as the app) ──
  const lastMember = await db.$queryRaw<{ n: bigint | number | null }[]>`SELECT MAX(CAST(SUBSTR(membershipNumber, 5) AS INTEGER)) AS n FROM "Member" WHERE membershipNumber LIKE 'ONT-%'`;
  let memberSeq = Number(lastMember[0]?.n ?? 0);
  const nextMemberNumber = () => `ONT-${String(++memberSeq).padStart(4, "0")}`;
  const prefix = `ONET-${now.getFullYear()}-`;
  const lastInvoice = await db.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  let invoiceSeq = lastInvoice ? Number(lastInvoice.number.slice(prefix.length)) : 0;
  const nextInvoiceNumber = () => `${prefix}${String(++invoiceSeq).padStart(4, "0")}`;

  // ── Trip managers on the two next trips ──
  const upcoming = await db.trip.findMany({ where: { departAt: { gt: now }, status: { in: ["OPEN", "FULL"] } }, orderBy: { departAt: "asc" }, take: 2 });
  const assignments: [number, string[]][] = [
    [0, [amel.member.id, yasmine.member.id]],
    [1, [amel.member.id, karim.member.id]],
  ];
  for (const [i, memberIds] of assignments) {
    const trip = upcoming[i];
    if (!trip) continue;
    for (const memberId of memberIds) await db.tripMonitor.upsert({ where: { tripId_memberId: { tripId: trip.id, memberId } }, create: { tripId: trip.id, memberId }, update: {} });
  }

  // ── Participants added by the managers, with partial payments ──
  type Person = { first: string; last: string; age: number; type?: "CHILD" | "MEMBER"; phone?: string; parent?: { first: string; last: string; phone: string; relation: string }; paid: number; method?: string };
  const people: [number, Person[]][] = [
    [
      0,
      [
        { first: "Mariem", last: "Ben Amor", age: 10, parent: { first: "Leila", last: "Ben Amor", phone: "+216 55 210 330", relation: "MOTHER" }, paid: 0.5, method: "CASH" },
        { first: "Taha", last: "Mabrouk", age: 12, parent: { first: "Fathi", last: "Mabrouk", phone: "+216 98 402 117", relation: "FATHER" }, paid: 0 },
        { first: "Bilel", last: "Hadj Ali", age: 19, type: "MEMBER", phone: "+216 29 333 418", paid: 1, method: "CASH" },
      ],
    ],
    [
      1,
      [
        { first: "Eya", last: "Sassi", age: 13, parent: { first: "Sonia", last: "Sassi", phone: "+216 22 908 641", relation: "MOTHER" }, paid: 0.5, method: "BANK_TRANSFER" },
        { first: "Iyed", last: "Khelifi", age: 14, parent: { first: "Mourad", last: "Khelifi", phone: "+216 50 774 210", relation: "FATHER" }, paid: 0 },
      ],
    ],
  ];
  for (const [i, list] of people) {
    const trip = upcoming[i];
    if (!trip) continue;
    for (const [k, p] of list.entries()) {
      const member = await db.member.create({
        data: { type: p.type ?? "CHILD", firstName: p.first, lastName: p.last, dateOfBirth: dob(p.age, (k * 4) % 12, 5 + k), phone: p.phone ?? null, membershipNumber: nextMemberNumber(), membershipStatus: "ACTIVE" },
      });
      let payerId = member.id;
      if (p.parent) {
        const parent = await db.member.create({
          data: { type: "PARENT", firstName: p.parent.first, lastName: p.parent.last, phone: p.parent.phone, membershipNumber: nextMemberNumber(), membershipStatus: "ACTIVE" },
        });
        await db.guardianship.create({ data: { parentId: parent.id, childId: member.id, relation: p.parent.relation, isPrimary: true } });
        payerId = parent.id;
      }
      const issued = ago(6 - k, 18);
      const paidAmount = Math.round((trip.price * p.paid) / 1000) * 1000;
      const status = trip.price === 0 || paidAmount >= trip.price ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";
      // One payment per person: a fully paid invoice is paid when that payment was recorded.
      const paymentAt = ago(3 - Math.min(k, 2), 17);
      const invoice =
        trip.price > 0
          ? await db.invoice.create({
              data: {
                number: nextInvoiceNumber(),
                payerId,
                childId: member.id,
                tripId: trip.id,
                amount: trip.price,
                description: `Sortie : ${trip.title} — ${p.first} ${p.last}`,
                issuedAt: issued,
                dueDate: trip.registrationDeadline ?? trip.departAt,
                status,
                paidAt: status === "PAID" ? paymentAt : null,
              },
            })
          : null;
      if (invoice && paidAmount > 0) {
        await db.payment.create({ data: { invoiceId: invoice.id, amount: paidAmount, method: p.method ?? "CASH", provider: "manual", paidAt: paymentAt, recordedById: amel.id, notes: "Encaissé par la responsable de la sortie" } });
      }
      await db.tripRegistration.create({
        data: { tripId: trip.id, memberId: member.id, invoiceId: invoice?.id, status: !invoice || status === "PAID" ? "CONFIRMED" : "PENDING", parentConsent: true, documentsStatus: k === 0 ? "COMPLETE" : "PARTIAL", registeredById: amel.id, createdAt: issued },
      });
    }
  }

  // ── A past trip whose list was finalized: the accountants already got the report ──
  const past = await db.trip.findFirst({ where: { returnAt: { lt: now }, status: "COMPLETED" }, orderBy: { departAt: "desc" } });
  if (past) {
    await db.tripMonitor.upsert({ where: { tripId_memberId: { tripId: past.id, memberId: yasmine.member.id } }, create: { tripId: past.id, memberId: yasmine.member.id }, update: {} });
    const closedAt = new Date(past.departAt.getTime() - 2 * DAY);
    await db.trip.update({ where: { id: past.id }, data: { listClosedAt: closedAt, listClosedById: yasmine.id } });
    // Everyone on a finalized list registered before it was closed (the main seed dates them "now").
    const late = await db.tripRegistration.findMany({ where: { tripId: past.id, createdAt: { gte: closedAt } }, orderBy: { id: "asc" }, select: { id: true } });
    for (const [i, r] of late.entries()) await db.tripRegistration.update({ where: { id: r.id }, data: { createdAt: new Date(closedAt.getTime() - (3 + (i % 10)) * DAY - i * 3600_000) } });
    const regs = await db.tripRegistration.findMany({
      where: { tripId: past.id, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { invoice: { select: { amount: true, status: true, payments: { select: { amount: true, status: true } } } } },
    });
    let collected = 0;
    let outstanding = 0;
    for (const r of regs) {
      if (!r.invoice || r.invoice.status === "CANCELLED") continue;
      const paid = r.invoice.payments.filter((x) => x.status === "COMPLETED").reduce((s, x) => s + x.amount, 0);
      collected += paid;
      outstanding += Math.max(0, r.invoice.amount - paid);
    }
    const recipients = await db.user.findMany({ where: { roles: { some: { role: { key: { in: ["accountant", "admin", "super_admin"] } } } } }, select: { id: true } });
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "TRIP_REGISTRATION",
        title: `Liste finalisée : ${past.title}`,
        body: `${regs.length} participants · encaissé ${formatMoney(collected, "fr")} · reste ${formatMoney(outstanding, "fr")} — par ${yasmine.name}`,
        link: `/dashboard/trips/${past.id}/report`,
        createdAt: closedAt,
        readAt: r.id === accountant.id ? null : closedAt,
      })),
    });
  }

  // ── Chat groups among members ──
  type Msg = [userId: string, body: string, daysAgo: number, hour: number];
  async function group(title: string, creatorId: string, memberIds: string[], msgs: Msg[], unreadFor: string[] = []) {
    const last = msgs.at(-1);
    const lastAt = last ? ago(last[2], last[3], 30) : ago(1);
    const conv = await db.conversation.create({
      data: {
        kind: "GROUP",
        subject: title,
        createdById: creatorId,
        createdAt: msgs[0] ? ago(msgs[0][2] + 1) : ago(2),
        participants: {
          create: [creatorId, ...memberIds.filter((id) => id !== creatorId)].map((userId) => ({
            userId,
            isAdmin: userId === creatorId,
            // Everyone has read the thread except the people listed in `unreadFor` (they miss the last message).
            lastReadAt: unreadFor.includes(userId) ? new Date(lastAt.getTime() - 60_000) : lastAt,
          })),
        },
      },
    });
    for (const [senderId, body, d, h] of msgs) await db.message.create({ data: { conversationId: conv.id, senderId, body, createdAt: ago(d, h, 30) } });
    await db.conversation.update({ where: { id: conv.id }, data: { updatedAt: lastAt } });
    if (last) {
      const sender = [amel, yasmine, karim, ines, gestion].find((u) => u?.id === last[0]);
      await db.notification.createMany({
        data: unreadFor.map((userId) => ({ userId, type: "MESSAGE", title: `${sender?.name ?? ""} · ${title}`, body: last[1], link: `/dashboard/messages?c=${conv.id}`, createdAt: lastAt })),
      });
    }
    return conv;
  }

  await group(
    "Bureau des moniteurs",
    amel.id,
    [yasmine.id, karim.id, ines.id, gestion.id],
    [
      [amel.id, "Bonjour à tous ! Je crée ce groupe pour coordonner nos activités de la saison.", 6, 9],
      [gestion.id, "Excellente idée. Pensez à remplir les feuilles de présence chaque samedi.", 6, 11],
      [yasmine.id, "Bien noté. Qui s'occupe du matériel pour l'atelier peinture ?", 4, 18],
      [karim.id, "Je passe à la librairie jeudi, je prends pinceaux et papier.", 4, 19],
      [amel.id, "Merci Karim ! Réunion de préparation samedi à 9h au siège.", 1, 20],
    ],
  );
  await group(
    "Équipe chorale",
    yasmine.id,
    [amel.id, ines.id],
    [
      [yasmine.id, "Répétition générale vendredi à 16h, salle de musique.", 3, 17],
      [ines.id, "Je ramène les carnets de paroles imprimés.", 3, 18],
      [yasmine.id, "Parfait. Amel, peux-tu préparer la liste des enfants pour le spectacle ?", 0, 9],
    ],
    [amel.id],
  );
  if (upcoming[0]) {
    await group(
      `Sortie ${upcoming[0].destination} — responsables`,
      amel.id,
      [yasmine.id],
      [
        [amel.id, `J'ai ajouté trois participants pour ${upcoming[0].title}. Il reste des paiements à encaisser.`, 2, 19],
        [yasmine.id, "Je relance les parents samedi après l'activité.", 2, 20],
      ],
    );
  }
}
