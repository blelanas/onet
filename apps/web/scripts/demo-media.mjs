// Generates the demo media (songs audio, gallery images, sample PDFs) into public/demo.
import { existsSync } from "fs";
import { execFileSync } from "child_process";
if (!existsSync("public/demo/audio/song-1.wav")) {
  execFileSync("npx", ["tsx", "../api/prisma/demo-media.ts", "public/demo"], { stdio: "inherit" });
}
