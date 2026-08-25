# Décisions techniques

## ADR-001 — Stack

Statut : VALIDÉ

Utiliser :

- Next.js ;
- TypeScript ;
- Supabase ;
- PostgreSQL ;
- Supabase Auth ;
- Supabase Storage ;
- Tailwind CSS ;
- Zod ;
- tests automatisés.

La version exacte de Next.js installée dans le projet fait foi.

Avant d'utiliser une API Next.js susceptible d'avoir changé, consulter la documentation locale disponible dans :

`node_modules/next/dist/docs/`

---

## ADR-002 — Base de données

Statut : VALIDÉ

PostgreSQL est la source de vérité des données métier.

Toutes les modifications de schéma doivent être réalisées au moyen de migrations versionnées.

---

## ADR-003 — Authentification

Statut : VALIDÉ

Utiliser Supabase Auth.

Les comptes sont créés et gérés par l'administrateur technique.

Les utilisateurs normaux peuvent uniquement :

- se connecter ;
- se déconnecter ;
- utiliser les fonctionnalités autorisées par leur rôle et leur périmètre.

---

## ADR-004 — Administration technique

Statut : VALIDÉ

Le rôle `ADMIN` est un rôle technique.

Il peut notamment :

- créer les comptes ;
- modifier les comptes ;
- désactiver les comptes ;
- attribuer les rôles ;
- gérer certains paramètres techniques ;
- gérer certains référentiels.

Le rôle `ADMIN` ne reçoit pas automatiquement les pouvoirs métier.

Il ne peut pas, uniquement grâce à son rôle technique :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle sur pièces au nom du Chef de section ;
- rejeter un contrôle sur pièces au nom du Chef de section ;
- modifier une décision métier ;
- contourner le workflow.

La séparation entre administration technique et pouvoir métier doit être appliquée techniquement.

---

## ADR-005 — Autorisation et RLS

Statut : VALIDÉ

L'autorisation est vérifiée côté serveur.

Utiliser PostgreSQL Row Level Security lorsque nécessaire pour protéger les données selon :

- l'identité ;
- le rôle ;
- le périmètre organisationnel ;
- les affectations.

RLS ne remplace pas les vérifications métier côté serveur.

---

## ADR-006 — Workflow

Statut : VALIDÉ

Le workflow est centralisé côté serveur.

Chaque transition doit vérifier :

- le statut actuel ;
- l'utilisateur ;
- le rôle ;
- le périmètre ;
- l'affectation lorsque nécessaire ;
- les conditions métier.

Une transition invalide doit être refusée.

Les changements importants de statut doivent être enregistrés dans l'audit.

---

## ADR-007 — Contrôle sur place

Statut : VALIDÉ

Une demande de contrôle sur place suit la chaîne :

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général.

Après approbation du DG :

- le système génère automatiquement l'ordre de mission ;
- les équipes proposées peuvent être confirmées ;
- les chefs d'équipe sont confirmés ;
- les agents sont confirmés ;
- les entreprises sont confirmées dans leurs équipes ;
- les agents peuvent accéder aux missions auxquelles ils sont affectés.

Le système ne doit pas générer l'ordre de mission avant l'approbation du DG.

---

## ADR-008 — Contrôle sur pièces

Statut : VALIDÉ

Le contrôle sur pièces :

- est une mission fonctionnelle ;
- est initié par le Bureau de contrôle compétent ;
- est soumis au Chef de section Contrôle ;
- ne nécessite pas de déplacement ;
- ne nécessite pas d'ordre de mission ;
- ne nécessite pas d'équipe de terrain.

Après approbation du Chef de section Contrôle :

- le système génère automatiquement l'autorisation de contrôle sur pièces ;
- un contrôleur peut être désigné ;
- le contrôleur désigné peut accéder au dossier nécessaire à l'exécution du contrôle.

---

## ADR-009 — Documents

Statut : VALIDÉ

Les documents sont stockés dans Supabase Storage.

Les documents métier doivent être stockés dans des espaces privés.

Leurs métadonnées sont conservées dans PostgreSQL.

Les métadonnées doivent notamment permettre de connaître :

- le type ;
- le nom ;
- la version ;
- l'auteur ;
- la date ;
- l'objet associé ;
- l'emplacement de stockage.

L'accès aux documents doit être contrôlé côté serveur.

Les documents importants ne doivent pas être supprimés physiquement sans règle explicite.

---

## ADR-010 — Audit

Statut : VALIDÉ

Les opérations critiques sont enregistrées dans l'audit.

Notamment :

- création ;
- modification ;
- soumission ;
- approbation ;
- rejet ;
- affectation ;
- confirmation d'équipe ;
- changement de statut ;
- génération de document ;
- modification d'un montant ;
- création ou modification d'un PV ;
- clôture ;
- administration d'un compte.

Les logs d'audit doivent être protégés contre les modifications ordinaires.

---

## ADR-011 — Devise

Statut : VALIDÉ

Chaque montant financier possède explicitement une devise.

Devises initiales :

- CDF ;
- USD.

Lors de la saisie d'un montant, l'utilisateur peut sélectionner la devise.

Le système ne réalise pas de conversion automatique entre CDF et USD.

Un résultat de contrôle utilise une seule devise pour ses montants financiers associés.

Les calculs financiers doivent utiliser des types adaptés aux montants monétaires.

