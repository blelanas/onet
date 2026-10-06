import type { OrgProfile } from "@api/modules/public/queries";
import { useApi } from "@/lib/query";

const FALLBACK: OrgProfile = { name: "ONET Teboulba" };

/** Public organisation profile (contact details, social links), shared by the layout and pages. */
export function useOrg(): OrgProfile {
  return useApi<OrgProfile>("/public/org").data ?? FALLBACK;
}
