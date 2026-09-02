-- =============================================================================
-- DGRAD CONTROLE - BUREAU ANALYSE & RECOUPEMENT TRANSVERSAL SANS SECTEURS
--
-- Règle métier :
-- Le Bureau Analyse et Recoupement (BUR_ANA_REC) et la Division Recoupement
-- sont transversaux et n'ont PAS de secteur d'activité propre.
-- Les secteurs d'activité sont rattachés UNIQUEMENT aux 6 bureaux de contrôle.
-- =============================================================================

BEGIN;

-- 1. Détachement du secteur pour les agents de la Division Recoupement
UPDATE agents
SET secteur_id = NULL
WHERE bureau_id IN (
    SELECT id FROM bureaux WHERE code IN ('BUR_ANA_REC', 'BUR_DOC') OR type = 'RECOUPEMENT'
);

-- 2. Suppression des faux secteurs d'analyse et documentation
DELETE FROM secteurs
WHERE code LIKE 'ANA_%'
   OR code LIKE 'DOC_%'
   OR bureau_id IN (
       SELECT id FROM bureaux WHERE code IN ('BUR_ANA_REC', 'BUR_DOC') OR type = 'RECOUPEMENT'
   );

-- 3. Trigger garantissant qu'aucun secteur ne peut être rattaché à un bureau autre que CONTROLE
CREATE OR REPLACE FUNCTION check_secteur_bureau_type()
RETURNS TRIGGER AS $$
DECLARE
    b_type TEXT;
BEGIN
    SELECT type INTO b_type FROM bureaux WHERE id = NEW.bureau_id;
    IF b_type IS NULL OR b_type <> 'CONTROLE' THEN
        RAISE EXCEPTION 'Un secteur d''activité ne peut être rattaché qu''à un bureau de contrôle (type = CONTROLE).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_secteur_bureau_type ON secteurs;
CREATE TRIGGER trg_check_secteur_bureau_type
BEFORE INSERT OR UPDATE ON secteurs
FOR EACH ROW
EXECUTE FUNCTION check_secteur_bureau_type();

COMMIT;
