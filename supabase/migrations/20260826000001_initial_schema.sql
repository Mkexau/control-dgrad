-- =============================================================================
-- DGRAD CONTROLE - MIGRATION INITIALE POSTGRESQL / SUPABASE
-- Version: 20260826_000001
-- Description: Schéma relationnel complet, enums, contraintes, indexes, RLS, Storage et audit
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. TYPES ENUMÉRÉS (ENUMS)
-- -----------------------------------------------------------------------------
CREATE TYPE app_role AS ENUM (
    'ADMIN',
    'ANALYSTE',
    'CHEF_BUREAU',
    'CHEF_SECTION',
    'CHEF_DIVISION',
    'DIRECTEUR_CONTROLES',
    'DIRECTEUR_GENERAL',
    'CHEF_EQUIPE',
    'CONTROLEUR',
    'CONSULTATION'
);

CREATE TYPE mission_type AS ENUM (
    'SUR_PLACE',
    'SUR_PIECES'
);

CREATE TYPE mission_status AS ENUM (
    'BROUILLON',
    'SOUMISE',
    'EXAMEN_CHEF_DIVISION',
    'EXAMEN_DIRECTEUR_CONTROLES',
    'ATTENTE_DG',
    'DEMANDE_SOUMISE',
    'EXAMEN_CHEF_SECTION',
    'APPROUVEE',
    'REJETEE',
    'ORDRE_MISSION_GENERE',
    'AUTORISATION_GENEREE',
    'CONTROLEUR_DESIGNE',
    'EQUIPES_AFFECTEES',
    'CONTROLE_EN_COURS',
    'CONTROLE_TERMINE',
    'RESULTAT',
    'PROCES_VERBAL',
    'FEUILLE_OBSERVATIONS',
    'RAPPORT',
    'CLOTUREE',
    'ANNULEE'
);

CREATE TYPE validation_type AS ENUM (
    'CHEF_DIVISION',
    'DIRECTEUR_CONTROLES',
    'DG',
    'CHEF_SECTION'
);

CREATE TYPE validation_status AS ENUM (
    'APPROUVE',
    'REJETE',
    'RETOURNE'
);

CREATE TYPE equipe_status AS ENUM (
    'PROPOSEE',
    'CONFIRMEE',
    'ANNULEE'
);

CREATE TYPE controle_status AS ENUM (
    'EN_ATTENTE',
    'EN_COURS',
    'TERMINE',
    'ANNULE'
);

CREATE TYPE resultat_type AS ENUM (
    'CHARGEE',
    'DECHARGEE'
);

CREATE TYPE pv_type AS ENUM (
    'ACCORD',
    'DESACCORD',
    'CARENCE'
);

CREATE TYPE signature_status AS ENUM (
    'EN_ATTENTE',
    'SIGNE',
    'REFUSE'
);

CREATE TYPE currency_type AS ENUM (
    'CDF',
    'USD'
);

CREATE TYPE assujetti_type AS ENUM (
    'PERSONNE_PHYSIQUE',
    'PERSONNE_MORALE'
);

CREATE TYPE document_type AS ENUM (
    'ORDRE_MISSION',
    'AUTORISATION_PIECES',
    'PROCES_VERBAL',
    'FEUILLE_OBSERVATIONS',
    'RAPPORT_MISSION',
    'DEMANDE_RENSEIGNEMENTS',
    'PIECE_JUSTIFICATIVE',
    'AVIS_RECOUVREMENT',
    'AUTRE'
);

