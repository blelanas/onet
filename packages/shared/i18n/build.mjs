// Builds every namespace: node i18n/build.mjs
import { readdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { write } from "./_lib.mjs";

const dir = path.join(process.cwd(), "i18n");
const files = readdirSync(dir).filter((f) => f.endsWith(".mjs") && !f.startsWith("_") && f !== "build.mjs");
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  write(f.replace(/\.mjs$/, ""), mod.default);
}
// One merged file per locale, consumed by the web app (lazy-loaded) and the API (server-side texts).
import { readFileSync, writeFileSync } from "fs";
for (const l of ["fr", "ar", "en"]) {
  const merged = {};
  for (const f of files) {
    const ns = f.replace(/\.mjs$/, "");
    merged[ns] = JSON.parse(readFileSync(path.join(process.cwd(), "messages", l, `${ns}.json`), "utf8"));
  }
  writeFileSync(path.join(process.cwd(), "messages", `${l}.json`), JSON.stringify(merged) + "\n");
}
console.log(`i18n: built ${files.length} namespaces × 3 locales`);
