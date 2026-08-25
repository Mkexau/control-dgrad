# Architecture technique

## 1. Stack

- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Tailwind CSS
- Zod
- Tests automatisés

La version exacte de Next.js installée dans le projet fait foi.

Avant d'utiliser une API Next.js susceptible d'avoir changé, consulter la documentation locale disponible dans :

`node_modules/next/dist/docs/`

---

## 2. Principes généraux

- Server Components par défaut.
- Client Components uniquement lorsque nécessaire.
- Les mutations métier sont réalisées côté serveur.
- Les données sensibles ne doivent pas être exposées inutilement au navigateur.
- Les contrôles d'authentification et d'autorisation doivent être réalisés côté serveur.
- Le frontend ne constitue jamais une frontière de sécurité.
- La logique métier ne doit pas être placée directement dans les composants React.

---

## 3. Structure du projet

Organisation indicative :

- `app/` : routes et pages Next.js
- `components/` : composants réutilisables
- `lib/` : logique serveur, services, validations et autorisations
- `supabase/` : migrations et données initiales
- `tests/` : tests automatisés
- `docs/` : documentation du projet

Structure cible :

    app/
      (auth)/
        login/

      (dashboard)/
        dashboard/
        assujettis/
        analyses/
        missions/
        controles/
        rapports/
        administration/

    components/
      ui/
      forms/
      tables/
      dashboard/
      missions/
      controles/
      assujettis/

    lib/
      auth/
      permissions/
      validations/
      services/
      workflows/
      documents/
      audit/
      db/

    supabase/
      migrations/
      seed/

    tests/

    docs/

La structure exacte peut évoluer si la version de Next.js installée impose une organisation différente.

---

## 4. Couche interface

Les composants React sont responsables de :

- l'affichage ;
- les interactions utilisateur ;
- la présentation des données ;
- la collecte des données des formulaires.

Ils ne doivent pas contenir toute la logique métier.

Les composants doivent utiliser les services ou actions appropriés pour les opérations métier.

---

## 5. Server Components

Les Server Components sont utilisés par défaut.

Ils sont privilégiés pour :

- lecture de données ;
- affichage de tableaux ;
- dashboards ;
- pages métier ;
- pages nécessitant des données sensibles.

Les données privées doivent être récupérées côté serveur avec les contrôles d'autorisation nécessaires.

---

## 6. Client Components

Les Client Components sont utilisés uniquement lorsque nécessaire.

Exemples :

- interactions complexes ;
- formulaires nécessitant un état local ;
- composants interactifs ;
- sélecteurs dynamiques ;
- interfaces nécessitant des APIs navigateur.

Ils ne doivent pas être utilisés uniquement par habitude.

Un Client Component ne doit jamais être considéré comme une frontière de sécurité.

---

## 7. Mutations métier

Toute mutation sensible doit être exécutée côté serveur.

Exemples :

- créer une mission ;
- soumettre une mission ;
- approuver ;
- rejeter ;
- affecter une équipe ;
- confirmer une équipe ;
- générer un ordre de mission ;
- générer une autorisation ;
- désigner un contrôleur ;
- enregistrer un résultat ;
- créer un PV ;
- clôturer une mission.

Chaque mutation doit vérifier :

- authentification ;
- rôle ;
- périmètre organisationnel ;
- affectation éventuelle ;
- statut actuel ;
- règles métier.

---

## 8. Server Actions

Les Server Actions doivent être considérées comme des points d'entrée HTTP.

Elles doivent donc :

- vérifier l'utilisateur ;
- valider les données ;
- vérifier les permissions ;
- vérifier le périmètre ;
- vérifier le statut ;
- vérifier les conditions du workflow ;
- exécuter l'opération ;
- enregistrer l'audit lorsque nécessaire.

Une protection uniquement dans l'interface utilisateur est insuffisante.

---

## 9. Accès aux données

Les accès aux données sensibles doivent être réalisés côté serveur.

La logique d'accès aux données doit être séparée de l'interface.

Les services métier peuvent être organisés autour des domaines suivants :

- assujettis ;
- analyses ;
- missions ;
- contrôles ;
- équipes ;
- rapports ;
- documents ;
- utilisateurs ;
- audit.

La structure exacte pourra évoluer pendant l'implémentation.

Une couche d'accès aux données côté serveur peut être utilisée pour centraliser :

- les requêtes ;
- les contrôles d'accès ;
- les transformations ;
- les DTO retournés à l'interface.

---

## 10. Validation

Zod est utilisé pour valider les données entrantes.

Les validations doivent être réalisées côté serveur.

Les formulaires frontend peuvent également utiliser les mêmes schémas lorsque cela est pertinent.

Une validation frontend ne remplace jamais la validation serveur.

Les données provenant du navigateur sont toujours considérées comme non fiables.

---

## 11. Base de données

PostgreSQL est la source de vérité des données métier.

