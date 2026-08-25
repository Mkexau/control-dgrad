# Workflow des missions

## 1. Principes généraux

L'application possède deux parcours distincts :

1. contrôle sur place ;
2. contrôle sur pièces.

Les deux parcours partagent certaines données, mais ne suivent pas les mêmes validations.

Les transitions de statut sont contrôlées côté serveur.

Une transition ne peut être effectuée que si :

- le statut actuel permet la transition ;
- l'utilisateur est authentifié ;
- l'utilisateur possède le rôle requis ;
- l'utilisateur appartient au périmètre requis ;
- les conditions métier sont satisfaites.

Le frontend ne constitue jamais une frontière de sécurité.

Le frontend ne doit jamais pouvoir forcer directement un changement de statut.

Toute transition importante doit être enregistrée dans l'audit.

---

# 2. Contrôle sur place

## 2.1 Parcours

Le parcours normal est :

BROUILLON

→ SOUMISE

→ EXAMEN_CHEF_DIVISION

→ EXAMEN_DIRECTEUR_CONTROLES

→ ATTENTE_DG

→ APPROUVEE

→ ORDRE_MISSION_GENERE

→ EQUIPES_AFFECTEES

→ CONTROLE_EN_COURS

→ CONTROLE_TERMINE

→ RESULTAT

→ PROCES_VERBAL

→ RAPPORT

→ CLOTUREE

Une feuille d'observations intervient uniquement lorsqu'une irrégularité est constatée.

---

## 2.2 Brouillon

Statut :

`BROUILLON`

Le Bureau de contrôle compétent prépare la demande.

À ce stade, le Bureau peut :

- renseigner les entreprises concernées ;
- renseigner le secteur ;
- proposer les équipes ;
- proposer les chefs d'équipe ;
- proposer les agents de terrain ;
- proposer l'affectation des entreprises aux équipes ;
- joindre les documents nécessaires ;
- compléter les informations statistiques ;
- modifier la demande.

Les équipes et affectations sont encore des propositions.

Elles ne sont pas considérées comme définitivement confirmées avant l'approbation du Directeur Général.

---

## 2.3 Soumission

Transition :

`BROUILLON → SOUMISE`

La demande est soumise par le Bureau de contrôle compétent.

La soumission déclenche le processus hiérarchique.

Après soumission, les modifications ordinaires sont limitées.

Toute modification autorisée doit respecter les permissions et le workflow.

---

## 2.4 Examen Chef de Division

Transition :

`SOUMISE → EXAMEN_CHEF_DIVISION`

Le Chef de Division Contrôle examine le dossier.

Il vérifie notamment :

- la cohérence du dossier ;
- le secteur concerné ;
- les entreprises concernées ;
- la proposition des équipes ;
- la proposition des agents ;
- les éléments nécessaires à la mission.

Le Chef de Division peut :

- transmettre le dossier ;
- retourner le dossier au Bureau de contrôle pour correction lorsque le workflow le permet.

Toute décision ou action importante est historisée.

---

## 2.5 Examen Directeur des contrôles

Transition :

`EXAMEN_CHEF_DIVISION → EXAMEN_DIRECTEUR_CONTROLES`

Le Directeur des contrôles et recoupement examine le dossier.

Il peut :

- transmettre le dossier au niveau DG ;
- retourner le dossier pour correction lorsque le workflow le permet.

La décision et son auteur doivent être historisés.

---

## 2.6 Attente DG

Transition :

`EXAMEN_DIRECTEUR_CONTROLES → ATTENTE_DG`

La demande est mise à disposition du Directeur Général.

À ce stade, la décision appartient au Directeur Général.

---

## 2.7 Décision DG

Le Directeur Général peut :

- approuver ;
- rejeter.

### Approbation

Transition :

`ATTENTE_DG → APPROUVEE`

L'identité du Directeur Général, la date et la décision doivent être enregistrées.

L'approbation valide la mission sur place.

