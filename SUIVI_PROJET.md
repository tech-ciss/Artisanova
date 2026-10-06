# Artisanova — suivi de conception et de réalisation

Dernière mise à jour : 6 octobre 2026. Référence : `Exercice Conception d.md`.
Objectif : couvrir les critères sur 100 avant les bonus, avec des preuves reproductibles. Aucune note ne peut être garantie.

## États et règle de suivi

**Fait** = implémenté et vérifié selon les preuves indiquées. **Partiel** = base présente, critères restants explicites. **À faire** = non implémenté. **Simplifié** = compromis assumé, avec justification. Mettre à jour ce fichier après chaque lot ; ne pas confondre intention et réalisation.

## Décisions techniques

| Réf. | Choix | Pourquoi / conséquences |
|---|---|---|
| ADR-001 | Conserver Next.js App Router, TypeScript strict et Tailwind déjà installés | Respect du sujet, pas de remplacement inutile du squelette. Server Components par défaut. |
| ADR-002 | PostgreSQL + ORM Prisma envisagés, à stabiliser avant schéma | Transactions et concurrence stock. Le CLI Prisma 8 RC et le client 7 présents doivent être alignés sur une version stable compatible avant toute migration. Aucune BDD opérationnelle actuellement. |
| ADR-003 | Prix en centimes entiers ; service pur séparé de l’interface | Éviter les erreurs monétaires et permettre les tests ; au checkout charger les prix depuis la BDD, jamais depuis le navigateur. |
| ADR-004 | Seuil de port gratuit : 60 € après remise, pour les trois modes | Arbitrage d’une ambiguïté B3/D2. Tarifs standard 590, relais 490, express 990 centimes ; PORT0 annule le port. Afficher cette règle dans le panier futur. |
| ADR-005 | Checkout invité prioritaire : livraison → paiement → confirmation | Maximum trois étapes, sans connexion forcée. Création de compte facultative après achat. Non implémenté. |
| ADR-006 | Palette crème / brun / vert / terre cuite, typographies système et Georgia | Identité chaleureuse, aucune dépendance au téléchargement Google Fonts pour construire le projet. |
| ADR-007 | Illustrations CSS temporaires | Accueil léger sans fausses photos produits. Remplacer par photos avec alternatives et next/image lors du catalogue. |
| ADR-008 | Tests initiaux via node:test et effacement des types Node 22.18+ | Tester immédiatement sans nouvelle dépendance. Simplification temporaire par rapport à Vitest recommandé ; couverture instrumentée ≥60 % restant à mettre en place. |
| ADR-009 | Paiement simulé prévu en premier, puis Stripe test si socle validé | Autorisé par le sujet. Aucun traitement de vraie carte ; interface clairement marquée démonstration. Pas encore implémenté. |

## Matrice de couverture

| Exigences | État | Livré / reste à faire |
|---|---|---|
| A1 accueil | Partiel | Identité, bannière, cinq univers, histoire. Produits vedettes pilotés en BDD à faire. |
| A2–A6 catalogue | À faire | Seed ~25 produits, pagination 12, filtres URL, recherche normalisée, fiches, galerie et stock. |
| B1–B2 panier | À faire | Persistance invité, fusion serveur à connexion, badge global, modification avec contrôle stock. |
| B3–B4 calcul et promotion | Partiel | Service testé : sous-total, tarifs, seuil, pourcentage, montant, port offert, validité promo. Lecture BDD, UI et consommation atomique promo à faire. |
| C1–C5 compte | À faire | Hash, cookies httpOnly, adresses, profil, commandes isolées et facture. |
| D1–D5 checkout | À faire | Invité et compte, adresse, paiement, transaction stock, confirmation, référence atomique. |
| E1–E6 admin | À faire | CRUD, protection serveur par rôle, transitions historisées, KPI et promotions. |
| F emails | À faire | Outbox en BDD ; événements inscription, commande, expédition, reset, admin. |
| BDD / seed / migrations | À faire | Schéma complet, contraintes, migrations versionnées, admin +3 clients, 5 artisans et catégories, ~10 commandes. |
| UI/UX | Partiel | Mise en page mobile-first, liens clavier, focus visible, lien d’évitement, HTML français, préférence mouvement réduit. États loading/error et formulaires restent à faire. |
| WCAG 2.2 AA | Partiel | Fondations présentes ; audit clavier, lecteur d’écran, contrastes, zoom 200/400 %, largeur 320 px et Lighthouse ≥90 non réalisés. Aucune certification annoncée. |
| Performance / SEO | Partiel | Métadonnées accueil, Server Component, polices locales. Images, metadata fiches, sitemap, robots et Lighthouse ≥85 à faire. |
| Tests | Partiel | Tests métier panier ; stock concurrent, transitions, accès manipulés, checkout E2E et couverture ≥60 % à faire. |
| Documentation / DX | Partiel | Suivi, README et exemple env présents. Installation BDD ≤3 commandes et comptes seed à finaliser. |
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

1. Stabiliser Prisma/client, PostgreSQL local, schéma, migrations et seed reproductible.
2. Catalogue branché sur BDD, fiche produit, recherche et filtres URL.
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
