# Artisanova — suivi de conception et de réalisation

Dernière mise à jour : 7 octobre 2026. Référence : `Exercice Conception d.md`.
Objectif : couvrir les critères sur 100 avant les bonus, avec des preuves reproductibles. Aucune note ne peut être garantie.

## États et règle de suivi

**Fait** = implémenté et vérifié selon les preuves indiquées. **Partiel** = base présente, critères restants explicites. **À faire** = non implémenté. **Simplifié** = compromis assumé, avec justification. Mettre à jour ce fichier après chaque lot ; ne pas confondre intention et réalisation.

## Décisions techniques

| Réf. | Choix | Pourquoi / conséquences |
|---|---|---|
| ADR-001 | Conserver Next.js App Router, TypeScript strict et Tailwind déjà installés | Respect du sujet, pas de remplacement inutile du squelette. Server Components par défaut. |
| ADR-002 | PostgreSQL 17 local via Docker ; Prisma CLI/client/adaptateur 7.10.0 stables et alignés | Migration initiale appliquée. Port 5433 lié à 127.0.0.1, volume persistant, client serveur à connexion différée. L’ancienne RC a été retirée. |
| ADR-003 | Prix en centimes entiers ; service pur séparé de l’interface | Éviter les erreurs monétaires et permettre les tests ; au checkout charger les prix depuis la BDD, jamais depuis le navigateur. |
| ADR-004 | Seuil de port gratuit : 60 € après remise, pour les trois modes | Arbitrage d’une ambiguïté B3/D2. Tarifs standard 590, relais 490, express 990 centimes ; PORT0 annule le port. Afficher cette règle dans le panier futur. |
| ADR-005 | Checkout invité prioritaire : livraison → paiement → confirmation | Maximum trois étapes, sans connexion forcée. Création de compte facultative après achat. Non implémenté. |
| ADR-006 | Palette crème / brun / vert / terre cuite, typographies système et Georgia | Identité chaleureuse, aucune dépendance au téléchargement Google Fonts pour construire le projet. |
| ADR-007 | Illustrations CSS temporaires | Accueil léger sans fausses photos produits. Remplacer par photos avec alternatives et next/image lors du catalogue. |
| ADR-008 | node:test avec tsx pour les imports TypeScript et le client généré | Tests unitaires sans BDD ; suite d’intégration PostgreSQL séparée. ESM explicite, avertissement initial supprimé. Vitest et couverture instrumentée ≥60 % restent à mettre en place. |
| ADR-009 | Paiement simulé prévu en premier, puis Stripe test si socle validé | Autorisé par le sujet. Aucun traitement de vraie carte ; interface clairement marquée démonstration. Pas encore implémenté. |

## Matrice de couverture

| Exigences | État | Livré / reste à faire |
|---|---|---|
| A1 accueil | Fait | Accueil, catégories actives et jusqu’à six coups de cœur sélectionnés via isFeatured en BDD (cinq dans le seed). Leur édition via le back-office reste en E1. |
| A2–A5 catalogue | Fait | Catalogue PostgreSQL, pagination 12, tris, filtres combinés partageables, prix avec curseur, recherche normalisée, galerie, artisan, stock et similaires. Mesures de performance et audit navigateur détaillés dans le journal. |
| A6 ajout au panier | Fait | Quantité et ajout depuis la fiche, stock validé côté serveur, confirmation et lien vers le panier. |
| B1–B2 panier | Partiel | Panier invité serveur, badge global, quantités et suppression réalisés ; fusion à la connexion attend l’authentification. |
| B3–B4 calcul et promotion | Partiel | Récapitulatif et code unique validé en BDD réalisés ; consommation atomique lors de la commande à venir. |
| C1–C5 compte | À faire | Hash, cookies httpOnly, adresses, profil, commandes isolées et facture. |
| D1–D5 checkout | À faire | Invité et compte, adresse, paiement, transaction stock, confirmation, référence atomique. |
| E1–E6 admin | À faire | CRUD, protection serveur par rôle, transitions historisées, KPI et promotions. |
| F emails | À faire | Outbox en BDD ; événements inscription, commande, expédition, reset, admin. |
| BDD / seed / migrations | Fait | Schéma PostgreSQL complet, migration versionnée et appliquée ; 1 admin +3 clients hashés, 5 artisans et catégories, 25 produits illustrés, 2 promotions, 10 commandes, adresses et emails simulés. Relance sans duplication vérifiée. |
| UI/UX | Partiel | Catalogue mobile-first, champs associés aux labels, erreurs de filtres, pagination, état vide, chargement et reprise après erreur. Formulaires mutatifs et audit navigateur restent à faire. |
| WCAG 2.2 AA | Partiel | Fondations présentes ; audit clavier, lecteur d’écran, contrastes, zoom 200/400 %, largeur 320 px et Lighthouse ≥90 non réalisés. Aucune certification annoncée. |
| Performance / SEO | Partiel | Métadonnées produit/OG/canoniques, next/image, sitemap des produits publics et robots. Recherche locale mesurée ; Lighthouse ≥85 et aperçu social réel restent à vérifier. |
| Tests | Partiel | 11 tests unitaires, 12 tests PostgreSQL et contrôles HTTP passent. Services de transitions, accès manipulés, checkout E2E, tests navigateur et couverture ≥60 % restent à faire. |
| Documentation / DX | Partiel | Démarrage documenté en 3 commandes, setup exécuté avec succès, comptes seed et commandes décrits. Déploiement et documentation de paiement restent à faire. |
| Déploiement | À faire | Choisir hébergement après socle persistant validé. |
| Bonus | À faire | Reporter après validation du MVP ; wishlist, avis acheteurs, PDF, Stripe test et emails réels prioritaires à évaluer. |

