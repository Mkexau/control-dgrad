-- =============================================================================
-- DGRAD CONTROLE - JEU DE RECETTE SERVICE D'ASSIETTE
-- Les arrivées externes sont distinctes des fiches d'ordonnancement.
-- =============================================================================

BEGIN;

-- Huit assujettis officiels déjà connus, pour tester l'association explicite.
INSERT INTO assujettis (type, identifiant, nom_raison_sociale, adresse, secteur_principal_id, actif)
SELECT 'PERSONNE_MORALE', v.nif, v.nom, 'Donnée fictive de recette', s.id, true
FROM (VALUES
  ('REC-ASS-2026-001', 'Congo Télécommunications Services SARL', 'ADM1_TELECOMMUNICATIONS'),
  ('REC-ASS-2026-002', 'Kivu Ressources Minières SA', 'SSOL_MINES'),
  ('REC-ASS-2026-003', 'Horizon Concessions Foncières SARL', 'SOL_FONCIER'),
  ('REC-ASS-2026-004', 'Agro-Panier RDC SARL', 'ADM2_AGRICULTURE'),
  ('REC-ASS-2026-005', 'TransCongo Logistique SA', 'ADM1_TRANSPORTS'),
  ('REC-ASS-2026-006', 'Congo Hydrocarbures Services SARL', 'SSOL_HYDROCARBURES'),
  ('REC-ASS-2026-007', 'Carrières du Kongo SARL', 'SSOL_CARRIERES'),
  ('REC-ASS-2026-008', 'Industries Métallurgiques du Congo SA', 'ADM2_INDUSTRIE')
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
  v.nom_declare, 'REC-ASS-2026-' || lpad(v.numero::text, 3, '0'), v.forme,
  'Adresse fictive de recette ' || v.numero,
  CASE WHEN v.numero <= 8 THEN (SELECT a.id FROM assujettis a WHERE a.identifiant = 'REC-ASS-2026-' || lpad(v.numero::text, 3, '0')) ELSE NULL END,
  'A_TRAITER'
FROM (VALUES
  (1, 'Congo Télécommunications Services SARL', 'ADM1_TELECOMMUNICATIONS', 'SARL'),
  (2, 'Kivu Ressources Minières SA', 'SSOL_MINES', 'SA'),
  (3, 'Horizon Concessions Foncières SARL', 'SOL_FONCIER', 'SARL'),
  (4, 'Agro-Panier RDC SARL', 'ADM2_AGRICULTURE', 'SARL'),
  (5, 'TransCongo Logistique SA', 'ADM1_TRANSPORTS', 'SA'),
  (6, 'Congo Hydrocarbures Services SARL', 'SSOL_HYDROCARBURES', 'SARL'),
  (7, 'Carrières du Kongo SARL', 'SSOL_CARRIERES', 'SARL'),
  (8, 'Industries Métallurgiques du Congo SA', 'ADM2_INDUSTRIE', 'SA'),
  (9, 'Grand Marché Commercial SARL', 'ADM2_COMMERCE', 'SARL'),
  (10, 'Congo Tourisme & Loisirs SARL', 'ADM2_TOURISME', 'SARL'),
  (11, 'Navigation Fluviale du Congo SARL', 'ADM1_NAVIGATION', 'SARL'),
  (12, 'Congo Communication Médias SA', 'ADM1_COMMUNICATION', 'SA'),
  (13, 'Aviation Services Congo SARL', 'ADM1_AVIATION', 'SARL'),
  (14, 'Éco-Environnement Congo SARL', 'ADM2_ENVIRONNEMENT', 'SARL'),
  (15, 'Congo Santé Services SARL', 'ADM3_SANTE', 'SARL'),
  (16, 'Institut Supérieur Horizon SA', 'ADM3_ENSEIGNEMENT', 'SA'),
  (17, 'Pêche et Élevage du Congo SARL', 'ADM2_PECHE_ELEVAGE', 'SARL'),
  (18, 'Centre Congo Recherche Minière SA', 'SSOL_RECHERCHE_MINIERE', 'SA'),
  (19, 'Participations Nationales Congo SA', 'RJP_PARTICIPATIONS_ETAT', 'SA'),
  (20, 'Services Judiciaires et Commerciaux SARL', 'RJP_TRIBUNAUX_COMMERCE', 'SARL')
) AS v(numero, nom_declare, secteur_code, forme)
JOIN secteurs s ON s.code = v.secteur_code
ON CONFLICT (numero_reference) DO NOTHING;

COMMIT;
