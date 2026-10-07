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
 * Splits one line on `sep`, CSV-style: separators inside double quotes are kept and `""` inside a
 * quoted field is a literal quote. Fields are trimmed.
 */
export function splitFields(line: string, sep: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"' && !cur.trim()) {
      cur = "";
      quoted = true;
    } else if (c === sep) {
      fields.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  fields.push(cur.trim());
  return fields;
}

/** The separator of a line: a tab, else `;`, else `,` (ignoring those inside double quotes). */
function separatorOf(line: string) {
  const outside = line.replace(/"(?:[^"]|"")*"/g, "");
  return outside.includes("\t") ? "\t" : outside.includes(";") ? ";" : ",";
}

/**
 * Pre-approved list: one person per line, `Name; email; phone`, separated by `;`, `,` or a tab
 * (CSV quoting allowed). Email or phone may be empty, not both. Blank lines and a header line (the
 * first non-blank one) are ignored.
 */
export function parsePeopleList(text: string): { people: ParsedPerson[]; invalid: InvalidLine[] } {
  const people: ParsedPerson[] = [];
  const invalid: InvalidLine[] = [];
  let first = true;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const s = raw.trim();
    if (!s) return;
    const isFirst = first;
    first = false;
    const [name = "", email = "", phone = ""] = splitFields(s, separatorOf(s));
    // Header row exported by a spreadsheet ("Nom;E-mail;Téléphone", "name,email,phone"…).
    if (isFirst && !email.includes("@") && /mail/i.test(email) && !/\d/.test(phone)) return;
    if (!name || name.length > 80) return invalid.push({ line, reason: "name" });
    if (!email && !phone) return invalid.push({ line, reason: "contact" });
    const e = email.toLowerCase();
    if (e && (!EMAIL_RE.test(e) || e.length > 160)) return invalid.push({ line, reason: "email" });
    const p = phone ? normalizePhone(phone) : null;
    if (phone && !p) return invalid.push({ line, reason: "phone" });
    people.push({ line, name, email: e || null, phone: p });
  });
  return { people, invalid };
}
