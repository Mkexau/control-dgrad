# Règles métier

## RM-001 — Bureau compétent

Chaque secteur d'activité est rattaché à un bureau de contrôle compétent.

Le bureau compétent est responsable des demandes de contrôle concernant ce secteur.

---

## RM-002 — Mission sur place

Une mission sur place est préparée par le bureau de contrôle compétent.

Le dossier de demande contient notamment :

- le secteur concerné ;
- les entreprises concernées ;
- la proposition des agents ;
- les chefs d'équipe ;
- les agents de terrain ;
- les éléments statistiques nécessaires.

---

## RM-003 — Chaîne de validation sur place

La demande de contrôle sur place suit la chaîne :

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général.

---

## RM-004 — Décision DG

Le Directeur Général peut :

- approuver ;
- rejeter.

Toute décision du Directeur Général doit être traçable.

---

## RM-005 — Ordre de mission

Après approbation DG d'une mission sur place, le système génère automatiquement l'ordre de mission.

L'ordre de mission peut être :

- consulté ;
- téléchargé ;
- imprimé ;
- conservé au format numérique.

L'ordre de mission ne doit pas être généré avant l'approbation du Directeur Général.

---

## RM-006 — Équipe

Une mission sur place peut comporter plusieurs équipes.

Une équipe appartient à une mission.

Les équipes sont préparées dans le cadre de la demande de mission.

---

## RM-007 — Chef d'équipe

Chaque équipe possède un chef d'équipe.

Le chef d'équipe est un agent de terrain affecté à la mission.

Un chef d'équipe est responsable des opérations de son équipe dans le cadre du contrôle.

---

## RM-008 — Agents

Une équipe peut comporter plusieurs agents de terrain.

Les agents sont proposés dans le dossier de demande puis affectés aux équipes dans le cadre de la mission.

---

## RM-009 — Entreprises

Les entreprises doivent être affectées aux équipes.

Une équipe peut être responsable de plusieurs entreprises.

Une mission peut concerner plusieurs entreprises.

Une entreprise affectée à une équipe doit faire partie des entreprises concernées par la mission.

---

## RM-010 — Contrôle sur pièces

Le contrôle sur pièces est une mission fonctionnelle avec un workflow spécifique.

Il :

- ne nécessite pas de déplacement ;
- ne nécessite pas d'ordre de mission ;
- ne nécessite pas d'équipe de terrain.

---

## RM-011 — Demande de contrôle sur pièces

La demande de contrôle sur pièces est préparée par le Bureau de contrôle compétent.

Elle est soumise au Chef de section Contrôle pour approbation.

---

## RM-012 — Décision Chef de section

Le Chef de section Contrôle peut :

- approuver ;
- rejeter.

La décision doit être enregistrée dans l'historique de la demande.

Le Chef de section Contrôle constitue l'autorité de validation du workflow des contrôles sur pièces.

---

## RM-013 — Autorisation sur pièces

Après approbation du Chef de section Contrôle, le système génère automatiquement une autorisation de contrôle sur pièces.

L'autorisation peut être :

- consultée ;
- téléchargée ;
- imprimée ;
- conservée au format numérique ;
- jointe au dossier de contrôle.

L'autorisation ne doit pas être générée avant l'approbation du Chef de section Contrôle.

---

## RM-014 — Ordre de mission sur pièces

Un contrôle sur pièces ne nécessite pas d'ordre de mission.

Il possède son propre document d'autorisation.

---

## RM-015 — Devise

Chaque montant financier doit enregistrer explicitement sa devise.

Les devises initiales sont :

- CDF ;
- USD.

Lors de la saisie d'un montant, l'utilisateur doit pouvoir sélectionner la devise.

Le système ne réalise aucune conversion automatique entre CDF et USD.

---

## RM-016 — Résultat chargé

Le résultat chargé indique qu'une irrégularité a conduit à déterminer un montant dû et éventuellement des pénalités.

Les montants concernés doivent être enregistrés avec leur devise.

Un résultat de contrôle utilise une seule devise pour :

- le montant dû ;
- les pénalités ;
- le montant total.

---

## RM-017 — Résultat déchargé

Le résultat déchargé indique qu'aucun montant n'est réclamé selon les situations prévues.

Le motif ou la justification du résultat doit être conservé.

---

## RM-018 — PV

Un PV est établi à la fin des opérations de contrôle.

Il doit être associé au dossier de la mission et, lorsque nécessaire, au contrôle concerné.

---

## RM-019 — Types de PV

Les types sont :

- accord ;
- désaccord ;
- carence.

---

## RM-020 — Observations conditionnelles

La feuille d'observations n'est créée que lorsque des irrégularités sont constatées.

Une mission ou un contrôle sans irrégularité ne doit pas générer automatiquement une feuille d'observations.

---

## RM-021 — Interface chef d'équipe

Le chef d'équipe doit disposer d'une interface lui permettant notamment de :

- consulter sa mission ;
- consulter l'ordre de mission ;
- consulter les entreprises affectées ;
- consulter les agents de son équipe ;
- saisir les informations du contrôle ;
- saisir les observations ;
- saisir les irrégularités ;
- saisir les montants ;
- préparer le PV ;
- joindre des documents.

