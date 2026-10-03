# Deployment — free tier (Firebase Hosting + Render + Turso)

| Part | Service | Free plan |
|---|---|---|
| Website (React) | **Firebase Hosting** (Spark plan, no card) | 10 GB storage, 360 MB/day transfer, SSL, custom domain |
| API (Node) | **Render** web service (free) | 512 MB RAM; sleeps after 15 min idle, wakes in ~30–50 s |
| Database | **Turso** (free, no card) | 5 GB, 500 M rows read / 10 M rows written per month |

Uploaded files (photos, documents, audio) are stored in the database, so no paid storage is needed.

---

## 1. Database — Turso

1. Create an account at <https://turso.tech> (GitHub login works, no card).
2. Install the CLI and create the database (Europe is closest to Tunisia):
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   turso db create onet-teboulba --location fra
   turso db show onet-teboulba --url        # → libsql://onet-teboulba-<org>.turso.io
   turso db tokens create onet-teboulba     # → long token
   ```
   (Everything can also be done in the Turso web dashboard.)
3. Create the tables and the first administrator **from your computer** (once):
   ```bash
   export DATABASE_URL="libsql://onet-teboulba-<org>.turso.io"
   export DATABASE_AUTH_TOKEN="<token>"
   npm ci
   npm run db:migrate -w @onet/api
   ADMIN_EMAIL="vous@exemple.tn" ADMIN_PASSWORD="<10+ caractères>" ADMIN_NAME="Votre nom" npm run db:bootstrap -w @onet/api
   ```
   Optional — demo data instead of a real start (**erases the database**): `npm run db:seed -w @onet/api`.

## 2. API — Render

1. Create an account at <https://render.com> and connect GitHub.
2. **New → Blueprint** → select this repository. Render reads `render.yaml` and creates the `onet-api` web service (free plan).
3. Fill the secret variables when asked:
   - `DATABASE_URL` = `libsql://onet-teboulba-<org>.turso.io`
   - `DATABASE_AUTH_TOKEN` = the Turso token
   - `CORS_ORIGINS` = `https://<firebase-project>.web.app,https://<firebase-project>.firebaseapp.com,https://<firebase-project>--pr*.web.app`
4. Deploy. Check `https://onet-api.onrender.com/health` → `{"json":{"ok":true}}`.
   Every push to `main` redeploys; pending migrations run automatically at start.

> The free instance sleeps when unused; the first request after a pause takes ~30–50 s.
> A free uptime monitor (e.g. UptimeRobot pinging `/health` every 10 min) keeps it awake during the day.

## 3. Website — Firebase Hosting

1. Create a project at <https://console.firebase.google.com> (Spark plan — free, no card), e.g. `onet-teboulba`.
   Hosting only; no need to enable Firestore/Storage/Functions.
2. Put the project id in `.firebaserc` (`"default": "<project-id>"`).
3. Service account for GitHub Actions:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase init hosting:github   # answers: this repo, "no" to overwriting firebase.json and workflows
   ```
   This creates the `FIREBASE_SERVICE_ACCOUNT_<PROJECT>` secret. Rename/copy it to **`FIREBASE_SERVICE_ACCOUNT`**
   (GitHub → Settings → Secrets and variables → Actions), or create a service account with the
   *Firebase Hosting Admin* role in Google Cloud and paste its JSON key into that secret.
4. In the same GitHub page, **Variables** tab, add:
   - `FIREBASE_PROJECT_ID` = `<project-id>`
   - `API_URL` = `https://onet-api.onrender.com`
5. Push to `main` → `.github/workflows/deploy-web.yml` builds and deploys to `https://<project-id>.web.app`.
   Each pull request gets a **preview link** (Firebase preview channel, kept 7 days) commented on the PR.

Manual deploy from a computer: `VITE_API_URL=https://onet-api.onrender.com npm run build -w @onet/web && firebase deploy --only hosting`.

## 4. Protect `main`

GitHub → Settings → Branches → add a rule for `main`: require a pull request and the checks
**Lint, types & i18n**, **Unit & integration tests**, **Build & end-to-end smoke test**.

## Environment variables (reference)

| Variable | Where | Example |
|---|---|---|
| `DATABASE_URL` | API | `libsql://…turso.io` (prod), `file:./prisma/dev.db` (dev) |
| `DATABASE_AUTH_TOKEN` | API | Turso token (prod only) |
| `CORS_ORIGINS` | API | comma list, `*` allowed inside a hostname (preview channels) |
| `PORT` | API | set by Render |
| `PAYMENT_PROVIDER` | API | `mock` until a real gateway is integrated |
| `VITE_API_URL` | web build | `https://onet-api.onrender.com` |
