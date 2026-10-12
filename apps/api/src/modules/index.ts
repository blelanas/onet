import type { Router } from "express";
import { router as members } from "./members/routes";
import { router as documents } from "./documents/routes";
import { router as dashboard } from "./dashboard/routes";
import { router as search } from "./search/routes";
import { router as profile } from "./profile/routes";
import { router as joinRequests } from "./joinRequests/routes";
import { router as groups } from "./groups/routes";
import { router as activities } from "./activities/routes";
import { router as attendance } from "./attendance/routes";
import { router as calendar } from "./calendar/routes";
import { router as events } from "./events/routes";
import { router as trips } from "./trips/routes";
import { router as registrations } from "./registrations/routes";
import { router as content } from "./content/routes";
import { router as finance } from "./finance/routes";
import { router as communication } from "./communication/routes";
import { router as reports } from "./reports/routes";
import { router as settings } from "./settings/routes";
import { router as publicSite } from "./public/routes";
import { router as signup } from "./signup/routes";

/** Every feature module owns modules/<name>/routes.ts; this list only mounts them. */
export function registerModules(api: Router) {
  api.use(members);
  api.use(documents);
  api.use(dashboard);
  api.use(search);
  api.use(profile);
  api.use(joinRequests);
  api.use(groups);
  api.use(activities);
  api.use(attendance);
  api.use(calendar);
  api.use(events);
  api.use(trips);
  api.use(registrations);
  api.use(content);
  api.use(finance);
  api.use(communication);
  api.use(reports);
  api.use(settings);
  api.use(publicSite);
  api.use(signup);
}
