# Artisanova — suivi de conception et de réalisation

Dernière mise à jour : 8 octobre 2026. Référence : `Exercice Conception d.md`.
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
| ADR-005 | Checkout invité prioritaire : livraison → paiement → confirmation | Maximum trois étapes, sans connexion forcée. Création de compte facultative après achat. Implémenté et testé. |
| ADR-006 | Palette crème / brun / vert / terre cuite, typographies système et Georgia | Identité chaleureuse, aucune dépendance au téléchargement Google Fonts pour construire le projet. |
| ADR-007 | Illustrations CSS temporaires | Accueil léger sans fausses photos produits. Remplacer par photos avec alternatives et next/image lors du catalogue. |
| ADR-008 | node:test avec tsx pour les imports TypeScript et le client généré | Tests unitaires sans BDD ; suite d’intégration PostgreSQL séparée. ESM explicite, avertissement initial supprimé. Vitest et couverture instrumentée ≥60 % restent à mettre en place. |
| ADR-009 | Paiement simulé prévu en premier, puis Stripe test si socle validé | Autorisé par le sujet. Aucun traitement de vraie carte ; interface clairement marquée démonstration. Implémenté avec fixtures locales, sans débit. |

## Matrice de couverture

| Exigences | État | Livré / reste à faire |
|---|---|---|
| A1 accueil | Fait | Accueil, catégories actives et jusqu’à six coups de cœur sélectionnés via isFeatured en BDD (cinq dans le seed). Sélection éditable en back-office, maximum six. |
| A2–A5 catalogue | Fait | Catalogue PostgreSQL, pagination 12, tris, filtres combinés partageables, prix avec curseur, recherche normalisée, galerie, artisan, stock et similaires. Mesures de performance et audit navigateur détaillés dans le journal. |
| A6 ajout au panier | Fait | Quantité et ajout depuis la fiche, stock validé côté serveur, confirmation et lien vers le panier. |
| B1–B2 panier | Fait | Panier invité/compte, badge global, quantités, suppression, fusion transactionnelle à inscription/connexion et persistance après déconnexion. |
| B3–B4 calcul et promotion | Fait | Calcul serveur, code unique et consommation atomique limitée/expirable au paiement, concurrence testée. |
| C1–C2 authentification | Fait | Inscription, connexion, déconnexion, session expirante, fusion du panier et achat invité vérifiés. |
| C3–C5 espace client | Fait / simplifié | CRUD adresses et défaut par usage, profil avec preuve et révocation, historique paginé/détails privés. Facture HTML imprimable de démonstration ; PDF et conformité fiscale non réalisés. |
| D1–D5 checkout | Fait / simplifié | Invité/compte, livraison/facturation, paiement simulé, stock/promo atomiques, référence, confirmation privée. Relais fictifs et France uniquement ; preuves dans le journal. |
| E1–E6 admin | Fait / simplifié | Catalogue, catégories, stock audité, commandes filtrées/transitions, KPI et promos ; rôle serveur vérifié. Images par URL, Markdown simple, HT calculé depuis TTC, retraits conservant l’historique. |
| F emails | Partiel | Commande client/admin, expédition et reprise outbox simulées ; bienvenue et reset restent à faire. |
| BDD / seed / migrations | Fait | Schéma PostgreSQL complet, migration versionnée et appliquée ; 1 admin +3 clients hashés, 5 artisans et catégories, 25 produits illustrés, 2 promotions, 10 commandes, adresses et emails simulés. Relance sans duplication vérifiée. |
| UI/UX | Partiel | Catalogue mobile-first, champs associés aux labels, erreurs de filtres, pagination, état vide, chargement et reprise après erreur. Formulaires panier/authentification/checkout/compte/admin livrés ; audit navigateur reste à faire. |
| WCAG 2.2 AA | Partiel | Fondations présentes ; audit clavier, lecteur d’écran, contrastes, zoom 200/400 %, largeur 320 px et Lighthouse ≥90 non réalisés. Aucune certification annoncée. |
| Performance / SEO | Partiel | Métadonnées produit/OG/canoniques, next/image, sitemap des produits publics et robots. Recherche locale mesurée ; Lighthouse ≥85 et aperçu social réel restent à vérifier. |
| Tests | Partiel | 20 tests unitaires, 28 tests PostgreSQL et contrôles HTTP panier/catalogue/auth/checkout/compte/admin passent en développement ; auth également vérifiée sur serveur de production local. Transitions et accès manipulés testés ; tests navigateur et couverture ≥60 % restent à faire. |
| Documentation / DX | Partiel | Démarrage documenté en 3 commandes, setup exécuté avec succès, comptes seed et commandes décrits. Paiement simulé documenté ; déploiement à faire. |
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
3. **Terminé :** panier persistant, promotions serveur, authentification et fusion panier.
4. **Terminé :** checkout invité transactionnel, tests concurrence/idempotence et emails simulés.
5. **Terminé :** espace client (facture HTML simplifiée) et back-office avec protections testées.
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

