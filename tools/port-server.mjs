// Ports a legacy Next.js server file (src/server/**, src/lib/**) to the Express API:
// strips "use server"/"server-only", maps next/* imports to API shims.
// usage: node tools/port-server.mjs legacy/src/server/x/queries.ts apps/api/src/modules/x/queries.ts
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
const [from, to] = process.argv.slice(2);
let s = readFileSync(from, "utf8");
s = s
  .replace(/^"use server";\n/m, "")
  .replace(/^import "server-only";\n/m, "")
  .replace(/from "next\/cache"/g, 'from "@api/lib/cache"')
  .replace(/from "next-intl\/server"/g, 'from "@api/lib/i18n"')
  .replace(/from "@\/server\//g, 'from "@api/modules/')
  .replace(/from "@\/lib\//g, 'from "@api/lib/')
  // Actions receive the JSON body (FormData still accepted for multipart routes).
  .replace(/\(fd: FormData\)/g, "(fd: FormData | Record<string, unknown>)");
mkdirSync(path.dirname(to), { recursive: true });
writeFileSync(to, s);
const leftovers = s.match(/from "next[^"]*"/g);
console.log(`ported ${from} → ${to}${leftovers ? `  ⚠ remaining: ${leftovers.join(", ")}` : ""}`);