---

## ADR-012 — Tests

Statut : VALIDÉ

Les fonctionnalités critiques doivent être testées.

Priorité :

1. authentification ;
2. permissions ;
3. RLS ;
4. workflow ;
5. accès horizontal ;
6. calculs financiers ;
7. documents ;
8. audit.

Les tests doivent notamment vérifier qu'un utilisateur ne peut pas effectuer une opération uniquement en contournant l'interface.

---

## ADR-013 — Génération documentaire

Statut : VALIDÉ

Le système doit pouvoir générer :

- ordre de mission ;
- autorisation de contrôle sur pièces ;
- procès-verbal ;
- feuille d'observations ;
- rapport.

Les conditions de génération sont contrôlées côté serveur.

### Ordre de mission

Généré automatiquement après approbation DG d'une mission `SUR_PLACE`.

### Autorisation de contrôle sur pièces

Générée automatiquement après approbation du Chef de section Contrôle d'une mission `SUR_PIECES`.

### Feuille d'observations

Générée uniquement lorsqu'une irrégularité est constatée et nécessite son établissement.

---

## ADR-014 — Suppression

Statut : VALIDÉ

Les objets métier importants ne doivent pas être supprimés physiquement sans règle explicite.

Lorsque cela est possible, privilégier :

- annulation ;
- désactivation ;
- archivage ;
- historisation ;
- nouvelle version du document.

L'historique des décisions métier doit être conservé.

---

## ADR-015 — Architecture serveur

Statut : VALIDÉ

L'application utilise une architecture séparant :

- interface ;
- logique métier ;
- validation ;
- accès aux données ;
- authentification ;
- autorisation ;
- stockage ;
- audit.

Les opérations métier sensibles doivent être exécutées côté serveur.

Les Server Actions et autres endpoints serveur sont considérés comme des points d'entrée HTTP et doivent revérifier l'authentification et l'autorisation.

---

## ADR-016 — Validation des données

Statut : VALIDÉ

Les données provenant de l'utilisateur doivent être validées côté serveur.

Zod est utilisé pour les validations applicatives lorsque nécessaire.

Les validations frontend servent uniquement à améliorer l'expérience utilisateur.

Elles ne constituent pas une protection de sécurité.

---

## ADR-017 — Contrôle des accès horizontaux

Statut : VALIDÉ

Le système doit empêcher un utilisateur d'accéder à une ressource uniquement en modifiant son identifiant.

Les contrôles d'accès doivent être réalisés côté serveur et renforcés par RLS lorsque nécessaire.

Cette règle s'applique notamment :

- aux missions ;
- aux contrôles ;
- aux documents ;
- aux entreprises ;
- aux équipes ;
- aux résultats ;
- aux rapports.

---

## ADR-018 — Projet universitaire

Statut : VALIDÉ

Les solutions doivent être suffisamment robustes pour démontrer les bonnes pratiques.

Il ne faut cependant pas introduire inutilement des mécanismes industriels disproportionnés au périmètre du projet.

La simplicité est privilégiée lorsque celle-ci ne compromet pas :

- la sécurité ;
- l'intégrité des données ;
- le workflow ;
- la traçabilité ;
- les règles métier.

---

## ADR-019 — Règle de non-invention

Statut : VALIDÉ

Les décisions techniques peuvent être prises librement lorsqu'elles ne modifient pas le processus métier.

Lorsqu'une décision peut modifier une règle métier :

1. ne pas l'inventer ;
2. identifier le point bloquant ;
3. consulter `docs/questions-metier.md` ;
4. demander ou documenter la validation nécessaire.

Une décision technique ne doit jamais modifier silencieusement une règle métier.

---

## ADR-020 — Documentation des décisions

Statut : VALIDÉ

Toute décision technique importante doit être documentée dans ce fichier.

Les règles métier validées restent dans :

- `docs/processus-metier.md` ;
- `docs/regles-metier.md` ;
- `docs/workflow-missions.md`.

Les permissions sont définies dans :

`docs/roles-permissions.md`

Les règles de sécurité sont définies dans :

`docs/securite.md`

Le modèle de données est défini dans :

`docs/modele-donnees.md`

Les questions encore ouvertes sont définies dans :

`docs/questions-metier.md`

---

## ADR-021 — Fondations techniques initiales

Statut : VALIDÉ

Les fondations techniques suivantes sont retenues avant tout module métier :

- `@supabase/supabase-js` et `@supabase/ssr` pour les futurs accès à Supabase, Auth et les sessions côté serveur ;
- Zod pour les validations partagées, avec validation obligatoire côté serveur ;
- le runner de tests natif de Node.js pour les tests unitaires et d'intégration progressifs ;
- `npm run typecheck` pour vérifier TypeScript sans émettre de fichiers ;
- un fichier `.env.example` ne contenant que la configuration Supabase publiable.

La clé de service Supabase n'est pas prévue dans le fichier d'exemple et ne devra jamais être exposée au client.

Le runner de tests natif est suffisant pour le socle universitaire et évite une dépendance supplémentaire. Une décision ultérieure pourra l'étendre si les besoins de tests d'interface le justifient.

Aucune migration, table, politique RLS, authentification, workflow ou fonctionnalité métier n'est créée par cette décision. Les politiques RLS et les tests de sécurité seront conçus avec les migrations et les modules métier correspondants.