### 2026-10-07 — validation finale de l’authentification

- `npm test` : **14 réussis** ; `npm run test:db` : **16 réussis**. Fusion hors limites testée avec rollback : paniers conservés et aucune nouvelle session. Connexion réellement refusée une fois la limite d’email dépassée.
- `npm run test:auth-http` réussi en développement, puis `AUTH_HTTP_PRODUCTION=true npm run test:auth-http` réussi sur `next start` local. Vérifie : inscription et rôle CLIENT non injectable, champs invalides, absence de mot de passe dans le HTML, cookie privé, accès /compte protégé, propriétaire de panier client ignoré, fusion, déconnexion, rejeu d’un cookie révoqué et expiration.
- POST d’origine hostile : rejeté par Next avant création de compte (HTTP 500 attendu dans cette version). Journaux de rejet lors du test intentionnel.
- Production : attribut Secure des cookies et `Cache-Control` privé/no-store de la page compte contrôlés. Le jar du test envoie les cookies manuellement sur HTTP local ; ce test contrôle les attributs serveur, **pas** un transport HTTPS ni le comportement Secure d’un navigateur. HTTPS obligatoire au déploiement.
- `npm run test:cart-http` et `npm run test:catalog-http` réussis après intégration de l’authentification, dont les 404. Lint sans avertissement et TypeScript réussis ; compilation de production avec `npm run build -- --webpack` réussie.
- Pendant le développement : une erreur JSON transitoire du serveur Next a disparu après redémarrage ; le parcours final est repassé. Fixture d’expiration corrigée pour respecter la contrainte expiresAt > createdAt, sans modifier les contraintes métier.
- Ajustements UX : messages de limite de mot de passe lisibles sans jargon de stockage, champs non secrets conservés, noms/emails longs autorisés à se répartir sur plusieurs lignes. Audit navigateur mobile/zoom/clavier/lecteur d’écran et Lighthouse encore non réalisés.
- Aucune dépendance nouvelle ni publication distante. Serveurs temporaires arrêtés ; comptes/paniers HTTP de test supprimés.

### 2026-10-07 — checkout : transaction et brouillon serveur

