# Questions métier à valider

## Instructions

Une question présente dans ce document ne doit pas être résolue arbitrairement par le développeur.

Lorsqu'une décision est validée, elle doit être retirée de la liste des questions ouvertes et la règle correspondante doit être ajoutée ou mise à jour dans :

`docs/regles-metier.md`

Les choix techniques qui ne modifient pas une règle métier peuvent être décidés par l'équipe de développement et documentés dans :

`docs/decisions-techniques.md`

---

## QM-001 — Mission et assujettis

Une mission peut-elle concerner :

- un seul assujetti ;
- plusieurs assujettis ;
- un secteur entier ?

**Statut : VALIDÉ**

Une mission peut concerner un ou plusieurs assujettis rattachés au secteur et au bureau compétent. L'association se fait via la table de liaison `mission_assujettis` sans duplication.

---

## QM-002 — Missions simultanées

Un même assujetti peut-il faire l'objet de plusieurs missions simultanément ?

**Statut : À VALIDER**

La possibilité d'exécuter plusieurs missions simultanées sur un même assujetti pour des actes ou périodes distincts reste à préciser sur le plan administratif officiel.

---

## QM-003 — Référence mission

Quel est le format officiel de la référence d'une mission ?

Exemple proposé :

`MIS-2026-000001`

**Statut : VALIDÉ POUR LA V1**

Le format technique retenu pour la V1 est `MIS-YYYY-NNNNNN` avec unicité garantie en base de données.

---

## QM-004 — Référence assujetti

Quel identifiant officiel doit être utilisé pour identifier un assujetti ?

**Statut : VALIDÉ POUR LA V1**

La V1 gère un identifiant textuel unique (NIF, numéro RCCM ou identifiant fiscal/administratif attribué).

---

## QM-005 — Types d'assujettis

Quels types officiels doivent être gérés ?

Exemple :

- personne physique ;
- personne morale.

**Statut : VALIDÉ POUR LA V1**

La V1 gère les types `PERSONNE_PHYSIQUE` et `PERSONNE_MORALE`.

---

## QM-006 — Statuts de mission

La liste détaillée des statuts et transitions doit-elle être validée telle qu'elle apparaît dans :

`docs/workflow-missions.md`

Les deux parcours doivent être distingués :

### Contrôle sur place

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général

→ Approbation ou rejet

→ Ordre de mission si approuvé

### Contrôle sur pièces

Bureau de contrôle

→ Demande de contrôle

→ Chef de Bureau du bureau compétent

→ Approbation ou rejet

→ Autorisation de contrôle sur pièces si approuvée

**Statut : VALIDÉ**

Les statuts suivent `docs/workflow-missions.md`; après rejet, le dossier revient à `BROUILLON` pour correction puis resoumission. Pour `SUR_PLACE`, les équipes sont confirmées avant l'ordre de mission.

---

## QM-007 — Rejet

Que devient une demande rejetée ?

Options possibles :

- clôturée définitivement ;
- retournée au bureau ;
- modifiable puis resoumise.

**Statut : VALIDÉ**

La demande passe à `REJETEE`, conserve son motif et son historique, puis peut être corrigée et resoumise sans suppression physique.

---

## QM-008 — Modification après soumission

Qui peut modifier une demande après sa soumission ?

**Statut : VALIDÉ**

Une demande soumise est verrouillée pendant son examen ; elle redevient modifiable seulement après rejet.

---

## QM-009 — Modification après approbation

Une mission approuvée peut-elle être modifiée ?

Si oui :

- par qui ?
- quels champs ?
- faut-il une nouvelle validation ?

**Statut : VALIDÉ**

Aucune modification métier majeure ni modification silencieuse n'est admise après approbation en V1.

---

## QM-010 — Annulation

Une mission approuvée peut-elle être annulée ?

**Statut : VALIDÉ**

Une mission non clôturée peut être annulée sans suppression physique ; la date, l'utilisateur, le motif et l'audit sont conservés.

---

## QM-011 — Délégation

Existe-t-il des mécanismes de délégation lorsqu'un responsable est absent ?

**Statut : À VALIDER**

---

## QM-012 — Contrôle sur place

Quels documents sont obligatoires avant le démarrage du contrôle sur place ?

L'ordre de mission est généré automatiquement après approbation DG.

Les autres documents obligatoires restent à préciser.

**Statut : VALIDÉ POUR LA V1**

Aucun document supplémentaire n'est bloquant tant que son caractère obligatoire n'est pas défini explicitement.

---

