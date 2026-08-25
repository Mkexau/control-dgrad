# Modèle de données

## 1. Organisation

### directions

- id
- code
- nom
- actif
- created_at
- updated_at

### divisions

- id
- direction_id
- code
- nom
- actif
- created_at
- updated_at

### bureaux

- id
- division_id
- code
- nom
- type
- actif
- created_at
- updated_at

### secteurs

- id
- bureau_id
- code
- nom
- actif
- created_at
- updated_at

Relations :

- une direction possède plusieurs divisions ;
- une division appartient à une direction ;
- une division possède plusieurs bureaux ;
- un bureau appartient à une division ;
- un bureau possède plusieurs secteurs ;
- un secteur appartient à un bureau.

Un secteur de contrôle appartient à un seul bureau de contrôle compétent.

---

## 2. Utilisateurs

### profiles

- id
- auth_user_id
- nom
- prenom
- email
- téléphone
- bureau_id
- role
- actif
- created_at
- updated_at

Relations :

- un profil correspond à un utilisateur Supabase Auth ;
- un profil appartient à un bureau ;
- le rôle détermine les permissions applicatives ;
- le bureau détermine le périmètre organisationnel principal.

La division est obtenue via le bureau.

Le rôle technique `ADMIN` ne donne pas automatiquement les pouvoirs métier.

Le rôle `CHEF_SECTION` représente l'autorité chargée d'approuver ou de rejeter les demandes de contrôle sur pièces relevant de son périmètre.

Aucune table `sections` n'est nécessaire à ce stade.

---

## 3. Agents

### agents

- id
- profile_id
- matricule
- spécialité
- domaine_competence
- actif
- created_at
- updated_at

Un agent est lié à un profil utilisateur.

Un agent peut être affecté à plusieurs missions ou équipes selon les règles du workflow.

---

## 4. Assujettis

### assujettis

- id
- type
- identifiant
- nom_raison_sociale
- adresse
- email
- téléphone
- secteur_principal_id
- actif
- created_at
- updated_at

Relations :

- un assujetti peut être rattaché à un secteur principal ;
- un secteur peut concerner plusieurs assujettis.

Un assujetti peut apparaître dans plusieurs missions au cours du temps.

---

## 5. Notes de perception

### notes_perception

- id
- assujetti_id
- numero
- date
- acte_generateur
- article_budgetaire
- nombre_actes
- montant
- devise
- created_at
- updated_at

Chaque note de perception appartient à un assujetti.

Le montant possède obligatoirement une devise.

Devises initiales :

- CDF ;
- USD.

---

## 6. Ordonnancements

### ordonnancements

- id
- assujetti_id
- numero
- date
- montant
- devise
- statut
- created_at
- updated_at

Chaque ordonnancement appartient à un assujetti.

---

## 7. Analyses

### analyses

- id
- bureau_id
- secteur_id
- auteur_id
- date
- statut
- observations
- created_at
- updated_at

Une analyse est réalisée dans le périmètre d'un bureau et éventuellement d'un secteur.

### analyse_assujettis

- id
- analyse_id
- assujetti_id
- montant_du
- montant_paye
- montant_restant
- devise
- manque_a_gagner
- priorité
- created_at
- updated_at

Cette table permet d'associer plusieurs assujettis à une analyse.

---

## 8. Missions

### missions

- id
- reference
- type_controle
- bureau_id
- secteur_id
- created_by
- statut
- motif
- date_creation
- date_soumission
- date_approbation
- date_cloture
- created_at
- updated_at

Types :

- SUR_PLACE
- SUR_PIECES

Une mission appartient à un bureau de contrôle compétent.

Une mission peut être associée à un secteur.

Une mission peut concerner plusieurs assujettis.

Le type de contrôle détermine le workflow applicable.

---

## 9. Assujettis d'une mission

### mission_assujettis

- id
- mission_id
- assujetti_id
- ordre
- statut
- created_at
- updated_at

Cette relation permet à une mission de concerner plusieurs assujettis.

Un même assujetti peut être concerné par plusieurs missions différentes.

---

## 10. Validations

### mission_validations

