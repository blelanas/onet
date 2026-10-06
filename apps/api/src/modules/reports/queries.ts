import { db } from "@api/lib/db";
import { ageFrom } from "@api/lib/utils";

export const AGE_BRACKETS = ["0-6", "7-9", "10-12", "13-15", "16-17", "18+"] as const;

function bracket(age: number | null) {
  if (age == null) return null;
  if (age <= 6) return "0-6";
  if (age <= 9) return "7-9";
  if (age <= 12) return "10-12";
  if (age <= 15) return "13-15";
  if (age <= 17) return "16-17";
  return "18+";
}

const ATTENDED = ["PRESENT", "LATE"];

function monthKeys(n: number) {
  const out: { key: string; date: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, date: d });
  }
  return out;
}

export async function membersReport() {
  const members = await db.member.findMany({
    select: { id: true, type: true, gender: true, dateOfBirth: true, membershipStatus: true, membershipDate: true, groupId: true },
  });
  const groups = await db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true, capacity: true, isActive: true } });
  const children = members.filter((m) => m.type === "CHILD");
  const count = <T,>(rows: T[], key: (r: T) => string | null) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const byType = count(members, (m) => m.type);
  const byStatus = count(members, (m) => m.membershipStatus);
  const byGender = count(children, (m) => m.gender ?? "UNKNOWN");
  const byAge = count(children, (m) => bracket(ageFrom(m.dateOfBirth)) ?? "UNKNOWN");
  const byGroup = count(children, (m) => m.groupId ?? "NONE");
  const months = monthKeys(12);
  const perMonth = months.map(({ key, date }) => {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const inMonth = members.filter((m) => m.membershipDate >= date && m.membershipDate < next);
    return { key, date, children: inMonth.filter((m) => m.type === "CHILD").length, others: inMonth.filter((m) => m.type !== "CHILD").length };
  });
  const startOfMonth = months[months.length - 1].date;
  return {
    total: members.length,
    children: children.length,
    active: byStatus.get("ACTIVE") ?? 0,
    inactive: members.length - (byStatus.get("ACTIVE") ?? 0),
    newThisMonth: members.filter((m) => m.membershipDate >= startOfMonth).length,
    byType: Object.fromEntries(byType),
    byStatus: Object.fromEntries(byStatus),
    byGender: Object.fromEntries(byGender),
    byAge: [...AGE_BRACKETS, "UNKNOWN"].map((b) => ({ bracket: b, count: byAge.get(b) ?? 0 })).filter((b) => b.bracket !== "UNKNOWN" || b.count > 0),
    byGroup: [
      ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color, capacity: g.capacity, count: byGroup.get(g.id) ?? 0 })),
      ...(byGroup.get("NONE") ? [{ id: "NONE", name: "", color: "#94a3b8", capacity: 0, count: byGroup.get("NONE")! }] : []),
    ],
    perMonth,
  };
}

function rate(rows: { status: string; _count: { _all: number } }[]) {
  const total = rows.reduce((s, r) => s + r._count._all, 0);
  const attended = rows.filter((r) => ATTENDED.includes(r.status)).reduce((s, r) => s + r._count._all, 0);
  return { total, attended, rate: total ? Math.round((attended / total) * 100) : null };
}

function groupRates<K extends string>(rows: ({ status: string; _count: { _all: number } } & Record<K, string | null>)[], key: K) {
  const m = new Map<string, { status: string; _count: { _all: number } }[]>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return new Map([...m].map(([k, v]) => [k, rate(v)]));
}