Les équipes et leurs affectations proposées peuvent alors être confirmées.

### Rejet

Transition :

`ATTENTE_DG → REJETEE`

Le motif du rejet doit être enregistré.

La décision doit être enregistrée dans l'audit.

Une mission rejetée ne doit pas être considérée comme approuvée.

Le comportement permettant une éventuelle correction et resoumission doit respecter la règle métier validée.

---

## 2.8 Confirmation des équipes

Après approbation DG, les propositions d'équipes sont confirmées.

Les équipes proposées deviennent :

`CONFIRMEE`

Les éléments suivants sont alors confirmés :

- chefs d'équipe ;
- agents de terrain ;
- entreprises affectées à chaque équipe.

Une équipe confirmée appartient à la mission approuvée.

Une équipe annulée ne peut pas être utilisée pour démarrer un contrôle.

---

## 2.9 Génération de l'ordre de mission

Après approbation DG :

`APPROUVEE → ORDRE_MISSION_GENERE`

Le système génère automatiquement l'ordre de mission.

L'ordre de mission doit identifier notamment :

- la mission ;
- les entreprises concernées ;
- les équipes ;
- les chefs d'équipe ;
- les agents affectés.

L'ordre de mission peut être :

- consulté ;
- téléchargé ;
- imprimé ;
- conservé au format numérique.

L'ordre de mission ne doit jamais être généré avant l'approbation DG.

---

## 2.10 Affectation des équipes

Transition :

`ORDRE_MISSION_GENERE → EQUIPES_AFFECTEES`

Les équipes confirmées sont enregistrées comme équipes opérationnelles de la mission.

Chaque équipe possède :

- un chef d'équipe ;
- plusieurs agents ;
- une ou plusieurs entreprises à contrôler.

Les entreprises doivent être affectées aux équipes.

Une mission sur place ne peut pas commencer tant que les conditions nécessaires d'affectation ne sont pas remplies.

---

## 2.11 Contrôle en cours

Transition :

`EQUIPES_AFFECTEES → CONTROLE_EN_COURS`

Le contrôle peut commencer lorsque :

- la mission est approuvée ;
- l'ordre de mission est généré ;
- les équipes nécessaires sont confirmées ;
- les agents sont affectés ;
- les entreprises sont affectées aux équipes.

Le chef d'équipe peut accéder à son interface de contrôle.

Il peut notamment :

- consulter la mission ;
- consulter l'ordre de mission ;
- consulter son équipe ;
- consulter les entreprises affectées ;
- saisir les informations du contrôle ;
- saisir les irrégularités ;
- saisir les observations ;
- saisir les montants ;
- joindre des documents ;
- préparer le PV.

Le chef d'équipe ne possède pas le pouvoir d'approuver ou de rejeter la mission.

---

## 2.12 Contrôle terminé

Transition :

`CONTROLE_EN_COURS → CONTROLE_TERMINE`

Le contrôle est terminé lorsque les opérations prévues sont achevées.

Les informations saisies doivent être conservées.

La fin du contrôle doit être historisée.

---

## 2.13 Résultat

Transition :

`CONTROLE_TERMINE → RESULTAT`

Le résultat du contrôle est enregistré.

Les deux résultats principaux sont :

- `CHARGEE` ;
- `DECHARGEE`.

### Résultat CHARGEE

Les montants dus et les éventuelles pénalités sont enregistrés.

Les montants utilisent une devise explicitement enregistrée.

Un résultat utilise une seule devise.

Le système ne réalise aucune conversion automatique entre CDF et USD.

### Résultat DECHARGEE

Aucun montant n'est réclamé selon les situations prévues.

Le motif ou la justification du résultat doit être enregistré.

---

## 2.14 Procès-verbal

Transition :

`RESULTAT → PROCES_VERBAL`

Le procès-verbal est établi à la fin des opérations.

Les types sont :

- `ACCORD` ;
- `DESACCORD` ;
- `CARENCE`.

