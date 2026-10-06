# Artisanova

Projet pédagogique e-commerce de créations artisanales françaises, basé sur Next.js App Router, React, TypeScript strict et Tailwind CSS.

## État actuel

Première étape : accueil responsive, identité visuelle et calcul commercial testé. Catalogue, panier persistant, comptes, checkout, BDD et administration ne sont pas encore implémentés. Le fichier [SUIVI_PROJET.md](SUIVI_PROJET.md) détaille chaque exigence, les décisions et les limites.

## Démarrage local

Prérequis : Node.js 22.18 ou plus récent, npm.

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:3000. L’accueil ne nécessite pas de variable d’environnement. `.env.example` prépare la future configuration PostgreSQL ; aucune connexion n’est actuellement utilisée.

## Vérifications

```sh
npm test
npm run lint
npm run build
```

Les tests initiaux utilisent le runner Node et son support TypeScript. La suite couvre les règles de panier et promotion, pas encore la persistance ni un achat complet. Les prix sont exprimés en centimes entiers. Le port est gratuit à partir de 60 € **après remise**, pour les trois modes de livraison.

## Démonstration et limites

Les cinq collections de l’accueil sont illustrées en CSS. Aucune commande ne peut encore être passée. Aucun compte de test ni carte de paiement n’est disponible : ils seront documentés quand le seed et le paiement seront opérationnels. Les seuils Lighthouse et la conformité WCAG restent à vérifier par audit ; ils ne sont pas revendiqués.

Le CLI Prisma RC et le client déjà installés devront être alignés avant le lot BDD. Les modifications préexistantes de l’environnement ont été conservées.
