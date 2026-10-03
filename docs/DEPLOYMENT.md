# Deployment — free tier (Firebase Hosting + Render + Turso)

| Part | Service | Free plan |
|---|---|---|
| Website (React) | **Firebase Hosting** (Spark plan, no card) | 10 GB storage, 360 MB/day transfer, SSL, custom domain |
| API (Node) | **Render** web service (free) | 512 MB RAM; sleeps after 15 min idle, wakes in ~30–50 s |
| Database | **Turso** (free, no card) | 5 GB, 500 M rows read / 10 M rows written per month |

Uploaded files (photos, documents, audio) are stored in the database, so no paid storage is needed.
Order: **1. database → 2. API → 3. website** (each step needs the previous one's URL).

---

## 1. Database — Turso (≈ 10 min)

1. Go to <https://turso.tech> → **Sign up** (GitHub login works, no card).
2. In the dashboard: **Create database** → name `onet-teboulba`, location **Frankfurt (fra)** (closest to Tunisia) → Create.
3. Open the database page:
   - copy the **URL** (`libsql://onet-teboulba-<your-name>.turso.io`);
   - **Generate token** (no expiration, read & write) → copy the token. Keep it secret.
4. Create the tables and your administrator account, from a computer with this repository and Node 22:
   ```bash
   npm ci
   export DATABASE_URL="libsql://onet-teboulba-<your-name>.turso.io"
   export DATABASE_AUTH_TOKEN="<token>"
   npm run db:migrate -w @onet/api
   ADMIN_EMAIL="vous@exemple.tn" ADMIN_PASSWORD="<au moins 10 caractères>" ADMIN_NAME="Votre nom" npm run db:bootstrap -w @onet/api
   ```
   Optional, for a demo instead of a real start (**erases the database**): `npm run db:seed -w @onet/api`.

## 2. API — Render (≈ 10 min)

1. Go to <https://render.com> → **Sign up with GitHub** (no card for the free plan) and allow access to the `onet` repository.
2. **New + → Blueprint** → choose the `onet` repository → Render reads `render.yaml` and proposes the `onet-api` service (free plan).
3. Fill the 3 secret values:
   - `DATABASE_URL` = the Turso URL
   - `DATABASE_AUTH_TOKEN` = the Turso token
   - `CORS_ORIGINS` = `https://<firebase-project-id>.web.app,https://<firebase-project-id>.firebaseapp.com,https://<firebase-project-id>--*.web.app`
     (you get the project id in step 3 — you can put a placeholder now and edit it later in **Environment**).
4. **Apply**. When the deploy is green, open `https://onet-api.onrender.com/health` (the exact URL is shown at the top of the service page) → `{"json":{"ok":true}}`.
   Every push to `main` redeploys; pending migrations run automatically at start.

> The free instance sleeps when unused; the first request after a pause takes ~30–50 s.
> A free monitor (e.g. UptimeRobot pinging `/health` every 10 min) keeps it awake during the day.

## 3. Website — Firebase Hosting (≈ 15 min)

1. Go to <https://console.firebase.google.com> → **Create a project** → name `onet-teboulba` (note the **project id** shown under the name, e.g. `onet-teboulba` or `onet-teboulba-1a2b3`) → you can disable Google Analytics → Create. The free **Spark** plan is the default; nothing else needs enabling.
2. In the project: **Build → Hosting → Get started** → click *Next* through the steps (no need to run the commands shown).
3. In this repository, put the project id in `.firebaserc` (`"default": "<project-id>"`) and commit it.
4. **Service account for GitHub Actions** (lets GitHub deploy, nothing else):
   1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts> and select the same project.
   2. **Create service account** → name `github-deploy` → **Create and continue**.
   3. Roles: add **Firebase Hosting Admin** *and* **API Keys Viewer** → *Continue* → *Done*.
   4. Click the account → **Keys → Add key → Create new key → JSON** → a `.json` file downloads. Treat it like a password.
5. In GitHub: repository **Settings → Secrets and variables → Actions**:
   - **Secrets** tab → *New repository secret* → name `FIREBASE_SERVICE_ACCOUNT`, value = the whole content of the JSON file. Then delete the file from your computer.
   - **Variables** tab → *New repository variable*:
     - `FIREBASE_PROJECT_ID` = `<project-id>`
     - `API_URL` = the Render URL, e.g. `https://onet-api.onrender.com`
6. In Render, update `CORS_ORIGINS` with the real project id (step 2.3) → *Save* (it redeploys).
7. Done:
   - every **pull request** gets a comment *"Visit the preview URL for this PR"* (link valid 7 days);
   - every push to **`main`** deploys the live site at `https://<project-id>.web.app`.

Optional hardening: GitHub **Settings → Environments → preview** → *Required reviewers* = you, so each preview deploy waits for your approval before the credential is used.

Manual deploy from a computer: `VITE_API_URL=https://onet-api.onrender.com npm run build -w @onet/web && npx firebase-tools deploy --only hosting`.

## 4. Protect `main`

GitHub → Settings → Branches → **Add rule** for `main`: require a pull request and the status checks
**Lint, types & i18n**, **Unit & integration tests**, **Build & end-to-end smoke test**.

## Environment variables (reference)

| Variable | Where | Example |
|---|---|---|
| `DATABASE_URL` | API (required in production) | `libsql://…turso.io` (prod), `file:./prisma/dev.db` (dev) |
| `DATABASE_AUTH_TOKEN` | API | Turso token (prod only) |
| `CORS_ORIGINS` | API | comma list; `*` allowed inside a hostname (preview channels) |
| `PORT` | API | set by Render |
| `PAYMENT_PROVIDER` | API | `mock` until a real gateway is integrated (unknown values are rejected) |
| `ALLOW_MOCK_PAYMENTS` | API | `false` (default). The `mock` provider marks every online payment as paid, so it is refused when `NODE_ENV=production` unless this is `true` — only for a demo deployment |
| `VITE_API_URL` | web build | `https://onet-api.onrender.com` |