- Brouillon de livraison en PostgreSQL, cookie opaque HttpOnly/SameSite/Lax/Secure en production, données et récapitulatif associés à l’identité serveur du panier. Durée 1 heure avant validation ; aucun nom/adresse/carte stocké dans le cookie.
- Paiement exclusivement simulé : whitelist de fixtures CB/Visa/Mastercard, refus Visa dédié, expiration/CVC/confirmation fictive validés en Zod. Aucun numéro, CVC ou date de carte dans les modèles/payloads d’email/logs. Montants, propriétaire, identifiant panier et promo relus en base.
- Récapitulatif figé par empreinte des lignes, quantités, prix, TVA, promo et totaux. Toute modification de prix/contenu impose de reprendre la livraison. L’ID du récapitulatif est comparé au brouillon privé : un autre onglet ne peut faire payer un devis différent via un cookie remplacé.
- Verrous : panier, produits triés, catégories partagées, promo, séquence journalière. Stock décrémenté conditionnellement ; consommation promo conditionnelle avec limite et expiration ; transaction unique commande/instantanés/paiement/historique/mouvements/emails/panier vidé.
- Idempotence : clé issue du brouillon serveur, contrainte unique et résultat rejoué avant de relire un panier désormais vide. Deux brouillons du même panier ne peuvent créer deux commandes une fois le panier vidé.
- Référence ART-AAAAMMJJ-séquence (minimum 4 chiffres) avec jour métier Europe/Paris et compteur atomique en BDD. Aucun reset du compteur lors des tests ; les références des fixtures supprimées peuvent laisser des trous.
- Emails client et admin insérés PENDING dans la transaction, simulation après commit avec marquage conditionnel SIMULATED et log sans coordonnées personnelles. Relance de l’outbox prévue par `npm run emails:simulate` (base locale de démonstration). Pas d’envoi externe.
- Confirmation invitée : cookie privé distinct valable 30 jours, hash et expiration en commande ; référence seule insuffisante. Cookie de reçu pour la dernière commande invitée du navigateur. Confirmation compte : propriétaire obligatoire. Création/connexion facultative après achat avec preuve du reçu ET email correspondant ; aucune récupération de commandes par email seul.
- 17 tests unitaires et 20 tests PostgreSQL réussis : dernier stock, dernière promo entre deux produits distincts, double paiement, instantanés, session étrangère, expiration, montant manipulé et ancien onglet. Tests DB exécutés par fichiers successifs pour éviter que les fixtures publiées ne perturbent les assertions du catalogue.
- Corrections de fixtures pendant le développement : identifiant de catégorie et code promo limité à 40 caractères ; les fixtures interrompues identifiées ont été nettoyées. Aucune suppression ni décrément des produits du seed.

### 2026-10-07 — interface du tunnel invité et compte

- Livraison → paiement → confirmation, sans connexion obligatoire. Adresses enregistrées relues avec leur propriétaire ; facturation distincte facultative. Relais Nantes/Paris fictifs, France uniquement, validation de format sans vérification postale externe.
- Formulaires avec labels, erreurs associées, focus sur le champ invalide, états d’attente et récapitulatif avant paiement. Mise en page mobile-first ; audit visuel/clavier en navigateur encore à réaliser.
- Confirmation protégée côté serveur, routes privées noindex. Compte facultatif après achat : preuve du reçu et email correspondant requis, transaction annulée si incompatibles.
- Cache Prisma de développement renouvelé quand les modèles ou noms de colonnes générés changent : corrige le client ancien conservé par le serveur après migration. Un changement de type de colonne ou d’adaptateur nécessite toujours un redémarrage.
- Parcours HTTP complet réussi : invité, relais/facturation, refus sans effets, origine hostile, ancien onglet, rejeu idempotent, confirmation privée, compte facultatif et adresse propriétaire.

### 2026-10-07 — validation finale du checkout

- `npm test` : **17 réussis** ; `npm run test:db` : **20 réussis**. Tests HTTP checkout, panier, authentification et catalogue réussis sur le serveur local. Les fixtures HTTP sont supprimées à la fin ; aucun reset de la base.
- Lint et TypeScript réussis ; `npm run build -- --webpack` réussi, dont les trois routes checkout. `git diff --check` réussi. Aucune dépendance ajoutée.
- README : cartes fictives, parcours, garanties, limites de preuve du reçu et reprise des emails documentés. Variable admin ajoutée uniquement au fichier exemple ; configuration locale existante conservée.
- Restent : espace client complet et back-office ; audit navigateur responsive/zoom/clavier/lecteur d’écran, scores Lighthouse et couverture instrumentée. Aucun audit WCAG ni achat réel revendiqué.
- Versionnement progressif : transaction backend, interface du tunnel, puis tests HTTP et documentation. Commits locaux, sans publication distante.

### 2026-10-08 — services de l’espace client

- Adresses CRUD françaises validées Zod, propriétaire imposé par session. Maximum 20 adresses ; verrou de ligne utilisateur et index SQL existant garantissent un défaut unique par usage. Première adresse automatiquement par défaut, remplacement après suppression ou changement d’usage. Une adresse par défaut reste telle tant qu’une autre n’est pas choisie.
- Profil : preuve du mot de passe actuel pour toute modification, limite de tentatives existante réutilisée. Changement email/mot de passe révoque toutes les sessions et jetons de reset ; ancien hash/email revérifiés sous verrou pour refuser une modification concurrente périmée. Rôle jamais modifiable depuis le formulaire. Email non vérifié : compromis de démonstration, vérification email à ajouter avant exploitation.
- Lecture de commande filtrée en BDD par propriétaire et référence, jamais par email. Les instantanés historiques ne changent pas avec le profil/adresses.
- Correction de composition Zod pendant les tests : utiliser les champs du schéma plutôt que pick sur un objet avec refinements. Aucun changement de contrainte ni migration requis.