## Robustesse ajoutée au sujet

Toutes les entrées mutatives devront être validées avec Zod côté serveur. Le service pur n’est pas une API et ne remplace pas cette validation.

- Idempotence checkout : empêcher une double commande lors d’un double clic ou d’une reprise réseau ; contrainte unique et résultat rejouable.
- Décrément conditionnel de stock en transaction ; test réel de deux achats concurrents du dernier exemplaire. Annulation et réapprovisionnement exactement une fois.
- Atomicité des usages promotionnels et de la séquence de référence ; validation au moment de l’achat.
- Instantanés produit, prix, adresses et fiscalité dans la commande pour conserver l’historique après modification du catalogue.
- Sessions expirables, protection CSRF/origine, limitation des tentatives, réponses sans fuite de données ; jetons de reset à usage unique, hashés et expirant après une heure.
- Emails sans mots de passe, coordonnées de carte ni données sensibles dans les logs ; outbox pour ne pas perdre un email après paiement.
- Statuts paiement séparés des statuts logistiques ; transitions autorisées et audit horodaté.
- Avant publication : vérifier les obligations françaises applicables (mentions légales, CGV, rétractation, confidentialité, cookies, prix/taxes, facture) avec sources officielles actualisées. Pas de texte juridique fictif présenté comme validé.
- Pas de cookies analytiques par défaut ; minimisation des données, secrets hors Git et aucune donnée réelle dans le seed.

## Ordre des prochains lots

1. **Terminé :** stabiliser Prisma/client, PostgreSQL local, schéma, migrations et seed reproductible.
2. **Terminé :** catalogue branché sur BDD, fiche produit, recherche et filtres URL (A6 réservé au lot panier).
3. Panier persistant et promotions validées serveur, puis auth et fusion panier.
4. Checkout invité transactionnel, tests concurrence/idempotence et emails simulés.
5. Espace client puis back-office avec protections testées.
6. Audit responsive/accessibilité/SEO/performance, documentation et déploiement ; bonus ensuite.

## Journal de validation

### 2026-10-06 — lot initial

- Énoncé lu intégralement ; modifications préexistantes conservées.
- Accueil original remplacé par une première interface Artisanova sans lien vers une route inexistante.
- Service de calcul et tests des limites commerciales créés.
- `npm test` : 7 tests réussis, 0 échec.
- `npm run lint` : réussi après remplacement des liens d’accueil par `next/link`.
- `npm run build` : réussi, compilation TypeScript et génération statique terminées sur la version corrigée.
- `git diff --check` : réussi.
- Le runner Node émet un avertissement de détection ESM (sans échec) : configuration des tests à harmoniser lors du lot Vitest/couverture.
- Aucun test navigateur, score Lighthouse, achat réel ou simulation complète réalisé à ce stade.

## Politique de versionnement

