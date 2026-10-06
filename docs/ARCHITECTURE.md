# ONET Teboulba — Architecture & conventions

## Overview

```
apps/web        React 19 SPA (Vite, React Router 7, TanStack Query, use-intl, Tailwind v4) → Firebase Hosting
apps/api        Node 22 REST API (Express 5, Prisma 6 + libSQL adapter, zod)              → Render (free web service)
packages/shared Code used by both: permissions, constants, money/date formatting, i18n messages
Database        Turso (hosted libSQL, free plan) in production — a local SQLite file in development
Files           Uploaded files are stored in the database (StoredFile/StoredFileChunk), served at /api/files/<id>
```

npm workspaces; `npm run dev` starts the API (http://localhost:4000) and the web app (http://localhost:5173).

## API (`apps/api`)

| Path | Role |
|---|---|
| `src/app.ts` | Express app: helmet, CORS (allow-list `CORS_ORIGINS`), per-request context, JSON body, routers |
| `src/modules/index.ts` | Mounts every module router. **Each module owns `src/modules/<name>/routes.ts`** (plus `queries.ts`, `actions.ts`, …) |
| `src/lib/context.ts` | AsyncLocalStorage request context: `requestCache()` (per-request memo), `clientIp()` |
| `src/lib/auth/*` | `session.ts` bearer tokens (`getCurrentUser()`), `guards.ts` (`requireUser`, `requirePermission`, `can`, `AuthError`), `scope.ts` data isolation |
| `src/lib/actions.ts` | `runAction(zodSchema, input, handler)` → `ActionResult`, `zs` zod helpers, `ActionError`, `formToObject` |
| `src/lib/http.ts` | `query(loader)` for GET, `mutation(handler)` for writes, `sendCsv`, `qs`, `param`; errors → 401/403/404/400 |
| `src/lib/i18n.ts` | server-side `getTranslations()` / `getLocale()` (locale from the `X-Locale` header) |
| `src/lib/uploads.ts`, `modules/files` | `POST /api/upload` (multipart, mime + size + magic-byte checks), `GET /api/files/:id` |
| `src/lib/services/*` | notifications (channel adapters), payments (provider abstraction), invoices |
| `prisma/` | `schema.prisma`, `migrations/*.sql` (applied by `npm run db:migrate`), `seed.ts`, `demo-media.ts` |

**Conventions**
- Responses are **superjson** (Dates survive). Mutations always return an `ActionResult` (`{ ok, data?, message? }` or `{ ok:false, error, fieldErrors? }`), error strings are i18n keys (`errors.*` in `common`).
- **Read endpoint** = an exported loader + `router.get(path, query(loader))`:
  ```ts
  export async function membersPage(req: Request) {
    const user = await requirePermission("members.read");
    return { rows, total };
  }
  router.get("/members", query(membersPage));
  ```
  The web app imports the loader **type** to type its data (`Loaded<typeof membersPage>`).
- **Mutation** = an action using `runAction` + `requirePermission` (+ scope checks) + `audit()`; route: `router.post(path, mutation((req) => saveX(req.body)))`.
- Every loader/action checks permissions itself; data isolation via `visibleMemberIds` / `memberScopeWhere` / `assertCanSeeMember`. Kids never receive financial data.
- Register static routes (`/x/export.csv`, `/x/options`) **before** `/:id` routes.
- Imports inside the API use the `@api/` alias.

## Web (`apps/web`)

| Path | Role |
|---|---|
| `src/routes.tsx` | Router: `/login`, `/dashboard/*` (RequireAuth + AppShell), public site. **Each module owns `src/pages/<module>/routes.tsx`** |
| `src/lib/api.ts` | `apiGet`, `apiSend`, `formAction(method, path)` (same `(fd) => Promise<ActionResult>` signature as the old server actions), `assetUrl()` for uploaded files, `download()` for CSV/ics, `uploadFile()` |
| `src/lib/query.ts` | `useApi<T>(path, params)` (TanStack Query), `refreshAll()` |
| `src/lib/router.tsx` | `Link href`, `useRouter()` (push/replace/refresh/back), `usePathname`, `useSearchParams`, `useSearchParamsObject` |
| `src/lib/auth.tsx` | `useAuth()`, `useMe()`, `can(me, …)`, `hasRole`, `signIn/signOut` |
| `src/lib/i18n.tsx` | locale provider (fr bundled, ar/en lazy), RTL, `useLocaleSwitch()` |
| `src/lib/title.ts` | `usePageTitle(title)` |
| `src/lib/types.ts` | `Loaded<typeof loader>` — page data types inferred from API loaders |
| `src/api/<module>.ts` | mutation functions for a module (`formAction(...)`, `apiSend(...)`) |
| `src/components/ui/*` | design system (Button, Card, Badge, StatusBadge, inputs, ActionForm, Modal, ConfirmButton, DataTable, Pagination, toolbar filters, tabs, KPI cards, charts, AudioPlayer, Upload, CoverArt, EmptyState, Skeleton…) |
| `src/components/states/*` | `QueryView` (loading / 403 / 404 / error), `RequireAuth`, `RequirePerm`, `Forbidden`, `NotFound` |

**Page pattern**
```tsx
type Data = Loaded<typeof memberProfilePage>;          // import type from "@api/modules/members/routes"
export function Component() {                           // lazy route module
  const { id } = useParams();
  const query = useApi<Data>(`/members/${id}`);
  return <QueryView query={query}>{(data) => <Profile data={data} />}</QueryView>;
}
```
- Pages are lazy route modules exporting `Component`. Wrap pages needing a permission in `<RequirePerm perm=…>` (UX only — the API enforces).
- URL state (filters, tabs, pagination) lives in the query string; `useApi` keys on it.
- After a successful mutation `ActionForm` / `ConfirmButton` call `router.refresh()` → refetch.
- Uploaded file URLs (`/api/files/…`) must go through `assetUrl()` (Avatar, CoverArt, AudioPlayer, Upload already do).
- Only `import type` from `@api/*` (enforced by ESLint).

## i18n
Sources `packages/shared/i18n/<ns>.mjs` (every leaf `T(fr, ar, en)`) → `npm run i18n` → `packages/shared/messages/<locale>/<ns>.json` + merged `<locale>.json`.
Web: `useTranslations("ns")`; API: `await getTranslations("ns")`. Use logical CSS (`ms-`, `pe-`, `start-`, `text-start`) and `rtl-flip` on arrows.

## Security model
1. Bearer session tokens (random 256-bit; only the SHA-256 is stored; 14-day expiry; revoked on logout/password change).
2. Login rate-limited per IP and per e-mail; failed attempts audited.
3. Every API loader and action checks permissions (`requirePermission`) and data scope; the web UI only hides what you can't use.
4. zod validation on every input; uploads validated (mime whitelist, size, magic bytes); files served with `nosniff`.
5. Helmet security headers, CORS allow-list, `X-Powered-By` disabled.
6. Audit log for sensitive operations.

## Database & migrations
- Schema: `apps/api/prisma/schema.prisma` (SQLite/libSQL). Money is integer millimes.
- Migrations are plain SQL files in `apps/api/prisma/migrations/` applied in order by `npm run db:migrate -w @onet/api` (works for a file and for Turso). To create one after a schema change:
  `npx prisma migrate diff --from-schema-datamodel <old schema> --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/000N_name.sql`.
- `npm run setup` = i18n + migrate + seed (demo data).

## Canonical routes
| Area | Web routes (`/dashboard/...`) |
|---|---|
| People | `members`, `children`, `parents`, `monitors`, `members/:id`, `members/new?type=`, `members/:id/edit`, `my-children`, `join-requests` |
| Groups/activities | `groups[/:id]`, `activities[/:id]`, `attendance`, `calendar` |
| Events/trips | `events[/:id]`, `trips[/:id]`, `registrations` |
| Content | `content/songs[/:id]`, `content/games[/:id]`, `content/conferences[/:id]`, `content/resources` |
| Finance | `finance/invoices[/:id]`, `finance/payments`, `finance/expenses`, `finance/reports` |
| Communication | `announcements`, `messages` (`?c=`, `?to=`), `notifications`, `documents` |
| Admin | `reports`, `settings/*`, `search?q=`, `profile`, `achievements` |
| Public | `/`, `/about`, `/activities`, `/events[/:id]`, `/trips[/:id]`, `/news[/:slug]`, `/gallery`, `/songs`, `/conferences`, `/contact`, `/join`, `/login` |
