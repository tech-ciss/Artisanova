# 🛒 Exercice — Conception d'un site e-commerce

## « ARTISANOVA » — Marketplace de créateurs artisanaux

**Type de mission :** Développement Full-Stack (Next.js)
**Durée estimée :** 5 à 8 jours
**Niveau :** Intermédiaire

---

## 1. Contexte de l'entreprise

**Artisanova** est une jeune entreprise basée à Nantes qui souhaite lancer une **boutique en ligne** dédiée aux produits artisanaux français : bougies, savons, céramiques, bijoux, textiles, cosmétiques naturels, etc.

L'entreprise a démarré sur les marchés de créateurs et sur Instagram, mais fait face à plusieurs limites :

- Les commandes sont prises **en DM Instagram** ou par mail.
- Les paiements se font par **virement ou PayPal** manuel.
- Le stock est suivi sur un **Google Sheet** partagé.
- Aucune vision claire du **catalogue** pour les clients.
- Les clients réclament une **vraie boutique en ligne** avec panier et paiement sécurisé.

La direction souhaite un **site e-commerce moderne** pour vendre en ligne, gérer le catalogue et suivre les commandes, avec une identité visuelle **chaleureuse et artisanale**.

---

## 2. Objectifs du projet

1. Proposer une **vitrine attractive** mettant en valeur les produits.
2. Permettre aux clients de **commander et payer en ligne** en toute simplicité.
3. Fournir un **back-office** pour gérer produits, stocks et commandes.
4. Poser les bases pour de futures évolutions (multi-créateurs, blog, programme fidélité).

---

## 3. Périmètre

### ✅ Inclus (MVP)

- Catalogue produits avec catégories, recherche et filtres
- Fiche produit détaillée
- Panier persistant
- Tunnel de commande (checkout) avec paiement **simulé ou réel** (Stripe test)
- Compte client (inscription, connexion, historique de commandes)
- Back-office admin (produits, stocks, commandes)
- Emails de confirmation (simulés acceptables)

### ❌ Hors périmètre

- Marketplace multi-vendeurs (un seul vendeur = Artisanova)
- Programme de fidélité / codes promo avancés (basique OK)
- Application mobile
- Livraison en temps réel / suivi transporteur

---

## 4. Acteurs & rôles

| Rôle | Description | Accès |
|---|---|---|
| **Visiteur** | Non connecté | Catalogue, fiche produit, panier, inscription |
| **Client** | Connecté | Tout ci-dessus + commandes, profil, adresses |
| **Admin** | Équipe Artisanova | Back-office complet |

---

## 5. Spécifications fonctionnelles

### Module A — Catalogue & navigation

| ID | User story | Règles de gestion |
|---|---|---|
| A1 | En tant que visiteur, je vois une **page d'accueil** avec bannière, produits mis en avant, catégories principales. | 3 à 6 produits « coup de cœur » sélectionnables en back-office. |
| A2 | Je peux parcourir le **catalogue** avec pagination ou scroll infini. | 12 produits par page. Tri : nouveauté, prix ↑, prix ↓, popularité. |
| A3 | Je peux filtrer les produits par **catégorie**, **prix** (slider), **disponibilité**. | Filtres combinables. URL contient les filtres (partageable). |
| A4 | Je peux **rechercher** un produit par nom ou mot-clé. | Recherche insensible à la casse et aux accents. Résultat en < 500 ms. |
| A5 | Je consulte la **fiche produit** détaillée. | Affiche : galerie d'images, titre, prix, description, stock disponible, catégorie, artisan (nom + petit texte), produits similaires. |
| A6 | Sur la fiche produit, je choisis la **quantité** et j'**ajoute au panier**. | Ne peut pas dépasser le stock disponible. Bouton désactivé si rupture. |

### Module B — Panier