-- -----------------------------------------------------------------------------
-- 3. FONCTIONS UTILITAIRES & TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. ORGANISATION ADMINISTRATIVE
-- -----------------------------------------------------------------------------
CREATE TABLE directions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction_id UUID NOT NULL REFERENCES directions(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bureaux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    type TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE secteurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID NOT NULL REFERENCES bureaux(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. UTILISATEURS, PROFILS ET AGENTS
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telephone TEXT,
    bureau_id UUID REFERENCES bureaux(id) ON DELETE RESTRICT,
    role app_role NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,
    matricule TEXT NOT NULL UNIQUE,
    specialite TEXT,
    domaine_competence TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. ASSUJETTIS ET DONNÉES FINANCIÈRES PRÉALABLES
-- -----------------------------------------------------------------------------
CREATE TABLE assujettis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type assujetti_type NOT NULL,
    identifiant TEXT NOT NULL UNIQUE,
    nom_raison_sociale TEXT NOT NULL,
    adresse TEXT,
    email TEXT,
    telephone TEXT,
    secteur_principal_id UUID REFERENCES secteurs(id) ON DELETE RESTRICT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes_perception (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    acte_generateur TEXT NOT NULL,
    article_budgetaire TEXT,
    nombre_actes INTEGER NOT NULL DEFAULT 1 CHECK (nombre_actes > 0),
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise currency_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ordonnancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise currency_type NOT NULL,
    statut TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. ANALYSES ET RECOUPEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID NOT NULL REFERENCES bureaux(id) ON DELETE RESTRICT,
    secteur_id UUID REFERENCES secteurs(id) ON DELETE RESTRICT,
    auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT current_date,
    statut TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analyse_assujettis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analyse_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    montant_du NUMERIC(18,2) CHECK (montant_du >= 0),
    montant_paye NUMERIC(18,2) CHECK (montant_paye >= 0),
    montant_restant NUMERIC(18,2) CHECK (montant_restant >= 0),
    devise currency_type NOT NULL,
    manque_a_gagner NUMERIC(18,2) CHECK (manque_a_gagner >= 0),
    priorite TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (analyse_id, assujetti_id)
);

-- -----------------------------------------------------------------------------
-- 8. MISSIONS ET VALIDATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    type_controle mission_type NOT NULL,
    bureau_id UUID NOT NULL REFERENCES bureaux(id) ON DELETE RESTRICT,
    secteur_id UUID REFERENCES secteurs(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    statut mission_status NOT NULL DEFAULT 'BROUILLON',
    motif TEXT,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_soumission TIMESTAMPTZ,
    date_approbation TIMESTAMPTZ,
    date_cloture TIMESTAMPTZ,
    date_annulation TIMESTAMPTZ,
    motif_annulation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mission_assujettis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    ordre INTEGER NOT NULL DEFAULT 1,
    statut TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mission_id, assujetti_id)
);

CREATE TABLE mission_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    type_validation validation_type NOT NULL,
    validateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    statut validation_status NOT NULL,
    motif TEXT,
    date_validation TIMESTAMPTZ NOT NULL DEFAULT now(),
    commentaire TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ordres_mission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL UNIQUE REFERENCES missions(id) ON DELETE RESTRICT,
    reference TEXT NOT NULL UNIQUE,
    date_generation TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    storage_path TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE autorisations_controle_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL UNIQUE REFERENCES missions(id) ON DELETE RESTRICT,
    validation_id UUID NOT NULL REFERENCES mission_validations(id) ON DELETE RESTRICT,
    reference TEXT NOT NULL UNIQUE,
    date_generation TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    storage_path TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. ÉQUIPES ET AFFECTATIONS (SUR_PLACE)
-- -----------------------------------------------------------------------------
CREATE TABLE equipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    chef_equipe_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    statut equipe_status NOT NULL DEFAULT 'PROPOSEE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE equipe_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (equipe_id, agent_id)
);

CREATE TABLE equipe_assujettis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (equipe_id, assujetti_id)
);

-- -----------------------------------------------------------------------------
-- 10. CONTRÔLES OPÉRATIONNELS ET DEMANDES DE RENSEIGNEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE controles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    equipe_id UUID REFERENCES equipes(id) ON DELETE RESTRICT,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    type_controle mission_type NOT NULL,
    controleur_responsable_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    date_debut DATE,
    date_fin DATE,
    statut controle_status NOT NULL DEFAULT 'EN_ATTENTE',
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_controle_equipe_type CHECK (
        (type_controle = 'SUR_PLACE' AND equipe_id IS NOT NULL) OR
        (type_controle = 'SUR_PIECES' AND equipe_id IS NULL)
    )
);

CREATE TABLE demandes_renseignements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controle_id UUID NOT NULL REFERENCES controles(id) ON DELETE RESTRICT,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    date_envoi DATE NOT NULL DEFAULT current_date,
    date_limite DATE,
    date_reponse DATE,
    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    contenu TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. RÉSULTATS, REDRESSEMENTS, PÉNALITÉS ET RECOUVREMENT