Le PV doit conserver :

- son auteur ;
- sa date ;
- son contenu ;
- ses signataires ;
- les documents associés.

---

## 2.15 Irrégularités

Après l'établissement du résultat et du PV, le système vérifie si des irrégularités ont été constatées.

### Avec irrégularités

Une feuille d'observations peut être créée.

Transition logique :

`PROCES_VERBAL → FEUILLE_OBSERVATIONS → RAPPORT`

La feuille d'observations est créée uniquement lorsqu'une irrégularité nécessite son établissement.

### Sans irrégularités

Aucune feuille d'observations n'est créée.

Transition :

`PROCES_VERBAL → RAPPORT`

Une feuille d'observations ne doit jamais être générée automatiquement lorsqu'aucune irrégularité n'est constatée.

---

## 2.16 Rapport

Transition :

`RAPPORT → CLOTUREE`

Le rapport est élaboré à l'issue des opérations concernées.

Il est associé à la mission et aux éléments nécessaires du contrôle.

Le rapport doit être conservé dans le dossier de la mission.

---

## 2.17 Clôture

La mission est clôturée après traitement des éléments requis.

Une mission clôturée ne doit plus pouvoir être modifiée librement.

Toute modification exceptionnelle doit :

- respecter les permissions ;
- respecter les règles métier ;
- être historisée.

---

# 3. Contrôle sur pièces

## 3.1 Principes

Le contrôle sur pièces est une mission fonctionnelle avec un workflow spécifique.

Il :

- ne nécessite pas de déplacement ;
- ne nécessite pas d'ordre de mission ;
- ne nécessite pas d'équipe de terrain.

La demande est initiée par le Bureau de contrôle compétent.

Elle est soumise au Chef de section Contrôle.

---

## 3.2 Parcours

Le parcours normal est :

BROUILLON

→ DEMANDE_SOUMISE

→ EXAMEN_CHEF_SECTION

→ APPROUVEE

→ AUTORISATION_GENEREE

→ CONTROLEUR_DESIGNE

→ CONTROLE_EN_COURS

→ CONTROLE_TERMINE

→ RESULTAT

→ PROCES_VERBAL

→ RAPPORT

→ CLOTUREE

Une feuille d'observations intervient uniquement lorsqu'une irrégularité est constatée.

---

## 3.3 Brouillon

Statut :

`BROUILLON`

Le Bureau de contrôle compétent prépare la demande.

La demande peut être :

- complétée ;
- modifiée ;
- documentée ;
- sauvegardée.

Elle ne peut pas être exécutée avant approbation du Chef de section Contrôle.

---

## 3.4 Soumission

Transition :

`BROUILLON → DEMANDE_SOUMISE`

La demande est soumise au Chef de section Contrôle.

La soumission doit être enregistrée dans l'audit.

---

## 3.5 Examen Chef de section

Transition :

`DEMANDE_SOUMISE → EXAMEN_CHEF_SECTION`

Le Chef de section Contrôle examine la demande.

Il vérifie notamment :

- le Bureau de contrôle compétent ;
- le secteur ;
- l'assujetti ou les assujettis concernés ;
- le motif ;
- les éléments nécessaires au contrôle.

Le Chef de section peut :

- approuver ;
- rejeter.

---

## 3.6 Approbation

Transition :

`EXAMEN_CHEF_SECTION → APPROUVEE`

Lorsque le Chef de section Contrôle approuve :

- la décision est enregistrée ;
- l'identité du décideur est enregistrée ;
- la date est enregistrée ;
- la demande devient approuvée ;
- le système peut générer l'autorisation.

L'approbation du Chef de section ne génère jamais un ordre de mission.

---

## 3.7 Rejet

Transition :

`EXAMEN_CHEF_SECTION → REJETEE`

Le motif du rejet doit être enregistré.

La décision doit être historisée.

Le comportement permettant une éventuelle correction et resoumission doit respecter la règle métier validée.

---

