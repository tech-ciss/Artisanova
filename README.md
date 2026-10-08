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
npm run test:catalog-http # contrôles HTTP, serveur local démarré sur 3000
npm run bench:catalogue   # benchmark local du service PostgreSQL
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

Les mots de passe sont hashés avec bcrypt (coût 12). Ces comptes existent en BDD ; ils sont utilisables sur `/connexion`. Le seed refuse l’exécution en production, sans `SEED_DEMO=true`, ou sur une URL qui ne vise pas une base `artisanova` locale. Ne jamais peupler une base de production avec ces comptes publics.

Promotions : `BIENVENUE10` réduit le sous-total de 10 % ; `PORT0` offre les frais de port. Le port est gratuit à partir de 60 € **après remise**, pour les trois modes. Les montants sont en centimes entiers ; la TVA de 20 % dans les fixtures est une hypothèse de démonstration à valider selon les produits avant commercialisation.

Les commandes fictives sont datées du 1er au 5 octobre 2026. Les stocks fournis représentent le stock disponible après cet historique ; relancer le seed ne rejoue pas les ventes. Les emails de confirmation sont stockés avec le statut `SIMULATED`, sans envoi réseau. Les cartes de paiement de démonstration sont décrites ci-dessous.

## Architecture et garanties actuelles

- `prisma/schema.prisma` : modèle complet, relations, unicité et index.
- `prisma/migrations/` : SQL versionné, contraintes supplémentaires sur prix, stock, totaux, propriétaire du panier, promotions, images et adresses.
- `src/lib/db/` : client PostgreSQL et point d’entrée applicatif `server-only` ; une instance par processus.
- `src/lib/services/` : règles commerciales indépendantes de l’interface.
- `src/lib/catalog/normalize.ts` : recherche insensible aux accents et à la casse.
- `prisma/seed.ts` : données fictives, relançables, insérées dans une transaction.
- `tests/` : tests unitaires et intégration PostgreSQL. Les tests d’intégration utilisent des transactions annulées ou une fixture unique supprimée ; ils ne réinitialisent pas le catalogue.

Le schéma prévoit des instantanés de commande, des clés d’idempotence uniques, des sessions expirables, des jetons de reset hashés, une outbox d’emails et des historiques de stock et de statut. **Le schéma anticipe plusieurs lots** : les sessions et la fusion du panier sont opérationnelles ; le checkout et les emails de commande simulés sont opérationnels ; le reset et les autres événements email restent à réaliser.

Le CLI et le client Prisma sont alignés sur 7.10.0. La configuration CLI et l’adaptateur PostgreSQL suivent la [documentation officielle Prisma](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference). La génération du client et le build ne nécessitent pas de base démarrée : les pages publiques sont dynamiques. Leur consultation nécessite PostgreSQL démarré. Les erreurs de connexion affichent un état de reprise dans la boutique.

## État et limites

L’accueil, le catalogue et les fiches produit utilisent maintenant PostgreSQL. Catalogue : recherche insensible aux accents, filtres URL combinables, budget avec curseur, disponibilité, quatre tris et pagination de 12 produits. Fiches : galerie, artisan, stock, prix TTC et similaires. Panier persistant et authentification sont disponibles. Le tunnel invité et compte est disponible. Adresses, profil, historique et back-office administrateur sont disponibles. Les illustrations SVG sont des visuels de démonstration, pas des photos de produits réels.

Le fichier [SUIVI_PROJET.md](SUIVI_PROJET.md) consigne les décisions, réalisations, preuves et simplifications. Les audits navigateur, WCAG, Lighthouse et couverture des services restent à réaliser. Le projet n’est pas prêt à recevoir de véritables achats.

## Catalogue et référencement

Routes : `/catalogue`, `/produits/tasse-gres-creme`, `/sitemap.xml`, `/robots.txt`.

Exemple partageable : `/catalogue?q=gr%C3%A8s&category=ceramiques&min=25&max=60&available=1&sort=price-asc`.

Les prix de l’URL sont en euros, convertis et validés côté serveur en centimes. La popularité mesure les quantités vendues dans les commandes payées et leurs statuts logistiques suivants ; les commandes annulées/en attente sont exclues. Les produits brouillons et catégories archivées sont masqués sur toutes les entrées publiques. Les coups de cœur de l’accueil proviennent de `isFeatured` (maximum six).

Les filtres GET et la saisie numérique du budget fonctionnent sans JavaScript ; le curseur synchronisé et les miniatures de galerie utilisent des composants client. Les formulaires panier utilisent les Server Actions Next et les données du catalogue serveur. Les images SVG du seed sont des illustrations de démonstration ; les images JPEG/PNG pourront être optimisées via `next/image` avec l’origine Unsplash autorisée.