- id
- mission_id
- type_validation
- validateur_id
- statut
- motif
- date_validation
- commentaire
- created_at
- updated_at

Types :

- CHEF_DIVISION
- DIRECTEUR_CONTROLES
- DG
- CHEF_SECTION

La validation doit conserver l'identité du validateur.

Une validation ne doit pas pouvoir être effectuée par un utilisateur ne possédant pas le pouvoir correspondant.

Pour une mission SUR_PLACE :

- CHEF_DIVISION ;
- DIRECTEUR_CONTROLES ;
- DG.

Pour une mission SUR_PIECES :

- CHEF_SECTION.

---

## 11. Ordres de mission

### ordres_mission

- id
- mission_id
- reference
- date_generation
- generated_by
- storage_path
- version
- created_at
- updated_at

Un ordre de mission existe uniquement pour une mission SUR_PLACE après approbation DG.

Le système le génère automatiquement.

Une mission SUR_PIECES ne possède pas d'ordre de mission.

---

## 12. Équipes

### equipes

- id
- mission_id
- nom
- chef_equipe_id
- statut
- created_at
- updated_at

Statuts :

- PROPOSEE
- CONFIRMEE
- ANNULEE

Une équipe appartient à une mission SUR_PLACE.

Chaque équipe possède un chef d'équipe.

Pendant la préparation de la mission, les équipes, les chefs d'équipe, les agents et les entreprises à contrôler sont proposés par le Bureau de contrôle compétent.

Avant l'approbation du Directeur Général, les équipes ont le statut `PROPOSEE`.

Après l'approbation du Directeur Général :

- les équipes proposées deviennent `CONFIRMEE` ;
- les chefs d'équipe sont confirmés ;
- les agents sont confirmés ;
- les entreprises affectées sont confirmées ;
- le système peut générer automatiquement l'ordre de mission.

Une équipe `ANNULEE` ne peut pas être utilisée pour démarrer un contrôle.

### equipe_agents

- id
- equipe_id
- agent_id
- created_at

Cette table permet d'associer plusieurs agents à une équipe.

### equipe_assujettis

- id
- equipe_id
- assujetti_id
- created_at

Cette table permet d'associer les entreprises/assujettis à contrôler à une équipe.

Une équipe peut contrôler plusieurs entreprises.

Une entreprise peut être affectée à une équipe de la mission.

Les affectations doivent être cohérentes avec les assujettis de la mission.

---

## 13. Contrôles

### controles

- id
- mission_id
- equipe_id
- assujetti_id
- type_controle
- controleur_responsable_id
- date_debut
- date_fin
- statut
- observations
- created_at
- updated_at

Relations :

- un contrôle appartient à une mission ;
- un contrôle concerne un assujetti ;
- un contrôle possède un contrôleur responsable ;
- un contrôle SUR_PLACE appartient à une équipe ;
- un contrôle SUR_PIECES ne nécessite pas d'équipe.

Règles :

Pour `SUR_PLACE` :

- `equipe_id` est obligatoire ;
- l'équipe doit appartenir à la mission ;
- l'assujetti doit appartenir aux assujettis de la mission ;
- l'assujetti doit être affecté à l'équipe.

Pour `SUR_PIECES` :

- `equipe_id` est NULL ;
- aucun déplacement n'est requis ;
- le contrôle doit être rattaché à une mission SUR_PIECES approuvée.

Le `type_controle` du contrôle doit être cohérent avec le type de la mission.

---

## 14. Autorisations de contrôle sur pièces

### autorisations_controle_pieces

- id
- mission_id
- validation_id
- reference
- date_generation
- generated_by
- storage_path
- version
- created_at
- updated_at

Une autorisation existe après approbation du Chef de section.

Elle est générée automatiquement par le système.

Une autorisation est liée à une mission SUR_PIECES.

Elle peut être :

- consultée ;
- téléchargée ;
- imprimée ;
- jointe au dossier du contrôle.

---

## 15. Demandes de renseignements

### demandes_renseignements

- id
- controle_id
- assujetti_id
- auteur_id
- date_envoi
- date_limite
- date_reponse
- statut
- contenu
- created_at
- updated_at

Une demande de renseignements appartient à un contrôle.

Elle concerne un assujetti.

