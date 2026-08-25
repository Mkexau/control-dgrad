# Rôles et permissions

## 1. Objectif

Définir les rôles applicatifs et leurs permissions.

Les permissions dépendent :

- du rôle ;
- du périmètre organisationnel ;
- de l'affectation de l'utilisateur ;
- de la ressource concernée ;
- de l'étape du workflow.

Le rôle `ADMIN` est un rôle technique et ne donne pas automatiquement de pouvoir de décision métier.

Le rôle seul ne constitue jamais une autorisation suffisante lorsqu'un périmètre organisationnel ou une affectation est nécessaire.

---

## 2. Organisation concernée

L'organisation du Bureau de contrôle et recoupement comprend :

### Direction / Bureau de contrôle et recoupement

- Directeur Général ;
- Division Recoupement ;
- Division Contrôle.

### Division Recoupement

- Bureau Analyse et Recoupement ;
- Bureau Documentation.

### Division Contrôle

- Bureau Contrôle Sol ;
- Bureau Contrôle Sous-sol ;
- Bureau Recettes judiciaires et de participation ;
- Bureau Contrôle Administratif 1 ;
- Bureau Contrôle Administratif 2 ;
- Bureau Contrôle Administratif 3.

Chaque bureau de contrôle possède plusieurs secteurs d'activité.

---

## 3. Rôles métier

### Directeur Général

Responsabilités :

- examiner les demandes arrivées au niveau DG ;
- approuver une mission de contrôle sur place ;
- rejeter une mission de contrôle sur place ;
- consulter les rapports selon son périmètre.

Le Directeur Général est le seul rôle applicatif autorisé à prendre la décision DG sur une mission sur place.

Il ne peut pas déléguer ce pouvoir automatiquement à un administrateur technique.

---

### Directeur des contrôles et recoupement

Responsabilités :

- examiner les dossiers de demande de contrôle sur place ;
- transmettre les dossiers vers le niveau DG selon le workflow ;
- consulter les informations nécessaires à l'examen.

Il ne peut pas :

- approuver au nom du DG ;
- rejeter au nom du DG ;
- contourner l'étape DG.

---

### Chef de Division Contrôle

Responsabilités :

- examiner les dossiers provenant des bureaux de contrôle ;
- superviser le traitement des demandes de sa division ;
- transmettre les dossiers au Directeur des contrôles et recoupement selon le workflow.

Il ne peut pas :

- approuver au nom du DG ;
- rejeter au nom du DG ;
- contourner l'étape du Directeur des contrôles et recoupement.

---

### Chef de Bureau

Le Chef de Bureau supervise les opérations relevant de son bureau.

Responsabilités :

- préparer ou superviser les demandes de contrôle ;
- consulter les assujettis de son périmètre ;
- consulter les secteurs de son bureau ;
- préparer les propositions d'équipes ;
- proposer les chefs d'équipe et agents ;
- suivre les contrôles de son bureau ;
- consulter les résultats et rapports selon son périmètre.

Le Chef de Bureau peut préparer et soumettre une demande selon le workflow.

Il ne peut pas :

- approuver une mission sur place au nom du DG ;
- rejeter une mission sur place au nom du DG ;
- approuver un contrôle sur pièces au nom du Chef de section.

---

### Chef de Section

Le Chef de section intervient dans le workflow du contrôle sur pièces.

Responsabilités :

- examiner les demandes de contrôle sur pièces qui lui sont soumises ;
- approuver une demande de contrôle sur pièces ;
- rejeter une demande de contrôle sur pièces ;
- consulter les éléments nécessaires à sa décision.

Après approbation, le système génère automatiquement l'autorisation de contrôle sur pièces.

Le Chef de section ne peut pas :

- approuver une mission sur place au nom du DG ;
- rejeter une mission sur place au nom du DG ;
- générer manuellement une autorisation en contournant le workflow.

La décision du Chef de section doit respecter son périmètre d'autorisation.