-- -----------------------------------------------------------------------------
CREATE TABLE resultats_controle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controle_id UUID NOT NULL UNIQUE REFERENCES controles(id) ON DELETE RESTRICT,
    type_resultat resultat_type NOT NULL,
    montant_du NUMERIC(18,2) CHECK (montant_du >= 0),
    montant_penalites NUMERIC(18,2) CHECK (montant_penalites >= 0),
    montant_total NUMERIC(18,2) CHECK (montant_total >= 0),
    devise currency_type NOT NULL,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_resultat_total_coherence CHECK (
        montant_total = COALESCE(montant_du, 0) + COALESCE(montant_penalites, 0)
    ),
    CONSTRAINT chk_resultat_dechargee_justification CHECK (
        (type_resultat = 'DECHARGEE' AND justification IS NOT NULL) OR
        (type_resultat = 'CHARGEE')
    )
);

CREATE TABLE redressements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resultat_id UUID NOT NULL REFERENCES resultats_controle(id) ON DELETE RESTRICT,
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise currency_type NOT NULL,
    motif TEXT NOT NULL,
    statut TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE penalites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resultat_id UUID NOT NULL REFERENCES resultats_controle(id) ON DELETE RESTRICT,
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise currency_type NOT NULL,
    motif TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE avis_recouvrement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resultat_id UUID NOT NULL REFERENCES resultats_controle(id) ON DELETE RESTRICT,
    reference TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT current_date,
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise currency_type NOT NULL,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE paiements_echelonnes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resultat_id UUID NOT NULL REFERENCES resultats_controle(id) ON DELETE RESTRICT,
    montant_total NUMERIC(18,2) NOT NULL CHECK (montant_total >= 0),
    devise currency_type NOT NULL,
    justification TEXT NOT NULL,
    statut TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 12. PROCÈS-VERBAUX, OBSERVATIONS ET RAPPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE proces_verbaux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    controle_id UUID REFERENCES controles(id) ON DELETE RESTRICT,
    type pv_type NOT NULL,
    date DATE NOT NULL DEFAULT current_date,
    contenu TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pv_signataires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proces_verbal_id UUID NOT NULL REFERENCES proces_verbaux(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    qualite TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE RESTRICT,
    date_signature TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature_status signature_status NOT NULL DEFAULT 'SIGNE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feuilles_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    controle_id UUID REFERENCES controles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT current_date,
    contenu TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    date_notification DATE,
    statut TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rapports_mission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT current_date,
    contenu TEXT NOT NULL,
    statut TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 13. DOCUMENTS, NOTIFICATIONS ET AUDIT
-- -----------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type document_type NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    nom TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    taille BIGINT NOT NULL CHECK (taille > 0),
    storage_path TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    lu BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 14. TRIGGERS UPDATED_AT
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_directions_updated_at BEFORE UPDATE ON directions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bureaux_updated_at BEFORE UPDATE ON bureaux FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_secteurs_updated_at BEFORE UPDATE ON secteurs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assujettis_updated_at BEFORE UPDATE ON assujettis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notes_perception_updated_at BEFORE UPDATE ON notes_perception FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ordonnancements_updated_at BEFORE UPDATE ON ordonnancements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_analyse_assujettis_updated_at BEFORE UPDATE ON analyse_assujettis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_missions_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_mission_assujettis_updated_at BEFORE UPDATE ON mission_assujettis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_mission_validations_updated_at BEFORE UPDATE ON mission_validations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ordres_mission_updated_at BEFORE UPDATE ON ordres_mission FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_autorisations_controle_pieces_updated_at BEFORE UPDATE ON autorisations_controle_pieces FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_equipes_updated_at BEFORE UPDATE ON equipes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_controles_updated_at BEFORE UPDATE ON controles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_demandes_renseignements_updated_at BEFORE UPDATE ON demandes_renseignements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_resultats_controle_updated_at BEFORE UPDATE ON resultats_controle FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_redressements_updated_at BEFORE UPDATE ON redressements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_penalites_updated_at BEFORE UPDATE ON penalites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_avis_recouvrement_updated_at BEFORE UPDATE ON avis_recouvrement FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_paiements_echelonnes_updated_at BEFORE UPDATE ON paiements_echelonnes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proces_verbaux_updated_at BEFORE UPDATE ON proces_verbaux FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_feuilles_observations_updated_at BEFORE UPDATE ON feuilles_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rapports_mission_updated_at BEFORE UPDATE ON rapports_mission FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 15. INDEXES DE PERFORMANCE ET RLS
-- -----------------------------------------------------------------------------
CREATE INDEX idx_divisions_direction ON divisions(direction_id);
CREATE INDEX idx_bureaux_division ON bureaux(division_id);
CREATE INDEX idx_secteurs_bureau ON secteurs(bureau_id);
CREATE INDEX idx_profiles_bureau ON profiles(bureau_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_agents_profile ON agents(profile_id);

CREATE INDEX idx_assujettis_secteur ON assujettis(secteur_principal_id);
CREATE INDEX idx_notes_perception_assujetti ON notes_perception(assujetti_id);
CREATE INDEX idx_ordonnancements_assujetti ON ordonnancements(assujetti_id);

CREATE INDEX idx_analyses_bureau ON analyses(bureau_id);
CREATE INDEX idx_analyses_secteur ON analyses(secteur_id);
CREATE INDEX idx_analyses_auteur ON analyses(auteur_id);
CREATE INDEX idx_analyse_assujettis_analyse ON analyse_assujettis(analyse_id);
CREATE INDEX idx_analyse_assujettis_assujetti ON analyse_assujettis(assujetti_id);

CREATE INDEX idx_missions_bureau ON missions(bureau_id);
CREATE INDEX idx_missions_secteur ON missions(secteur_id);
CREATE INDEX idx_missions_statut ON missions(statut);
CREATE INDEX idx_missions_type ON missions(type_controle);
CREATE INDEX idx_missions_created_by ON missions(created_by);

CREATE INDEX idx_mission_assujettis_mission ON mission_assujettis(mission_id);
CREATE INDEX idx_mission_assujettis_assujetti ON mission_assujettis(assujetti_id);
CREATE INDEX idx_mission_validations_mission ON mission_validations(mission_id);
CREATE INDEX idx_mission_validations_validateur ON mission_validations(validateur_id);

CREATE INDEX idx_equipes_mission ON equipes(mission_id);
CREATE INDEX idx_equipes_chef ON equipes(chef_equipe_id);
CREATE INDEX idx_equipe_agents_equipe ON equipe_agents(equipe_id);
CREATE INDEX idx_equipe_agents_agent ON equipe_agents(agent_id);
CREATE INDEX idx_equipe_assujettis_equipe ON equipe_assujettis(equipe_id);
CREATE INDEX idx_equipe_assujettis_assujetti ON equipe_assujettis(assujetti_id);

CREATE INDEX idx_controles_mission ON controles(mission_id);
CREATE INDEX idx_controles_equipe ON controles(equipe_id);
CREATE INDEX idx_controles_assujetti ON controles(assujetti_id);
CREATE INDEX idx_controles_responsable ON controles(controleur_responsable_id);
CREATE INDEX idx_demandes_renseignements_controle ON demandes_renseignements(controle_id);

CREATE INDEX idx_resultats_controle_controle ON resultats_controle(controle_id);
CREATE INDEX idx_redressements_resultat ON redressements(resultat_id);
CREATE INDEX idx_penalites_resultat ON penalites(resultat_id);
CREATE INDEX idx_avis_recouvrement_resultat ON avis_recouvrement(resultat_id);
CREATE INDEX idx_paiements_echelonnes_resultat ON paiements_echelonnes(resultat_id);

CREATE INDEX idx_proces_verbaux_mission ON proces_verbaux(mission_id);
CREATE INDEX idx_proces_verbaux_controle ON proces_verbaux(controle_id);
CREATE INDEX idx_pv_signataires_pv ON pv_signataires(proces_verbal_id);
CREATE INDEX idx_feuilles_observations_mission ON feuilles_observations(mission_id);
CREATE INDEX idx_rapports_mission_mission ON rapports_mission(mission_id);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_notifications_user_lu ON notifications(user_id, lu);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- -----------------------------------------------------------------------------
-- 16. FONCTIONS DE SÉCURITÉ POUR RLS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS app_role AS $$
    SELECT role FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_bureau_id()
RETURNS UUID AS $$
    SELECT bureau_id FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_profile_id()
RETURNS UUID AS $$
    SELECT id FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_agent_id()
RETURNS UUID AS $$
    SELECT a.id FROM agents a
    JOIN profiles p ON p.id = a.profile_id
    WHERE p.auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 17. ACTIVATION DU ROW LEVEL SECURITY (RLS) - DENY BY DEFAULT
-- -----------------------------------------------------------------------------
ALTER TABLE directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE secteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assujettis ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_perception ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordonnancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyse_assujettis ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_assujettis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordres_mission ENABLE ROW LEVEL SECURITY;
ALTER TABLE autorisations_controle_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe_assujettis ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_renseignements ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_controle ENABLE ROW LEVEL SECURITY;
ALTER TABLE redressements ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalites ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis_recouvrement ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements_echelonnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proces_verbaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_signataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE feuilles_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_mission ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 18. POLITIQUES RLS DE BASE
-- -----------------------------------------------------------------------------

-- --- Référentiels d'organisation ---
CREATE POLICY "Lecture de l'organisation pour les utilisateurs authentifiés"
ON directions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture des divisions pour les utilisateurs authentifiés"
ON divisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture des bureaux pour les utilisateurs authentifiés"
ON bureaux FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture des secteurs pour les utilisateurs authentifiés"
ON secteurs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion technique des référentiels par ADMIN"
ON directions FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

CREATE POLICY "Gestion technique des divisions par ADMIN"
ON divisions FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

CREATE POLICY "Gestion technique des bureaux par ADMIN"
ON bureaux FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

CREATE POLICY "Gestion technique des secteurs par ADMIN"
ON secteurs FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

-- --- Profils & Agents (Moindre privilège & cloisonnement strict) ---
CREATE POLICY "Lecture des profils par permission métier"
ON profiles FOR SELECT TO authenticated USING (
    -- Un utilisateur peut toujours lire son propre profil
    auth_user_id = auth.uid() OR
    -- La hiérarchie globale et l'administrateur technique
    auth_user_role() IN ('ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION') OR
    -- Le Chef de bureau et le Chef de section pour les profils de leur bureau
    (auth_user_role() IN ('CHEF_BUREAU', 'CHEF_SECTION') AND bureau_id = auth_user_bureau_id()) OR
    -- Les Chefs d'équipe et Contrôleurs pour les membres associés à leurs équipes/missions
    (auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR') AND id IN (
        SELECT p2.id FROM profiles p2
        JOIN agents a ON a.profile_id = p2.id
        JOIN equipe_agents ea ON ea.agent_id = a.id
        JOIN equipes eq ON eq.id = ea.equipe_id
        WHERE eq.mission_id IN (
            SELECT eq2.mission_id FROM equipes eq2
            JOIN equipe_agents ea2 ON ea2.equipe_id = eq2.id
            WHERE ea2.agent_id = auth_user_agent_id() OR eq2.chef_equipe_id = auth_user_agent_id()
        )
    ))
);

CREATE POLICY "Gestion des profils par ADMIN"
ON profiles FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

CREATE POLICY "Modification de son propre profil"
ON profiles FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

CREATE POLICY "Lecture des agents par permission métier"
ON agents FOR SELECT TO authenticated USING (
    -- Un agent peut toujours lire son propre dossier agent
    profile_id = auth_user_profile_id() OR
    -- La hiérarchie globale et l'administrateur technique
    auth_user_role() IN ('ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION') OR
    -- Le Chef de bureau pour les agents de son bureau
    (auth_user_role() = 'CHEF_BUREAU' AND profile_id IN (
        SELECT p.id FROM profiles p WHERE p.bureau_id = auth_user_bureau_id()
    )) OR
    -- Le Chef d'équipe pour les agents de son équipe
    (auth_user_role() = 'CHEF_EQUIPE' AND id IN (
        SELECT ea.agent_id FROM equipe_agents ea
        JOIN equipes eq ON eq.id = ea.equipe_id
        WHERE eq.chef_equipe_id = auth_user_agent_id()
    )) OR
    -- Le Contrôleur pour les agents de sa mission
    (auth_user_role() = 'CONTROLEUR' AND id IN (
        SELECT ea.agent_id FROM equipe_agents ea
        JOIN equipes eq ON eq.id = ea.equipe_id
        WHERE eq.mission_id IN (
            SELECT eq2.mission_id FROM equipes eq2
            JOIN equipe_agents ea2 ON ea2.equipe_id = eq2.id
            WHERE ea2.agent_id = auth_user_agent_id()
        )
    ))
);

CREATE POLICY "Gestion technique des agents par ADMIN"
ON agents FOR ALL TO authenticated USING (auth_user_role() = 'ADMIN');

-- --- Assujettis ---
CREATE POLICY "Lecture des assujettis selon périmètre"
ON assujettis FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN') OR
    (auth_user_role() IN ('CHEF_BUREAU', 'ANALYSTE') AND secteur_principal_id IN (
        SELECT s.id FROM secteurs s WHERE s.bureau_id = auth_user_bureau_id()
    )) OR
    (auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR', 'CHEF_SECTION', 'CONSULTATION'))
);

CREATE POLICY "Gestion des assujettis par Analystes et Chefs de Bureau"
ON assujettis FOR ALL TO authenticated USING (
    auth_user_role() IN ('ADMIN', 'ANALYSTE', 'CHEF_BUREAU')
);

-- --- Notes de perception & Ordonnancements ---
CREATE POLICY "Lecture des notes de perception"
ON notes_perception FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des notes de perception par Analystes et Chefs de Bureau"
ON notes_perception FOR ALL TO authenticated USING (
    auth_user_role() IN ('ADMIN', 'ANALYSTE', 'CHEF_BUREAU')
);

CREATE POLICY "Lecture des ordonnancements"
ON ordonnancements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des ordonnancements par Analystes et Chefs de Bureau"
ON ordonnancements FOR ALL TO authenticated USING (
    auth_user_role() IN ('ADMIN', 'ANALYSTE', 'CHEF_BUREAU')
);

-- --- Analyses ---
CREATE POLICY "Lecture des analyses selon périmètre"
ON analyses FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN') OR
    bureau_id = auth_user_bureau_id()
);

