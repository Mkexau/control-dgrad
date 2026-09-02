-- =============================================================================
-- DGRAD CONTROLE - EXTENSION : PÉNALITÉ CONDITIONNELLE
-- Migration : 20260902130000
-- Contexte :
--   La pénalité de 5 % est calculée automatiquement côté serveur,
--   mais elle ne s'applique QUE si l'agent de contrôle la valide explicitement.
--   Les données de la "déclaration" correspondent aux informations
--   déjà présentes dans la fiche d'ordonnancement (issue de BUR_ANA_REC).
-- =============================================================================

BEGIN;

-- PÉNALITÉ CONDITIONNELLE
--   Valeur par défaut = false (ne pas pénaliser sans décision explicite de l'agent).
ALTER TABLE verifications_ordonnancement
  ADD COLUMN IF NOT EXISTS penalite_applicable BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_verif_ord_penalite
    ON verifications_ordonnancement(penalite_applicable)
    WHERE penalite_applicable = true;

COMMENT ON COLUMN verifications_ordonnancement.penalite_applicable
    IS 'Flag indiquant si la pénalité de 5 % du reste dû est applicable, selon la décision explicite de l''agent de contrôle. Ne jamais activer automatiquement.';

COMMIT;