---

### Analyste

L'Analyste intervient principalement dans :

- la collecte et l'exploitation des informations ;
- l'analyse ;
- le recoupement ;
- la préparation des données ;
- l'identification des secteurs prioritaires ;
- la gestion des éléments d'analyse selon son périmètre.

L'Analyste ne possède pas automatiquement de pouvoir d'approbation.

---

### Contrôleur

Le Contrôleur intervient dans l'exécution des contrôles.

Il peut notamment :

- consulter les missions auxquelles il est affecté ;
- consulter les entreprises qui lui sont affectées ;
- consulter son équipe lorsqu'il intervient dans une mission sur place ;
- consulter les dossiers de contrôle sur pièces qui lui sont affectés ;
- saisir les informations du contrôle ;
- saisir les irrégularités ;
- saisir les observations ;
- saisir les montants ;
- participer au procès-verbal ;
- joindre des documents selon les permissions.

Le Contrôleur ne peut pas :

- approuver une mission sur place ;
- rejeter une mission sur place ;
- approuver un contrôle sur pièces au nom du Chef de section ;
- modifier une décision administrative.

---

### Chef d'équipe

Le Chef d'équipe est un agent de terrain désigné comme responsable d'une équipe.

Il peut notamment :

- consulter sa mission ;
- consulter l'ordre de mission ;
- consulter les entreprises affectées à son équipe ;
- consulter les agents de son équipe ;
- saisir les informations du contrôle ;
- saisir les observations ;
- saisir les irrégularités ;
- saisir les montants ;
- préparer le procès-verbal ;
- joindre des documents.

Le Chef d'équipe ne reçoit pas automatiquement un pouvoir d'approbation administrative.

Il ne peut pas :

- approuver la mission ;
- rejeter la mission ;
- modifier la décision du DG ;
- modifier la décision du Chef de section ;
- accéder aux missions auxquelles il n'est pas affecté.

---

### Consultation

Le rôle `CONSULTATION` permet une lecture seule des ressources autorisées.

Il ne peut pas :

- créer ;
- modifier ;
- approuver ;
- rejeter ;
- affecter ;
- supprimer ;
- modifier une décision métier.

L'accès reste soumis au périmètre autorisé.

---

## 4. Rôle technique

### ADMIN

Le rôle `ADMIN` est exclusivement technique.

Il peut notamment :

- créer des comptes ;
- modifier des comptes ;
- désactiver des comptes ;
- attribuer des rôles ;
- gérer certains paramètres techniques ;
- gérer certains référentiels techniques.

Le rôle `ADMIN` ne donne pas automatiquement le pouvoir de :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle sur pièces au nom du Chef de section ;
- rejeter un contrôle sur pièces au nom du Chef de section ;
- modifier une décision métier ;
- modifier les résultats d'un contrôle au nom d'un contrôleur ;
- modifier un PV au nom de son auteur ;
- contourner une transition de workflow.

Une opération métier doit toujours être autorisée par le rôle métier correspondant.

---

## 5. Rôles applicatifs

Les rôles applicatifs initiaux sont :

- `ADMIN`
- `ANALYSTE`
- `CHEF_BUREAU`
- `CHEF_SECTION`
- `CHEF_DIVISION`
- `DIRECTEUR_CONTROLES`
- `DIRECTEUR_GENERAL`
- `CHEF_EQUIPE`
- `CONTROLEUR`
- `CONSULTATION`

La correspondance entre les rôles organisationnels réels et les rôles applicatifs doit être conservée dans le profil utilisateur.

Un utilisateur ne doit pas recevoir automatiquement plusieurs pouvoirs incompatibles uniquement parce que plusieurs rôles lui sont attribués.

Les combinaisons de rôles doivent respecter la séparation des pouvoirs métier.

---

## 6. Principe de périmètre

Le rôle seul ne suffit jamais à autoriser une opération métier.

Le système doit également vérifier le périmètre de l'utilisateur.

