-- =============================================================================
-- DGRAD CONTROLE - DONNEES MINIMALES DE RECETTE
--
-- Ce seed est idempotent et reutilise les references organisationnelles deja
-- presentes en les resolvant par code. Il ne modifie ni ne supprime de donnee.
-- =============================================================================

BEGIN;

-- Deux bureaux officiels de la Division Controle, pour verifier le cloisonnement.
INSERT INTO bureaux (division_id, code, nom, type, actif)
SELECT id, 'BUR_CTRL_SOL', 'Bureau Contrôle Sol', 'CONTROLE', true
FROM divisions
WHERE code = 'DIV_CTRL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO bureaux (division_id, code, nom, type, actif)
SELECT id, 'BUR_CTRL_SOUS_SOL', 'Bureau Contrôle Sous-sol', 'CONTROLE', true
FROM divisions
WHERE code = 'DIV_CTRL'
ON CONFLICT (code) DO NOTHING;

-- Deux secteurs officiels par bureau, suffisants pour la recette initiale.
INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT id, 'SOL_FONCIER', 'Affaires foncières', true
FROM bureaux
WHERE code = 'BUR_CTRL_SOL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT id, 'SOL_CONCESSIONS', 'Concessions foncières', true
FROM bureaux
WHERE code = 'BUR_CTRL_SOL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT id, 'SSOL_MINES', 'Mines', true
FROM bureaux
WHERE code = 'BUR_CTRL_SOUS_SOL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO secteurs (bureau_id, code, nom, actif)
SELECT id, 'SSOL_HYDROCARBURES', 'Hydrocarbures', true
FROM bureaux
WHERE code = 'BUR_CTRL_SOUS_SOL'
ON CONFLICT (code) DO NOTHING;

COMMIT;
