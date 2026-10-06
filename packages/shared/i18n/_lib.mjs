// Trilingual message sources. Each i18n/<namespace>.mjs builds one tree where every leaf is
// T(fr, ar, en); `npm run i18n` writes messages/{fr,ar,en}/<namespace>.json.
// Keeping the three languages side by side makes missing translations impossible.
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export const T = (fr, ar, en) => ({ __t: true, fr, ar, en });
export const LOCALES = ["fr", "ar", "en"];

function pick(node, l, trail) {
  if (node && node.__t) {
    if (typeof node[l] !== "string") throw new Error(`Missing ${l} for ${trail}`);
    return node[l];
  }
  if (typeof node === "string") throw new Error(`Untranslated string at ${trail}: use T(fr, ar, en)`);
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, pick(v, l, `${trail}.${k}`)]));
}

export function write(ns, tree) {
  for (const l of LOCALES) {
    const dir = path.join(process.cwd(), "messages", l);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(pick(tree, l, ns), null, 2) + "\n");
  }
}