Le périmètre peut notamment dépendre de :

- direction ;
- division ;
- bureau ;
- secteur ;
- mission ;
- équipe ;
- affectation.

Exemples :

Un contrôleur ne doit accéder qu'aux missions et contrôles auxquels il est autorisé ou affecté.

Un Chef de Bureau doit principalement accéder aux données relevant de son bureau.

Un Chef de Division doit pouvoir superviser les bureaux relevant de sa division selon les règles applicables.

Un Chef de section doit uniquement pouvoir traiter les demandes de contrôle sur pièces relevant de son périmètre.

Le Directeur des contrôles doit accéder aux dossiers qui lui sont soumis dans le cadre de son niveau de validation.

Le Directeur Général doit accéder aux missions arrivées au niveau DG.

---

## 7. Permissions principales

| Fonction | ADMIN | ANALYSTE | CHEF_BUREAU | CHEF_SECTION | CHEF_DIVISION | DIR_CONTROLES | DG | CHEF_EQUIPE | CONTROLEUR | CONSULTATION |
|---|---|---|---|---|---|---|---|---|---|---|
| Consulter assujettis | Technique* | Oui | Oui | Selon périmètre | Selon périmètre | Oui | Oui | Selon affectation | Selon affectation | Lecture |
| Modifier assujettis | Technique* | Oui | Oui | Non | Selon périmètre | Non | Non | Non | Non | Non |
| Créer une analyse | Technique* | Oui | Oui | Non | Non | Non | Non | Non | Non | Non |
| Consulter une analyse | Technique* | Oui | Oui | Selon périmètre | Selon périmètre | Oui | Oui | Non | Non | Lecture |
| Créer une demande sur place | Non | Selon processus | Oui | Non | Non | Non | Non | Non | Non | Non |
| Examiner une demande sur place | Non | Non | Selon périmètre | Non | Oui | Oui | Selon étape | Non | Non | Non |
| Soumettre au niveau suivant | Non | Non | Selon workflow | Non | Oui | Oui | Non | Non | Non | Non |
| Approuver mission sur place | Non | Non | Non | Non | Non | Non | Oui | Non | Non | Non |
| Rejeter mission sur place | Non | Non | Non | Non | Non | Non | Oui | Non | Non | Non |
| Créer demande sur pièces | Non | Selon processus | Oui | Non | Non | Non | Non | Non | Non | Non |
| Examiner demande sur pièces | Non | Non | Selon périmètre | Oui | Non | Non | Non | Non | Non | Non |
| Approuver contrôle sur pièces | Non | Non | Non | Oui | Non | Non | Non | Non | Non | Non |
| Rejeter contrôle sur pièces | Non | Non | Non | Oui | Non | Non | Non | Non | Non | Non |
| Affecter équipes | Non | Non | Selon workflow | Non | Selon workflow | Non | Selon décision | Non | Non | Non |
| Confirmer équipes après approbation | Non | Non | Selon workflow | Non | Selon workflow | Non | Selon décision | Non | Non | Non |
| Consulter ordre de mission | Technique* | Selon périmètre | Oui | Selon périmètre | Oui | Oui | Oui | Oui | Selon affectation | Lecture |
| Exécuter contrôle | Non | Non | Non | Non | Non | Non | Non | Oui | Oui | Non |
| Saisir observations | Non | Non | Selon workflow | Non | Non | Non | Non | Oui | Oui | Non |
| Saisir résultats | Non | Non | Selon workflow | Selon workflow | Selon périmètre | Selon périmètre | Consultation | Oui | Oui | Non |
| Préparer PV | Non | Non | Selon workflow | Selon workflow | Non | Non | Non | Oui | Oui | Non |
| Consulter rapports | Technique* | Selon périmètre | Oui | Selon périmètre | Oui | Oui | Oui | Selon mission | Selon mission | Lecture |
| Voir statistiques | Technique* | Oui | Oui | Oui | Oui | Oui | Oui | Selon périmètre | Selon périmètre | Lecture |
| Administrer utilisateurs | Oui | Non | Non | Non | Non | Non | Non | Non | Non | Non |

