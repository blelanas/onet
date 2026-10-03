import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/** RFC 5545 text escaping + 75-octet line folding. */
function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Downloads an .ics calendar invitation for a conference (default duration 2 h). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  if (!can(user, "content.read")) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const { id } = await params;
  const c = await db.conference.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "errors.notFound" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const start = new Date(c.date);
  const end = new Date(start.getTime() + 2 * 3600_000);
  const description = [c.speaker + (c.speakerBio ? ` — ${c.speakerBio}` : ""), c.description ?? "", `${origin}/dashboard/content/conferences/${c.id}`].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ONET Teboulba//Conferences//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:conference-${c.id}@onet-teboulba.tn`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(c.title)}`,
    `DESCRIPTION:${esc(description)}`,
    ...(c.location ? [`LOCATION:${esc(c.location)}`] : []),
    `URL:${origin}/dashboard/content/conferences/${c.id}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(c.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const body = lines.map(fold).join("\r\n") + "\r\n";
  const slug = c.title.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "conference";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