## QM-013 — Contrôle sur pièces

Le contrôle sur pièces est initié par le Bureau de contrôle compétent et soumis au Chef de Bureau concerné.

Après approbation du Chef de Bureau, le système génère automatiquement une autorisation de contrôle sur pièces.

Cette autorisation constitue la matérialisation applicative de l'approbation.

La question de la signature électronique officielle reste ouverte.

**Statut : VALIDÉ POUR LA V1**

L'autorisation contient une validation applicative ; aucune signature électronique officielle n'est requise en V1.

---

## QM-014 — Délai de 7 jours

Le délai de sept jours mentionné dans le processus doit-il être calculé :

- en jours calendaires ;
- en jours ouvrables ?

**Statut : VALIDÉ**

Le délai est en jours calendaires ; les dates de départ et d'échéance sont conservées.

---

## QM-015 — Délai de 20 jours

Le délai de vingt jours doit-il être calculé :

- en jours calendaires ;
- en jours ouvrables ?

**Statut : VALIDÉ**

Le délai est en jours calendaires ; les dates de départ et d'échéance sont conservées.

---

## QM-016 — Notifications

Qui doit recevoir les notifications à chaque étape du workflow ?

Les destinataires doivent notamment être définis pour :

- soumission ;
- approbation ;
- rejet ;
- affectation ;
- contrôle ;
- demandes de renseignements ;
- clôture.

**Statut : VALIDÉ POUR LA V1**

Les notifications internes sont envoyées aux acteurs concernés par chaque événement du workflow selon leur rôle, bureau et affectation. L'acheminement interne est prioritaire et non bloquant.

---

## QM-017 — Email

L'application doit-elle envoyer automatiquement les avis de contrôle par email ?

**Statut : VALIDÉ POUR LA V1**

Les notifications internes sont prioritaires ; l'email est complémentaire, facultatif et ne bloque aucun workflow.

---

## QM-018 — Signature

Une signature électronique est-elle nécessaire ?

Il faut notamment déterminer si :

- la validation dans l'application suffit pour le projet ;
- une signature électronique est requise ;
- un document signé doit être conservé.

Pour le projet universitaire, une validation applicative peut être utilisée tant qu'elle est clairement distinguée d'une signature électronique officielle.

**Statut : VALIDÉ POUR LA V1**

La V1 conserve l'identité, la qualité, la date et le statut du signataire ; un PDF portant ces informations suffit.

---

## QM-019 — Procès-verbal

Quel format officiel doit avoir le procès-verbal ?

Le système doit au minimum pouvoir représenter :

- accord ;
- désaccord ;
- carence ;
- identité des signataires ;
- date ;
- contenu ;
- documents associés.

**Statut : VALIDÉ POUR LA V1**

Le système gère les types ACCORD, DESACCORD et CARENCE avec traçabilité complète des signataires (nom, qualité, date, statut de signature) et document PDF associé.

---

## QM-020 — Documents

Quels documents doivent obligatoirement être attachés à :

- une demande de mission ;
- un contrôle ;
- un procès-verbal ;
- une feuille d'observations ;
- un rapport ?

**Statut : VALIDÉ POUR LA V1**

Le système permet les pièces nécessaires sans bloquer un workflow sur une liste de documents non définie.

---

## QM-021 — Montants

Les devises initialement supportées sont :

- CDF ;
- USD.

Lors de la saisie d'un montant, l'utilisateur doit pouvoir sélectionner explicitement la devise.

**Statut : VALIDÉ**

---

## QM-022 — Calculs financiers

Quels calculs doivent être automatisés ?

Le système ne doit pas inventer de formule financière ou de pénalité qui n'est pas définie dans les documents métier.

**Statut : VALIDÉ POUR LA V1**

Le système assure la cohérence arithmétique élémentaire (`montant_total = montant_du + montant_penalites`) en devise unique et interdit les calculs en virgule flottante non contrôlés. Aucune formule arbitraire de pénalité n'est inventée.

---

## QM-023 — Pénalités

Quelles règles permettent de calculer les pénalités ?

Le document actuel ne fournit pas les formules.

**Statut : À VALIDER**

---

## QM-024 — Paiement échelonné

Quelles conditions permettent d'autoriser un paiement échelonné ?

**Statut : À VALIDER**

---

## QM-025 — Taxation d'office

Quels champs et documents sont nécessaires pour enregistrer la taxation d'office ?

Les conditions exactes d'application et les calculs ne sont pas suffisamment définis.

**Statut : À VALIDER**

---

## QM-026 — Clôture

