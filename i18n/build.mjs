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
console.log(`i18n: built ${files.length} namespaces × 3 locales`);
