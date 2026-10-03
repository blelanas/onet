// Ports a legacy Next.js component/page to the Vite React app (mechanical part only):
//  - next/link, next/navigation → @/lib/router;  next-intl(/server) → use-intl hooks
//  - async server components → regular components (data loading must then use useApi)
//  - "use client", next lint pragmas and server-only imports removed
// usage: node tools/port-client.mjs <legacy file> <new file>
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
const [from, to] = process.argv.slice(2);
let s = readFileSync(from, "utf8");
s = s
  .replace(/^"use client";\n/m, "")
  .replace(/^\/\* eslint-disable @next\/next\/no-img-element \*\/\n/m, "")
  .replace(/^import Link from "next\/link";/m, 'import { Link } from "@/lib/router";')
  .replace(/from "next\/navigation"/g, 'from "@/lib/router"')
  .replace(/from "next-intl\/server"/g, 'from "use-intl"')
  .replace(/from "next-intl"/g, 'from "use-intl"')
  .replace(/\bgetTranslations\b/g, "useTranslations")
  .replace(/\bgetLocale\b/g, "useLocale")
  .replace(/await useTranslations\(/g, "useTranslations(")
  .replace(/await useLocale\(\)/g, "useLocale()")
  .replace(/export default async function/g, "export default function")
  .replace(/export async function ([A-Z])/g, "export function $1")
  .replace(/import type \{ ActionResult \} from "@\/lib\/actions";/g, 'import type { ActionResult } from "@/lib/api";')
  .replace(/from "@\/lib\/(constants|permissions|money|dates|csv)"/g, 'from "@onet/shared"')
  .replace(/from "@\/lib\/utils"/g, 'from "@/lib/utils"');
// Merge duplicate use-intl imports.
const names = new Set();
s = s.replace(/^import \{([^}]+)\} from "use-intl";\n/gm, (_m, n) => {
  n.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => names.add(x));
  return "";
});
if (names.size) s = `import { ${[...names].join(", ")} } from "use-intl";\n` + s;
mkdirSync(path.dirname(to), { recursive: true });
writeFileSync(to, s);
const todo = [...s.matchAll(/from "(@\/server\/[^"]+|next[^"]*|@\/lib\/(auth|db|audit|actions|uploads|services)[^"]*)"/g)].map((m) => m[1]);
console.log(`ported ${from} → ${to}${todo.length ? `  ⚠ needs manual work: ${[...new Set(todo)].join(", ")}` : ""}`);