Les fiches ont leurs métadonnées, URL canonique et Open Graph. Les variantes filtrées du catalogue sont `noindex, follow`. Le sitemap ne contient que les fiches publiées de catégories actives. **Configurer NEXT_PUBLIC_APP_URL avec l’origine réelle avant déploiement**. robots.txt est une indication aux robots, pas un contrôle d’accès ; les futurs espaces privés devront être protégés côté serveur.

Les tests HTTP vérifient le HTML et les statuts, pas les interactions dans un navigateur. Le benchmark mesure le service PostgreSQL local après échauffement ; il ne mesure pas Lighthouse ni le temps de rendu utilisateur.

Le panier invité est maintenant disponible sur `/panier` : ajout depuis une fiche, quantités, suppression, badge et codes BIENVENUE10 / PORT0. Le cookie privé persiste 30 jours ; les prix et stocks restent vérifiés côté serveur. Port standard offert dès 60 € après remise. La connexion fusionne ce panier avec le panier du compte. Le paiement simulé est disponible depuis le panier.

Contrôle du parcours panier : `npm run test:cart-http` (serveur local sur 127.0.0.1:3000 et base de démonstration nécessaires). Le test nettoie son panier en fin d’exécution. Dans les environnements où Turbopack ne peut pas ouvrir son port interne, `npm run dev -- --webpack` et `npm run build -- --webpack` permettent de vérifier le projet avec Webpack.

## Authentification et panier du compte

- `/inscription` : prénom, nom, email normalisé et unique, mot de passe confirmé. Minimum 8 caractères, une majuscule et un chiffre ; limite de 72 octets pour bcrypt, sans suppression des espaces.
- `/connexion` et `/compte` : session privée expirant après 30 jours. Déconnexion par POST avec révocation en base. Cookie Secure en production : le site doit être servi en HTTPS.
- Fusion à inscription/connexion : quantités additionnées, code invité prioritaire, aucune suppression silencieuse en cas de rupture. L’ancien panier invité est marqué consommé. Le panier du compte est conservé après déconnexion.
- Limitation PostgreSQL : 10 tentatives par email / 15 minutes et plafond global de 200 / 15 minutes. Les tentatives réussies comptent aussi. Pour une exploitation publique, compléter avec protection réseau et limites par IP provenant d’un proxy de confiance, puis planifier le nettoyage des données expirées.
- `npm run test:auth-http` : formulaires POST, cookies, accès protégé, origine hostile, propriétaire de panier manipulé, fusion, révocation et expiration. Serveur local sur `127.0.0.1:3000` et base de démonstration requis ; comptes/paniers de test nettoyés.

Cette étape livre l’authentification et un accueil de compte. Adresses, modification de profil, historique et document HTML de démonstration sont disponibles. Email de bienvenue, vérification email et récupération de mot de passe restent à réaliser. La commande invité est disponible sans création de compte.

La validation auth HTTP peut aussi cibler `npm run start` après build avec `AUTH_HTTP_PRODUCTION=true npm run test:auth-http` : elle exige alors Secure sur les cookies et private/no-store sur le compte. Le test utilise un jar manuel en HTTP local ; il ne vérifie pas TLS ni la politique cookie d’un navigateur.

## Commander et simuler un paiement

Ajouter un produit au panier puis choisir « Commander » : livraison, paiement, confirmation. France uniquement ; standard 5,90 €, relais 4,90 €, express 9,90 €, gratuit dès 60 € après remise. Les deux relais sont fictifs. Une adresse de facturation distincte est facultative ; un client connecté peut sélectionner son adresse enregistrée.

| Marque | Numéro fictif accepté | Résultat |
|---|---|---|
| CB | 4000000000000077 | Réussite |
| Visa | 4242424242424242 | Réussite |
| Mastercard | 5555555555554444 | Réussite |
| Visa | 4000000000000002 | Refus sans commande |

Utiliser une expiration future au format MM/AAAA (ex. 12/2035), le CVC **123**, et cocher la confirmation de simulation. Seules ces fixtures sont acceptées ; aucune donnée de carte n’est conservée. Aucun débit ni livraison réelle.

Le brouillon expire après une heure. Un changement de prix, contenu ou promo demande de reprendre la livraison. Paiement, stock, consommation promo, instantanés, historique, emails et panier vidé sont validés dans une même transaction. Un rejeu du paiement retourne la même commande. Les références suivent ART-AAAAMMJJ-séquence, avec jour Europe/Paris.

La référence seule ne donne pas accès à la confirmation. L’invité utilise un cookie privé de reçu valable 30 jours pour sa dernière commande ; le client connecté doit en être propriétaire. Après achat, création ou connexion facultative au compte avec le même email et la preuve du reçu. Les commandes rattachées au compte sont accessibles dans son historique.

