# Artisanova

Boutique pédagogique de créations artisanales : Next.js App Router, TypeScript strict, Tailwind CSS, Prisma 7.10.0 et PostgreSQL 17.

## État

Accueil et calcul du panier testés. Schéma de données complet et migration initiale appliquée. Le seed, le setup automatisé et les interfaces commerciales arrivent dans les prochains lots.

## Développement

Prérequis : Node.js 22.18+, npm ; Docker Compose pour PostgreSQL.

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:3000. L’accueil peut démarrer sans base. Le client Prisma est généré après installation.

Pour la base locale : copier `.env.example` vers `.env`, démarrer `docker compose up -d --wait`, puis exécuter `npm run db:migrate`. Le port 5433 est lié à 127.0.0.1 et le volume conserve les données. Les identifiants publics de l’exemple sont exclusivement locaux.

```sh
npm run db:generate
npm run db:status
npm test
npm run lint
npm run build
```

## Architecture

`prisma/schema.prisma` et `prisma/migrations/` définissent les relations, index et contraintes sur les prix, stocks, totaux, promotions et adresses. Le client applicatif de `src/lib/db/` est réservé au serveur et ne se connecte qu’à la demande. Les services métier sont indépendants de l’interface.

La présence du schéma ne signifie pas qu’un checkout ou une authentification sont opérationnels. Les validations utilisateur et contrôles d’accès seront ajoutés avec les futurs modules.

CLI et client Prisma sont alignés sur une version stable. Les correctifs ciblés des dépendances sont verrouillés ; shadcn est un outil de développement. L’audit npm production ne signale aucune vulnérabilité ; les alertes restantes de développement seront détaillées dans le suivi.

Voir [SUIVI_PROJET.md](SUIVI_PROJET.md) pour les choix et les limites. Les audits navigateur, WCAG et Lighthouse restent à réaliser.
