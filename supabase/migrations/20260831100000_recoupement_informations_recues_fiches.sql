-- =============================================================================
-- DGRAD CONTROLE - RECOUPEMENT, INFORMATIONS DU SERVICE D'ASSIETTE & FICHES D'ORDONNANCEMENT
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TABLE : informations_recues (Simulation source externe Service d'assiette)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS informations_recues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_reference TEXT NOT NULL UNIQUE,
    source_externe TEXT NOT NULL DEFAULT 'SERVICE_ASSIETTE',
    date_reception DATE NOT NULL DEFAULT CURRENT_DATE,
    secteur_code TEXT NOT NULL,
    secteur_id UUID REFERENCES secteurs(id) ON DELETE RESTRICT,
    numero_serie TEXT NOT NULL,
    delai_traitement_jours INTEGER NOT NULL CHECK (delai_traitement_jours > 0),
    numero_note_perception TEXT NOT NULL,
    date_note_perception DATE NOT NULL,
    nom_assujetti_declare TEXT NOT NULL,
    identifiant_assujetti_declare TEXT NOT NULL,
    assujetti_id UUID REFERENCES assujettis(id) ON DELETE SET NULL,
    acte_generateur TEXT NOT NULL,
    article_budgetaire TEXT,
    nombre_actes INTEGER NOT NULL DEFAULT 1 CHECK (nombre_actes > 0),
    montant_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_cdf >= 0),
    montant_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_usd >= 0),
    statut TEXT NOT NULL DEFAULT 'A_TRAITER' CHECK (statut IN ('A_TRAITER', 'EN_COURS', 'TRAITE', 'REJETE')),
    observations TEXT,
    traite_par UUID REFERENCES profiles(id) ON DELETE SET NULL,
    date_traitement TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inf_rec_statut ON informations_recues(statut);
CREATE INDEX IF NOT EXISTS idx_inf_rec_secteur ON informations_recues(secteur_id);
CREATE INDEX IF NOT EXISTS idx_inf_rec_assujetti ON informations_recues(assujetti_id);
CREATE INDEX IF NOT EXISTS idx_inf_rec_date ON informations_recues(date_reception DESC);

-- -----------------------------------------------------------------------------
-- 2. TABLE : fiches_ordonnancement (Fiche d'enregistrement des données d'ordonnancement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiches_ordonnancement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_fiche TEXT NOT NULL UNIQUE,
    information_recue_id UUID REFERENCES informations_recues(id) ON DELETE RESTRICT,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    secteur_id UUID NOT NULL REFERENCES secteurs(id) ON DELETE RESTRICT,
    bureau_id UUID NOT NULL REFERENCES bureaux(id) ON DELETE RESTRICT,
    numero_serie TEXT NOT NULL,
    delai_traitement_jours INTEGER NOT NULL CHECK (delai_traitement_jours > 0),
    numero_note_perception TEXT NOT NULL,
    date_note_perception DATE NOT NULL,
    acte_generateur TEXT NOT NULL,
    article_budgetaire TEXT,
    nombre_actes INTEGER NOT NULL DEFAULT 1 CHECK (nombre_actes > 0),
    montant_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_cdf >= 0),
    montant_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_usd >= 0),
    statut_transmission TEXT NOT NULL DEFAULT 'CONSERVEE_BUREAU' CHECK (statut_transmission IN ('CONSERVEE_BUREAU', 'TRANSMIS_DIVISION_CONTROLE')),
    date_transmission_division TIMESTAMPTZ,
    transmis_par UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiches_ord_assujetti ON fiches_ordonnancement(assujetti_id);
CREATE INDEX IF NOT EXISTS idx_fiches_ord_secteur ON fiches_ordonnancement(secteur_id);
CREATE INDEX IF NOT EXISTS idx_fiches_ord_bureau ON fiches_ordonnancement(bureau_id);
CREATE INDEX IF NOT EXISTS idx_fiches_ord_transmission ON fiches_ordonnancement(statut_transmission);
CREATE INDEX IF NOT EXISTS idx_fiches_ord_date ON fiches_ordonnancement(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. POLITIQUES RLS
-- -----------------------------------------------------------------------------
ALTER TABLE informations_recues ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches_ordonnancement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des informations reçues selon périmètre" ON informations_recues;
DROP POLICY IF EXISTS "Gestion des informations reçues par Bureau Analyse" ON informations_recues;
DROP POLICY IF EXISTS "Lecture des fiches d'ordonnancement selon périmètre" ON fiches_ordonnancement;
DROP POLICY IF EXISTS "Gestion des fiches d'ordonnancement par Bureau Analyse" ON fiches_ordonnancement;

-- Politiques informations_recues
CREATE POLICY "Lecture des informations reçues selon périmètre"
ON informations_recues FOR SELECT TO authenticated
USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION')
    OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    OR auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
);

CREATE POLICY "Gestion des informations reçues par Bureau Analyse"
ON informations_recues FOR ALL TO authenticated
USING (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
    AND (
        auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
        OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    )
)
WITH CHECK (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
    AND (
        auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
        OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    )
);

-- Politiques fiches_ordonnancement
CREATE POLICY "Lecture des fiches d'ordonnancement selon périmètre"
ON fiches_ordonnancement FOR SELECT TO authenticated
USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION')
    OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    OR auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
    OR (
        statut_transmission = 'TRANSMIS_DIVISION_CONTROLE'
        AND (
            auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_CTRL')
            OR auth_user_bureau_id() = bureau_id
        )
    )
);

CREATE POLICY "Gestion des fiches d'ordonnancement par Bureau Analyse"
ON fiches_ordonnancement FOR ALL TO authenticated
USING (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
    AND (
        auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
        OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    )
)
WITH CHECK (
    auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
    AND (
        auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
        OR auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC')
    )
);

-- -----------------------------------------------------------------------------
-- 4. PRIVILÈGES
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON informations_recues TO authenticated;
GRANT SELECT, INSERT, UPDATE ON fiches_ordonnancement TO authenticated;
GRANT ALL ON informations_recues TO service_role;
GRANT ALL ON fiches_ordonnancement TO service_role;

COMMIT;