Le système doit permettre de suivre :

- date d'envoi ;
- date limite ;
- date de réponse ;
- statut.

---

## 16. Résultats

### resultats_controle

- id
- controle_id
- type_resultat
- montant_du
- montant_penalites
- montant_total
- devise
- justification
- created_at
- updated_at

Types :

- CHARGEE
- DECHARGEE

Un contrôle possède au maximum un résultat final.

Un résultat de contrôle utilise une seule devise.

Devises initiales :

- CDF ;
- USD.

La devise s'applique aux montants :

- montant_du ;
- montant_penalites ;
- montant_total.

Le système ne réalise aucune conversion automatique entre CDF et USD.

Pour un résultat CHARGEE :

- les montants dus peuvent être renseignés ;
- les pénalités peuvent être renseignées ;
- les redressements peuvent être associés.

Pour un résultat DECHARGEE :

- la justification doit être renseignée.

---

## 17. Redressements

### redressements

- id
- resultat_id
- montant
- devise
- motif
- statut
- created_at
- updated_at

Un redressement appartient à un résultat chargé.

Les règles de calcul détaillées seront définies séparément si elles deviennent nécessaires.

---

## 18. Pénalités

### penalites

- id
- resultat_id
- montant
- devise
- motif
- created_at
- updated_at

Une pénalité appartient à un résultat de contrôle.

Les formules officielles de calcul ne sont pas définies dans le modèle actuel.

Le système ne doit donc pas inventer de formule métier.

---

## 19. Avis de recouvrement

### avis_recouvrement

- id
- resultat_id
- reference
- date
- montant
- devise
- storage_path
- created_at
- updated_at

Un avis de recouvrement appartient à un résultat de contrôle.

---

## 20. Paiement échelonné

### paiements_echelonnes

- id
- resultat_id
- montant_total
- devise
- justification
- statut
- created_at
- updated_at

Un paiement échelonné appartient à un résultat.

---

## 21. Procès-verbaux

### proces_verbaux

- id
- mission_id
- controle_id
- type
- date
- contenu
- created_by
- created_at
- updated_at

Types :

- ACCORD
- DESACCORD
- CARENCE

Un PV appartient à une mission et peut être associé au contrôle concerné.

Le système doit conserver :

- auteur ;
- date ;
- type ;
- contenu ;
- signataires.

---

## 22. Signataires des PV

### pv_signataires

- id
- proces_verbal_id
- nom
- qualité
- agent_id
- date_signature
- signature_status
- created_at

Les signataires peuvent être liés à des utilisateurs/agents lorsque cela est possible.

Le système doit conserver l'identité des signataires et l'état de leur signature ou validation.

---

## 23. Feuilles d'observations

### feuilles_observations

- id
- mission_id
- controle_id
- date
- contenu
- created_by
- date_notification
- statut
- created_at
- updated_at

Une feuille d'observations n'est créée que lorsqu'une irrégularité est constatée.

Elle peut être liée au contrôle concerné.

---

## 24. Rapports

### rapports_mission

- id
- mission_id
- auteur_id
- date
- contenu
- statut
- storage_path
- created_at
- updated_at

Un rapport appartient à une mission.

---

## 25. Documents

### documents

- id
- document_type
- entity_type
- entity_id
- nom
- mime_type
- taille
- storage_path
- version
- uploaded_by
- created_at
- updated_at

Les documents peuvent être associés notamment à :

- une mission ;
- un contrôle ;
- un assujetti ;
- un PV ;
- une feuille d'observations ;
- un rapport ;
- une demande de renseignements ;
- une autorisation ;
- un ordre de mission.

Le système doit contrôler les droits d'accès avant tout téléchargement.

Les documents métier importants ne doivent pas être supprimés physiquement sans règle explicite.

---

## 26. Notifications

### notifications

- id
- user_id
- type
- titre
- message
- entity_type
- entity_id
- lu
- created_at

Une notification peut être liée à une ressource métier.

---

## 27. Audit

### audit_logs

- id
- user_id
- action
- entity_type
- entity_id
- old_data
- new_data
- ip_address
- user_agent
- created_at

Les actions importantes doivent être enregistrées.

