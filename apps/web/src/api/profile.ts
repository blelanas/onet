// Profile mutations (own account) — same signatures as the former server actions.
import { formAction } from "@/lib/api";

export const updateProfile = formAction("POST", "/profile");
/** Changes the password and signs out every other session (the current one stays valid). */
export const changePassword = formAction("POST", "/profile/password");
