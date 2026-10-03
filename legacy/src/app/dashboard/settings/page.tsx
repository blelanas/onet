import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { allowedSections } from "@/components/settings/sections";

export default async function SettingsIndex() {
  const user = await requireUser();
  const first = allowedSections(user.permissions)[0];
  redirect(first ? first.href : "/dashboard/forbidden");
}