### 2026-10-08 — interface et documents client

- Menu client, CRUD d’adresses, profil et historique paginé (10 commandes/page), détails et historique des statuts. Toutes les pages/actions exigent la session, toutes les lectures d’objet filtrent son propriétaire ; métadonnées privées noindex héritées du layout.
- Labels, erreurs par champ, focus sur premier champ invalide et boutons pending. Formulaires natifs utilisables sans JavaScript ; confirmation de suppression dans l’interface. Responsive en une colonne puis deux, cibles de navigation ≥44 px. Audit navigateur non effectué.
- Facture de démonstration téléchargeable en HTML imprimable, issue des instantanés, échappement HTML, CSP sans scripts, attachment, private/no-store et nosniff. Sans numéro fiscal ni valeur comptable : entreprise et achats fictifs. Un vrai PDF et les mentions fiscales vérifiées restent à réaliser ; aucun bonus PDF revendiqué.
- Choix d’adresse enregistrée livraison disponible au checkout ; facturation distincte saisie manuellement, sélection de facture enregistrée au checkout encore simplifiée.

### 2026-10-08 — validation de l’espace client

- 18 tests unitaires et 22 PostgreSQL réussis. Parcours HTTP compte et checkout réussis ; authentification réussie après redémarrage du serveur de test suite à une erreur JSON interne transitoire de Next. Origines hostiles intentionnellement rejetées lors des contrôles.
- Isolation testée avec référence/adresse manipulée et propriétaire étranger : 404 ou refus sans fuite. Document sans cache, texte produit échappé ; absence de session : 401 sur téléchargement. Fixtures supprimées, aucun reset ni migration de ce lot.
- Connexion et changement de profil partagent désormais le verrou utilisateur : une preuve de mot de passe périmée ne peut émettre une session après révocation. Test de connexion avec ancien mot de passe refusé et nouveau accepté ajouté.
- Lint, TypeScript et compilation Webpack de production validés. Audit navigateur, PDF et vérification email restent explicitement non réalisés. Suivi/README et commandes de test actualisés ; commits locaux progressifs, aucun push.

### 2026-10-08 — socle métier du back-office

- Rôle ADMIN vérifié depuis la session pour chaque page/action, puis relu en transaction pour chaque mutation. Aucun rôle ni auteur transmis par le formulaire n’est accepté. Le layout seul ne remplace pas la vérification dans les pages/actions.
- Produits : prix TTC en centimes et HT calculé selon TVA ; 1 à 5 images avec texte alternatif et origines bornées. Publication impossible dans une catégorie archivée. Maximum six coups de cœur, sélection sérialisée. Édition avec timestamp attendu sous verrou produit : un stock changé depuis l’ouverture ne peut être écrasé silencieusement.
- Migration additive `202610080001_admin_stock_audit` appliquée sans reset : auteur et motif des mouvements de stock. Ajustement manuel historisé, motif obligatoire sur produit existant. Produit utilisé retiré en brouillon au lieu de détruire son historique ; suppression physique limitée aux produits sans liens ni mouvements.
- Catégorie utilisée non supprimable, archivage masque les produits publics. Promo modifiable sous verrou partagé avec checkout, usages jamais remis à zéro et plafond jamais abaissé sous les usages consommés. Pas de suppression de promo : désactivation conserve l’historique.
- Transitions conformes à la contrainte SQL et testées ; rôle et ancien statut vérifiés, rejeu du même statut sans effets supplémentaires. Passage PAID réservé au checkout, pas de faux paiement administratif. Annulation avant expédition : réapprovisionnement, remboursement mock et historique dans une transaction, exactement une fois. Aucun remboursement de fournisseur externe pris en charge.
- Usage promo maintenu après annulation (évite le renouvellement artificiel). Historique seed sans mouvements SALE : annulation d’une commande seed payée utilise ses quantités figées, cohérentes avec les stocks fournis après cet historique. Produit historique manquant : annulation refusée pour examen, aucune restitution arbitraire.
- Email d’expédition ajouté à l’outbox atomique, événement unique ; simulation après commit et reprise CLI existante. Aucun email externe.
- 20 tests unitaires et 26 PostgreSQL réussis à ce stade. Verrou consultatif converti en texte pour Prisma ; quatre fixtures de préparation interrompues ont été nettoyées avec contrôle strict de leur forme. Générateur et migration alignés ; aucun seed ni stock réel réinitialisé.

