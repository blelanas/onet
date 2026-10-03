# ONET Teboulba — plateforme de l'enfance

Plateforme web complète (site public + ERP) pour le comité local de Teboulba de l'**Organisation Nationale de l'Enfance Tunisienne**.
Membres, familles, groupes, activités, présences, calendrier, événements, sorties, contenus (chansons, jeux, conférences, ressources),
finances, communication, documents, rapports et administration — en **français, arabe (RTL) et anglais**.

> « Un lieu où les enfants apprennent, jouent, découvrent, participent et appartiennent. »

## Démarrage rapide

```bash
cp .env.example .env
npm install
npm run setup        # crée la base SQLite + données de démonstration (+ audio/visuels générés)
npm run dev          # http://localhost:3000
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
| `npm run dev` / `build` / `start` | Next.js |
| `npm run setup` / `db:reset` | Schéma + données de démo (le seed vide puis recharge la base) |
| `npm run i18n` | Génère `messages/{fr,ar,en}/*.json` depuis les sources trilingues `i18n/*.mjs` |
| `npm run typecheck` / `lint` / `test` | Vérifications (tests unitaires + intégration sur une base isolée) |

## Intégration continue

Chaque pull request lance `.github/workflows/ci.yml` (3 jobs en parallèle, ~5 min, les exécutions obsolètes sont annulées) :

| Job | Vérifie |
|---|---|
| Lint, types & i18n | schéma Prisma, traductions générées à jour, `tsc`, ESLint sans avertissement, `npm audit` (bloquant si critique) |
| Unit & integration tests | `npm test` sur une base SQLite fraîchement peuplée |
| Build & end-to-end smoke test | build de production + `npm run test:e2e` : site public et permissions des 7 rôles dans Chromium |

Dependabot propose chaque semaine les mises à jour npm (mineures et correctives regroupées, majeures séparément) et les mises à jour GitHub Actions (regroupées).

## Architecture

Next.js 15 (App Router, server components + server actions) · TypeScript strict · Prisma (SQLite en dev, PostgreSQL en prod) ·
Tailwind CSS v4 · next-intl · zod · Recharts. Détails, conventions, modèle de sécurité et routes : **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

- **RBAC** en base (rôles, permissions, matrice éditable) + **isolation des données** (un parent ne voit que ses enfants, un moniteur ses groupes, un enfant lui-même) vérifiées côté serveur sur chaque page et action.
- **Sessions** opaques (jeton aléatoire, seul le hash SHA-256 est stocké), mots de passe bcrypt, limitation des tentatives de connexion, journal d'audit.
- **Fichiers** : upload validé (type MIME, taille, signature binaire).
- **Paiements** : abstraction `PaymentProvider` (fournisseur « mock » en démo) prête pour Konnect / Flouci / ClicToPay.
- **Notifications** : canal in-app + adaptateurs e-mail / SMS / push à brancher.

## Identité visuelle

Le logo est dans `public/brand/onet-mark.svg` (et `src/app/icon.svg` pour le favicon). **Remplacez ces fichiers par le logo officiel** ;
la palette (rouge ONET + jaune soleil, bleu ciel, vert feuille, violet, corail) se règle dans `src/app/globals.css` (variables `--brand-*`).

## Production

1. `DATABASE_URL` vers PostgreSQL et `provider = "postgresql"` dans `prisma/schema.prisma`, puis `npx prisma migrate deploy`.
2. Stockage des fichiers : remplacer `src/lib/uploads.ts` par un stockage objet (S3, etc.) si plusieurs instances.
3. Remplacer la limitation de connexion en mémoire (`src/actions/auth.ts`) par Redis en multi-instances.
4. Brancher un fournisseur de paiement (`src/lib/services/payments.ts`) et des canaux de notification (`src/lib/services/notifications.ts`).
