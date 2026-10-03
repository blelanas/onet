import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Click on a notification: mark it read (own notifications only) and follow its internal link. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = new URL(req.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  const n = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return NextResponse.redirect(new URL("/dashboard/notifications", base));
  if (!n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  // Only same-origin paths are followed (no open redirect).
  const target = n.link && /^\/(?![\/\\])/.test(n.link) ? n.link : "/dashboard/notifications";
  return NextResponse.redirect(new URL(target, base));
}
