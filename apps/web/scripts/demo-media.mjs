// Generates the demo media (songs audio, gallery images, sample PDFs, bureau portraits, dance covers)
// into public/demo. Runs tsx through Node itself (not `npx`) so it works the same on Windows, macOS and Linux.
import { existsSync } from "fs";
import { execFileSync } from "child_process";
import { createRequire } from "module";
const tsx = createRequire(import.meta.url).resolve("tsx/cli");
if (!existsSync("public/demo/audio/song-1.wav")) {
  execFileSync(process.execPath, [tsx, "../api/prisma/demo-media.ts", "public/demo"], { stdio: "inherit" });
}
if (!existsSync("public/demo/bureau/member-1.svg")) {
  execFileSync(process.execPath, [tsx, "../api/prisma/demo-media-members.ts", "public/demo"], { stdio: "inherit" });
}
