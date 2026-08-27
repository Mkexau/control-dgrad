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

---

## ADR-022 — Modélisation du rôle utilisateur principal

Statut : VALIDÉ

### Problème

Comment structurer les rôles applicatifs dans le modèle de données : rôle principal unique ou système multi-rôles complexe ?

### Décision

Chaque utilisateur possède un seul rôle applicatif principal stocké dans `profiles.role` (enum `app_role`).

### Justification

Pour la version V1 du projet universitaire, un rôle principal unique évite les ambiguïtés d'autorisation, simplifie les politiques RLS, clarifie les responsabilités dans les logs d'audit et reste conforme aux fonctions attribuées au sein des bureaux.

### Conséquences

Le schéma de la table `profiles` est simple et performant. Une évolution ultérieure vers des rôles multiples nécessitera une table d'association explicite `user_roles` et une mise à jour des politiques de sécurité.

---

## ADR-023 — Contrôleur responsable unique sur pièces

Statut : VALIDÉ

### Problème

Une mission de contrôle sur pièces peut-elle avoir plusieurs contrôleurs co-responsables ?

### Décision

Un contrôle sur pièces est attribué à un contrôleur responsable unique enregistré dans `controles.controleur_responsable_id`.

### Justification

Garantit la clarté de la responsabilité administrative, simplifie le contrôle des droits d'accès au dossier et rend la traçabilité des opérations univoque.

### Conséquences

Clé étrangère directe `controleur_responsable_id` vers `profiles.id`. Les règles d'accès RLS et les Server Actions peuvent vérifier directement l'identité du contrôleur assigné.

---

## ADR-024 — Cycle de vie des équipes et génération de l'ordre de mission

Statut : VALIDÉ

### Problème

Comment articuler la proposition d'équipe, l'approbation DG et la génération de l'ordre de mission pour les missions `SUR_PLACE` ?

### Décision

Les équipes sont créées avec le statut `PROPOSEE`. L'approbation du Directeur Général déclenche la confirmation des équipes (`CONFIRMEE`), des agents et des assujettis affectés, puis la génération de l'ordre de mission (`ordres_mission`).

### Justification

Respecte fidèlement la règle administrative : aucune équipe n'est habilitée à intervenir sur le terrain sans l'approbation préalable du DG.

### Conséquences

L'état de l'équipe (`PROPOSEE`, `CONFIRMEE`, `ANNULEE`) conditionne côté serveur l'accès aux interfaces de saisie des contrôles de terrain.

---

## ADR-025 — Gestion des rejets, corrections et resoumissions

Statut : VALIDÉ

### Problème

Quel cycle de vie appliquer à une demande rejetée par le Chef de Division, le Directeur des contrôles, le DG ou le Chef de section ?

### Décision

La mission passe au statut `REJETEE` avec enregistrement obligatoire du motif et de la décision dans l'audit et dans `mission_validations`. Le bureau demandeur peut modifier le dossier rejeté, le repasser à l'état `BROUILLON` et le resoumettre.

### Justification

Conserve l'historique complet des refus pour audit tout en offrant un mécanisme propre de reprise du dossier sans duplication d'entité.

### Conséquences

Aucune suppression physique lors d'un rejet ; l'historique de chaque itération est conservé dans `mission_validations`.

---

## ADR-026 — Verrouillage des modifications post-soumission et post-approbation

Statut : VALIDÉ

### Problème

À quelles étapes les données d'une mission peuvent-elles être éditées ?

### Décision

Une mission soumise (`SOUMISE`, `EXAMEN_*`, `ATTENTE_DG`) est verrouillée en lecture seule pendant son examen hiérarchique. Après approbation, aucune modification métier majeure (assujettis, type de contrôle, bureau) n'est autorisée en V1. Seule une mission rejetée revenant à `BROUILLON` redevient modifiable par son bureau d'origine.

### Justification

Garantit l'intégrité décisionnelle : les validateurs examinent un dossier figé, et une mission approuvée ne peut être altérée unilatéralement.

### Conséquences

Les Server Actions vérifient systématiquement le statut `BROUILLON` avant toute mise à jour de la demande de mission.

---

## ADR-027 — Stratégie d'annulation et archivage logique (Soft Delete)

Statut : VALIDÉ

### Problème

Comment traiter l'annulation ou la suppression d'une mission ou d'un élément opérationnel sans détruire l'historique ?

### Décision

Privilégier systématiquement l'archivage logique via les statuts (`ANNULEE`, `CLOTUREE`) et des drapeaux booléens (`actif = false`). Interdiction des suppressions physiques (`DELETE`) sur les données métier sensibles (`missions`, `controles`, `resultats_controle`, `proces_verbaux`, `documents`, `audit_logs`).

