import { Router } from "express";
import { requireUser } from "@api/lib/auth/guards";
import { mutation, query } from "@api/lib/http";
import { myProfile } from "./queries";
import { changePassword, updateProfile } from "./actions";

/** profile module routes (mounted under /api). */
export const router = Router();

/** The signed-in user's own account, membership card and active sessions count. */
export async function profilePage() {
  const user = await requireUser();
  return myProfile(user.id);
}
router.get("/profile", query(profilePage));

router.post(
  "/profile",
  mutation((req) => updateProfile(req.body ?? {})),
);
router.post(
  "/profile/password",
  mutation((req) => changePassword(req.body ?? {})),
);
