# Artisanova

Projet pédagogique de boutique artisanale française, basé sur Next.js App Router, React, TypeScript strict, Tailwind CSS, Prisma 7 et PostgreSQL 17.

## Démarrage local en trois commandes

Prérequis : Node.js 22.18+, npm, Docker avec Compose et un daemon démarré. Le port local 5433 doit être libre.

```sh
npm ci
npm run setup
npm run dev
```

Ouvrir http://localhost:3000. `setup` copie `.env.example` vers `.env` si ce fichier n’existe pas, démarre PostgreSQL, génère le client, applique les migrations puis initialise la démonstration. Il ne remplace jamais un `.env` existant et ne supprime aucune base ni volume.

La base Docker est exposée sur **127.0.0.1:5433 uniquement**. Les identifiants de `.env.example` sont publics et réservés au développement. Pour un port différent, adapter **POSTGRES_PORT et DATABASE_URL** ensemble dans `.env`. Un changement de mot de passe après création du volume nécessite de changer aussi le mot de passe du rôle dans PostgreSQL ; les variables Docker ne reconfigurent pas un volume existant.

## Commandes de développement

```sh
npm run db:generate  # client Prisma, sans base démarrée
npm run db:migrate   # applique les migrations versionnées, sans reset
npm run db:seed      # initialise la démonstration locale
npm run db:status    # état des migrations
npm test            # tests unitaires, sans base
npm run test:db      # tests PostgreSQL, après setup
npm run lint
npm run build
```

Pour arrêter PostgreSQL en conservant les données : `docker compose stop`. Pour créer une nouvelle migration pendant le développement : `npx prisma migrate dev --name nom_explicite`. Ne pas modifier une migration déjà appliquée ; ajouter une nouvelle migration. Le client généré est ignoré par Git et régénéré après installation.

## Données et comptes de démonstration

Le seed comprend 1 admin, 3 clients, 5 catégories, 5 artisans fictifs, 25 produits publiés avec illustrations locales, 2 promotions et 10 commandes de statuts variés, dont une commande invitée. Il crée les données absentes avec des identifiants stables ; **il conserve les données déjà présentes**, y compris les mots de passe, stocks et statuts modifiés. Les adresses sont fictives.

| Rôle | Email | Mot de passe local |
|---|---|---|
| Admin | admin@artisanova.test | Artisanova123! |
| Client | camille@artisanova.test | Artisanova123! |
| Client | sam@artisanova.test | Artisanova123! |
| Client | lou@artisanova.test | Artisanova123! |

Les mots de passe sont hashés avec bcrypt (coût 12). Ces comptes existent en BDD ; **l’interface de connexion reste à implémenter**. Le seed refuse l’exécution en production, sans `SEED_DEMO=true`, ou sur une URL qui ne vise pas une base `artisanova` locale. Ne jamais peupler une base de production avec ces comptes publics.

Promotions : `BIENVENUE10` réduit le sous-total de 10 % ; `PORT0` offre les frais de port. Le port est gratuit à partir de 60 € **après remise**, pour les trois modes. Les montants sont en centimes entiers ; la TVA de 20 % dans les fixtures est une hypothèse de démonstration à valider selon les produits avant commercialisation.

Les commandes fictives sont datées du 1er au 5 octobre 2026. Les stocks fournis représentent le stock disponible après cet historique ; relancer le seed ne rejoue pas les ventes. Les emails de confirmation sont stockés avec le statut `SIMULATED`, sans envoi réseau. Les cartes de paiement de démonstration seront documentées lors de l’implémentation du checkout.

## Architecture et garanties actuelles

- `prisma/schema.prisma` : modèle complet, relations, unicité et index.
- `prisma/migrations/` : SQL versionné, contraintes supplémentaires sur prix, stock, totaux, propriétaire du panier, promotions, images et adresses.
- `src/lib/db/` : client PostgreSQL et point d’entrée applicatif `server-only` ; une instance par processus.
- `src/lib/services/` : règles commerciales indépendantes de l’interface.
- `src/lib/catalog/normalize.ts` : recherche insensible aux accents et à la casse.
- `prisma/seed.ts` : données fictives, relançables, insérées dans une transaction.
- `tests/` : tests unitaires et intégration PostgreSQL. Les tests d’intégration utilisent des transactions annulées ou une fixture unique supprimée ; ils ne réinitialisent pas le catalogue.

Le schéma prévoit des instantanés de commande, des clés d’idempotence uniques, des sessions expirables, des jetons de reset hashés, une outbox d’emails et des historiques de stock et de statut. **Les services qui exploitent ces mécanismes restent à implémenter** : la présence des tables ne signifie pas qu’un checkout ou une authentification sont opérationnels.

Le CLI et le client Prisma sont alignés sur 7.10.0. La configuration CLI et l’adaptateur PostgreSQL suivent la [documentation officielle Prisma](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference). La génération du client et le build ne nécessitent pas de base démarrée : les pages publiques sont dynamiques. Leur consultation nécessite PostgreSQL démarré. Les erreurs de connexion affichent un état de reprise dans la boutique.

## État et limites

L’accueil, le catalogue et les fiches produit utilisent maintenant PostgreSQL. Catalogue : recherche insensible aux accents, filtres URL combinables, budget avec curseur, disponibilité, quatre tris et pagination de 12 produits. Fiches : galerie, artisan, stock, prix TTC et similaires. Panier persistant, comptes, checkout et back-office restent à construire. Les illustrations SVG sont des visuels de démonstration, pas des photos de produits réels.

Le fichier [SUIVI_PROJET.md](SUIVI_PROJET.md) consigne les décisions, réalisations, preuves et simplifications. Les audits navigateur, WCAG, Lighthouse et couverture des services restent à réaliser. Le projet n’est pas prêt à recevoir de véritables achats.
