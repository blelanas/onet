import type { groupPage } from "@api/modules/groups/routes";
import type { Loaded } from "@/lib/types";

/** The group as loaded by GET /groups/:id (shared by the detail page and its tabs). */
export type Group = Loaded<typeof groupPage>["group"];
