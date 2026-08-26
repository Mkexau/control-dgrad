# Modèle de données relationnel

## 1. Types énumérés (Enums PostgreSQL)

Le modèle utilise des types énumérés stricts pour garantir l'intégrité et la cohérence du workflow :

- **`app_role`** : `'ADMIN'`, `'ANALYSTE'`, `'CHEF_BUREAU'`, `'CHEF_SECTION'`, `'CHEF_DIVISION'`, `'DIRECTEUR_CONTROLES'`, `'DIRECTEUR_GENERAL'`, `'CHEF_EQUIPE'`, `'CONTROLEUR'`, `'CONSULTATION'`
- **`mission_type`** : `'SUR_PLACE'`, `'SUR_PIECES'`
- **`mission_status`** : `'BROUILLON'`, `'SOUMISE'`, `'EXAMEN_CHEF_DIVISION'`, `'EXAMEN_DIRECTEUR_CONTROLES'`, `'ATTENTE_DG'`, `'DEMANDE_SOUMISE'`, `'EXAMEN_CHEF_SECTION'`, `'APPROUVEE'`, `'REJETEE'`, `'ORDRE_MISSION_GENERE'`, `'AUTORISATION_GENEREE'`, `'CONTROLEUR_DESIGNE'`, `'EQUIPES_AFFECTEES'`, `'CONTROLE_EN_COURS'`, `'CONTROLE_TERMINE'`, `'RESULTAT'`, `'PROCES_VERBAL'`, `'FEUILLE_OBSERVATIONS'`, `'RAPPORT'`, `'CLOTUREE'`, `'ANNULEE'`
- **`validation_type`** : `'CHEF_DIVISION'`, `'DIRECTEUR_CONTROLES'`, `'DG'`, `'CHEF_SECTION'`
- **`validation_status`** : `'APPROUVE'`, `'REJETE'`, `'RETOURNE'`
- **`equipe_status`** : `'PROPOSEE'`, `'CONFIRMEE'`, `'ANNULEE'`
- **`controle_status`** : `'EN_ATTENTE'`, `'EN_COURS'`, `'TERMINE'`, `'ANNULE'`
- **`resultat_type`** : `'CHARGEE'`, `'DECHARGEE'`
- **`pv_type`** : `'ACCORD'`, `'DESACCORD'`, `'CARENCE'`
- **`signature_status`** : `'EN_ATTENTE'`, `'SIGNE'`, `'REFUSE'`
- **`currency_type`** : `'CDF'`, `'USD'`
- **`assujetti_type`** : `'PERSONNE_PHYSIQUE'`, `'PERSONNE_MORALE'`
- **`document_type`** : `'ORDRE_MISSION'`, `'AUTORISATION_PIECES'`, `'PROCES_VERBAL'`, `'FEUILLE_OBSERVATIONS'`, `'RAPPORT_MISSION'`, `'DEMANDE_RENSEIGNEMENTS'`, `'PIECE_JUSTIFICATIVE'`, `'AVIS_RECOUVREMENT'`, `'AUTRE'`

---

## 2. Organisation

### directions

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `code` | TEXT | NON | UNIQUE | Code officiel (ex: `DCR`) |
| `nom` | TEXT | NON | | Nom complet |
| `actif` | BOOLEAN | NON | DEFAULT true | État d'activité |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### divisions

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `direction_id` | UUID | NON | REFERENCES directions(id) ON DELETE RESTRICT | Direction de rattachement |
| `code` | TEXT | NON | UNIQUE | Code (ex: `DIV_CTRL`, `DIV_REC`) |
| `nom` | TEXT | NON | | Nom de la division |
| `actif` | BOOLEAN | NON | DEFAULT true | État d'activité |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### bureaux

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `division_id` | UUID | NON | REFERENCES divisions(id) ON DELETE RESTRICT | Division de rattachement |
| `code` | TEXT | NON | UNIQUE | Code (ex: `BUR_SOL`, `BUR_SOUS_SOL`, `BUR_ADM1`) |
| `nom` | TEXT | NON | | Nom complet du bureau |
| `type` | TEXT | NON | | Type (ex: `CONTROLE`, `RECOUPEMENT`) |
| `actif` | BOOLEAN | NON | DEFAULT true | État d'activité |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### secteurs

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `bureau_id` | UUID | NON | REFERENCES bureaux(id) ON DELETE RESTRICT | Bureau de contrôle compétent |
| `code` | TEXT | NON | UNIQUE | Code du secteur |
| `nom` | TEXT | NON | | Intitulé du secteur d'activité |
| `actif` | BOOLEAN | NON | DEFAULT true | État d'activité |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 3. Utilisateurs et Profils

