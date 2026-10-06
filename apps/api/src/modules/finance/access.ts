import type { Prisma } from "@prisma/client";
import { AuthError, can, requireUser } from "@api/lib/auth/guards";
import { getCurrentUser, type CurrentUser } from "@api/lib/auth/session";
import { myChildren } from "@api/lib/auth/scope";

/**
 * Finance access model.
 *  - "staff": finance.read → every invoice/payment (finance.manage additionally allows mutations)
 *  - "family": invoices.pay → invoices where they are the payer or the child is one of their children
 * Kids (role or CHILD member) never reach finance, whatever their grants.
 */
export type FinanceMode = "staff" | "family";

function isKid(user: CurrentUser) {
  return user.roles.includes("kid") || user.memberType === "CHILD";
}

export function financeMode(user: CurrentUser): FinanceMode | null {
  if (isKid(user)) return null;
  if (can(user, "finance.read")) return "staff";
  if (can(user, "invoices.pay") && user.memberId) return "family";
  return null;
}

export function canManageFinance(user: CurrentUser) {
  return financeMode(user) === "staff" && can(user, "finance.manage");
}

/** Page loaders: user + mode, 403 otherwise (the web app shows the forbidden state). */
export async function requireFinancePage(opts: { staffOnly?: boolean } = {}) {
  const user = await requireUser();
  const mode = financeMode(user);
  if (!mode || (opts.staffOnly && mode !== "staff")) throw new AuthError("FORBIDDEN");
  return { user, mode };
}

/** Actions / route handlers: throws AuthError. */
export async function requireFinance(opts: { manage?: boolean; staffOnly?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  const mode = financeMode(user);
  if (!mode) throw new AuthError("FORBIDDEN");
  if ((opts.staffOnly || opts.manage) && mode !== "staff") throw new AuthError("FORBIDDEN");
  if (opts.manage && !can(user, "finance.manage")) throw new AuthError("FORBIDDEN");
  return { user, mode };
}

/** Invoice `where` restricting rows to what the user may see. */
export async function invoiceScope(user: CurrentUser): Promise<Prisma.InvoiceWhereInput> {
  const mode = financeMode(user);
  if (mode === "staff") return {};
  if (mode !== "family" || !user.memberId) return { id: "__none__" };
  const kids = await myChildren(user);
  return {
    status: { not: "DRAFT" },
    OR: [{ payerId: user.memberId }, ...(kids.length ? [{ childId: { in: kids.map((k) => k.id) } }] : [])],
  };
}