À la demande explicite de l’utilisateur : commits clairs et progressifs à chaque lot cohérent, documentation mise à jour avec le code, aucun commit final monolithique. Aucun secret, `.env`, client généré ou donnée de base ne doit être versionné. Les commits sont locaux ; aucun push distant n’a été demandé.

## Décisions du lot base de données

| Réf. | Choix | Pourquoi / limites |
|---|---|---|
| ADR-010 | Seed transactionnel avec IDs stables et upserts sans mise à jour | Créer les éléments absents tout en préservant mots de passe, prix, stocks et commandes modifiés. Ne répare pas automatiquement une fixture altérée ; aucun reset implicite. |
| ADR-011 | Seed et tests réservés à une BDD `artisanova` sur localhost, hors production, avec SEED_DEMO=true | Les identifiants publics de démonstration ne doivent jamais être injectés sur une base distante. Le garde contrôle aussi le protocole PostgreSQL. |
| ADR-012 | Cinq illustrations SVG locales réutilisées selon la catégorie | Démonstration autonome et légère ; visuels explicitement fictifs. Photos réelles, galerie variée et caractéristiques produit restent à fournir avant commercialisation. |
| ADR-013 | Une adresse par défaut par client et par type livraison/facturation | Index unique partiel PostgreSQL pour éviter deux valeurs par défaut, même lors de requêtes concurrentes. |
| ADR-014 | Contraintes SQL en plus du schéma Prisma | Stock/prix positifs ou nuls, totaux cohérents, panier à propriétaire unique, promotion valide, cinq images maximum, code postal/country français. Minimum une image pour un produit publié et cohérence de tous les agrégats à vérifier dans les futurs services. |
| ADR-015 | Séparer tests unitaires et tests PostgreSQL | Tests rapides sans infrastructure ; vérification réelle des garanties SQL. Transactions annulées et fixture de concurrence supprimée. Un test rejoue effectivement le seed et compare les données avant/après. |
| ADR-016 | Correctifs npm ciblés et CLI shadcn en devDependency | Overrides : deepmerge-ts 8.0.2, mysql2 3.24.5, source-map-js 1.2.2, SDK MCP 1.32.1. Compatibilité validée par génération Prisma, migration, seed, tests et build. Réexaminer les overrides lors d’une mise à jour upstream, surtout deepmerge-ts qui change de version majeure. |

### 2026-10-06 — schéma et migration

- PostgreSQL 17 démarré via Compose, schéma Prisma validé et client généré.
- Migration `202610060001_initial` générée, complétée avec les contraintes SQL puis appliquée avec succès. Ne plus modifier cette migration appliquée ; toute évolution doit créer une nouvelle migration.
- Tables prévues pour tous les modules, plus sessions, reset, outbox, séquences et historiques. Leur présence ne signifie pas que l’authentification ou le checkout sont implémentés.
- Génération et build possibles sans connexion BDD sur l’accueil actuel. Les futures pages dynamiques devront gérer les erreurs de connexion.

### 2026-10-06 — seed et installation

- `npm run setup` réussi : création non destructive de `.env`, conteneur sain, génération, migration et seed.
- 4 comptes bcrypt coût 12, 5 catégories, 5 artisans fictifs, 25 produits publiés, 2 promotions et 10 commandes sur les 6 statuts, dont une invitée. Instantanés d’adresses, paiements mock, historiques cohérents et confirmations simulées.
- Dates fixes de démonstration : 1er–5 octobre 2026, pour une soutenance reproductible. Stocks du seed = disponibilité après l’historique ; aucune décrémentation rejouée lors d’une relance. TVA 20 % = hypothèse de fixture, à valider avant commercialisation.

### 2026-10-06 — validations du socle PostgreSQL

