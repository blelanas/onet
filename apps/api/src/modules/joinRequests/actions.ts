import { revalidatePath } from "@api/lib/cache";
import { z } from "zod";
import { db } from "@api/lib/db";
import { requirePermission } from "@api/lib/auth/guards";
import { ActionError, formToObject, runAction, zs } from "@api/lib/actions";
import { audit } from "@api/lib/audit";
import { ageFrom } from "@api/lib/utils";
import { nextMembershipNumber } from "../members/actions";
import { activeGroupsWithCapacity, groupForAge } from "./queries";

/** "Fatma Ben Salah" → { firstName: "Fatma", lastName: "Ben Salah" } */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const approveSchema = z.object({ id: zs.id, groupId: zs.optId });

/**
 * Approve a join request: creates (or reuses, by e-mail) the PARENT member, creates the CHILD
 * member when a child was declared (linked by Guardianship, placed in the chosen group or the
 * group matching their age), and marks the request APPROVED — all in one transaction.
 */
export async function approveJoinRequest(fd: FormData | Record<string, unknown>) {
  return runAction(approveSchema, formToObject(fd), async ({ id, groupId }) => {
    const user = await requirePermission("members.manage");
    const result = await db.$transaction(async (tx) => {
      const req = await tx.joinRequest.findUnique({ where: { id } });
      if (!req) throw new ActionError("errors.notFound");
      if (req.status !== "PENDING") throw new ActionError("errors.alreadyRegistered");
      const email = req.email.trim().toLowerCase();

      const existing = await tx.member.findFirst({ where: { email, type: { in: ["PARENT", "MEMBER", "STAFF", "MONITOR"] } }, select: { id: true } });
      const parent =
        existing ??
        (await tx.member.create({
          data: { type: "PARENT", ...splitName(req.parentName), email, phone: req.phone, membershipNumber: await nextMembershipNumber(tx), membershipStatus: "ACTIVE", notes: req.message ?? null },
          select: { id: true },
        }));

      let childId: string | null = null;
      if (req.childName?.trim()) {
        const groups = await activeGroupsWithCapacity(tx);
        const chosen = groupId ? groups.find((g) => g.id === groupId) : groupForAge(groups.filter((g) => !g.full), ageFrom(req.childDob));
        if (groupId && !chosen) throw new ActionError("errors.validation");
        if (chosen?.full) throw new ActionError("errors.capacityFull");
        const names = splitName(req.childName);
        const child = await tx.member.create({
          data: {
            type: "CHILD",
            firstName: names.firstName,
            // A single-word child name inherits the family name of the parent.
            lastName: req.childName.trim().includes(" ") ? names.lastName : splitName(req.parentName).lastName,
            dateOfBirth: req.childDob,
            membershipNumber: await nextMembershipNumber(tx),
            membershipStatus: "ACTIVE",
            groupId: chosen?.id ?? null,
            emergencyName: req.parentName,
            emergencyPhone: req.phone,
          },
          select: { id: true },
        });
        await tx.guardianship.create({ data: { parentId: parent.id, childId: child.id, relation: "PARENT", isPrimary: true } });
        childId = child.id;
      }

      await tx.joinRequest.update({ where: { id }, data: { status: "APPROVED", processedAt: new Date() } });
      return { parentId: parent.id, childId, reusedParent: !!existing };
    });
    await audit(user.id, "approve", "JoinRequest", id, result);
    revalidatePath("/dashboard", "layout");
    return result;
  });
}

export async function rejectJoinRequest(id: string) {
  return runAction(zs.id, id, async (reqId) => {
    const user = await requirePermission("members.manage");
    const { count } = await db.joinRequest.updateMany({ where: { id: reqId, status: "PENDING" }, data: { status: "REJECTED", processedAt: new Date() } });
    if (!count) throw new ActionError("errors.notFound");
    await audit(user.id, "reject", "JoinRequest", reqId);
    revalidatePath("/dashboard/join-requests");
  });
}