### Justification

Exigence légale de traçabilité des procédures non fiscales et conformité aux règles d'audit.

### Conséquences

Les clés étrangères utilisent `ON DELETE RESTRICT` pour empêcher les suppressions destructives involontaires.

---

## ADR-028 — Calcul des délais en jours calendaires

Statut : VALIDÉ

### Problème

Comment calculer les délais de 7 et 20 jours prévus dans le processus ?

### Décision

Les délais sont calculés en jours calendaires standard (`date_echeance = date_depart + INTERVAL 'X days'`). Pas de moteur de calendrier de jours fériés pour la V1.

### Justification

Simplicité de calcul, robustesse et prévisibilité pour le prototype universitaire.

### Conséquences

Les dates de départ et d'échéance sont stockées au format `date` ou `timestamptz` et vérifiées côté serveur.

---

## ADR-029 — Traçabilité des signatures et validations documentaires

Statut : VALIDÉ

### Problème

Comment gérer les signatures sur les procès-verbaux et documents officiels en V1 ?

### Décision

La table `pv_signataires` conserve l'identité, la qualité, la date et le statut de signature/validation. Les documents PDF générés intègrent ces mentions de validation applicative sans recourir à une infrastructure PKI complexe.

### Justification

Assure une traçabilité rigoureuse sans dépendance externe lourde, parfaitement adaptée au périmètre du projet.

### Conséquences

Séparation nette entre validation applicative certifiée par l'audit et signature électronique qualifiée.

---

## ADR-030 — Système de notifications internes prioritaires

Statut : VALIDÉ

### Problème

Comment alerter les acteurs lors des transitions du workflow sans risque de blocage technique ?

### Décision

Les notifications sont enregistrées en base (`notifications`) et présentées dans l'interface utilisateur. L'envoi éventuel d'emails est secondaire et non bloquant.

### Justification

Une défaillance réseau ou SMTP ne doit jamais interrompre ou faire échouer une transition de statut métier.

### Conséquences

Fiabilité maximale des opérations du workflow.

---

## ADR-031 — Typage et intégrité des montants financiers

Statut : VALIDÉ

### Problème

Comment représenter les montants financiers et garantir l'exactitude des calculs ?

### Décision

Utiliser le type PostgreSQL `NUMERIC(18,2)` avec contraintes `CHECK(montant >= 0)`. Chaque montant ou groupe de montants possède obligatoirement une devise (`CDF` ou `USD`). Un résultat de contrôle utilise une devise unique. Interdiction absolue des types flottants (`FLOAT`/`REAL`).

### Justification

Élimine tout risque d'erreur d'arrondi binaire sur les recettes de l'État.

### Conséquences

La cohérence arithmétique `montant_total = montant_du + montant_penalites` est vérifiée côté serveur et en base.

---

## ADR-032 — Stratégie d'indexation pour les requêtes métier et RLS

Statut : VALIDÉ

### Problème

Quels indexes créer pour optimiser les performances des requêtes métier et des règles de sécurité ?

### Décision

Créer des indexes B-tree sur :
- toutes les clés étrangères (`bureau_id`, `secteur_id`, `mission_id`, `controle_id`, `assujetti_id`, `user_id`, `agent_id`) ;
- les colonnes de filtrage fréquent (`statut`, `type_controle`, `actif`) ;
- les références uniques (`reference`, `identifiant`, `matricule`, `numero`) ;
- les colonnes polymorphiques (`entity_type`, `entity_id`).

### Justification

Optimise les jointures relationnelles et les prédicats RLS tout en maintenant des temps de réponse rapides.

### Conséquences

Plan d'indexation documenté pour la future migration PostgreSQL.

---

## ADR-033 — Gestion des contraintes d'intégrité et règles ON DELETE

Statut : VALIDÉ

### Problème

Comment protéger la cohérence relationnelle contre les suppressions orphelines ?

### Décision