Le chef d'équipe ne possède pas de pouvoir d'approbation de la mission.

---

## RM-022 — Proposition et confirmation des équipes

Pour une mission sur place, le dossier présenté par le Bureau de contrôle contient une proposition d'organisation des équipes.

Cette proposition peut contenir :

- les équipes ;
- les chefs d'équipe ;
- les agents de terrain ;
- les entreprises affectées à chaque équipe.

Avant l'approbation du Directeur Général, les équipes ont le statut `PROPOSEE`.

Après l'approbation du Directeur Général :

- les équipes proposées deviennent `CONFIRMEE` ;
- les chefs d'équipe sont confirmés ;
- les agents sont confirmés ;
- les entreprises affectées sont confirmées.

Les équipes confirmées peuvent alors être utilisées pour l'exécution du contrôle et pour la génération de l'ordre de mission.

---

## RM-023 — Contrôle sur place et équipe

Un contrôle sur place doit être associé à une équipe.

L'équipe doit appartenir à la mission concernée.

L'entreprise contrôlée doit :

- faire partie des entreprises de la mission ;
- être affectée à l'équipe concernée.

---

## RM-024 — Contrôle sur pièces et équipe

Un contrôle sur pièces ne nécessite pas d'équipe.

Le contrôle sur pièces ne doit pas être associé à une équipe de terrain.

---

## RM-025 — Administrateur technique

L'administrateur technique ne possède pas automatiquement les pouvoirs de décision métier.

Il ne peut pas, uniquement en raison de son rôle technique :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle au nom du Chef de section ;
- rejeter un contrôle au nom du Chef de section ;
- modifier une décision métier ;
- contourner une transition de workflow.

---

## RM-026 — Comptes

Les comptes sont créés et gérés par l'administrateur.

L'administrateur peut notamment :

- créer un compte ;
- modifier un compte ;
- désactiver un compte ;
- attribuer un rôle.

Les autres utilisateurs peuvent uniquement utiliser leur compte selon leurs permissions.

La création ou la gestion technique d'un compte ne donne pas automatiquement de pouvoir métier à son utilisateur.

---

## RM-027 — Audit

Les décisions et actions métier importantes doivent être traçables.

L'audit doit notamment permettre de connaître :

- l'utilisateur ;
- l'action ;
- la date ;
- l'objet concerné ;
- l'ancienne valeur lorsque nécessaire ;
- la nouvelle valeur lorsque nécessaire.

Les décisions d'approbation et de rejet doivent notamment être enregistrées.

---

## RM-028 — Documents

Les documents importants doivent être conservés dans le dossier correspondant.

Les documents métier doivent rester accessibles uniquement aux utilisateurs autorisés.

Les documents générés par le système doivent également être traçables.

---

## RM-029 — Annulation

Une mission ne doit pas être supprimée physiquement après son entrée dans le workflow métier.

Une annulation doit être traçable.

L'annulation ne doit pas effacer l'historique de la mission.

---

## RM-030 — Historique

Les changements importants doivent être historisés.

Les décisions :

- d'approbation ;
- de rejet ;
- d'affectation ;
- de changement de statut ;

doivent notamment être conservées.

---

## RM-031 — Observations et irrégularités

Les observations sont liées aux irrégularités constatées pendant le contrôle.

Une feuille d'observations est créée uniquement lorsqu'une irrégularité nécessite son établissement.

Une absence d'irrégularité ne doit pas entraîner automatiquement la création d'une feuille d'observations.

---

## RM-032 — Documents générés automatiquement

Le système génère automatiquement les documents suivants lorsque les conditions métier sont remplies :

- ordre de mission après approbation DG pour un contrôle sur place ;
- autorisation de contrôle sur pièces après approbation du Chef de section Contrôle.

Ces documents doivent être conservés dans le dossier correspondant.

---

## RM-033 — Décisions techniques

Les conventions nécessaires au projet universitaire peuvent être définies techniquement lorsqu'elles ne modifient pas le processus métier.

Toute décision technique importante doit être documentée dans :

`docs/decisions-techniques.md`

Une décision technique ne doit jamais modifier silencieusement une règle métier.

---

## RM-034 — Source de vérité métier

Les règles métier validées sont définies dans :

- `docs/processus-metier.md`
- `docs/regles-metier.md`
- `docs/workflow-missions.md`

Les questions encore ouvertes sont définies dans :

`docs/questions-metier.md`

En cas de contradiction, Codex doit signaler le problème au lieu d'inventer une règle.

---

## RM-035 — Périmètre du Chef de section Contrôle

Le Chef de section Contrôle peut uniquement approuver ou rejeter les demandes de contrôle sur pièces relevant de son périmètre d'autorisation.

Le système doit vérifier :

- l'identité de l'utilisateur ;
- son rôle `CHEF_SECTION` ;
- son périmètre organisationnel ;
- la mission concernée ;
- le statut actuel de la mission.

Un utilisateur ne peut pas approuver une demande simplement en connaissant son identifiant.

---

## RM-036 — Désignation du contrôleur sur pièces

