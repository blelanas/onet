import { SIGNUP_ROLE_KEYS, type SignupRole } from "@onet/shared";

/** Member type created for an account of a given role. */
export const MEMBER_TYPE_FOR_ROLE = { parent: "PARENT", monitor: "MONITOR", member: "MEMBER" } as const;

export function isSignupRole(v: unknown): v is SignupRole {
  return typeof v === "string" && (SIGNUP_ROLE_KEYS as readonly string[]).includes(v);
}

/**
 * Phone → comparable digits, Tunisian numbers by default: "+216 22 345 678", "0021622345678" and
 * "22 345 678" all give "21622345678". Returns null for anything that isn't 8–15 digits.
 */
export function normalizePhone(v: string | null | undefined): string | null {
  if (!v) return null;
  let d = v.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = `216${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export type InvitationState = "valid" | "revoked" | "expired" | "full";

export function invitationState(inv: { revokedAt: Date | null; expiresAt: Date; uses: number; maxUses: number }, now = new Date()): InvitationState {
  if (inv.revokedAt) return "revoked";
  if (inv.expiresAt <= now) return "expired";
  if (inv.uses >= inv.maxUses) return "full";
  return "valid";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type ParsedPerson = { line: number; name: string; email: string | null; phone: string | null };
export type InvalidLine = { line: number; reason: "name" | "contact" | "email" | "phone" };

/**
 * Pre-approved list: one person per line, `Name; email; phone`, separated by `;`, `,` or a tab.
 * Email or phone may be empty, not both. Blank lines and a header line are ignored.
 */
export function parsePeopleList(text: string): { people: ParsedPerson[]; invalid: InvalidLine[] } {
  const people: ParsedPerson[] = [];
  const invalid: InvalidLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const s = raw.trim();
    if (!s) return;
    const sep = s.includes("\t") ? "\t" : s.includes(";") ? ";" : ",";
    const [name = "", email = "", phone = ""] = s.split(sep).map((f) => f.trim().replace(/^"(.*)"$/, "$1").trim());
    // Header row exported by a spreadsheet ("Nom;E-mail;Téléphone", "name,email,phone"…).
    if (line === 1 && !email.includes("@") && /mail/i.test(email) && !/\d/.test(phone)) return;
    if (!name || name.length > 120) return invalid.push({ line, reason: "name" });
    if (!email && !phone) return invalid.push({ line, reason: "contact" });
    const e = email.toLowerCase();
    if (e && (!EMAIL_RE.test(e) || e.length > 160)) return invalid.push({ line, reason: "email" });
    const p = phone ? normalizePhone(phone) : null;
    if (phone && !p) return invalid.push({ line, reason: "phone" });
    people.push({ line, name, email: e || null, phone: p });
  });
  return { people, invalid };
}