Qui peut clôturer définitivement une mission ?

**Statut : À VALIDER**

---

## QM-027 — Rapport

Le rapport doit-il être généré automatiquement à partir des données de la mission ?

**Statut : À VALIDER**

---

## QM-028 — Statistiques

Quels indicateurs doivent apparaître sur le dashboard officiel ?

Exemples possibles :

- nombre de missions ;
- missions en cours ;
- missions terminées ;
- missions rejetées ;
- contrôles chargés ;
- contrôles déchargés ;
- montants concernés ;
- répartition par bureau ;
- répartition par secteur.

La liste officielle reste à valider.

**Statut : VALIDÉ POUR LA V1**

Le dashboard initial couvre les missions par statut, type et bureau, les contrôles réalisés, les résultats, les montants, les missions en cours et clôturées dans le périmètre de l'utilisateur.

---

## QM-029 — Historique

Quelle durée de conservation de l'historique est requise ?

**Statut : À VALIDER**

---

## QM-030 — Archivage

Existe-t-il une procédure officielle d'archivage des missions ?

Si aucune procédure officielle n'est disponible pour le projet universitaire, une solution technique simple d'archivage peut être définie sans inventer de règle administrative.

**Statut : VALIDÉ POUR LA V1**

L'archivage est logique : les objets métier et leur historique sont conservés sans suppression physique.

---

## QM-031 — Création des comptes

Les comptes utilisateurs sont créés et gérés par l'administrateur technique.

L'utilisateur normal peut :

- se connecter ;
- se déconnecter ;
- utiliser les fonctionnalités autorisées par son rôle.

Il ne peut pas créer ou gérer d'autres comptes.

**Statut : VALIDÉ**

---

## QM-032 — Pouvoir de l'administrateur technique

L'administrateur technique peut notamment :

- créer un compte ;
- modifier un compte ;
- désactiver un compte ;
- attribuer un rôle ;
- gérer certains paramètres techniques.

L'administrateur technique ne reçoit pas automatiquement le pouvoir de :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle au nom d'un Chef de Bureau ;
- modifier une décision métier.

**Statut : VALIDÉ**

---

## QM-033 — Ordre de mission

Pour un contrôle sur place, l'ordre de mission est généré automatiquement par le système après approbation du Directeur Général.

Il peut être :

- consulté ;
- téléchargé ;
- imprimé ;
- conservé au format numérique.

**Statut : VALIDÉ**

---

## QM-034 — Autorisation de contrôle sur pièces

Pour un contrôle sur pièces, l'autorisation est générée automatiquement après approbation du Chef de Bureau.

Elle peut être :

- consultée ;
- téléchargée ;
- imprimée ;
- conservée au format numérique ;
- jointe au dossier.

**Statut : VALIDÉ**

---

## QM-035 — Affectation des agents

Pour une mission sur place, le dossier présenté par le Bureau de contrôle contient une proposition d'équipe comprenant :

- un chef d'équipe ;
- des agents de terrain.

Après approbation de la mission, les équipes et leurs membres sont enregistrés dans le système.

Chaque équipe est associée aux entreprises qu'elle doit contrôler.

**Statut : VALIDÉ**

---

## QM-036 — Interface chef d'équipe

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

**Statut : VALIDÉ**

---

## QM-037 — Observations

Une feuille d'observations n'est pas obligatoire pour toutes les missions.

Elle est créée lorsqu'une irrégularité est constatée.

Une mission ou un contrôle sans irrégularité ne doit pas générer automatiquement une feuille d'observations.

**Statut : VALIDÉ**

---

## QM-038 — Contrôle sur pièces et ordre de mission

Le contrôle sur pièces ne nécessite pas d'ordre de mission.

Il possède son propre parcours et son propre document d'autorisation.

**Statut : VALIDÉ**

---

## QM-039 — Entité administrative compétente

L'entité administrative compétente pour un contrôle est le Bureau de contrôle responsable du secteur d'activité concerné.

**Statut : VALIDÉ**

---

## QM-040 — Rôle utilisateur unique

Un utilisateur possède un rôle applicatif principal unique dans son profil.

Le champ `profiles.role` est unique et il n'y a pas de système multi-rôles pour la V1.

**Statut : VALIDÉ**

---

## QM-041 — Contrôleur responsable sur pièces unique

Une mission de contrôle sur pièces est confiée à un contrôleur responsable principal unique via `controles.controleur_responsable_id`.

Pas de système multi-contrôleurs pour la V1.

**Statut : VALIDÉ**