CREATE POLICY "Création et modification des analyses par Analystes et Chefs de Bureau"
ON analyses FOR ALL TO authenticated USING (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id()
);

CREATE POLICY "Lecture des assujettis d'analyse"
ON analyse_assujettis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des assujettis d'analyse"
ON analyse_assujettis FOR ALL TO authenticated USING (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
);

-- --- Missions ---
CREATE POLICY "Lecture des missions selon périmètre organisationnel"
ON missions FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN', 'CONSULTATION') OR
    bureau_id = auth_user_bureau_id() OR
    id IN (
        SELECT eq.mission_id FROM equipes eq
        JOIN equipe_agents ea ON ea.equipe_id = eq.id
        WHERE ea.agent_id = auth_user_agent_id() OR eq.chef_equipe_id = auth_user_agent_id()
    ) OR
    id IN (
        SELECT c.mission_id FROM controles c
        WHERE c.controleur_responsable_id = auth_user_profile_id()
    )
);

CREATE POLICY "Création des missions par les Chefs de Bureau et Analystes"
ON missions FOR INSERT TO authenticated WITH CHECK (
    auth_user_role() IN ('CHEF_BUREAU', 'ANALYSTE') AND bureau_id = auth_user_bureau_id()
);

CREATE POLICY "Modification des missions en brouillon par le bureau créateur"
ON missions FOR UPDATE TO authenticated USING (
    bureau_id = auth_user_bureau_id() AND statut = 'BROUILLON'
);

