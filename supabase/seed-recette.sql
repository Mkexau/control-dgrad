-- =============================================================================
-- DGRAD CONTROLE - JEU DE RECETTE SERVICE D'ASSIETTE
-- Les arrivées externes sont distinctes des fiches d'ordonnancement.
-- =============================================================================

BEGIN;

-- Huit assujettis officiels déjà connus, pour tester l'association explicite.
INSERT INTO assujettis (type, identifiant, nom_raison_sociale, adresse, secteur_principal_id, actif)
SELECT 'PERSONNE_MORALE', v.nif, v.nom, 'Donnée fictive de recette', s.id, true
FROM (VALUES
  ('REC-ASS-2026-001', 'Société Télécom Express SARL', 'ADM1_TELECOMMUNICATIONS'),
  ('REC-ASS-2026-002', 'Société Minière du Congo Test SARL', 'SSOL_MINES'),
  ('REC-ASS-2026-003', 'Concession Foncière Horizon SA', 'SOL_FONCIER'),
  ('REC-ASS-2026-004', 'Agro Congo Test SARL', 'ADM2_AGRICULTURE'),
  ('REC-ASS-2026-005', 'Transport National Test SARL', 'ADM1_TRANSPORTS'),
  ('REC-ASS-2026-006', 'Hydrocarbures Congo Test SARL', 'SSOL_HYDROCARBURES'),
  ('REC-ASS-2026-007', 'Société Carrières Test SARL', 'SSOL_CARRIERES'),
  ('REC-ASS-2026-008', 'Industrie Nationale Test SA', 'ADM2_INDUSTRIE')
) AS v(nif, nom, secteur_code)
JOIN secteurs s ON s.code = v.secteur_code
ON CONFLICT (identifiant) DO NOTHING;

-- Vingt arrivées de recette. Les huit premières sont déjà connues; les autres
-- sont volontairement non associées et sans données d'ordonnancement.
INSERT INTO informations_recues (
  numero_reference, source_externe, date_reception, secteur_code, secteur_id,
  nom_assujetti_declare, identifiant_assujetti_declare, forme_juridique,
  adresse_declaree, assujetti_id, statut
)
SELECT
  'REC-2026-ASS-' || lpad(v.numero::text, 3, '0'),
  'SERVICE_ASSIETTE', DATE '2026-08-01' + (v.numero - 1), v.secteur_code, s.id,
  v.nom_declare, 'REC-ASS-2026-' || lpad(v.numero::text, 3, '0'), 'SARL',
  'Adresse fictive de recette ' || v.numero,
  CASE WHEN v.numero <= 8 THEN (SELECT a.id FROM assujettis a WHERE a.identifiant = 'REC-ASS-2026-' || lpad(v.numero::text, 3, '0')) ELSE NULL END,
  'A_TRAITER'
FROM (VALUES
  (1, 'Société Télécom Express SARL', 'ADM1_TELECOMMUNICATIONS'), (2, 'Société Minière du Congo Test SARL', 'SSOL_MINES'),
  (3, 'Concession Foncière Horizon SA', 'SOL_FONCIER'), (4, 'Agro Congo Test Sarl', 'ADM2_AGRICULTURE'),
  (5, 'Transport National Test SARL', 'ADM1_TRANSPORTS'), (6, 'Hydrocarbures Congo Test SARL', 'SSOL_HYDROCARBURES'),
  (7, 'Société Carrières Test SARL', 'SSOL_CARRIERES'), (8, 'Industrie Nationale Test SA', 'ADM2_INDUSTRIE'),
  (9, 'Commerce Général Test SARL', 'ADM2_COMMERCE'), (10, 'Société Tourisme Congo Test', 'ADM2_TOURISME'),
  (11, 'Société Navigation Test', 'ADM1_NAVIGATION'), (12, 'Société Communication Test', 'ADM1_COMMUNICATION'),
  (13, 'Société Aviation Test', 'ADM1_AVIATION'), (14, 'Société Environnement Test', 'ADM2_ENVIRONNEMENT'),
  (15, 'Société Santé Test', 'ADM3_SANTE'), (16, 'Société Enseignement Test', 'ADM3_ENSEIGNEMENT'),
  (17, 'Société Pêche Élevage Test', 'ADM2_PECHE_ELEVAGE'), (18, 'Société Recherche Minière Test', 'SSOL_RECHERCHE_MINIERE'),
  (19, 'Société Participations État Test', 'RJP_PARTICIPATIONS_ETAT'), (20, 'Société Tribunaux Commerce Test', 'RJP_TRIBUNAUX_COMMERCE')
) AS v(numero, nom_declare, secteur_code)
JOIN secteurs s ON s.code = v.secteur_code
ON CONFLICT (numero_reference) DO NOTHING;

COMMIT;