Après approbation de la demande de contrôle sur pièces et génération de l'autorisation, un contrôleur doit être désigné avant le démarrage du contrôle.

Le contrôleur désigné peut alors accéder au dossier nécessaire à l'exécution du contrôle.

---

## RM-037 — Accès du chef d'équipe

Le chef d'équipe peut accéder uniquement aux missions et aux entreprises qui lui sont effectivement affectées.

Il ne peut pas accéder à une autre mission uniquement en modifiant un identifiant dans l'URL ou une requête.

---

## RM-038 — Accès des agents de terrain

Un agent de terrain peut accéder aux données nécessaires aux contrôles auxquels il est effectivement affecté.

L'affectation à une mission ou à une équipe constitue une condition d'accès aux données opérationnelles correspondantes.

---

## RM-039 — Périmètre organisationnel

Les permissions métier doivent respecter le périmètre organisationnel de l'utilisateur.

Le système doit notamment tenir compte, selon l'opération :

- de la division ;
- du bureau ;
- du secteur ;
- de la mission ;
- de l'équipe ;
- de l'affectation.

Le rôle seul ne constitue pas une autorisation suffisante pour accéder à toutes les données.

---

## RM-040 — Résultat financier mono-devise

Un résultat de contrôle utilise une seule devise.

Les devises initiales sont :

- CDF ;
- USD.

Le système ne réalise aucune conversion automatique entre CDF et USD.

Tous les montants financiers appartenant au même résultat utilisent la devise enregistrée pour ce résultat.

---

## RM-041 — Intégrité du montant total

Lorsqu'un montant total est calculé à partir du montant dû et des pénalités, le système doit garantir la cohérence des valeurs enregistrées.

Les calculs financiers doivent utiliser un type numérique adapté aux montants monétaires.

Les calculs flottants non maîtrisés ne doivent pas être utilisés pour les montants financiers.

---

## RM-042 — Suppression des données métier

Les données métier importantes ne doivent pas être supprimées physiquement sans règle explicite.

Lorsqu'une suppression physique n'est pas nécessaire, le système doit privilégier :

- l'annulation ;
- la désactivation ;
- l'archivage ;
- l'historisation.

L'historique des décisions métier doit être conservé.

---

## RM-043 — Règle de non-invention

Lorsqu'une règle métier n'est pas définie dans les documents de référence :

1. elle ne doit pas être inventée par le développeur ;
2. le manque doit être identifié ;
3. la question doit être ajoutée ou référencée dans `docs/questions-metier.md` si nécessaire ;
4. une décision technique peut être prise uniquement lorsqu'elle ne modifie pas le processus métier.

---

## RM-044 — Rôle principal unique

Chaque profil possède un seul rôle applicatif principal en V1. Le champ `profiles.role` est donc singulier. Toute évolution vers plusieurs rôles devra faire l'objet d'une règle métier et d'une évolution de modèle explicites.

---

## RM-045 — Contrôleur responsable sur pièces

En V1, un contrôle sur pièces possède un contrôleur responsable principal unique. Cette désignation est enregistrée dans `controles.controleur_responsable_id`.

---

## RM-046 — Confirmation des équipes et ordre de mission

Après l'approbation DG d'une mission `SUR_PLACE`, les équipes, chefs d'équipe, agents et entreprises proposés sont confirmés. L'ordre de mission définitif est généré après cette confirmation et ne doit contenir aucune équipe non confirmée.

---

## RM-047 — Rejet et resoumission

Une demande rejetée passe à `REJETEE`, conserve le motif et l'historique de la décision, puis revient au bureau demandeur pour correction. Après correction, elle revient à `BROUILLON` et doit être soumise à nouveau.

---

## RM-048 — Verrouillage des modifications

Une demande soumise est non modifiable pendant son examen. Après approbation, aucune modification métier majeure ni silencieuse n'est autorisée en V1.

---

## RM-049 — Annulation et archivage logique

Une mission non clôturée peut être annulée sans suppression physique. L'annulation conserve la date, l'auteur, le motif lorsque nécessaire et une trace d'audit. Les données métier importantes sont archivées logiquement et leur historique est conservé.

---

## RM-050 — Délais calendaires

Les délais de sept et vingt jours sont calculés en jours calendaires en V1. Les dates de départ et d'échéance sont conservées. Aucun calendrier de jours fériés n'est requis.

---

## RM-051 — Validation documentaire en V1

La V1 ne requiert pas de signature électronique juridiquement complexe. Les documents conservent l'identité, la qualité, la date et le statut de signature ou de validation ; un PDF comportant ces informations est suffisant.

---

## RM-052 — Notifications et documents non bloquants

Les notifications internes sont prioritaires. L'email est complémentaire et ne bloque pas un workflow. Les documents nécessaires peuvent être joints, sans rendre obligatoire une pièce dont la règle métier n'est pas explicitement définie.

---

## RM-053 — Statistiques initiales

Les statistiques initiales couvrent les missions par statut, type et bureau, les contrôles réalisés, les résultats chargés et déchargés, les montants concernés, les missions en cours et les missions clôturées. Elles respectent le périmètre de l'utilisateur.