-- --- Validations ---
CREATE POLICY "Lecture des validations"
ON mission_validations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insertion des validations par les rôles décisionnaires habilités"
ON mission_validations FOR INSERT TO authenticated WITH CHECK (
    (type_validation = 'CHEF_DIVISION' AND auth_user_role() = 'CHEF_DIVISION') OR
    (type_validation = 'DIRECTEUR_CONTROLES' AND auth_user_role() = 'DIRECTEUR_CONTROLES') OR
    (type_validation = 'DG' AND auth_user_role() = 'DIRECTEUR_GENERAL') OR
    (type_validation = 'CHEF_SECTION' AND auth_user_role() = 'CHEF_SECTION')
);

-- --- Ordres de mission & Autorisations sur pièces ---
CREATE POLICY "Lecture des ordres de mission"
ON ordres_mission FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture des autorisations sur pièces"
ON autorisations_controle_pieces FOR SELECT TO authenticated USING (true);

-- --- Équipes & Affectations ---
CREATE POLICY "Lecture des équipes"
ON equipes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des équipes par Chef de Bureau"
ON equipes FOR ALL TO authenticated USING (
    auth_user_role() = 'CHEF_BUREAU'
);

CREATE POLICY "Lecture des agents d'équipe"
ON equipe_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des agents d'équipe par Chef de Bureau"
ON equipe_agents FOR ALL TO authenticated USING (
    auth_user_role() = 'CHEF_BUREAU'
);