Exemples :

- création ;
- modification ;
- soumission ;
- approbation ;
- rejet ;
- affectation ;
- changement de statut ;
- génération de document ;
- création de PV ;
- clôture ;
- modification financière.

---

## 28. Contraintes importantes

Le schéma PostgreSQL doit prévoir :

- clés étrangères ;
- contraintes d'unicité ;
- NOT NULL ;
- indexes ;
- contraintes de cohérence ;
- enums lorsque pertinents ;
- contraintes CHECK lorsque pertinentes.

### Organisation

- une division appartient à une direction ;
- un bureau appartient à une division ;
- un secteur appartient à un bureau ;
- un profil appartient à un bureau.

### Missions

- une mission possède un type de contrôle valide ;
- une mission possède un bureau compétent ;
- une mission peut concerner plusieurs assujettis ;
- les références de mission sont uniques.

### Contrôle sur place

- une mission SUR_PLACE doit passer par la validation DG ;
- une mission SUR_PLACE approuvée peut générer un ordre de mission ;
- une mission SUR_PLACE doit avoir des équipes avant le démarrage du contrôle ;
- chaque équipe possède un chef d'équipe ;
- un contrôle SUR_PLACE doit être lié à une équipe ;
- l'équipe doit appartenir à la mission ;
- l'assujetti contrôlé doit appartenir à la mission ;
- l'assujetti contrôlé doit être affecté à l'équipe.

### Contrôle sur pièces

- une mission SUR_PIECES ne nécessite pas d'équipe ;
- une mission SUR_PIECES ne génère pas d'ordre de mission ;
- une mission SUR_PIECES est soumise au Chef de section ;
- après approbation, le système génère une autorisation de contrôle sur pièces ;
- un contrôle SUR_PIECES ne doit pas avoir d'équipe ;
- un contrôle SUR_PIECES doit appartenir à une mission SUR_PIECES approuvée.

### Résultats

- un contrôle possède au maximum un résultat final ;
- un résultat CHARGEE peut avoir des redressements ;
- un résultat DECHARGEE doit comporter une justification ;
- les montants financiers possèdent une devise ;
- les montants d'un même résultat utilisent la même devise ;
- aucune conversion automatique entre CDF et USD n'est effectuée.

### Observations

- une feuille d'observations ne doit être créée que lorsqu'une irrégularité est constatée.

### Documents

- les fichiers métier sont privés ;
- les téléchargements sont soumis aux permissions ;
- les métadonnées sont conservées dans PostgreSQL.

### Audit

- les actions critiques doivent être traçables ;
- les logs d'audit ne doivent pas être modifiables par les utilisateurs métier ordinaires.

---

## 29. Suppression et archivage

Les données métier importantes ne doivent pas être supprimées physiquement sans règle explicite.

Pour les objets importants, privilégier :

- statut ;
- archivage ;
- désactivation ;
- historique.

Les règles de suppression doivent être définies dans les migrations et les services concernés.

---

## 30. Indexes

Les indexes doivent être ajoutés selon les besoins réels des requêtes.

Les colonnes fréquemment utilisées pour :

- recherches ;
- relations ;
- filtrage ;
- workflow ;
- périmètre organisationnel ;
- audit ;

doivent être étudiées avant création des migrations.

Ne pas créer inutilement des indexes sur toutes les colonnes.

---

## 31. Cohérence des types

Les valeurs suivantes doivent être normalisées :

- rôles ;
- statuts ;
- types de contrôle ;
- types de résultat ;
- types de PV ;
- types de validation ;
- devises.

Éviter les chaînes libres lorsque la valeur appartient à un ensemble fermé.

---

## 32. Important

Ce modèle constitue la base de conception avant la création de la base PostgreSQL.

Avant de créer les migrations, Codex doit vérifier :

- cohérence relationnelle ;
- clés étrangères ;
- contraintes ;
- contraintes CHECK ;
- indexes ;
- enums ;
- RLS ;
- règles de suppression ;
- règles d'archivage ;
- cohérence des workflows ;
- cohérence des permissions ;
- intégrité des montants financiers.

Codex ne doit pas créer les migrations avant d'avoir effectué cette vérification.