| ID | User story | Règles de gestion |
|---|---|---|
| B1 | Je consulte mon panier à tout moment (icône avec badge nombre d'articles). | Persistant même sans compte (localStorage ou cookie). Fusion avec le panier serveur à la connexion. |
| B2 | Je peux modifier la quantité ou supprimer un article. | Recalcul automatique du total. Vérification stock à chaque modification. |
| B3 | Je vois un **récapitulatif** : sous-total, frais de port, total TTC. | Frais de port : **gratuits dès 60 € d'achat**, sinon 5,90 €. |
| B4 | Je peux appliquer un **code promo**. | Code = pourcentage (ex : `BIENVENUE10` = -10 %) ou montant fixe. Un seul code par commande. Vérifié côté serveur. |

### Module C — Compte client

| ID | User story | Règles de gestion |
|---|---|---|
| C1 | Je peux créer un compte (email + mot de passe) ou passer commande en **invité**. | Email unique. Mot de passe ≥ 8 caractères, 1 majuscule, 1 chiffre. |
| C2 | Je me connecte / me déconnecte. | Session persistante (cookie httpOnly). |
| C3 | Je gère mes **adresses** de livraison et facturation (CRUD). | Une adresse par défaut. Adresse française uniquement (validation du code postal). |
| C4 | Je consulte l'**historique** de mes commandes. | Statut, date, montant, détail, bouton « télécharger facture ». |
| C5 | Je modifie mon profil (nom, email, mot de passe). | Confirmation par ancien mot de passe pour changer le mot de passe. |

### Module D — Tunnel de commande (checkout)

Le checkout est le cœur de la conversion. Il doit être **fluide, en 3 étapes maximum**.

**Étapes obligatoires :**

```
1. Livraison  →  2. Paiement  →  3. Confirmation
```

| ID | User story | Règles de gestion |
|---|---|---|
| D1 | Je saisis / choisis mon adresse de livraison. | Si connecté, pré-remplissage depuis mes adresses enregistrées. Si invité, saisie manuelle + option « créer un compte à la fin ». |
| D2 | Je choisis un **mode de livraison**. | Standard (3-5 jours, 5,90 €) / Point relais (4,90 €) / Express (24 h, 9,90 €). Gratuit dès 60 €. |
| D3 | Je paie ma commande. | Stripe (mode test) **ou** paiement simulé avec formulaire de carte fictif validé côté serveur. Cartes acceptées : CB, Visa, Mastercard. |
| D4 | À la validation, la commande est créée et le **stock décrémenté**. | Transaction atomique : si le stock a été pris entre temps par un autre client, la commande est refusée avec un message clair. |
| D5 | Je reçois une **page de confirmation** avec le numéro de commande + un email de confirmation. | N° de commande au format `ART-{AAAAMMJJ}-{séquence}` (ex : `ART-20260115-0042`). Email peut être simulé (log). |

### Module E — Back-office admin

| ID | User story | Règles de gestion |
|---|---|---|
| E1 | En tant qu'admin, je gère les **produits** (CRUD). | Champs : titre, slug, description (markdown ou éditeur riche), prix HT/TTC, stock, catégorie, images (min. 1, max. 5), artisan, statut (brouillon / publié). |
| E2 | Je gère les **catégories** (CRUD). | Une catégorie = nom, slug, image, description. Une catégorie utilisée ne peut pas être supprimée (uniquement archivée). |
| E3 | Je vois la liste des **commandes** avec filtres (statut, date, client). | Statuts : `EN ATTENTE PAIEMENT`, `PAYÉE`, `EN PRÉPARATION`, `EXPÉDIÉE`, `LIVRÉE`, `ANNULÉE`. |
| E4 | Je change le **statut** d'une commande. | Transitions logiques uniquement (pas de retour en arrière). Chaque changement est historisé. |
| E5 | Je vois un **dashboard** simple. | KPI : CA du mois, nb commandes du mois, panier moyen, produits en rupture, top 5 des produits vendus. |
| E6 | Je gère les **codes promo**. | Code, type (% ou €), valeur, date d'expiration, nombre d'utilisations max, actif/inactif. |

### Module F — Emails transactionnels

| Événement | Destinataire | Contenu |
|---|---|---|
| Inscription | Client | Bienvenue |
| Commande validée | Client | Récapitulatif + n° |
| Commande expédiée | Client | Notification |
| Réinitialisation mot de passe | Client | Lien (valable 1 h) |
| Nouvelle commande | Admin | Notification interne |

> Envoi réel (Resend, Nodemailer…) **ou** simulé (log + stockage en base). Une page « historique des emails » côté admin est un plus.

---

## 6. Fiche technique

### 6.1 Stack recommandée

| Couche | Technologie | Remarques |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Server Components par défaut |
| Langage | **TypeScript** | Mode strict |
| Style | **Tailwind CSS** | shadcn/ui recommandé |
| BDD | **PostgreSQL** ou **SQLite** (dev) | Docker ou hébergé |
| ORM | **Prisma** ou **Drizzle** | Migrations versionnées |
| Auth | **Auth.js (NextAuth)** ou solution maison | Cookies httpOnly |
| Validation | **Zod** | Côté serveur systématique |
| Paiement | **Stripe (mode test)** ou simulé | Clés en variables d'env |
| Images | **next/image** + service (Cloudinary, UploadThing…) ou stockage local en dev | |
| Tests | **Vitest** (unitaire) | Bonus : Playwright |

### 6.2 Architecture attendue

```
src/
├── app/
│   ├── (shop)/              # accueil, catalogue, produit, panier, checkout
│   ├── (account)/account/   # espace client
│   ├── (admin)/admin/       # back-office
│   ├── api/                 # webhooks Stripe, route handlers
│   └── auth/                # login, register
├── components/
│   ├── ui/                  # composants génériques
│   └── features/            # ProductCard, CartDrawer, CheckoutForm…
├── lib/
│   ├── db/
│   ├── auth/
│   ├── validations/         # schémas Zod
│   ├── services/            # cart.service, order.service, stock.service…
│   └── payment/             # abstraction Stripe / mock
├── actions/                 # server actions
└── types/
```

**Principes :**

- La **logique métier** (calcul panier, application code promo, décrément stock) vit dans `lib/services/` et est **testable unitairement**.
- Chaque action mutative : **authentifie (si besoin) → valide Zod → appelle le service**.
- Les prix, stocks, totaux sont **toujours recalculés côté serveur** au moment de la commande (jamais faire confiance au client).

### 6.3 Modèle de données minimal

```
User        (id, email, passwordHash, firstName, lastName, role, createdAt)
Address     (id, userId, line1, line2?, city, zip, country, isDefault, type[SHIPPING|BILLING])
Category    (id, name, slug, image?, description?, isArchived)
Artisan     (id, name, bio, avatar?)
Product     (id, title, slug, description, priceCents, stock, categoryId, artisanId, status[DRAFT|PUBLISHED], isFeatured, createdAt)
ProductImage(id, productId, url, alt, position)
Cart        (id, userId?, sessionId?, updatedAt)
CartItem    (id, cartId, productId, quantity)
Order       (id, reference, userId?, email, status, subtotalCents, shippingCents, discountCents, totalCents, promoCodeId?, createdAt)
OrderItem   (id, orderId, productId, title, unitPriceCents, quantity)
OrderAddress(id, orderId, type, line1, city, zip, country, ...)
PromoCode   (id, code, type[PERCENT|FIXED], value, expiresAt?, maxUses?, usedCount, isActive)
Payment     (id, orderId, provider, providerRef, status, amountCents, createdAt)
```

### 6.4 Données de démonstration (seed)

Script `seed` **obligatoire** :

- 1 admin + 3 clients de test
- 5 catégories, 5 artisans
- ~25 produits publiés avec images (URLs Unsplash acceptables)
- 2 codes promo (`BIENVENUE10` -10 %, `PORT0` port gratuit)
- ~10 commandes fictives (statuts variés) pour peupler le dashboard
- Identifiants documentés dans le README

---

## 7. Contraintes

### 7.1 Techniques

- [ ] `next build` sans erreur TypeScript ni ESLint bloquante.
- [ ] Server Components par défaut ; `"use client"` justifié.
- [ ] Toutes les entrées utilisateur validées **côté serveur** avec Zod.
- [ ] Les prix, totaux et stocks sont **toujours** recalculés côté serveur.
- [ ] Migrations versionnées ; le projet démarre en **≤ 3 commandes** après clonage.
- [ ] Variables d'environnement dans `.env.example`.

### 7.2 Sécurité

- [ ] Mots de passe hashés (bcrypt / argon2).
- [ ] Un client ne voit **jamais** les commandes d'un autre (tester avec IDs manipulés).
- [ ] Les routes `/admin/*` protégées par rôle côté serveur.
- [ ] Rate limiting basique sur login, register, checkout.
- [ ] Aucune clé secrète (Stripe, DB) exposée côté client.

### 7.3 UX / UI

- [ ] **Responsive mobile-first** (>60 % du trafic e-commerce vient du mobile).
- [ ] Feedback utilisateur systématique (toast succès/erreur, spinners).
- [ ] Loading states (`loading.tsx`, skeletons) et error boundaries (`error.tsx`, `not-found.tsx`).
- [ ] Panier accessible depuis toutes les pages (drawer ou page dédiée).
- [ ] Formulaires : erreurs au niveau du champ, bouton désactivé pendant soumission.
- [ ] **Accessibilité** : navigation clavier, labels, contraste AA, score Lighthouse a11y ≥ 90.

### 7.4 Performance & SEO

- [ ] Lighthouse Performance ≥ 85 sur accueil et fiche produit.
- [ ] Images via `next/image` (formats modernes, lazy loading).
- [ ] Fiches produit : `generateMetadata` (titre, description, Open Graph, image).
- [ ] URLs propres avec **slugs** (`/produits/bougie-cire-abeille-lavande`).
- [ ] Sitemap.xml et robots.txt générés.
- [ ] Pas de requête N+1 (utiliser `include` / joins).

### 7.5 Qualité & livrables

- [ ] Dépôt Git avec **commits atomiques et lisibles**.
- [ ] **Tests unitaires** minimum sur : calcul du panier (sous-total, port, remise), application du code promo, décrément du stock, transitions de statut de commande. Couverture ≥ 60 % sur `lib/services/`.
- [ ] `README.md` : présentation, prérequis, installation, comptes de test, cartes Stripe test, choix techniques, limites connues.
- [ ] `.env.example` documenté.

---

## 8. Livrables attendus

| # | Livrable | Format |
|---|---|---|
| 1 | Code source | Dépôt Git (GitHub / GitLab) |
| 2 | Application déployée | URL Vercel + BDD hébergée (Neon, Supabase…) — recommandé |
| 3 | README | Markdown à la racine |
| 4 | Vidéo démo (optionnel) | 3-5 min : parcours d'achat complet + back-office |

---

## 9. Grille d'évaluation (sur 100)

| Critère | Points |
|---|---|
| **Couverture fonctionnelle** (modules A à F) | 30 |
| **Qualité du code & architecture** | 20 |
| **Sécurité & robustesse** (contrôle d'accès, calculs serveur, transactions) | 15 |
| **UX / UI / Responsive / Accessibilité** | 15 |
| **Performance & SEO** | 10 |
| **Tests** | 5 |
| **Documentation & DX** | 5 |

> ⚠️ Un site **partiel mais propre, sécurisé et fluide** sera mieux noté qu'un site **complet mais fragile ou lent**.

---

## 10. Bonus (max +15 points)

| Bonus | Pts | Description |
|---|---|---|
| ❤️ **Wishlist** | +2 | Liste de favoris persistante par client |
| ⭐ **Avis clients** | +2 | Notation 1-5 ⭐ + commentaire, réservé aux clients ayant acheté |
| 🔍 **Recherche avancée** | +2 | Recherche full-text avec suggestions (autocomplétion) |
| 💳 **Stripe réel** (mode test) | +2 | Intégration complète avec webhook de confirmation |
| 📄 **Facture PDF** | +2 | Génération d'une vraie facture téléchargeable |
| 📧 **Emails réels** | +1 | Envoi via Resend / Sendgrid avec templates |
| 🌙 **Dark mode** | +1 | Persistant, sans flash |
| 🌍 **i18n** | +1 | FR / EN avec `next-intl` |
| 📊 **Dashboard graphique** | +1 | Graphique CA, top produits, courbes |
| 📱 **PWA** | +1 | Installable, manifest, offline basique |

---

## 11. Planning indicatif (8 jours)

| Jour | Objectif |
|---|---|
| **J1** | Setup projet, BDD, ORM, seed, layout global, header/footer |
| **J2** | Page d'accueil, catalogue, filtres, fiche produit |
| **J3** | Panier (client + serveur), persistance, code promo |
| **J4** | Auth, compte client, adresses, historique |
| **J5** | Tunnel de commande complet + paiement |
| **J6** | Back-office : produits, catégories, commandes, dashboard |
| **J7** | Tests, responsive, accessibilité, SEO, polish UX |
| **J8** | Documentation, déploiement, bonus |

---

## 12. Questions à anticiper pour la soutenance

- Comment gérez-vous les **prix côté serveur vs client** ?
- Que se passe-t-il si deux clients achètent le **dernier exemplaire** en même temps ?
- Comment fusionnez-vous le panier **invité** et le panier **connecté** ?
- Pourquoi Server Actions ou Route Handlers pour le checkout ?
- Comment évolueriez-vous l'app vers une vraie **marketplace multi-vendeurs** ?
- Quels indicateurs surveilleriez-vous en production ?

---

*Bon développement — et souvenez-vous : un e-commerce, c'est **un panier qui ne se perd jamais** et **un paiement qui ne plante jamais**. Tout le reste est secondaire.* 🛍️