CREATE POLICY "Lecture des assujettis d'équipe"
ON equipe_assujettis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des assujettis d'équipe par Chef de Bureau"
ON equipe_assujettis FOR ALL TO authenticated USING (
    auth_user_role() = 'CHEF_BUREAU'
);

-- --- Contrôles ---
CREATE POLICY "Lecture des contrôles selon affectation et périmètre"
ON controles FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN') OR
    controleur_responsable_id = auth_user_profile_id() OR
    equipe_id IN (
        SELECT eq.id FROM equipes eq
        JOIN equipe_agents ea ON ea.equipe_id = eq.id
        WHERE ea.agent_id = auth_user_agent_id() OR eq.chef_equipe_id = auth_user_agent_id()
    ) OR
    mission_id IN (SELECT m.id FROM missions m WHERE m.bureau_id = auth_user_bureau_id())
);

CREATE POLICY "Mise à jour des contrôles par le Chef d'équipe ou Contrôleur assigné"
ON controles FOR UPDATE TO authenticated USING (
    controleur_responsable_id = auth_user_profile_id() OR
    equipe_id IN (
        SELECT eq.id FROM equipes eq WHERE eq.chef_equipe_id = auth_user_agent_id()
    )
);

-- --- Résultats & Sanctions ---
CREATE POLICY "Lecture des résultats de contrôle"
ON resultats_controle FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des résultats par Chef d'équipe ou Contrôleur"
ON resultats_controle FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR')
);

