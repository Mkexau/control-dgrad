-- =============================================================================
-- DGRAD CONTROLE - MODULE DE CONTRÔLE DES DONNÉES D'ORDONNANCEMENT
-- Table de vérification des données d'ordonnancement par les Bureaux de Contrôle
-- =============================================================================

BEGIN;

-- 1. TABLE : verifications_ordonnancement
CREATE TABLE IF NOT EXISTS verifications_ordonnancement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiche_ordonnancement_id UUID NOT NULL REFERENCES fiches_ordonnancement(id) ON DELETE RESTRICT UNIQUE,
    assujetti_id UUID NOT NULL REFERENCES assujettis(id) ON DELETE RESTRICT,
    bureau_id UUID NOT NULL REFERENCES bureaux(id) ON DELETE RESTRICT,
    secteur_id UUID NOT NULL REFERENCES secteurs(id) ON DELETE RESTRICT,
    statut_note TEXT NOT NULL CHECK (statut_note IN ('RETROUVEE', 'ABSENTE', 'A_VERIFIER')),
    numero_note_verifie TEXT,
    montant_paye_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_paye_cdf >= 0),
    montant_paye_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_paye_usd >= 0),
    date_paiement DATE,
    date_echeance DATE,
    jours_retard INTEGER NOT NULL DEFAULT 0 CHECK (jours_retard >= 0),
    statut_paiement TEXT NOT NULL DEFAULT 'A_VERIFIER' CHECK (statut_paiement IN ('CONFORME', 'DEBITEUR', 'NOTE_ABSENTE', 'PAIEMENT_RETARD', 'NON_DECLARE')),
    reste_du_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (reste_du_cdf >= 0),
    reste_du_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (reste_du_usd >= 0),
    penalite_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (penalite_cdf >= 0),
    penalite_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (penalite_usd >= 0),
    total_du_cdf NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_du_cdf >= 0),
    total_du_usd NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_du_usd >= 0),
    observations TEXT,
    verifie_par UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    date_verification TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_verif_ord_fiche ON verifications_ordonnancement(fiche_ordonnancement_id);
CREATE INDEX IF NOT EXISTS idx_verif_ord_assujetti ON verifications_ordonnancement(assujetti_id);
CREATE INDEX IF NOT EXISTS idx_verif_ord_bureau ON verifications_ordonnancement(bureau_id);
CREATE INDEX IF NOT EXISTS idx_verif_ord_secteur ON verifications_ordonnancement(secteur_id);
CREATE INDEX IF NOT EXISTS idx_verif_ord_statut_note ON verifications_ordonnancement(statut_note);
CREATE INDEX IF NOT EXISTS idx_verif_ord_statut_paiement ON verifications_ordonnancement(statut_paiement);

-- 2. POLITIQUES RLS
ALTER TABLE verifications_ordonnancement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des vérifications selon périmètre" ON verifications_ordonnancement;
DROP POLICY IF EXISTS "Gestion des vérifications par Bureau de Contrôle" ON verifications_ordonnancement;

-- Lecture : Les agents du bureau de contrôle compétent ou hiérarchie globale
CREATE POLICY "Lecture des vérifications selon périmètre"
ON verifications_ordonnancement FOR SELECT TO authenticated
USING (
    can_access_bureau(bureau_id)
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.actif = true
        AND (
            p.role IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CONSULTATION')
            OR p.bureau_id = verifications_ordonnancement.bureau_id
        )
    )
);

-- Écriture / Modification : Réservé aux agents du Bureau de Contrôle compétent (CHEF_BUREAU, ANALYSTE)
CREATE POLICY "Gestion des vérifications par Bureau de Contrôle"
ON verifications_ordonnancement FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.actif = true
        AND p.role IN ('CHEF_BUREAU', 'ANALYSTE')
        AND p.bureau_id = verifications_ordonnancement.bureau_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.actif = true
        AND p.role IN ('CHEF_BUREAU', 'ANALYSTE')
        AND p.bureau_id = verifications_ordonnancement.bureau_id
    )
);

GRANT SELECT, INSERT, UPDATE ON verifications_ordonnancement TO authenticated;
GRANT ALL ON verifications_ordonnancement TO service_role;

COMMIT;