Les données métier importantes ne doivent pas être stockées uniquement dans :

- l'état React ;
- le navigateur ;
- localStorage ;
- sessionStorage.

Toute modification du schéma PostgreSQL doit passer par une migration versionnée.

Les migrations doivent être conservées dans :

`supabase/migrations/`

---

## 12. Supabase

Supabase est utilisé notamment pour :

- PostgreSQL ;
- Auth ;
- Storage ;
- Row Level Security.

Les clés et secrets sensibles ne doivent jamais être exposés au navigateur.

La clé Service Role ne doit jamais être utilisée dans du code client.

---

## 13. Authentification

Supabase Auth gère l'authentification.

Le cycle de vie des comptes est géré par l'administrateur technique.

Les utilisateurs disposent d'un profil applicatif contenant notamment :

- identité ;
- rôle ;
- bureau ;
- statut actif/inactif.

Un utilisateur désactivé ne doit plus pouvoir accéder aux fonctionnalités protégées.

---

## 14. Autorisation

L'autorisation doit être appliquée en tenant compte de :

- l'utilisateur ;
- son rôle ;
- son périmètre organisationnel ;
- ses affectations ;
- la ressource concernée ;
- l'action demandée ;
- le statut de la ressource.

Un Chef de Bureau ne doit pas pouvoir accéder automatiquement aux missions d'un autre bureau.

Un contrôleur ne doit pas pouvoir accéder automatiquement aux missions d'une autre équipe.

Le rôle seul ne constitue pas toujours une autorisation suffisante.

---

## 15. Row Level Security

PostgreSQL Row Level Security doit protéger les données lorsque nécessaire.

RLS doit notamment contribuer à empêcher :

- les accès horizontaux non autorisés ;
- l'accès aux données d'un autre bureau ;
- l'accès aux missions non autorisées ;
- l'accès aux contrôles non autorisés ;
- l'accès aux documents non autorisés.

RLS ne remplace pas les contrôles métier côté serveur.

Les politiques RLS doivent être versionnées dans les migrations PostgreSQL.

---

## 16. Organisation administrative

Le modèle organisationnel est :

Bureau de contrôle et recoupement

→ Division Recoupement

→ Bureau Analyse et Recoupement

→ Bureau Documentation

et :

Bureau de contrôle et recoupement

→ Division Contrôle

→ Bureau Contrôle Sol

→ Bureau Contrôle Sous-sol

→ Bureau Recettes judiciaires et de participation

→ Bureau Contrôle Administratif 1

→ Bureau Contrôle Administratif 2

→ Bureau Contrôle Administratif 3

Chaque bureau de contrôle possède plusieurs secteurs d'activité.

Un secteur appartient à un bureau.

Un bureau appartient à une division.

Un profil utilisateur appartient à un bureau.

La division d'un utilisateur peut être déterminée à partir de son bureau.

---

## 17. Contrôle sur place

Le contrôle sur place suit le parcours :

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général

→ Approbation

→ Génération automatique de l'ordre de mission

→ Confirmation des équipes

→ Contrôle

Une mission peut contenir plusieurs équipes.

Chaque équipe possède :

- un chef d'équipe ;
- plusieurs agents ;
- une ou plusieurs entreprises affectées.

Avant l'approbation DG, les équipes sont des propositions.

Après l'approbation DG :

- les équipes sont confirmées ;
- les chefs d'équipe sont confirmés ;
- les agents sont confirmés ;
- les entreprises sont confirmées dans leurs équipes.

Le système ne doit pas démarrer le contrôle avant que les conditions nécessaires soient remplies.

---

## 18. Contrôle sur pièces

Le contrôle sur pièces suit un workflow différent :

Bureau de contrôle compétent

→ Demande de contrôle

→ Chef de section Contrôle

→ Approbation

→ Génération automatique de l'autorisation

→ Désignation du contrôleur

→ Contrôle sur pièces

Le contrôle sur pièces :

- ne nécessite pas de déplacement ;
- ne nécessite pas d'ordre de mission ;
- n'utilise pas d'équipe de terrain ;
- nécessite l'approbation du Chef de section Contrôle ;
- nécessite la désignation du contrôleur avant le démarrage.

---

## 19. Interface chef d'équipe

Le chef d'équipe doit disposer d'une interface permettant notamment :

- consulter sa mission ;
- consulter les entreprises affectées ;
- consulter les membres de son équipe ;
- consulter l'ordre de mission ;
- saisir les informations du contrôle ;
- saisir les observations ;
- saisir les irrégularités ;
- saisir les montants ;
- préparer le procès-verbal ;
- joindre des documents.

L'interface du chef d'équipe ne lui donne aucun pouvoir d'approbation administrative.

---

## 20. Génération documentaire

Le système doit pouvoir générer certains documents métier.

Notamment :

- ordre de mission ;
- autorisation de contrôle sur pièces ;
- procès-verbal ;
- feuille d'observations ;
- rapport.