### 2026-10-08 — écrans administrateur et contrôle HTTP

- `/admin` : CA TTC du mois, nombre de commandes, panier moyen payé, ruptures publiques et top cinq des ventes. Calendrier Europe/Paris ; CA/moyenne excluent attente et annulations, nombre de commandes inclut tous statuts. Top ventes toutes périodes. Agrégats et lectures dans un instantané RepeatableRead, aucune requête par ligne.
- Produits, catégories, promotions, commandes et emails : pagination 20 lignes, filtres GET, états vides et erreur/chargement. Commandes filtrées par statut, client/email/référence et jour Europe/Paris (borne tenant compte de l’heure d’été).
- Formulaires labels/erreurs/focus/pending, conservation des champs non secrets après erreur. Présentation mobile-first, confirmation d’opération destructive et accès administration dans le header pour ADMIN. Protection effective côté serveur, indépendante du lien visible et de robots/noindex.
- Descriptions produit : sous-ensemble Markdown sûr (paragraphes, titres ##, listes -), React échappe tout HTML ; liens/HTML enrichi non interprétés. Images renseignées par URL autorisée et alternative, pas d’upload de fichiers dans ce lot. Prix édité en TTC, HT affiché/calculé avec TVA ; édition HT directe simplifiée.
- Parcours HTTP réussi : visiteur redirigé, client en 404 sur toutes routes admin, mutation capturée refusée après retrait du rôle en BDD malgré un rôle forgé ; création catégorie/produit/promo, image externe refusée, ancien stock refusé, filtres, transition illégale, expédition rejouée et email simulé unique. Fixtures dédiées nettoyées.

### 2026-10-08 — finitions de gestion

- Date limite de promo choisie avec calendrier, valide jusqu’à la fin du jour Europe/Paris. Conversion SQL vers minuit du lendemain (borne exclusive), heure d’été incluse ; édition affiche le dernier jour valide. Test du 1er juillet 2027 : expiration 22:00 UTC, soit minuit France le 2 juillet.
- Cases à cocher conservées explicitement après erreur ; cibles de confirmation compactes et labels ≥44 px, focus visible dans les champs admin, résumés de modification accessibles au clavier.
- Agrégats du dashboard exécutés successivement dans la même transaction, pour respecter la connexion PostgreSQL partagée et éviter un usage concurrent du driver déprécié. Pagination et requête unique des titres conservées.

### 2026-10-08 — validation finale du back-office

- `npm test` : **20 réussis** ; `npm run test:db` : **28 réussis**. Six scénarios admin incluent vente/ajustement concurrents et frontière du mois Paris, CA annulé exclu, annulation répétée, expédition unique, catégorie archivée et usages promo préservés. Tests admin ciblés repassés après finition des dates.
- `npm run test:admin-http` réussi, puis repassé sur les formulaires finaux et calendrier promo. `test:account-http`, `test:checkout-http` et `test:catalog-http` réussis après intégration admin ; fixtures dédiées nettoyées, seed et catalogue conservés.
- Lint et TypeScript réussis ; compilation de production `npm run build -- --webpack` validée. Serveur de test lancé pour ce lot arrêté après les contrôles. Aucune dépendance ajoutée ni publication distante.
- Limites restantes : bienvenue/reset, rate limiting checkout explicite et nettoyage planifié des données expirées ; audit navigateur mobile/zoom/clavier/lecteur d’écran, scores Lighthouse, couverture instrumentée ≥60 %, PDF et vérification email, déploiement. Les choix de démonstration n’équivalent pas à une validation commerciale ou WCAG.
- Versionnement : services/migration/tests métier, écrans, finitions, puis tests HTTP et documentation. README et matrice actualisés avec réalisations et simplifications, aucun secret ni donnée de base versionnés.