`*` Pour `ADMIN`, l'accès technique éventuel ne doit jamais être interprété comme un pouvoir métier.

Les valeurs `Selon périmètre`, `Selon workflow` et `Selon affectation` signifient qu'une vérification supplémentaire doit être effectuée côté serveur.

---

## 8. Permissions sur les missions

### Création

Une demande de mission sur place est préparée par le Bureau de contrôle compétent.

Une demande de contrôle sur pièces est préparée par le Bureau de contrôle compétent.

La création ne signifie pas que la mission est approuvée.

---

### Contrôle sur place

La chaîne de décision est :

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général.

Seul le Directeur Général peut :

- approuver ;
- rejeter ;

au niveau DG.

---

### Contrôle sur pièces

La chaîne de décision est :

Bureau de contrôle

→ Chef de section Contrôle

→ Approbation ou rejet.

Seul le Chef de section Contrôle peut prendre la décision prévue à ce niveau.

---

## 9. Permissions sur les équipes

Les équipes sont utilisées uniquement pour les contrôles sur place.

Le système doit permettre, selon l'étape du workflow :

- création de l'équipe ;
- désignation du chef d'équipe ;
- ajout des agents ;
- affectation des entreprises ;
- consultation de l'équipe ;
- confirmation des affectations.

Avant approbation DG :

- les équipes sont des propositions ;
- les membres sont des propositions ;
- les entreprises sont des propositions.

Après approbation DG :

- les équipes peuvent être confirmées ;
- les membres peuvent être confirmés ;
- les entreprises peuvent être confirmées.

Les modifications doivent respecter l'étape du workflow et les permissions du responsable.

---

## 10. Permissions du chef d'équipe

Le Chef d'équipe peut accéder aux informations :

- de sa mission ;
- de sa propre équipe ;
- des entreprises affectées à son équipe ;
- des documents nécessaires à son contrôle.

Il peut notamment :

- consulter la mission ;
- consulter l'ordre de mission ;
- saisir les données de contrôle ;
- préparer le PV ;
- joindre les documents ;
- enregistrer les observations ;
- enregistrer les irrégularités.

Il ne peut pas :

- approuver la mission ;
- rejeter la mission ;
- modifier une décision du DG ;
- modifier une décision du Chef de section ;
- accéder aux missions d'autres équipes sans autorisation de périmètre.

---

## 11. Permissions sur les contrôles sur pièces

Le contrôle sur pièces suit un workflow distinct.

Le Chef de section peut :

- examiner la demande ;
- approuver ;
- rejeter.

Après approbation :

- l'autorisation est générée automatiquement ;
- le contrôleur peut être désigné ;
- le contrôle peut commencer après désignation.

Le contrôleur désigné peut :

- consulter le dossier ;
- consulter les documents nécessaires ;
- saisir les informations du contrôle ;
- saisir les résultats ;
- préparer les éléments du PV ;
- joindre des documents.

Le contrôleur ne peut pas approuver sa propre demande.

---

## 12. Permissions sur les documents

L'accès aux documents doit respecter :

- le rôle ;
- le périmètre ;
- la mission ;
- le contrôle ;
- l'affectation éventuelle ;
- le type de document.

Un utilisateur ne doit pas pouvoir télécharger un document simplement parce qu'il connaît :

- son identifiant ;
- son nom ;
- son chemin de stockage.

Les téléchargements doivent être autorisés côté serveur.

Les documents privés doivent être stockés dans un espace privé.

---

## 13. Permissions sur les données financières

Les montants financiers sont des données sensibles.

La consultation et la modification doivent être contrôlées selon :

- le rôle ;
- le périmètre ;
- la mission ;
- le contrôle ;
- l'étape du workflow.

Toute modification importante d'un montant doit être enregistrée dans l'audit.

