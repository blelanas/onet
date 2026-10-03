import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { saveUpload, UploadError, type UploadKind } from "@/lib/uploads";

// Any authenticated user may upload a file; the entity that references the URL enforces its own
// permission when it is saved (e.g. documents.manage, content.manage).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "errors.unauthenticated" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as UploadKind) ?? "image";
  if (!(file instanceof File)) return NextResponse.json({ error: "errors.validation" }, { status: 400 });
  try {
    const saved = await saveUpload(file, kind);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[upload]", e);
    return NextResponse.json({ error: "errors.unexpected" }, { status: 500 });
  }
}