### profiles

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY (= auth.users.id) | Identifiant utilisateur |
| `auth_user_id` | UUID | NON | UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE | Lien compte Supabase Auth |
| `nom` | TEXT | NON | | Nom de famille |
| `prenom` | TEXT | NON | | Prénom |
| `email` | TEXT | NON | UNIQUE | Adresse email professionnelle |
| `telephone` | TEXT | OUI | | Numéro de téléphone |
| `bureau_id` | UUID | OUI | REFERENCES bureaux(id) ON DELETE RESTRICT | Bureau d'affectation |
| `role` | app_role | NON | | Rôle applicatif principal unique (V1) |
| `actif` | BOOLEAN | NON | DEFAULT true | État du compte |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 4. Agents

### agents

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique agent |
| `profile_id` | UUID | NON | UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT | Profil utilisateur associé |
| `matricule` | TEXT | NON | UNIQUE | Matricule administratif officiel |
| `specialite` | TEXT | OUI | | Spécialité technique |
| `domaine_competence` | TEXT | OUI | | Domaine de compétence |
| `actif` | BOOLEAN | NON | DEFAULT true | Disponibilité opérationnelle |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 5. Assujettis

### assujettis

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `type` | assujetti_type | NON | | `PERSONNE_PHYSIQUE` ou `PERSONNE_MORALE` |
| `identifiant` | TEXT | NON | UNIQUE | NIF, RCCM ou identifiant attribué |
| `nom_raison_sociale` | TEXT | NON | | Nom ou raison sociale |
| `adresse` | TEXT | OUI | | Adresse physique |
| `email` | TEXT | OUI | | Email de contact |
| `telephone` | TEXT | OUI | | Téléphone de contact |
| `secteur_principal_id`| UUID | OUI | REFERENCES secteurs(id) ON DELETE RESTRICT | Secteur d'activité principal |
| `actif` | BOOLEAN | NON | DEFAULT true | État d'activité |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'enregistrement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 6. Notes de perception et Ordonnancements

### notes_perception

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Assujetti redevable |
| `numero` | TEXT | NON | UNIQUE | Numéro de la note de perception |
| `date` | DATE | NON | | Date d'émission |
| `acte_generateur` | TEXT | NON | | Acte générateur de la recette |
| `article_budgetaire` | TEXT | OUI | | Article budgétaire |
| `nombre_actes` | INTEGER | NON | DEFAULT 1, CHECK (nombre_actes > 0) | Nombre d'actes concernés |
| `montant` | NUMERIC(18,2) | NON | CHECK (montant >= 0) | Montant dû |
| `devise` | currency_type | NON | | Devise (`CDF` ou `USD`) |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### ordonnancements

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Assujetti |
| `numero` | TEXT | NON | UNIQUE | Numéro du titre d'ordonnancement |
| `date` | DATE | NON | | Date d'ordonnancement |
| `montant` | NUMERIC(18,2) | NON | CHECK (montant >= 0) | Montant ordonnancé |
| `devise` | currency_type | NON | | Devise (`CDF` ou `USD`) |
| `statut` | TEXT | NON | | Statut (ex: `ORDONNANCE`, `PAYE`) |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 7. Analyses et Recoupements

### analyses

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `bureau_id` | UUID | NON | REFERENCES bureaux(id) ON DELETE RESTRICT | Bureau initiateur |
| `secteur_id` | UUID | OUI | REFERENCES secteurs(id) ON DELETE RESTRICT | Secteur d'activité concerné |
| `auteur_id` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Analyste auteur |
| `date` | DATE | NON | DEFAULT current_date | Date de l'analyse |
| `statut` | TEXT | NON | | Statut de l'analyse |
| `observations` | TEXT | OUI | | Synthèse et observations |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### analyse_assujettis

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `analyse_id` | UUID | NON | REFERENCES analyses(id) ON DELETE CASCADE | Analyse parente |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Assujetti analysé |
| `montant_du` | NUMERIC(18,2) | OUI | CHECK (montant_du >= 0) | Montant total constaté dû |
| `montant_paye` | NUMERIC(18,2) | OUI | CHECK (montant_paye >= 0) | Montant payé |
| `montant_restant` | NUMERIC(18,2) | OUI | CHECK (montant_restant >= 0) | Écart / solde restant |
| `devise` | currency_type | NON | | Devise (`CDF` ou `USD`) |
| `manque_a_gagner` | NUMERIC(18,2) | OUI | CHECK (manque_a_gagner >= 0) | Évaluation du manque à gagner |
| `priorite` | TEXT | OUI | | Niveau de priorité de contrôle |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'ajout |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