Appliquer `ON DELETE RESTRICT` par défaut sur toutes les entités métier majeures (`missions`, `controles`, `assujettis`, `bureaux`, `profils`). Utiliser `ON DELETE CASCADE` uniquement pour les sous-entités purement dépendantes (`analyse_assujettis`, `notifications` d'un profil supprimé techniquement).

### Justification

Garantit qu'aucune donnée de contrôle ou d'audit ne peut être supprimée accidentellement par effet domino.

### Conséquences

Sécurité et intégrité maximale des données dans PostgreSQL.

---

## ADR-034 — Architecture transactionnelle et génération documentaire découplée

Statut : VALIDÉ

### Problème

Comment garantir l'atomicité et la robustesse des opérations lors des approbations sans risque d'échec ou d'incohérence liés au stockage physique des documents ?

### Décision

Adopter une architecture en deux phases distinctes et découplées :
1. **Phase transactionnelle PostgreSQL (Atomique & synchrone)** :
   - Vérification de l'authentification, du rôle et du périmètre organisationnel côté serveur ;
   - Enregistrement de la décision hiérarchique dans `mission_validations` ;
   - Mise à jour atomique du statut de la mission (`APPROUVEE`, `ORDRE_MISSION_GENERE` ou `AUTORISATION_GENEREE`) ;
   - Confirmation des équipes (`CONFIRMEE`), des agents et des assujettis affectés pour les missions `SUR_PLACE` ;
   - Création de l'enregistrement de métadonnées documentaires (`ordres_mission` ou `autorisations_controle_pieces`) avec contrainte `UNIQUE (mission_id)` ;
   - Enregistrement immuable dans `audit_logs` ;
   - `COMMIT` de la transaction PostgreSQL.
2. **Phase post-commit (Résiliente & idempotente)** :
   - Génération du binaire PDF officiel contenant les informations validées ;
   - Téléversement sécurisé dans le bucket Supabase Storage privé ;
   - Émission des notifications internes aux acteurs concernés dans la table `notifications`.

### Justification

La génération binaire d'un PDF et l'appel réseau HTTP vers Supabase Storage ne sont pas des opérations atomiques de base de données. En isolant la transaction PostgreSQL avant le transfert de fichier, on élimine tout risque d'état incohérent en base. Si le téléversement échoue temporairement, le système peut relancer la génération du fichier sans dupliquer la mission ni corrompre l'audit.

### Conséquences

Garantie d'intégrité absolue des données métier dans PostgreSQL, idempotence totale et résilience face aux aléas de stockage réseau.

---

## ADR-035 — Idempotence des opérations de génération documentaire et de soumission

Statut : VALIDÉ

### Problème

Comment prévenir les doublons lors de requêtes répétées ou de clics multiples ?

### Décision

Imposer des contraintes d'unicité en base (`ordres_mission.mission_id`, `autorisations_controle_pieces.mission_id`, `resultats_controle.controle_id`, `mission_assujettis(mission_id, assujetti_id)`) et vérifier l'état du dossier avant toute opération de génération.

### Justification

Empêche la création multiple de documents officiels pour une même mission.

### Conséquences

Résilience contre les rejeux réseau et clics concurrents.

---

## ADR-036 — Référentiel initial des 36 secteurs d'activité de contrôle

Statut : VALIDÉ

### Problème

Comment structurer initialement la compétence sectorielle des 6 bureaux de contrôle de la Division Contrôle pour l'application ?

### Décision

Définir un référentiel initial structuré de 36 secteurs (6 secteurs par bureau de contrôle) intégrés dans `supabase/seed.sql` et la table `secteurs`. Chaque secteur est rattaché à son bureau de contrôle compétent (`bureau_id`).

### Justification

Permet le cloisonnement organisationnel, le filtrage des missions, le rattachement des assujettis et la production des statistiques métier dès la version 1 du projet universitaire.

### Conséquences

Ce référentiel constitue la base de données métier de référence de l'application et pourra être affiné lors des validations institutionnelles avec la DGRAD réelle.

---

## ADR-037 — Sécurisation du Storage par URLs signées à durée courte et politiques RLS strictes

Statut : VALIDÉ

### Problème

Comment interdire l'accès direct et non autorisé aux pièces et documents administratifs sensibles stockés dans Supabase Storage ?

### Décision

Maintenir le bucket `dgrad-documents` strictement privé (`public = false`), interdire la lecture ouverte à tous les utilisateurs authentifiés au niveau RLS de `storage.objects`, et baser l'accès applicatif sur une vérification des permissions côté serveur avant la génération d'une URL signée temporaire (ou transmission par flux contrôlé).

### Justification

La possession d'une session valide ne doit pas conférer l'accès aux documents des autres bureaux ou missions. Le contrôle d'accès aux fichiers doit respecter l'habilitation sur les métadonnées de la ressource.

### Conséquences

Cloisonnement horizontal étanche et protection intégrale des documents officiels.

---

## ADR-038 — Tests Node des guards TypeScript de production

Statut : VALIDÉ

Les guards purs de sécurité sont importés directement dans les tests Node natifs. `allowImportingTsExtensions` est activé car le projet n’émet pas de JavaScript via TypeScript ; les Server Actions et les tests appellent ainsi la même logique d’autorisation.

