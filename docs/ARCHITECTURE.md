# ONET Teboulba — Architecture & conventions

## Stack
- **Next.js 15 (App Router, React 19, TypeScript strict)** — server components for reads, **server actions** for mutations, a few route handlers (`/api/upload`, CSV exports).
- **Prisma 6 + SQLite** (dev). Switch `provider` to `postgresql` for production; the schema avoids SQLite-only features.
  Enum-like columns are strings validated with zod against `src/lib/constants.ts`. **Money = integer millimes** (1 TND = 1000).
- **Tailwind CSS v4** with design tokens in `src/app/globals.css` (`brand-*`, `sun`, `sky`, `leaf`, `grape`, `coral`, `teal`, `canvas`, `surface`, `ink`, `muted`, `line`).
  Use **logical utilities** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) so Arabic RTL works. Add `rtl-flip` to directional icons (arrows/chevrons).
- **next-intl** (no locale in URL; cookie `NEXT_LOCALE`, user preference saved in `User.locale`). Locales: `fr` (default), `ar` (RTL), `en`.

## Folder map
```
prisma/schema.prisma, prisma/seed.ts     data model + demo data (npm run db:seed)
i18n/<ns>.mjs                            trilingual message sources → npm run i18n → messages/<locale>/<ns>.json
src/i18n/config.ts                       locales + NAMESPACES list (one per module)
src/lib/                                 db, auth (session/guards/scope), permissions, constants, actions helper, money, dates, csv, uploads, audit
src/lib/services/                        cross-module domain services (notifications, payments provider, invoices)
src/server/<module>/queries.ts           server-only reads (always scoped to the current user)
src/server/<module>/actions.ts           "use server" mutations (runAction + requirePermission + audit + revalidatePath)
src/components/ui/                       design system (Button, Card, Badge, StatusBadge, Input/Select/Textarea/Checkbox, ActionForm,
                                         Modal, ConfirmButton/ActionButton, DataTable, Pagination, SearchBox/FilterSelect/FilterChips,
                                         LinkTabs, KpiCard, charts (TrendChart/BarsChart/DonutChart), AudioPlayer, Upload, CoverArt,
                                         EmptyState, Skeleton, Progress, Section/InfoList, PageHeader/Breadcrumbs, Avatar)
src/components/<module>/                 module-specific components (client forms live here)
src/components/layout/                   AppShell (sidebar, topbar, mobile tabs), nav-config (permission-driven), Logo
src/app/(public pages)                   public website
src/app/dashboard/...                    authenticated ERP
```

## Security model (never rely on hidden UI)
1. `middleware.ts` only checks a session cookie exists for `/dashboard/*`.
2. Every page: `await requirePagePermission("x.read")` (redirects) — or `requireUser()` for pages open to all roles.
3. Every server action: `runAction(schema, input, async (data) => { const user = await requirePermission("x.manage"); … })`.
   Zod validates input; errors are i18n keys (`errors.*` in `common.json`).
4. **Data isolation** (`src/lib/auth/scope.ts`): `visibleMemberIds(user)` / `memberScopeWhere(user)` / `assertCanSeeMember`;
   parents see their children, monitors see their groups, kids see themselves. Finance data is never shown to kids.
5. `audit(userId, action, entity, entityId, details)` for sensitive operations (create/update/delete, payments, permission changes, exports).
6. Uploads go through `/api/upload` (auth, mime whitelist, size limit, magic-byte sniffing) → stored in `public/uploads/YYYY/MM/`.
7. Sessions: random 256-bit token in an httpOnly cookie, only its SHA-256 is stored (`Session` table); passwords hashed with bcrypt.

## Permissions
Catalog + default grants: `src/lib/permissions.ts`. Roles and grants live in the DB and are editable from Settings → Roles.
Helpers: `can(user, ...perms)`, `canAny`, `hasRole`. Scoped read permissions: `members.read`, `attendance.read`, `documents.read`.

## Canonical routes (link to these from any module)
| Area | Routes |
|---|---|
| People | `/dashboard/members`, `/dashboard/children`, `/dashboard/parents`, `/dashboard/monitors`, `/dashboard/members/[id]`, `/dashboard/members/new?type=CHILD`, `/dashboard/my-children`, `/dashboard/join-requests` |
| Groups | `/dashboard/groups`, `/dashboard/groups/[id]` |
| Activities | `/dashboard/activities`, `/dashboard/activities/[id]`, `/dashboard/attendance`, `/dashboard/calendar` |
| Events/trips | `/dashboard/events`, `/dashboard/events/[id]`, `/dashboard/trips`, `/dashboard/trips/[id]`, `/dashboard/registrations` |
| Content | `/dashboard/content/songs[/id]`, `/dashboard/content/games[/id]`, `/dashboard/content/conferences[/id]`, `/dashboard/content/resources` |
| Finance | `/dashboard/finance/invoices[/id]`, `/dashboard/finance/payments`, `/dashboard/finance/expenses`, `/dashboard/finance/reports` |
| Communication | `/dashboard/announcements`, `/dashboard/messages` (`?c=<conversationId>`, `?to=<userId>`), `/dashboard/notifications`, `/dashboard/documents` |
| Admin | `/dashboard/reports`, `/dashboard/settings/*`, `/dashboard/search?q=`, `/dashboard/profile`, `/dashboard/achievements` |
| Public | `/`, `/about`, `/activities`, `/events[/id]`, `/trips[/id]`, `/news[/slug]`, `/gallery`, `/songs`, `/conferences`, `/contact`, `/join`, `/login` |

## Patterns to copy
- **List page**: `src/components/members/member-directory.tsx` (Toolbar + SearchBox/FilterSelect bound to URL, DataTable with mobile cards, Pagination, EmptyState).
- **Detail page with tabs**: `src/app/dashboard/members/[id]/page.tsx`.
- **Form**: `src/components/members/member-form.tsx` (client) + `src/server/members/actions.ts` (`saveMember` handles create & update).
- **Server enum labels**: `const tc = await getTranslations("common"); tc(\`enums.activityCategory.${v}\`)`, statuses via `<StatusBadge status=… />`.
- **Money**: `formatMoney(millimes, locale)`, forms submit TND and parse with `zs.money`.
- **Notifications**: `notifyUsers(userIds, {type, title, body, link})`, `notifyGuardians(childId, …)`, `notifyRoles([...], …)` in `src/lib/services/notifications.ts`.

## i18n workflow
Edit `i18n/<namespace>.mjs` (every leaf is `T(fr, ar, en)`), then `npm run i18n`. Never hardcode UI text in components.
Server: `getTranslations("ns")`; client: `useTranslations("ns")`. Dates/numbers: `formatDate`, `formatDateTime`, `relativeTime`, `formatMoney`.