*Contrainte d'unicité* : `UNIQUE (analyse_id, assujetti_id)`.

---

## 8. Missions

### missions

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `reference` | TEXT | NON | UNIQUE | Référence (ex: `MIS-2026-000001`) |
| `type_controle` | mission_type | NON | | `SUR_PLACE` ou `SUR_PIECES` |
| `bureau_id` | UUID | NON | REFERENCES bureaux(id) ON DELETE RESTRICT | Bureau compétent |
| `secteur_id` | UUID | OUI | REFERENCES secteurs(id) ON DELETE RESTRICT | Secteur d'activité |
| `created_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Créateur du dossier |
| `statut` | mission_status | NON | DEFAULT 'BROUILLON' | Statut actuel du workflow |
| `motif` | TEXT | OUI | | Justification de la mission |
| `date_creation` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `date_soumission` | TIMESTAMPTZ | OUI | | Date de première soumission |
| `date_approbation`| TIMESTAMPTZ | OUI | | Date d'approbation DG / Chef Section |
| `date_cloture` | TIMESTAMPTZ | OUI | | Date de clôture |
| `date_annulation` | TIMESTAMPTZ | OUI | | Date d'annulation |
| `motif_annulation`| TEXT | OUI | | Motif obligatoire si annulée |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### mission_assujettis

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission concernée |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Assujetti concerné |
| `ordre` | INTEGER | NON | DEFAULT 1 | Ordre de traitement |
| `statut` | TEXT | OUI | | Statut individuel dans la mission |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de rattachement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

*Contrainte d'unicité* : `UNIQUE (mission_id, assujetti_id)`.

---

## 9. Validations hiérarchiques

### mission_validations

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission soumise |
| `type_validation` | validation_type | NON | | Échelon de validation |
| `validateur_id` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Autorité ayant statué |
| `statut` | validation_status | NON | | `APPROUVE`, `REJETE`, `RETOURNE` |
| `motif` | TEXT | OUI | | Motif (obligatoire en cas de rejet) |
| `date_validation` | TIMESTAMPTZ | NON | DEFAULT now() | Date et heure de décision |
| `commentaire` | TEXT | OUI | | Remarques complémentaires |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 10. Ordres de mission (SUR_PLACE)

### ordres_mission

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | UNIQUE REFERENCES missions(id) ON DELETE RESTRICT | Mission SUR_PLACE approuvée DG |
| `reference` | TEXT | NON | UNIQUE | Numéro d'ordre officiel |
| `date_generation` | TIMESTAMPTZ | NON | DEFAULT now() | Date de génération automatique |
| `generated_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Utilisateur système / déclencheur |
| `storage_path` | TEXT | NON | | Chemin dans Supabase Storage privé |
| `version` | INTEGER | NON | DEFAULT 1 | Version du document |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 11. Équipes et Affectations (SUR_PLACE)

### equipes

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission de rattachement |
| `nom` | TEXT | NON | | Désignation de l'équipe |
| `chef_equipe_id` | UUID | NON | REFERENCES agents(id) ON DELETE RESTRICT | Agent désigné chef d'équipe |
| `statut` | equipe_status | NON | DEFAULT 'PROPOSEE' | `PROPOSEE`, `CONFIRMEE`, `ANNULEE` |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de proposition |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de confirmation/mise à jour |

### equipe_agents

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `equipe_id` | UUID | NON | REFERENCES equipes(id) ON DELETE RESTRICT | Équipe |
| `agent_id` | UUID | NON | REFERENCES agents(id) ON DELETE RESTRICT | Agent de terrain |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'affectation |

*Contrainte d'unicité* : `UNIQUE (equipe_id, agent_id)`.

### equipe_assujettis

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `equipe_id` | UUID | NON | REFERENCES equipes(id) ON DELETE RESTRICT | Équipe |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Entreprise à contrôler |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'affectation |

*Contrainte d'unicité* : `UNIQUE (equipe_id, assujetti_id)`.

---

## 12. Contrôles opérationnels

