// Dev helper — usage: PORT=3000 node scripts/screenshot.mjs <email|-> <locale> <width> <out-prefix> <path1> [path2...]
import { createRequire } from "module";
import { mkdirSync } from "fs";
mkdirSync("./.screenshots", { recursive: true });
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = (await import("/opt/node-tools/node_modules/playwright/index.js")).default; }
const [email, locale, width, prefix, ...paths] = process.argv.slice(2);
const BASE = `http://localhost:${process.env.PORT ?? 3000}`;
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(width), height: Number(width) < 600 ? 860 : 900 }, deviceScaleFactor: 1 });
await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
if (email !== "-") {
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Onet2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 60000 });
}
for (const [i, p] of paths.entries()) {
  const res = await page.goto(BASE + p, { timeout: 120000, waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const file = `./.screenshots/${prefix}-${i}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(res.status(), p, "→", file);
}
if (errors.length) console.log("ERRORS:", [...new Set(errors)].slice(0, 8).join("\n"));
await browser.close();
