// End-to-end smoke test against the running web app + API (default http://localhost:5173, seeded demo data).
// Checks that public pages render, that every role can sign in, reaches the pages it is allowed to,
// is denied the ones it is not, and that no page throws a client-side error.
// Usage: BASE_URL=http://localhost:5173 node tests/e2e/smoke.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const PASSWORD = "Onet2026!";

const PUBLIC = ["/", "/about", "/activities", "/events", "/trips", "/news", "/gallery", "/songs", "/conferences", "/contact", "/join", "/login", "/signup"];

// Expected access per role: `allow` must render content, `deny` must show the forbidden page.
const ROLES = {
  "admin@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/members", "/dashboard/groups", "/dashboard/finance/invoices", "/dashboard/finance/reports", "/dashboard/reports", "/dashboard/settings/roles", "/dashboard/settings/audit", "/dashboard/approvals"],
    deny: [],
  },
  "gestion@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/members", "/dashboard/events", "/dashboard/finance/invoices", "/dashboard/settings/users", "/dashboard/approvals", "/dashboard/approvals?tab=invitations", "/dashboard/approvals?tab=preapproved"],
    deny: ["/dashboard/finance/invoices/new", "/dashboard/settings/roles", "/dashboard/settings/audit"],
  },
  "comptable@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/finance/invoices", "/dashboard/finance/payments", "/dashboard/finance/expenses", "/dashboard/finance/reports"],
    deny: ["/dashboard/groups", "/dashboard/activities", "/dashboard/attendance", "/dashboard/settings/users", "/dashboard/join-requests", "/dashboard/approvals"],
  },
  "moniteur@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/children", "/dashboard/groups", "/dashboard/attendance", "/dashboard/calendar", "/dashboard/messages"],
    deny: ["/dashboard/members", "/dashboard/finance/invoices", "/dashboard/reports", "/dashboard/settings/users", "/dashboard/approvals"],
  },
  "parent@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/my-children", "/dashboard/events", "/dashboard/trips", "/dashboard/finance/invoices", "/dashboard/messages", "/dashboard/content/songs"],
    deny: ["/dashboard/members", "/dashboard/groups", "/dashboard/finance/expenses", "/dashboard/finance/reports", "/dashboard/reports", "/dashboard/settings/users"],
  },
  "enfant@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/achievements", "/dashboard/activities", "/dashboard/content/songs", "/dashboard/content/games", "/dashboard/announcements"],
    deny: ["/dashboard/children", "/dashboard/finance/invoices", "/dashboard/finance/payments", "/dashboard/messages", "/dashboard/documents", "/dashboard/attendance"],
  },
  "membre@onet-teboulba.tn": {
    allow: ["/dashboard", "/dashboard/events", "/dashboard/trips", "/dashboard/content/songs"],
    deny: ["/dashboard/children", "/dashboard/finance/invoices", "/dashboard/settings/users"],
  },
};

// Pages that must show a specific panel (data-testid), e.g. the tab selected by ?tab=.
const EXPECT_TESTID = {
  "/dashboard/approvals": "approvals-pending",
  "/dashboard/approvals?tab=invitations": "approvals-invitations",
  "/dashboard/approvals?tab=preapproved": "approvals-preapproved",
};

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};

async function visit(page, path) {
  const errors = [];
  const onError = (e) => errors.push(e.message);
  page.on("pageerror", onError);
  const res = await page.goto(BASE + path, { waitUntil: "load" });
  // The SPA fetches its data after load: wait for the network to settle.
  await page.waitForLoadState("networkidle").catch(() => {});
  page.off("pageerror", onError);
  const has = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0;
  return {
    status: res?.status() ?? 0,
    url: new URL(page.url()).pathname + new URL(page.url()).search,
    errors,
    has,
    forbidden: await has("forbidden"),
    broken: (await has("error-state")) || (await has("not-found")),
  };
}

const browser = await chromium.launch();
try {
  console.log("Public pages");
  {
    const page = await browser.newPage();
    for (const p of PUBLIC) {
      const r = await visit(page, p);
      if (r.status !== 200 || r.broken) fail(`anonymous ${p} → HTTP ${r.status}${r.broken ? ", error/not-found state" : ""}`);
      else if (r.errors.length) fail(`anonymous ${p} → page error: ${r.errors[0]}`);
    }
    const r = await visit(page, "/dashboard");
    if (r.url.split("?")[0] !== "/login") fail(`anonymous /dashboard should redirect to /login, got ${r.url}`);
    await page.close();
  }

  for (const [email, { allow, deny }] of Object.entries(ROLES)) {
    console.log(email);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 20000 });
    } catch {
      fail(`${email} could not sign in`);
      await ctx.close();
      continue;
    }
    for (const p of allow) {
      const r = await visit(page, p);
      // Same page; a query string in `p` (?tab=…) must survive too.
      const samePage = p.includes("?") ? r.url === p : r.url.split("?")[0] === p;
      if (r.status !== 200 || !samePage || r.forbidden || r.broken) fail(`${email} ${p} should be allowed (HTTP ${r.status}, ended on ${r.url}${r.forbidden ? ", forbidden" : ""}${r.broken ? ", error/not-found state" : ""})`);
      else if (r.errors.length) fail(`${email} ${p} → page error: ${r.errors[0]}`);
      else if (EXPECT_TESTID[p] && !(await r.has(EXPECT_TESTID[p]))) fail(`${email} ${p} should show [data-testid="${EXPECT_TESTID[p]}"]`);
    }
    for (const p of deny) {
      const r = await visit(page, p);
      if (!r.forbidden) fail(`${email} ${p} should be forbidden (ended on ${r.url}, no forbidden page)`);
      else if (r.errors.length) fail(`${email} ${p} → page error: ${r.errors[0]}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
