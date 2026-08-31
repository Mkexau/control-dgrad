-- =============================================================================
-- DGRAD CONTROLE - MISE A JOUR DES NOMS DE RECETTE (SERVICE D'ASSIETTE & ASSUJETTIS)
-- Garantit que "Assujetti déclaré" et les assujettis affichent des raisons sociales
-- réelles et professionnelles sans modifier les structures ni supprimer de données.
-- =============================================================================

BEGIN;

-- 1. Mise à jour des 8 assujettis officiels de recette
UPDATE assujettis SET nom_raison_sociale = 'Congo Télécommunications Services SARL' WHERE identifiant = 'REC-ASS-2026-001';
UPDATE assujettis SET nom_raison_sociale = 'Kivu Ressources Minières SA' WHERE identifiant = 'REC-ASS-2026-002';
UPDATE assujettis SET nom_raison_sociale = 'Horizon Concessions Foncières SARL' WHERE identifiant = 'REC-ASS-2026-003';
UPDATE assujettis SET nom_raison_sociale = 'Agro-Panier RDC SARL' WHERE identifiant = 'REC-ASS-2026-004';
UPDATE assujettis SET nom_raison_sociale = 'TransCongo Logistique SA' WHERE identifiant = 'REC-ASS-2026-005';
UPDATE assujettis SET nom_raison_sociale = 'Congo Hydrocarbures Services SARL' WHERE identifiant = 'REC-ASS-2026-006';
UPDATE assujettis SET nom_raison_sociale = 'Carrières du Kongo SARL' WHERE identifiant = 'REC-ASS-2026-007';
UPDATE assujettis SET nom_raison_sociale = 'Industries Métallurgiques du Congo SA' WHERE identifiant = 'REC-ASS-2026-008';

-- 2. Mise à jour des 20 arrivées de recette transmises par le Service d'assiette
UPDATE informations_recues SET nom_assujetti_declare = 'Congo Télécommunications Services SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-001';
UPDATE informations_recues SET nom_assujetti_declare = 'Kivu Ressources Minières SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-002';
UPDATE informations_recues SET nom_assujetti_declare = 'Horizon Concessions Foncières SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-003';
UPDATE informations_recues SET nom_assujetti_declare = 'Agro-Panier RDC SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-004';
UPDATE informations_recues SET nom_assujetti_declare = 'TransCongo Logistique SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-005';
UPDATE informations_recues SET nom_assujetti_declare = 'Congo Hydrocarbures Services SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-006';
UPDATE informations_recues SET nom_assujetti_declare = 'Carrières du Kongo SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-007';
UPDATE informations_recues SET nom_assujetti_declare = 'Industries Métallurgiques du Congo SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-008';
UPDATE informations_recues SET nom_assujetti_declare = 'Grand Marché Commercial SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-009';
UPDATE informations_recues SET nom_assujetti_declare = 'Congo Tourisme & Loisirs SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-010';
UPDATE informations_recues SET nom_assujetti_declare = 'Navigation Fluviale du Congo SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-011';
UPDATE informations_recues SET nom_assujetti_declare = 'Congo Communication Médias SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-012';
UPDATE informations_recues SET nom_assujetti_declare = 'Aviation Services Congo SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-013';
UPDATE informations_recues SET nom_assujetti_declare = 'Éco-Environnement Congo SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-014';
UPDATE informations_recues SET nom_assujetti_declare = 'Congo Santé Services SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-015';
UPDATE informations_recues SET nom_assujetti_declare = 'Institut Supérieur Horizon SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-016';
UPDATE informations_recues SET nom_assujetti_declare = 'Pêche et Élevage du Congo SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-017';
UPDATE informations_recues SET nom_assujetti_declare = 'Centre Congo Recherche Minière SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-018';
UPDATE informations_recues SET nom_assujetti_declare = 'Participations Nationales Congo SA', forme_juridique = 'SA' WHERE numero_reference = 'REC-2026-ASS-019';
UPDATE informations_recues SET nom_assujetti_declare = 'Services Judiciaires et Commerciaux SARL', forme_juridique = 'SARL' WHERE numero_reference = 'REC-2026-ASS-020';

COMMIT;
