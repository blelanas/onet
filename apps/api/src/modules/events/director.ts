import { z } from "zod";
import { db } from "@api/lib/db";
import { ActionError } from "@api/lib/actions";
import type { NotifyClient } from "@api/lib/services/notifications";
import { notifyLocalized } from "@api/modules/registrations/notify";
import { TEAM_ELIGIBLE } from "./teams";

/**
 * The director of an event (Event.directorId): one animator who gets a team leader's rights on the event and
 * manages all its teams and kids (see access.ts). Chosen among the team candidates (TEAM_ELIGIBLE).
 */

/** Form field: missing → undefined (keep the current director), "" / null → null (no director), else a member id. */
export const directorField = z.preprocess((v) => (v === undefined ? undefined : v === "" || v === null ? null : v), z.string().min(1).max(64).nullable().optional());

/**
 * A newly chosen director must be eligible (an ACTIVE animator whose login, if any, is active). Keeping the
 * current director is always accepted, so saving the event never fails because they were suspended since
 * (a suspended director has no rights anyway).
 */
export async function assertDirectorEligible(directorId: string | null | undefined, currentId: string | null = null) {
  if (!directorId || directorId === currentId) return;
  if (!(await db.member.count({ where: { id: directorId, ...TEAM_ELIGIBLE } }))) throw new ActionError("errors.directorIneligible");
}

/** In-app notification to a newly assigned director (when they have a login, unless they chose themselves), linking to the event. */
export async function notifyDirectorAssigned(directorId: string, event: { id: string; title: string }, actorUserId: string, client: NotifyClient = db) {
  const m = await client.member.findUnique({ where: { id: directorId }, select: { userId: true } });
  if (!m?.userId || m.userId === actorUserId) return;
  await notifyLocalized([m.userId], "EVENT_NEW", `/dashboard/events/${event.id}`, (t) => ({ title: t("notify.directorAssigned", { title: event.title }), body: t("notify.directorAssignedBody") }), "events", client);
}