Les documents générés doivent être associés à leur objet métier.

### Ordre de mission

Généré automatiquement après approbation DG d'une mission `SUR_PLACE`.

### Autorisation de contrôle sur pièces

Générée automatiquement après approbation du Chef de section Contrôle d'une mission `SUR_PIECES`.

### Feuille d'observations

Créée uniquement lorsqu'une irrégularité est constatée et qu'une feuille d'observations est nécessaire.

---

## 21. Documents et stockage

Supabase Storage est utilisé pour les fichiers.

Les documents métier doivent être stockés dans des espaces privés.

Les métadonnées des documents sont conservées dans PostgreSQL.

Un document doit pouvoir être associé à son objet métier.

Le téléchargement doit vérifier les permissions côté serveur.

Les fichiers doivent être contrôlés selon les règles définies dans :

`docs/securite.md`

---

## 22. Audit

Les opérations importantes doivent être enregistrées dans un système d'audit.

Exemples :

- création ;
- modification ;
- soumission ;
- approbation ;
- rejet ;
- affectation ;
- confirmation d'équipe ;
- changement de statut ;
- génération de document ;
- création de PV ;
- clôture ;
- modification financière ;
- administration d'un compte.

L'audit doit permettre de connaître au minimum :

- l'utilisateur ;
- l'action ;
- l'objet concerné ;
- la date ;
- les anciennes données lorsque nécessaire ;
- les nouvelles données lorsque nécessaire.

---

## 23. Finances

Les montants financiers doivent être stockés avec leur devise.

Devises initiales :

- CDF ;
- USD.

Le montant et la devise doivent être traités comme des données liées.

Le système ne réalise pas de conversion automatique entre CDF et USD.

Un résultat de contrôle utilise une seule devise pour les montants financiers qui lui sont associés.

Les calculs financiers doivent éviter les erreurs liées aux nombres flottants.

Utiliser des types numériques adaptés aux montants monétaires.

---

## 24. Notifications

Le système pourra utiliser :

- notifications internes ;
- emails.

Les notifications doivent être générées côté serveur.

Les emails ne doivent pas être considérés comme la seule source de vérité d'une décision métier.

Les décisions importantes doivent toujours être enregistrées dans PostgreSQL et dans l'audit lorsque nécessaire.

---

## 25. Workflow

La logique des workflows doit être centralisée côté serveur.

Les transitions doivent vérifier les conditions métier avant toute modification du statut.

Les statuts et transitions détaillés sont définis dans :

`docs/workflow-missions.md`

Une transition invalide doit être refusée.

Le frontend ne doit jamais pouvoir forcer directement un changement de statut.

---

## 26. Gestion des erreurs

Les erreurs doivent être :

- prévisibles ;
- compréhensibles pour l'utilisateur ;
- suffisamment détaillées dans les logs serveur ;
- sans exposer de secrets ou d'informations sensibles.

Les erreurs internes ne doivent pas exposer inutilement :

- requêtes SQL ;
- chemins internes ;
- secrets ;
- tokens ;
- informations confidentielles.

---

## 27. Cache et données sensibles

Les pages contenant des données sensibles doivent être conçues avec prudence concernant le cache.

Une donnée privée ne doit jamais être accidentellement servie depuis un cache partagé.

La stratégie exacte de rendu et de cache doit respecter la version actuelle de Next.js installée.

Toute donnée dépendant de l'utilisateur authentifié ou de son périmètre doit être traitée avec prudence avant toute mise en cache.

---

## 28. Tests

Les tests doivent couvrir progressivement :

1. authentification ;
2. permissions ;
3. RLS ;
4. workflows ;
5. validations ;
6. calculs financiers ;
7. documents ;
8. audit ;
9. accès horizontal.

Les tests de sécurité et de workflow sont prioritaires avant la mise en production.

Les opérations critiques doivent disposer de tests automatisés.

---

## 29. Déploiement

Architecture cible indicative :

Utilisateur

→ Next.js

→ Supabase

→ PostgreSQL / Auth / Storage

Le choix définitif de l'hébergement et les paramètres de production seront documentés avant le déploiement.

Les secrets de production doivent être configurés uniquement dans l'environnement sécurisé du fournisseur d'hébergement.

---

## 30. Principe d'évolution

L'architecture doit rester suffisamment simple pour un projet universitaire tout en respectant :

- sécurité ;
- séparation des responsabilités ;
- intégrité des données ;
- traçabilité ;
- testabilité ;
- maintenabilité.

Ne pas introduire une complexité technique qui n'apporte pas de valeur au projet.

Toute décision technique importante doit être documentée dans :

`docs/decisions-techniques.md`

Toute nouvelle règle métier doit être documentée dans :

`docs/regles-metier.md`

Toute question métier non résolue doit être documentée dans :

`docs/questions-metier.md`