CREATE POLICY "Lecture des redressements et pénalités"
ON redressements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des redressements"
ON redressements FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR')
);

CREATE POLICY "Lecture des penalites"
ON penalites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des penalites"
ON penalites FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR')
);

CREATE POLICY "Lecture avis de recouvrement et paiements echelonnes"
ON avis_recouvrement FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture paiements echelonnes"
ON paiements_echelonnes FOR SELECT TO authenticated USING (true);

-- --- Procès-verbaux & Feuilles d'observations ---
CREATE POLICY "Lecture des procès-verbaux"
ON proces_verbaux FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des PV par Chef d'équipe ou Contrôleur"
ON proces_verbaux FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR')
);

CREATE POLICY "Lecture des signataires de PV"
ON pv_signataires FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture des feuilles d'observations"
ON feuilles_observations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion des feuilles d'observations par Chef d'équipe ou Contrôleur"
ON feuilles_observations FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_EQUIPE', 'CONTROLEUR')
);

CREATE POLICY "Lecture des rapports de mission"
ON rapports_mission FOR SELECT TO authenticated USING (true);

-- --- Documents ---
CREATE POLICY "Lecture des métadonnées de documents"
ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Téléversement de documents par les utilisateurs habilités"
ON documents FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth_user_profile_id()
);

-- --- Notifications & Audit ---
CREATE POLICY "Lecture de ses propres notifications"
ON notifications FOR SELECT TO authenticated USING (
    user_id = auth_user_profile_id()
);

CREATE POLICY "Mise à jour de lecture de ses notifications"
ON notifications FOR UPDATE TO authenticated USING (
    user_id = auth_user_profile_id()
);

CREATE POLICY "Lecture des logs d'audit par la hiérarchie et ADMIN"
ON audit_logs FOR SELECT TO authenticated USING (
    auth_user_role() IN ('ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES')
);

CREATE POLICY "Insertion des logs d'audit pour les utilisateurs authentifiés"
ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;
