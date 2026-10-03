# ONET Teboulba — plateforme de l'enfance

Plateforme web complète (site public + ERP) pour le comité local de Teboulba de l'**Organisation Nationale de l'Enfance Tunisienne** :
membres, familles, groupes, activités, présences, calendrier, événements, sorties, contenus (chansons, jeux, conférences, ressources),
finances, communication, documents, rapports et administration — en **français, arabe (RTL) et anglais**.

> « Un lieu où les enfants apprennent, jouent, découvrent, participent et appartiennent. »

## Architecture

| Dossier | Rôle | Technologies | Hébergement (gratuit) |
|---|---|---|---|
| `apps/web` | Application React (site public + espace connecté) | React 19, Vite, React Router, TanStack Query, Tailwind CSS v4, use-intl | Firebase Hosting |
| `apps/api` | API REST Node.js | Express 5, Prisma (adaptateur libSQL), zod | Render |
| `packages/shared` | Code partagé : permissions, constantes, formats, traductions | TypeScript | — |
| Base de données | SQLite en local, **Turso** (libSQL) en production | | Turso |

Détails et conventions : **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · mise en production : **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Démarrage rapide

```bash
npm install
npm run setup     # traductions + base SQLite locale + données de démonstration
npm run dev       # API http://localhost:4000 + web http://localhost:5173
```

Comptes de démonstration — mot de passe **`Onet2026!`** (boutons de pré-remplissage sur `/login`) :

| Profil | E-mail |
|---|---|
| Super administrateur | admin@onet-teboulba.tn |
| Administrateur | gestion@onet-teboulba.tn |
| Comptable | comptable@onet-teboulba.tn |
| Moniteur | moniteur@onet-teboulba.tn |
| Parent (3 enfants) | parent@onet-teboulba.tn |
| Enfant | enfant@onet-teboulba.tn |
| Membre | membre@onet-teboulba.tn |

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | API + web en mode développement |
| `npm run build` | builds de production (API → `apps/api/dist`, web → `apps/web/dist`) |
| `npm run setup` | traductions + migrations + données de démo |
| `npm run i18n` | génère `packages/shared/messages` depuis les sources trilingues `packages/shared/i18n/*.mjs` |
| `npm run typecheck` / `lint` / `test` / `test:e2e` | vérifications |
| `npm run db:migrate -w @onet/api` | applique les migrations SQL (`DATABASE_URL`, fichier ou Turso) |
| `npm run db:bootstrap -w @onet/api` | rôles/permissions + premier super-administrateur (production, sans effacer) |
| `npm run db:check -w @onet/api` | vérifie que les migrations correspondent au schéma Prisma |

## Intégration continue

Chaque pull request lance `.github/workflows/ci.yml` (3 jobs en parallèle, les exécutions obsolètes sont annulées) :

| Job | Vérifie |
|---|---|
| Lint, types & i18n | traductions à jour, migrations ↔ schéma, TypeScript (API + web), ESLint sans avertissement, `npm audit` (bloquant si critique) |
| Unit & integration tests | tests de l'API (permissions, isolation des données, factures, endpoints HTTP) sur une base fraîche |
| Build & end-to-end smoke test | builds de production, API + web démarrés, site public et permissions des 7 rôles dans Chromium |

`.github/workflows/deploy-web.yml` publie le site sur Firebase Hosting à chaque push sur `main` et crée un **lien de prévisualisation** sur chaque pull request (une fois les secrets configurés). Render redéploie l'API automatiquement.
Dependabot propose chaque semaine les mises à jour npm (mineures et correctives regroupées, majeures séparément) et GitHub Actions (regroupées).

## Sécurité (résumé)

Jetons de session opaques (seul le hash est stocké), mots de passe bcrypt, limitation des tentatives de connexion,
vérification des permissions **côté API** sur chaque lecture et écriture, isolation des données (un parent ne voit que ses enfants,
un moniteur ses groupes, un enfant lui-même), validation zod, contrôle des fichiers envoyés, en-têtes de sécurité, CORS restreint, journal d'audit.

## Identité visuelle

Le logo est dans `apps/web/public/brand/onet-mark.svg` — **remplacez-le par le logo officiel**. La palette se règle dans `apps/web/src/index.css` (variables `--brand-*`).