Les calculs financiers doivent respecter les règles métier concernant :

- la devise ;
- la précision ;
- le résultat ;
- les pénalités ;
- les redressements.

---

## 14. Permissions et RLS

Les permissions applicatives doivent être complétées par des protections PostgreSQL RLS lorsque nécessaire.

Le système doit empêcher les accès horizontaux.

Exemple :

Un utilisateur du Bureau Contrôle Sol ne doit pas pouvoir accéder automatiquement aux données privées d'une mission appartenant au Bureau Contrôle Administratif 1.

Un contrôleur ne doit pas pouvoir accéder aux contrôles d'une autre équipe uniquement en modifiant un identifiant.

Un chef d'équipe ne doit pas pouvoir accéder aux missions d'un autre chef d'équipe uniquement en modifiant un identifiant.

Les règles RLS doivent respecter :

- l'utilisateur authentifié ;
- son rôle ;
- son bureau ;
- son secteur lorsque nécessaire ;
- ses affectations.

---

## 15. Principe de séparation des pouvoirs

Un utilisateur ne doit pas pouvoir utiliser un rôle technique pour contourner une décision métier.

Notamment :

- `ADMIN` ne remplace pas `DIRECTEUR_GENERAL` ;
- `ADMIN` ne remplace pas `CHEF_SECTION` ;
- `CHEF_BUREAU` ne remplace pas `DIRECTEUR_GENERAL` ;
- `CONTROLEUR` ne remplace pas `CHEF_SECTION` ;
- `CHEF_EQUIPE` ne remplace pas `DIRECTEUR_GENERAL`.

Une décision métier doit toujours être réalisée par le rôle métier prévu par le workflow.

---

## 16. Règles concernant les comptes

Les comptes utilisateurs sont créés et gérés par `ADMIN`.

`ADMIN` peut :

- créer un compte ;
- modifier les informations administratives d'un compte ;
- attribuer un rôle ;
- désactiver un compte.

Les autres utilisateurs ne peuvent pas :

- créer eux-mêmes leur compte ;
- modifier leur rôle ;
- attribuer un rôle à un autre utilisateur ;
- désactiver un autre utilisateur.

La gestion technique d'un compte ne donne pas de pouvoir de décision métier.

---

## 17. Audit des permissions

Les opérations sensibles doivent être auditées.

Notamment :

- création de compte ;
- désactivation de compte ;
- changement de rôle ;
- approbation ;
- rejet ;
- affectation ;
- confirmation d'équipe ;
- changement de statut ;
- modification d'un résultat ;
- modification d'un montant ;
- génération d'un document important.

---

## 18. Accès horizontal

Toute ressource métier doit être protégée contre les accès horizontaux.

Un utilisateur ne doit jamais pouvoir accéder à une ressource uniquement en modifiant :

- un `id` dans l'URL ;
- un `id` dans une requête ;
- un identifiant de document ;
- un chemin Storage.

Les vérifications doivent être réalisées côté serveur.

---

## 19. Permissions définitives

Les permissions détaillées pourront être affinées pendant l'implémentation.

Toute modification importante des pouvoirs métier doit être documentée dans :

`docs/regles-metier.md`

Toute décision purement technique concernant l'implémentation des permissions doit être documentée dans :

`docs/decisions-techniques.md`

Codex ne doit pas inventer une permission métier lorsqu'elle n'est pas définie.

En cas de doute, il doit signaler le point et consulter :

`docs/questions-metier.md`.

---

## 20. Règle finale

Aucune interface utilisateur, Server Component, Client Component, formulaire ou bouton ne doit être considéré comme une protection d'autorisation.

Toute opération sensible doit être vérifiée :

1. côté serveur ;
2. au niveau du service métier ;
3. au niveau PostgreSQL/RLS lorsque nécessaire.

Une opération non autorisée doit être refusée même si l'utilisateur tente de l'exécuter directement sans passer par l'interface.