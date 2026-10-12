import { Router } from "express";
import { toCsv, toDateInput } from "@onet/shared";
import { requirePermission } from "@api/lib/auth/guards";
import { audit } from "@api/lib/audit";
import { mutation, param, qs, query, sendCsv } from "@api/lib/http";
import { slugify } from "@api/lib/utils";
import { assertCanSeeKids } from "@api/modules/events/access";
import { getEvent } from "@api/modules/events/queries";
import { editionKids, editionKidsPage, kidCandidatesPage, kidFilters, kidHistoryPage, kidsPage, listKids } from "./queries";
import { addKid, removeKid, setKidTeam, updateKid } from "./actions";

/** kids module routes (mounted under /api): the kids of an edition, the kids directory and kid history. */
export const router = Router();

const RELATION_HEADER = "relation";

// ── Kids of an edition ──
router.get(
  "/events/:id/kids/export.csv",
  query(async (req, res) => {
    const user = await requirePermission("events.read");
    const id = param(req, "id");
    const e = await getEvent(user, id);
    await assertCanSeeKids(user, id);
    const rows = await editionKids(id, { q: qs(req, "q"), teamId: qs(req, "teamId") });
    await audit(user.id, "export", "EventRegistration", id, { kids: rows.length });
    sendCsv(
      res,
      `enfants-${slugify(e.title)}.csv`,
      toCsv([
        ["membershipNumber", "firstName", "lastName", "dateOfBirth", "age", "gender", "team", "parent", RELATION_HEADER, "parentPhone", "medicalNotes", "status"],
        ...rows.map((r) => [
          r.member.membershipNumber,
          r.member.firstName,
          r.member.lastName,
          toDateInput(r.member.dateOfBirth),
          r.member.age,
          r.member.gender,
          r.team?.name,
          r.guardian?.name,
          r.guardian?.relation,
          r.guardian?.phone,
          r.medicalNotes,
          r.status,
        ]),
      ]),
    );
  }),
);
router.get("/events/:id/kids/candidates", query(kidCandidatesPage));
router.get("/events/:id/kids", query(editionKidsPage));
router.post(
  "/events/:id/kids",
  mutation((req) => addKid({ ...req.body, eventId: param(req, "id") })),
);
router.post(
  "/events/:id/kids/:registrationId/team",
  mutation((req) => setKidTeam({ ...req.body, eventId: param(req, "id"), registrationId: param(req, "registrationId") })),
);
router.delete(
  "/events/:id/kids/:registrationId",
  mutation((req) => removeKid(param(req, "id"), param(req, "registrationId"))),
);

// ── Kids directory ──
router.get(
  "/kids/export.csv",
  query(async (req, res) => {
    const user = await requirePermission("members.read");
    const { rows } = await listKids(user, kidFilters(req));
    await audit(user.id, "export", "Member", null, { kids: rows.length });
    sendCsv(
      res,
      `onet-enfants-${toDateInput(new Date())}.csv`,
      toCsv([
        ["membershipNumber", "firstName", "lastName", "dateOfBirth", "age", "gender", "parent", RELATION_HEADER, "parentPhone", "latestSeries", "latestEdition", "latestYear", "latestTeam", "editions", "medicalNotes"],
        ...rows.map((r) => [
          r.member.membershipNumber,
          r.member.firstName,
          r.member.lastName,
          toDateInput(r.member.dateOfBirth),
          r.member.age,
          r.member.gender,
          r.guardian?.name,
          r.guardian?.relation,
          r.guardian?.phone,
          r.latestEdition?.series?.name,
          r.latestEdition?.title,
          r.latestEdition?.year,
          r.latestEdition?.team?.name,
          r.editionsCount,
          r.medicalNotes,
        ]),
      ]),
    );
  }),
);
router.get("/kids", query(kidsPage));
router.get("/kids/:id/history", query(kidHistoryPage));
router.post(
  "/kids/:id",
  mutation((req) => updateKid({ ...req.body, id: param(req, "id") })),
);