- `npm test` : **9 tests unitaires réussis**.
- `npm run test:db` : **9 tests d’intégration réussis**, dont concurrence du dernier exemplaire (un succès, un refus), unicité idempotence, conservation des instantanés, refus des valeurs invalides et relance du seed sans modification/duplication.
- Cette concurrence teste le décrément conditionnel PostgreSQL. L’atomicité de la commande complète et du paiement n’est pas encore testable : checkout non implémenté.
- `npm run build` réussi : client généré, compilation Next.js, contrôle TypeScript et génération statique.
- Les refus SQL attendus produisent des messages `prisma:error` pendant les tests négatifs ; les assertions passent et les transactions sont annulées.
- Audit npm production : **0 vulnérabilité signalée** le 6 octobre 2026. Audit complet : **8 alertes high de développement**, liées à la même dépendance `braces` via ESLint/shadcn/fast-glob/ts-morph. Version disponible 3.0.3, sans correctif indiqué : [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Ne pas annoncer un audit global sans alerte. Réévaluer avant livraison et éviter d’exécuter l’outillage sur des motifs externes non fiables.
- `npm run lint` et `tsc --noEmit` après ajout du test de relance : réussis.
- `npm run db:status` : schéma à jour.
- `npm ci --ignore-scripts --dry-run` : réussi, verrou npm cohérent. Le contrôle hors ligne a d’abord échoué faute de métadonnées en cache ; la vérification avec accès au registre a réussi. Ce dry-run ne remplace pas une installation complète sur une machine vierge.
- `git diff --check` : réussi.

### 2026-10-07 — services du catalogue

- Filtres URL validés avec Zod côté serveur : recherche, catégorie, bornes de prix, disponibilité, tri et page. Prix décimaux FR/EN convertis en centimes sans multiplication flottante ; URL reconstruites avec URLSearchParams.
- Catalogue PostgreSQL paginé par 12, tri déterministe avec ID en départage, compte et page cohérents dans une transaction RepeatableRead. Une page excessive sera ramenée à la dernière page et l’interface redirigera vers son URL.
- Recherche normalisée par mots, avec échappement des caractères SQL LIKE `%`, `_`, `\` et requêtes paramétrées. Popularité = somme des quantités des commandes PAID/PREPARING/SHIPPED/DELIVERED ; commandes en attente/annulées exclues.
- Publication et catégorie non archivée imposées aux listes, coups de cœur, fiches et similaires. Relations chargées par lots ; aucune requête par carte produit.
- `npm test` : 11 tests réussis. `npm run test:db` : 12 tests réussis, avec fixtures brouillon/catégorie archivée testées via les vrais services puis supprimées. Contrôle TypeScript corrigé après adaptation des transformations Zod.
- Décision : le catalogue, la galerie et les fiches constituent ce lot. A6 (quantité et ajout au panier) reste pour le lot panier ; aucune simulation d’ajout présentée comme une commande réelle.

### 2026-10-07 — interface du catalogue

- Groupe `(shop)` avec en-tête/pied de page communs ; accueil branché sur les catégories actives et coups de cœur de la BDD.
- `/catalogue` : formulaire GET utilisable sans JavaScript pour les champs numériques, catégories, recherche, tri et disponibilité ; contrôle de budget client uniquement pour synchroniser le curseur et son champ numérique. Un filtre appliqué remet la pagination à la page 1.
- Erreurs françaises au niveau des champs et résumé, absence de résultats explicite, pagination conservant tous les filtres. Deux colonnes mobile, trois puis quatre selon contexte ; contrôles à cible d’au moins 44 px.
- `/produits/[slug]` : galerie interactive, prix TTC, description en texte (aucun HTML utilisateur injecté), catégorie, artisan, stock et jusqu’à quatre similaires.
- Loading du catalogue limité à son segment : une frontière Suspense globale envoyait HTTP 200 avant qu’une fiche inexistante soit détectée. Le déplacement préserve les vrais 404 des fiches testées.
- Fiches : métadonnées par produit avec React cache pour partager la lecture entre metadata et page. `next/image`, propriétés sizes et preload pour la galerie selon la documentation Next installée. SVG locaux servis sans transformation bitmap ; images Unsplash autorisées par hostname uniquement.
- `AGENTS.md` et `CLAUDE.md` ont été générés par Next dev ; conservés pour rappeler la consultation de la documentation de la version installée.
- Audit visuel, interactions galerie/curseur dans un navigateur, lecteurs d’écran et Lighthouse restent à réaliser : aucun navigateur pilotable disponible dans cette session. Contrôles HTTP réussis ; interactions navigateur non vérifiées.

### 2026-10-07 — SEO et vérifications finales

- Métadonnées produit, Open Graph, canoniques ; variantes du catalogue avec paramètres en noindex/follow pour limiter les duplications. Origine publique issue de NEXT_PUBLIC_APP_URL ; à configurer correctement au déploiement.
- Sitemap dynamique : accueil, catalogue et 25 fiches publiques dans le seed. Produits brouillons et catégories archivées exclus. robots.txt indique les espaces privés prévus ; il ne remplace pas une protection d’accès.
- `npm run test:catalog-http` réussi : accueil avec cinq coups de cœur, douze cartes sur la première page, filtres combinés, erreurs de bornes, état vide, fiche et quatre similaires, métadonnées, sitemap de 27 URL, robots et HTTP 404 (robot HTML limité **et agent standard**).
- Les commentaires de streaming React sont retirés uniquement dans la lecture du test pour comparer les textes du HTML ; aucune modification du rendu applicatif. Test HTTP sur Next dev local, sans navigateur ni mesure Lighthouse.
- `npm run bench:catalogue` : 25 produits, 20 échantillons après échauffement ; médiane **8,20 ms**, p95 **10,81 ms**, maximum **12,16 ms**. Mesure du service PostgreSQL local, comprenant ses lectures ; exclut réseau utilisateur, compilation, rendu et navigateur. Pas une garantie de temps de réponse en production.
- Contrastes calculés sur quatre paires explicites : texte brun/crème **13,11:1**, texte secondaire/crème **6,46:1**, blanc/vert boutons **9,98:1**, erreurs terre cuite/crème **7,14:1**. Toutes dépassent AA 4,5:1 pour texte normal ; pas un audit exhaustif WCAG.
- `npm test` : **11 réussis** ; `npm run test:db` : **12 réussis** ; lint et TypeScript réussis.
- `npm run build` réussi sur la version finale : accueil/catalogue/fiches/sitemap dynamiques, robots et page introuvable générés. L’ancien cache de types Next dev référençait le fichier d’accueil déplacé ; le validateur généré obsolète a été supprimé puis régénéré.
- Avertissement de dépréciation observé avec pg 8.23 lors des lectures Prisma : non bloquant ; vérifier la compatibilité de l’adaptateur avant une évolution vers pg 9. Aucun contournement ni suppression d’avertissement.
- Simplifications : illustrations SVG de démonstration (aperçu social SVG à remplacer par une image bitmap avant publication) ; galerie multi-image implémentée mais seed à une image par produit ; pas de full-text/trigram ni autocomplete (bonus), pas d’ajout au panier dans ce lot.
- Pas de score Lighthouse, certification WCAG, test visuel 320 px/zoom ou validation interactive galerie/curseur revendiqués.

### 2026-10-07 — panier persistant, service serveur

- Cookie invité opaque aléatoire 256 bits, HttpOnly, SameSite=Lax, Secure en production, durée glissante de 30 jours après mutation. Seul son SHA-256 est conservé dans sessionId ; aucun identifiant de panier fourni par le navigateur n’est utilisé pour l’autorisation.
- Migration additive : code promotionnel sélectionné conservé dans Cart. Validation Zod et relecture des produits, prix, publication, catégorie et stock côté serveur. Limites : 999 pièces par ligne, 100 créations différentes.
- Mutations transactionnelles et verrou de ligne du panier pour les onglets concurrents. Aucun stock réservé par le panier. Un seul code ; validité relue au calcul, sans consommer ses utilisations avant une future commande.
- Lignes devenues indisponibles conservées et signalées, exclues du total. Promo devenue invalide signalée et remise retirée du calcul.
- Fusion avec panier compte différée à l’authentification : aucun compte ni connexion simulés. Nettoyage planifié des paniers abandonnés à ajouter avant exploitation ; expiration du cookie ne supprime pas les lignes en base.

### 2026-10-07 — interface panier

- Page /panier, lien et badge communs, formulaire quantité/ajout sur fiche, modification et suppression, état vide, récapitulatif TTC et code promo. Server Actions POST avec contrôle Origin Next, erreurs publiques françaises et états pending/status accessibles.
- Présentation mobile en une colonne, récapitulatif latéral à partir de 800 px. Aucun bouton de paiement inactif présenté comme fonctionnel.
- Test concurrent a révélé une course lors de la première création Prisma : verrou consultatif transactionnel sur le hash de session avant upsert, puis verrou de ligne. Conversion du résultat void en texte pour la compatibilité Prisma.

### 2026-10-07 — vérification du panier

- `npm test` : 11 tests réussis ; `npm run test:db` : 14 réussis. Nouveaux scénarios : isolation, persistance, mutations concurrentes, rupture, prix actualisé, promo expirée, suppression et panier vide sans frais. Fixtures supprimées ou transactions annulées.
- `npm run test:cart-http` : réussi sur Next dev Webpack. Formulaires HTML POST réels sans navigateur : cookie HttpOnly/SameSite, ajout, badge, isolation, quantité modifiée/refusée, code invalide/valide, total et suppression. Nettoyage du panier de test.
- `npm run test:catalog-http` : réussi, dont les vrais HTTP 404 avec agent standard ; le badge asynchrone n’a pas réintroduit les soft 404.
- Lint et TypeScript vérifiés. `npm run build -- --webpack` réussi. Turbopack a échoué sur un port interne EPERM, y compris après relance avec autorisation ; Webpack fournit une compilation de production validée. Aucun changement global de bundler imposé.
- Contrôles visuels mobile/zoom, navigation clavier, lecteur d’écran et Lighthouse toujours à effectuer dans un navigateur. Les retours `role=status`, labels et cibles 44 px sont implémentés ; pas de certification WCAG revendiquée.

### 2026-10-07 — socle d’authentification et fusion

- Sessions opaques 256 bits, jeton SHA-256 en BDD, durée absolue 30 jours, cookie HttpOnly/SameSite=Lax/Secure en production. Rotation à connexion, suppression serveur à déconnexion ; vérification de l’expiration et utilisateur relu en BDD. DTO minimal sans mot de passe ni jeton.
- Validation serveur Zod : email normalisé, prénom/nom bornés, mot de passe ≥8 caractères avec majuscule/chiffre, confirmation. Limite bcrypt de 72 **octets** vérifiée pour éviter une troncature silencieuse ; espaces du mot de passe conservés. bcrypt coût 12. Rôle CLIENT imposé par défaut, jamais issu du formulaire.
- Connexion : erreur identique pour compte inconnu et mauvais mot de passe, comparaison bcrypt avec hash factice pour un compte absent. Inscription : erreur de doublon générale et contrainte unique PostgreSQL conservée. Pas de récupération de mot de passe ni vérification email dans ce lot ; prévues avec le module emails/reset.
- Limitation atomique en PostgreSQL : 10 tentatives par email normalisé sur 15 min, plafond global de 200 sur 15 min (inscription/connexion, réussies incluses). Aucune confiance implicite dans X-Forwarded-For. Limites choisies pour la démonstration : blocage volontaire d’un compte/plafond global possible sous attaque ; protection réseau et stratégie par IP de proxy fiable à ajouter avant exploitation. Nettoyage des sessions expirées, compteurs et paniers abandonnés à planifier au déploiement.
- Fusion transactionnelle : quantités additionnées, code invité prioritaire s’il existe, sinon code du compte. Stock devenu insuffisant : choix conservé et averti par le panier. Limites 100 créations/999 pièces : fusion refusée explicitement et transaction annulée, aucune ligne supprimée silencieusement.
- Verrous consultatifs dans un ordre déterministe pour invité et compte ; mutations du compte partagent le même verrou. Marqueur mergedAt sur la source vidée : un ancien appel invité ne peut pas recréer le panier après fusion. Le panier du compte reste en BDD après déconnexion.
- Tests à ce stade : 14 unitaires et 16 PostgreSQL réussis, dont fusion concurrente exécutée une seule fois, rotation/révocation/expiration, rôle non injectable et fenêtre de tentatives atomique.

### 2026-10-07 — formulaires et accès au compte

- Routes /inscription, /connexion, /compte ; compte protégé par vérification serveur de session, navigation globale adaptée, panier lu/modifié selon l’identité serveur. Le navigateur ne fournit jamais son propriétaire de panier.
- Formulaires avec labels, autocomplete, affichage facultatif du mot de passe, erreurs associées aux champs, focus sur le premier champ invalide après réponse client et boutons pending. Email/noms conservés après erreur ; mots de passe non renvoyés dans l’état du formulaire.
- Connexion/inscription redirigent vers le panier si des articles ont été fusionnés ; message de vérification des quantités. Déconnexion POST avec révocation puis notification. Aucun paramètre de redirection externe accepté.
- Compte minimal : identité et lien panier, sans liens vers des fonctionnalités absentes. Adresses, profil, historique/factures restent pour le lot espace client ; commande invité toujours prévue au checkout.
- robots/noindex complétés pour les routes de compte et panier. Les autorisations restent côté serveur et ne dépendent jamais de robots.txt.