### controles

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique du contrôle |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission parente |
| `equipe_id` | UUID | OUI | REFERENCES equipes(id) ON DELETE RESTRICT | Équipe (OBLIGATOIRE si SUR_PLACE, NULL si SUR_PIECES) |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Entreprise contrôlée |
| `type_controle` | mission_type | NON | | `SUR_PLACE` ou `SUR_PIECES` (doit égaler missions.type_controle) |
| `controleur_responsable_id` | UUID | OUI | REFERENCES profiles(id) ON DELETE RESTRICT | Contrôleur désigné (SUR_PIECES) |
| `date_debut` | DATE | OUI | | Date effective de début |
| `date_fin` | DATE | OUI | | Date effective de fin |
| `statut` | controle_status | NON | DEFAULT 'EN_ATTENTE' | État du contrôle |
| `observations` | TEXT | OUI | | Observations préliminaires |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 13. Autorisations de contrôle sur pièces (SUR_PIECES)

### autorisations_controle_pieces

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | UNIQUE REFERENCES missions(id) ON DELETE RESTRICT | Mission SUR_PIECES approuvée |
| `validation_id` | UUID | NON | REFERENCES mission_validations(id) ON DELETE RESTRICT | Décision du Chef de section |
| `reference` | TEXT | NON | UNIQUE | Référence de l'autorisation |
| `date_generation` | TIMESTAMPTZ | NON | DEFAULT now() | Date de génération automatique |
| `generated_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Utilisateur système / validateur |
| `storage_path` | TEXT | NON | | Chemin dans Supabase Storage privé |
| `version` | INTEGER | NON | DEFAULT 1 | Version du document |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 14. Demandes de renseignements

### demandes_renseignements

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `controle_id` | UUID | NON | REFERENCES controles(id) ON DELETE RESTRICT | Contrôle opérationnel |
| `assujetti_id` | UUID | NON | REFERENCES assujettis(id) ON DELETE RESTRICT | Assujetti destinataire |
| `auteur_id` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Contrôleur demandeur |
| `date_envoi` | DATE | NON | DEFAULT current_date | Date d'émission de la demande |
| `date_limite` | DATE | OUI | | Date limite de réponse accordée |
| `date_reponse` | DATE | OUI | | Date de réception de la réponse |
| `statut` | TEXT | NON | DEFAULT 'EN_ATTENTE' | État (`EN_ATTENTE`, `REPONDU`, `RELANCE`) |
| `contenu` | TEXT | NON | | Détail des pièces/renseignements demandés |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 15. Résultats financiers et Sanctions

### resultats_controle

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `controle_id` | UUID | NON | UNIQUE REFERENCES controles(id) ON DELETE RESTRICT | Contrôle évalué |
| `type_resultat` | resultat_type | NON | | `CHARGEE` ou `DECHARGEE` |
| `montant_du` | NUMERIC(18,2) | OUI | CHECK (montant_du >= 0) | Droits éludés / montant principal |
| `montant_penalites` | NUMERIC(18,2) | OUI | CHECK (montant_penalites >= 0) | Pénalités et majorations |
| `montant_total` | NUMERIC(18,2) | OUI | CHECK (montant_total >= 0) | Total dû (`montant_du + montant_penalites`) |
| `devise` | currency_type | NON | | Devise unique du résultat (`CDF` ou `USD`) |
| `justification` | TEXT | OUI | | Motivation obligatoire si DECHARGEE |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de constatation |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### redressements

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `resultat_id` | UUID | NON | REFERENCES resultats_controle(id) ON DELETE RESTRICT | Résultat chargé |
| `montant` | NUMERIC(18,2) | NON | CHECK (montant >= 0) | Montant du redressement |
| `devise` | currency_type | NON | | Devise (identique au résultat) |
| `motif` | TEXT | NON | | Motif du redressement |
| `statut` | TEXT | OUI | | Statut du redressement |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'établissement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### penalites

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `resultat_id` | UUID | NON | REFERENCES resultats_controle(id) ON DELETE RESTRICT | Résultat chargé |
| `montant` | NUMERIC(18,2) | NON | CHECK (montant >= 0) | Montant de la pénalité |
| `devise` | currency_type | NON | | Devise (identique au résultat) |
| `motif` | TEXT | NON | | Fondement juridique de la sanction |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'application |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### avis_recouvrement

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `resultat_id` | UUID | NON | REFERENCES resultats_controle(id) ON DELETE RESTRICT | Résultat chargé |
| `reference` | TEXT | NON | UNIQUE | Numéro officiel de l'avis |
| `date` | DATE | NON | DEFAULT current_date | Date d'émission |
| `montant` | NUMERIC(18,2) | NON | CHECK (montant >= 0) | Montant total à recouvrer |
| `devise` | currency_type | NON | | Devise |
| `storage_path` | TEXT | OUI | | Chemin du document dans Storage |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### paiements_echelonnes

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `resultat_id` | UUID | NON | REFERENCES resultats_controle(id) ON DELETE RESTRICT | Résultat concerné |
| `montant_total` | NUMERIC(18,2) | NON | CHECK (montant_total >= 0) | Montant de l'échéancier |
| `devise` | currency_type | NON | | Devise |
| `justification` | TEXT | NON | | Justification de l'octroi |
| `statut` | TEXT | OUI | | Statut (`ACCORDE`, `EN_COURS`, `SOLDE`) |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'accord |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 16. Procès-verbaux et Signataires

### proces_verbaux

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission de rattachement |
| `controle_id` | UUID | OUI | REFERENCES controles(id) ON DELETE RESTRICT | Contrôle opérationnel concerné |
| `type` | pv_type | NON | | `ACCORD`, `DESACCORD`, `CARENCE` |
| `date` | DATE | NON | DEFAULT current_date | Date de clôture des opérations |
| `contenu` | TEXT | NON | | Texte et conclusions du PV |
| `created_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Contrôleur / Chef d'équipe rédacteur |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'enregistrement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### pv_signataires

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `proces_verbal_id` | UUID | NON | REFERENCES proces_verbaux(id) ON DELETE RESTRICT | Procès-verbal associé |
| `nom` | TEXT | NON | | Nom complet du signataire |
| `qualite` | TEXT | NON | | Qualité (ex: Chef d'équipe, Représentant) |
| `agent_id` | UUID | OUI | REFERENCES agents(id) ON DELETE RESTRICT | Agent lié si signataire interne |
| `date_signature` | TIMESTAMPTZ | NON | DEFAULT now() | Date et heure de validation/signature |
| `signature_status`| signature_status| NON | DEFAULT 'SIGNE' | Statut de validation |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'enregistrement |

---

## 17. Observations et Rapports

### feuilles_observations

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission concernée |
| `controle_id` | UUID | OUI | REFERENCES controles(id) ON DELETE RESTRICT | Contrôle ayant constaté l'irrégularité |
| `date` | DATE | NON | DEFAULT current_date | Date de rédaction |
| `contenu` | TEXT | NON | | Détail des irrégularités constatées |
| `created_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Rédacteur |
| `date_notification`| DATE | OUI | | Date de notification à l'assujetti |
| `statut` | TEXT | OUI | | Statut (ex: `NOTIFIEE`, `CONTESTEE`, `ACCEPTEE`) |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'établissement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

### rapports_mission

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `mission_id` | UUID | NON | REFERENCES missions(id) ON DELETE RESTRICT | Mission rattachée |
| `auteur_id` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Rédacteur du rapport |
| `date` | DATE | NON | DEFAULT current_date | Date de soumission du rapport |
| `contenu` | TEXT | NON | | Synthèse générale des opérations |
| `statut` | TEXT | OUI | | Statut du rapport |
| `storage_path` | TEXT | OUI | | Emplacement du PDF final dans Storage |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de création |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 18. Gestion Documentaire et Fichiers

### documents

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `document_type` | document_type | NON | | Type de document |
| `entity_type` | TEXT | NON | | Entité liée (`missions`, `controles`, etc.) |
| `entity_id` | UUID | NON | | ID de l'entité liée |
| `nom` | TEXT | NON | | Nom du fichier d'origine |
| `mime_type` | TEXT | NON | | Type MIME (ex: `application/pdf`) |
| `taille` | BIGINT | NON | CHECK (taille > 0) | Taille en octets |
| `storage_path` | TEXT | NON | | Clé d'objet dans Supabase Storage privé |
| `version` | INTEGER | NON | DEFAULT 1, CHECK (version > 0) | Numéro de version |
| `uploaded_by` | UUID | NON | REFERENCES profiles(id) ON DELETE RESTRICT | Utilisateur ayant téléversé |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de téléversement |
| `updated_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date de mise à jour |

---

## 19. Notifications et Audit

### notifications

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | UUID | NON | REFERENCES profiles(id) ON DELETE CASCADE | Destinataire de l'alerte |
| `type` | TEXT | NON | | Catégorie de notification |
| `titre` | TEXT | NON | | Titre court |
| `message` | TEXT | NON | | Corps du message explicatif |
| `entity_type` | TEXT | OUI | | Type d'entité liée |
| `entity_id` | UUID | OUI | | ID d'entité liée |
| `lu` | BOOLEAN | NON | DEFAULT false | État de lecture |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Date d'envoi |

### audit_logs

| Colonne | Type | Nullable | Contraintes | Description |
|---|---|---|---|---|
| `id` | UUID | NON | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `user_id` | UUID | OUI | REFERENCES profiles(id) ON DELETE RESTRICT | Auteur de l'action |
| `action` | TEXT | NON | | Action (`CREATION`, `APPROBATION`, etc.) |
| `entity_type` | TEXT | NON | | Entité modifiée |
| `entity_id` | UUID | NON | | ID de l'entité |
| `old_data` | JSONB | OUI | | État avant modification |
| `new_data` | JSONB | OUI | | État après modification |
| `ip_address` | TEXT | OUI | | Adresse IP cliente |
| `user_agent` | TEXT | OUI | | User Agent du client |
| `created_at` | TIMESTAMPTZ | NON | DEFAULT now() | Horodatage immuable |

---

## 20. Recommandations d'indexation (B-Tree Indexes)

Pour optimiser les performances des requêtes métier, les jointures et l'application des politiques RLS :

1. **Organisation & Profils**
   - `idx_divisions_direction`: `divisions(direction_id)`
   - `idx_bureaux_division`: `bureaux(division_id)`
   - `idx_secteurs_bureau`: `secteurs(bureau_id)`
   - `idx_profiles_bureau`: `profiles(bureau_id)`
   - `idx_profiles_role`: `profiles(role)`
   - `idx_agents_profile`: `agents(profile_id)`

2. **Missions & Validations**
   - `idx_missions_bureau`: `missions(bureau_id)`
   - `idx_missions_secteur`: `missions(secteur_id)`
   - `idx_missions_statut`: `missions(statut)`
   - `idx_missions_type`: `missions(type_controle)`
   - `idx_mission_assujettis_mission`: `mission_assujettis(mission_id)`
   - `idx_mission_assujettis_assujetti`: `mission_assujettis(assujetti_id)`
   - `idx_mission_validations_mission`: `mission_validations(mission_id)`
   - `idx_mission_validations_validateur`: `mission_validations(validateur_id)`

3. **Équipes & Contrôles**
   - `idx_equipes_mission`: `equipes(mission_id)`
   - `idx_equipes_chef`: `equipes(chef_equipe_id)`
   - `idx_equipe_agents_equipe`: `equipe_agents(equipe_id)`
   - `idx_equipe_agents_agent`: `equipe_agents(agent_id)`
   - `idx_equipe_assujettis_equipe`: `equipe_assujettis(equipe_id)`
   - `idx_equipe_assujettis_assujetti`: `equipe_assujettis(assujetti_id)`
   - `idx_controles_mission`: `controles(mission_id)`
   - `idx_controles_equipe`: `controles(equipe_id)`
   - `idx_controles_assujetti`: `controles(assujetti_id)`
   - `idx_controles_responsable`: `controles(controleur_responsable_id)`

4. **Résultats, Documents & Audit**
   - `idx_resultats_controle`: `resultats_controle(controle_id)`
   - `idx_redressements_resultat`: `redressements(resultat_id)`
   - `idx_penalites_resultat`: `penalites(resultat_id)`
   - `idx_documents_entity`: `documents(entity_type, entity_id)`
   - `idx_notifications_user_lu`: `notifications(user_id, lu)`
   - `idx_audit_logs_entity`: `audit_logs(entity_type, entity_id)`
   - `idx_audit_logs_user`: `audit_logs(user_id)`
   - `idx_audit_logs_created_at`: `audit_logs(created_at)`

---

## 21. Synthèse de validation pour la future migration

Le présent modèle relationnel est complet, normalisé en 3NF, strictement typé avec des enums, protégé par des contraintes `CHECK` sur les montants financiers (`NUMERIC(18,2)`), intègre les règles d'intégrité `ON DELETE RESTRICT` et fournit les associations nécessaires pour les deux parcours (`SUR_PLACE` et `SUR_PIECES`).