export async function activitiesReport() {
  const [activities, byActivity, byGroup, groups] = await Promise.all([
    db.activity.findMany({
      where: { status: { not: "DRAFT" } },
      select: { id: true, title: true, category: true, capacity: true, status: true, groupId: true, group: { select: { name: true, color: true } }, _count: { select: { participants: true } } },
    }),
    db.attendance.groupBy({ by: ["activityId", "status"], where: { activityId: { not: null } }, _count: { _all: true } }),
    db.attendance.groupBy({ by: ["groupId", "status"], where: { groupId: { not: null } }, _count: { _all: true } }),
    db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);
  const actRates = groupRates(byActivity, "activityId");
  const grpRates = groupRates(byGroup, "groupId");
  const rows = activities
    .map((a) => {
      // Sessions are usually taken per group: fall back to the activity's group attendance.
      const own = actRates.get(a.id);
      const viaGroup = !own && a.groupId ? grpRates.get(a.groupId) : undefined;
      return {
        id: a.id,
        title: a.title,
        category: a.category,
        status: a.status,
        group: a.group,
        capacity: a.capacity,
        participants: a._count.participants,
        ...(own ?? viaGroup ?? { total: 0, attended: 0, rate: null }),
        viaGroup: !!viaGroup,
      };
    })
    .sort((a, b) => b.participants - a.participants);
  const overall = rate([...byActivity, ...byGroup].map((r) => ({ status: r.status, _count: r._count })));
  return {
    rows,
    totalParticipants: rows.reduce((s, r) => s + r.participants, 0),
    overallRate: overall.rate,
    groupRates: groups.map((g) => ({ ...g, ...(grpRates.get(g.id) ?? { total: 0, attended: 0, rate: null }) })).filter((g) => g.total > 0),
  };
}

async function collected(where: { eventId?: { not: null }; tripId?: { not: null } }) {
  return db.invoice.findMany({
    where: { ...where, status: { not: "CANCELLED" } },
    select: { eventId: true, tripId: true, amount: true, payments: { where: { status: "COMPLETED" }, select: { amount: true } } },
  });
}

export async function eventsReport() {
  const [events, invoices, attendance] = await Promise.all([
    db.event.findMany({
      orderBy: { startAt: "desc" },
      select: { id: true, title: true, category: true, startAt: true, status: true, capacity: true, price: true, registrations: { where: { status: { not: "CANCELLED" } }, select: { status: true } } },
    }),
    collected({ eventId: { not: null } }),
    db.attendance.groupBy({ by: ["eventId", "status"], where: { eventId: { not: null } }, _count: { _all: true } }),
  ]);
  const att = groupRates(attendance, "eventId");
  const rows = events.map((e) => {
    const inv = invoices.filter((i) => i.eventId === e.id);
    return {
      id: e.id,
      title: e.title,
      category: e.category,
      startAt: e.startAt,
      status: e.status,
      capacity: e.capacity,
      participants: e.registrations.filter((r) => r.status === "CONFIRMED").length,
      pending: e.registrations.filter((r) => r.status !== "CONFIRMED").length,
      expected: inv.reduce((s, i) => s + i.amount, 0),
      revenue: inv.reduce((s, i) => s + i.payments.reduce((t, p) => t + p.amount, 0), 0),
      attended: att.get(e.id)?.attended ?? 0,
      attendanceRate: att.get(e.id)?.rate ?? null,
    };
  });
  return { rows, participants: rows.reduce((s, r) => s + r.participants, 0), revenue: rows.reduce((s, r) => s + r.revenue, 0) };
}

export async function tripsReport() {
  const [trips, invoices] = await Promise.all([
    db.trip.findMany({
      orderBy: { departAt: "desc" },
      select: { id: true, title: true, destination: true, category: true, departAt: true, status: true, capacity: true, price: true, registrations: { where: { status: { not: "CANCELLED" } }, select: { status: true } } },
    }),
    collected({ tripId: { not: null } }),
  ]);
  const rows = trips.map((t) => {
    const inv = invoices.filter((i) => i.tripId === t.id);
    const expected = inv.reduce((s, i) => s + i.amount, 0);
    const revenue = inv.reduce((s, i) => s + i.payments.reduce((x, p) => x + p.amount, 0), 0);
    return {
      id: t.id,
      title: t.title,
      destination: t.destination,
      category: t.category,
      departAt: t.departAt,
      status: t.status,
      capacity: t.capacity,
      participants: t.registrations.filter((r) => r.status === "CONFIRMED").length,
      pending: t.registrations.filter((r) => r.status !== "CONFIRMED").length,
      expected,
      revenue,
      collectionRate: expected ? Math.round((revenue / expected) * 100) : null,
    };
  });
  return {
    rows,
    participants: rows.reduce((s, r) => s + r.participants, 0),
    capacity: rows.reduce((s, r) => s + r.capacity, 0),
    expected: rows.reduce((s, r) => s + r.expected, 0),
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
  };
}

export async function financeSummary() {
  const [invoiced, payments, expenses, overdue] = await Promise.all([
    db.invoice.aggregate({ where: { status: { notIn: ["CANCELLED", "DRAFT"] } }, _sum: { amount: true }, _count: { _all: true } }),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { amount: true } }),
    db.invoice.count({ where: { status: "OVERDUE" } }),
  ]);
  const income = payments._sum.amount ?? 0;
  const billed = invoiced._sum.amount ?? 0;
  return {
    invoiced: billed,
    invoiceCount: invoiced._count._all,
    collected: income,
    outstanding: Math.max(0, billed - income),
    expenses: expenses._sum.amount ?? 0,
    balance: income - (expenses._sum.amount ?? 0),
    overdue,
  };
}