Deux emails (client et admin) sont enregistrés dans la transaction puis marqués SIMULATED, sans envoi externe. `ADMIN_NOTIFICATION_EMAIL` configure le destinataire admin, par défaut admin@artisanova.test. Si la simulation échoue après commit, relancer `npm run emails:simulate` sur la base locale de démonstration : seules les entrées PENDING sont traitées. Nettoyage des brouillons expirés à planifier au déploiement.

```sh
npm run test:cart-http
npm run test:auth-http
npm run test:checkout-http # serveur sur 127.0.0.1:3000 ; fixtures nettoyées
npm run emails:simulate   # simulation locale, aucun email envoyé
```

Les tests HTTP soumettent les formulaires natifs et vérifient les protections et effets en base ; ils ne remplacent pas l’audit interactif mobile/clavier. En développement, le cache Prisma se renouvelle après changement des modèles ou noms de colonnes générés ; redémarrer Next après changement de type de colonne ou d’adaptateur.

## Espace client

Depuis `/compte` :

- `/compte/adresses` : créer, modifier et supprimer des adresses françaises. Une adresse par défaut par usage (livraison/facturation), première adresse automatiquement sélectionnée ; un remplacement est choisi après suppression. Maximum 20 adresses.
- `/compte/profil` : modifier nom/email ou mot de passe, avec confirmation par mot de passe actuel. Changer email ou mot de passe révoque toutes les sessions et exige une reconnexion. Les commandes conservent leurs coordonnées historiques. La vérification du nouvel email reste à ajouter.
- `/compte/commandes` : historique paginé, statut, date, total, détail et suivi des statuts. Seules les commandes rattachées à ce compte apparaissent, aucune récupération par email seul.
- Document de facture téléchargeable en HTML imprimable depuis chaque commande. Basé sur ses instantanés et protégé par propriétaire, sans cache. Document fictif sans valeur comptable ; PDF et mentions fiscales d’une entreprise réelle restent à réaliser.

`npm run test:account-http` vérifie les formulaires, la révocation, l’historique et l’isolation des documents, avec nettoyage des fixtures. Serveur local sur 127.0.0.1:3000 et base de démonstration requis. Les tests PostgreSQL couvrent aussi les défauts d’adresse concurrents et l’impossibilité de modifier l’adresse d’un autre client.

## Administration

Se connecter avec le compte admin de démonstration puis ouvrir `/admin`. Chaque page et action vérifie le rôle en base ; un client reçoit une 404 et le visiteur est redirigé vers la connexion. Le rôle transmis par un formulaire n’est jamais accepté.

- Tableau de bord : CA TTC, nombre de commandes du mois, moyenne des commandes payées, ruptures publiques et top cinq des ventes. Mois Europe/Paris ; CA/moyenne excluent attente/annulations, compteur inclut tous statuts. Top ventes toutes périodes.
- Produits : titre, slug, Markdown simple, prix TTC et TVA (HT calculé), stock, artisan/catégorie, publication, 1–5 images et sélection de coups de cœur (maximum six). Images par URL locale `/demo` ou `/images`, ou HTTPS `images.unsplash.com` ; alternatives obligatoires. Pas d’upload dans ce lot. Markdown : paragraphes, titres `##` et listes `-`, sans HTML ni liens interprétés.
- Une fiche ouverte avant un changement de stock doit être rechargée ; son ancien formulaire ne peut pas écraser le nouvel inventaire. Les ajustements de stock enregistrent auteur et motif.
- Catégories : CRUD ; une catégorie utilisée peut être archivée mais pas supprimée. Ses produits sont masqués dans la boutique. Un produit utilisé dans un panier, une commande ou un mouvement de stock est retiré du catalogue plutôt que supprimé physiquement.
- Commandes : recherche client/email/référence, statut et jour Europe/Paris, détail et historique. Transitions : payée → préparation → expédiée → livrée ; annulation possible avant expédition. Le statut payé provient du checkout. Annuler rembourse uniquement le paiement mock et réapprovisionne une fois ; pas de retour après expédition, ni de remboursement externe. L’usage promo reste consommé.
- Promotions : pourcentage entier, montant fixe en euros ou port offert (valeur 0), date limite jusqu’à fin de journée Europe/Paris, plafond et activation. Les usages sont conservés et une limite ne peut pas descendre sous les usages déjà consommés. Désactivation plutôt que suppression historique.
- Emails : historique paginé des événements simulés, dont l’expédition. Un rejeu de transition ne crée pas de nouvel email. Bienvenue et récupération de mot de passe restent à réaliser.

Les listes sont paginées à 20 lignes. `npm run test:admin-http` vérifie les formulaires, les origines d’images, le stock périmé, les transitions, l’email unique et le refus d’une action après retrait du rôle. Serveur local sur 127.0.0.1:3000 et base de démonstration requis ; fixtures nettoyées. Les tests PostgreSQL vérifient également achat/ajustement concurrents et annulation répétée.