## 3.8 Génération de l'autorisation

Transition :

`APPROUVEE → AUTORISATION_GENEREE`

Le système génère automatiquement l'autorisation de contrôle sur pièces.

L'autorisation peut être :

- consultée ;
- téléchargée ;
- imprimée ;
- conservée au format numérique ;
- jointe au dossier.

Aucun ordre de mission n'est généré pour un contrôle sur pièces.

---

## 3.9 Désignation du contrôleur

Transition :

`AUTORISATION_GENEREE → CONTROLEUR_DESIGNE`

Le ou les contrôleurs concernés sont désignés selon les permissions et le périmètre applicables.

La désignation doit être enregistrée.

Le contrôleur désigné peut accéder au dossier du contrôle selon :

- son rôle ;
- son bureau ;
- son secteur ;
- son affectation.

---

## 3.10 Contrôle en cours

Transition :

`CONTROLEUR_DESIGNE → CONTROLE_EN_COURS`

Le contrôle est réalisé depuis les locaux de l'administration.

Le contrôleur peut notamment :

- consulter le dossier ;
- examiner les déclarations ;
- examiner les actes générateurs ;
- examiner les documents justificatifs ;
- enregistrer les résultats ;
- demander des renseignements lorsque nécessaire ;
- joindre des documents.

Aucune équipe de terrain n'est requise.

---

## 3.11 Contrôle terminé

Transition :

`CONTROLE_EN_COURS → CONTROLE_TERMINE`

Le contrôle est terminé lorsque les opérations prévues sont achevées.

Les éléments du contrôle doivent être conservés.

---

## 3.12 Résultat

Transition :

`CONTROLE_TERMINE → RESULTAT`

Le résultat peut être :

- `CHARGEE` ;
- `DECHARGEE`.

Les montants financiers doivent être enregistrés avec leur devise.

Un résultat utilise une seule devise.

---

## 3.13 Procès-verbal

Transition :

`RESULTAT → PROCES_VERBAL`

Un procès-verbal est établi.

Les types sont :

- `ACCORD` ;
- `DESACCORD` ;
- `CARENCE`.

Le PV doit être associé à la mission et au contrôle concerné lorsque nécessaire.

---

## 3.14 Irrégularités

Le système vérifie si des irrégularités ont été constatées.

### Avec irrégularités

Une feuille d'observations peut être créée.

Transition logique :

`PROCES_VERBAL → FEUILLE_OBSERVATIONS → RAPPORT`

### Sans irrégularités

Aucune feuille d'observations n'est créée.

Transition :

`PROCES_VERBAL → RAPPORT`

---

## 3.15 Rapport

Transition :

`RAPPORT → CLOTUREE`

Le rapport est élaboré à l'issue du contrôle.

Il est associé à la mission et aux éléments nécessaires du contrôle.

---

## 3.16 Clôture

La mission est clôturée après traitement des éléments requis.

Une mission clôturée ne doit plus être modifiée librement.

Toute modification exceptionnelle doit être autorisée et auditée.

---

# 4. Règles communes aux deux workflows

## 4.1 Authentification

Toute transition nécessite un utilisateur authentifié.

---

## 4.2 Autorisation

Toute transition doit vérifier :

- identité de l'utilisateur ;
- rôle ;
- périmètre organisationnel ;
- affectation lorsque nécessaire ;
- statut actuel ;
- conditions métier.

Le rôle seul ne constitue jamais une autorisation suffisante lorsque le périmètre doit être contrôlé.

---

## 4.3 Audit

Les transitions importantes doivent être enregistrées dans l'audit.

Notamment :

- création ;
- soumission ;
- transmission ;
- approbation ;
- rejet ;
- affectation ;
- changement de statut ;
- génération de document ;
- clôture.

---

## 4.4 Documents

Les documents générés doivent être associés à la ressource métier correspondante.

Les documents importants ne doivent pas être supprimés physiquement sans règle explicite.

---

