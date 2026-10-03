import { Router, type Request } from "express";
import { db } from "@api/lib/db";
import { requirePermission, can, AuthError } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, param, qs, query, sendCsv } from "@api/lib/http";
import { toCsv, toDateInput } from "@onet/shared";
import { readFormData } from "@api/modules/files/routes";
import {
  getMemberProfile,
  groupOptions,
  listMembers,
  memberAttendance,
  memberInvoices,
  memberOptions,
} from "./queries";
import {
  createMemberAccount,
  deleteMember,
  importMembers,
  linkGuardian,
  saveMember,
  unlinkGuardian,
} from "./actions";

/** members module routes (mounted under /api). */
export const router = Router();

const PAGE_SIZE = 15;

// Directory (used by /members, /children, /parents, /monitors). Children list only needs the
// scoped members.read; the other directories need members.read_all (checked from `type`).
export async function membersPage(req: Request) {
  const type = qs(req, "type");
  const user = await requirePermission(
    ...(type === "CHILD"
      ? (["members.read"] as const)
      : (["members.read_all"] as const)),
  );
  const page = Math.max(1, Number(qs(req, "page")) || 1);
  const [{ rows, total }, groups] = await Promise.all([
    listMembers(user, {
      q: qs(req, "q"),
      type,
      status: qs(req, "status"),
      groupId: qs(req, "group"),
      sort: qs(req, "sort"),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    groupOptions(),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, groups };
}
router.get("/members", query(membersPage));

router.get(
  "/members/export.csv",
  query(async (req, res) => {
    const user = await requirePermission("members.export");
    const { rows } = await listMembers(user, {
      q: qs(req, "q"),
      type: qs(req, "type"),
      status: qs(req, "status"),
      groupId: qs(req, "group"),
    });
    await audit(user.id, "export", "Member", null, { count: rows.length });
    sendCsv(
      res,
      `onet-membres-${toDateInput(new Date())}.csv`,
      toCsv([
        [
          "membershipNumber",
          "type",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "dateOfBirth",
          "gender",
          "phone",
          "email",
          "address",
          "group",
          "membershipStatus",
          "membershipDate",
          "parents",
        ],
        ...rows.map((m) => [
          m.membershipNumber,
          m.type,
          m.firstName,
          m.lastName,
          m.firstNameAr,
          m.lastNameAr,
          toDateInput(m.dateOfBirth),
          m.gender,
          m.phone,
          m.email,
          m.address,
          m.group?.name,
          m.membershipStatus,
          toDateInput(m.membershipDate),
          m.parentLinks
            .map((p) => `${p.parent.firstName} ${p.parent.lastName}`)
            .join(" / "),
        ]),
      ]),
    );
  }),
);

/** Form-only options (all members of the given types) — staff who manage members only. */
export async function memberOptionsPage(req: Request) {
  await requirePermission("members.manage");
  const types = qs(req, "types")?.split(",").filter(Boolean);
  return { members: await memberOptions(types), groups: await groupOptions() };
}
router.get("/members/options", query(memberOptionsPage));

/** Member profile page: profile + attendance + invoices (null when not allowed) + options for staff. */
export async function memberProfilePage(req: Request) {
  const user = await requirePermission("members.read");
  const id = param(req, "id");
  const member = await getMemberProfile(user, id);
  const [attendance, invoices, parentOptions] = await Promise.all([
    can(user, "attendance.read") ? memberAttendance(id, 60) : Promise.resolve([]),
    memberInvoices(user, id),
    can(user, "members.manage") && member.type === "CHILD"
      ? memberOptions(["PARENT", "MEMBER", "STAFF", "MONITOR"])
      : Promise.resolve([]),
  ]);
  return { member, attendance, invoices, parentOptions };
}
router.get("/members/:id", query(memberProfilePage));

/** Data for the edit form. */
export async function memberFormPage(req: Request) {
  await requirePermission("members.manage");
  const member = await db.member.findUnique({
    where: { id: param(req, "id") },
    include: { parentLinks: true, monitoredGroups: true },
  });
  if (!member) throw new AuthError("NOT_FOUND");
  return {
    ...member,
    parentIds: member.parentLinks.map((p) => p.parentId),
    monitorGroupIds: member.monitoredGroups.map((g) => g.groupId),
  };
}
router.get("/members/:id/form", query(memberFormPage));

router.post(
  "/members",
  mutation((req) => saveMember(req.body)),
);
router.delete(
  "/members/:id",
  mutation((req) => deleteMember(param(req, "id"))),
);
router.post(
  "/members/:id/guardians",
  mutation((req) => linkGuardian({ ...req.body, childId: param(req, "id") })),
);
router.delete(
  "/members/:id/guardians/:parentId",
  mutation((req) => unlinkGuardian(param(req, "id"), param(req, "parentId"))),
);
router.post(
  "/members/:id/account",
  mutation((req) =>
    createMemberAccount({ ...req.body, memberId: param(req, "id") }),
  ),
);
router.post(
  "/members/import",
  mutation(async (req) => importMembers(await readFormData(req))),
);