## 4.5 Contrôle des transitions

Une transition invalide doit être refusée côté serveur.

Exemple :

Un utilisateur ne doit pas pouvoir passer directement :

`ATTENTE_DG → APPROUVEE`

s'il ne possède pas le pouvoir du Directeur Général.

De même, une mission `SUR_PIECES` ne doit jamais passer par :

`ORDRE_MISSION_GENERE`

---

## 4.6 Séparation des workflows

Les workflows `SUR_PLACE` et `SUR_PIECES` doivent rester distincts.

### SUR_PLACE

Utilise :

- Bureau de contrôle ;
- Chef de Division Contrôle ;
- Directeur des contrôles et recoupement ;
- Directeur Général ;
- ordre de mission ;
- équipes ;
- agents de terrain.

### SUR_PIECES

Utilise :

- Bureau de contrôle ;
- Chef de section Contrôle ;
- autorisation de contrôle sur pièces ;
- contrôleur désigné.

Le contrôle sur pièces ne nécessite :

- ni déplacement ;
- ni ordre de mission ;
- ni équipe de terrain.

---

# 5. Conditions obligatoires de démarrage

## 5.1 Mission sur place

Une mission `SUR_PLACE` ne peut passer à :

`CONTROLE_EN_COURS`

que si :

- la mission est approuvée par le DG ;
- l'ordre de mission a été généré ;
- les équipes nécessaires sont confirmées ;
- chaque équipe possède un chef d'équipe ;
- les agents nécessaires sont affectés ;
- les entreprises sont affectées aux équipes.

---

## 5.2 Mission sur pièces

Une mission `SUR_PIECES` ne peut passer à :

`CONTROLE_EN_COURS`

que si :

- la demande a été approuvée par le Chef de section Contrôle ;
- l'autorisation a été générée ;
- le ou les contrôleurs ont été désignés.

Aucune équipe de terrain n'est requise.

---

# 6. Statuts techniques

Les valeurs de statut doivent être normalisées dans le code et la base de données.

## 6.1 SUR_PLACE

- `BROUILLON`
- `SOUMISE`
- `EXAMEN_CHEF_DIVISION`
- `EXAMEN_DIRECTEUR_CONTROLES`
- `ATTENTE_DG`
- `APPROUVEE`
- `REJETEE`
- `ORDRE_MISSION_GENERE`
- `EQUIPES_AFFECTEES`
- `CONTROLE_EN_COURS`
- `CONTROLE_TERMINE`
- `RESULTAT`
- `PROCES_VERBAL`
- `FEUILLE_OBSERVATIONS`
- `RAPPORT`
- `CLOTUREE`

## 6.2 SUR_PIECES

- `BROUILLON`
- `DEMANDE_SOUMISE`
- `EXAMEN_CHEF_SECTION`
- `APPROUVEE`
- `REJETEE`
- `AUTORISATION_GENEREE`
- `CONTROLEUR_DESIGNE`
- `CONTROLE_EN_COURS`
- `CONTROLE_TERMINE`
- `RESULTAT`
- `PROCES_VERBAL`
- `FEUILLE_OBSERVATIONS`
- `RAPPORT`
- `CLOTUREE`

Les statuts `FEUILLE_OBSERVATIONS` ne doivent être utilisés que lorsqu'une irrégularité est constatée.

---

# 7. Règle de cohérence des workflows

Le système doit empêcher les parcours incohérents.

### SUR_PLACE ne doit jamais :

- générer une autorisation de contrôle sur pièces ;
- être approuvée par le Chef de section ;
- démarrer sans équipe ;
- démarrer sans ordre de mission.

### SUR_PIECES ne doit jamais :

- générer un ordre de mission ;
- être approuvée par le DG dans le cadre de ce workflow ;
- nécessiter une équipe de terrain ;
- nécessiter un déplacement.

Toute tentative de contourner ces règles doit être refusée côté serveur et enregistrée dans l'audit lorsque pertinent.