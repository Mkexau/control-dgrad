-- =============================================================================
-- DGRAD CONTROLE - SEPARATION DES ARRIVEES SERVICE D'ASSIETTE ET DE
-- L'ORDONNANCEMENT. Les donnees de perception restent exclusivement sur la fiche.
-- =============================================================================

BEGIN;

-- Une arrivee externe ne contient que les informations declaratives. Les trois
-- lignes de recette precedentes sont identifiables de maniere explicite; elles
-- ne sont retirees que lorsqu'elles n'ont aucune dependance metier protegee.
DELETE FROM informations_recues i
WHERE i.numero_reference IN ('REC-2026-08-0001', 'REC-2026-08-0002', 'REC-2026-08-0003')
  AND NOT EXISTS (SELECT 1 FROM fiches_ordonnancement f WHERE f.information_recue_id = i.id);

DELETE FROM assujettis a
WHERE a.identifiant IN ('TEST-ASSUJETTI-A-2026', 'TEST-ASSUJETTI-B-2026')
  AND NOT EXISTS (SELECT 1 FROM informations_recues i WHERE i.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM notes_perception n WHERE n.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM ordonnancements o WHERE o.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM analyse_assujettis aa WHERE aa.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM mission_assujettis ma WHERE ma.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM controles c WHERE c.assujetti_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM demandes_renseignements dr WHERE dr.assujetti_id = a.id);

ALTER TABLE informations_recues
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS adresse_declaree TEXT;

-- Colonnes issues de l'ancien modele: elles representent une fiche et non une
-- arrivee. Aucune fiche ne les reference et la migration cible les donnees de
-- recette ci-dessus avant de les retirer.
ALTER TABLE informations_recues
  DROP COLUMN IF EXISTS numero_serie,
  DROP COLUMN IF EXISTS delai_traitement_jours,
  DROP COLUMN IF EXISTS numero_note_perception,
  DROP COLUMN IF EXISTS date_note_perception,
  DROP COLUMN IF EXISTS acte_generateur,
  DROP COLUMN IF EXISTS article_budgetaire,
  DROP COLUMN IF EXISTS nombre_actes,
  DROP COLUMN IF EXISTS montant_cdf,
  DROP COLUMN IF EXISTS montant_usd;

ALTER TABLE informations_recues
  ALTER COLUMN secteur_code DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fiches_ord_information_recue
  ON fiches_ordonnancement(information_recue_id)
  WHERE information_recue_id IS NOT NULL;

DROP POLICY IF EXISTS "Lecture des informations reçues selon périmètre" ON informations_recues;
DROP POLICY IF EXISTS "Gestion des informations reçues par Bureau Analyse" ON informations_recues;
DROP POLICY IF EXISTS "Lecture des fiches d'ordonnancement selon périmètre" ON fiches_ordonnancement;
DROP POLICY IF EXISTS "Gestion des fiches d'ordonnancement par Bureau Analyse" ON fiches_ordonnancement;

CREATE POLICY "Lecture des informations reçues selon périmètre" ON informations_recues FOR SELECT TO authenticated
USING (
  auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION')
  OR auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
  OR (auth_user_role() = 'CHEF_DIVISION' AND auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC'))
);

CREATE POLICY "Gestion des informations reçues par Bureau Analyse" ON informations_recues FOR ALL TO authenticated
USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC'))
WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC'));

CREATE POLICY "Lecture des fiches d'ordonnancement selon périmètre" ON fiches_ordonnancement FOR SELECT TO authenticated
USING (
  auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION')
  OR auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC')
  OR (auth_user_role() = 'CHEF_DIVISION' AND auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_REC'))
  OR (statut_transmission = 'TRANSMIS_DIVISION_CONTROLE' AND (
    auth_user_division_id() = (SELECT id FROM divisions WHERE code = 'DIV_CTRL')
    OR auth_user_bureau_id() = bureau_id
  ))
);

CREATE POLICY "Gestion des fiches d'ordonnancement par Bureau Analyse" ON fiches_ordonnancement FOR ALL TO authenticated
USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC'))
WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND auth_user_bureau_id() = (SELECT id FROM bureaux WHERE code = 'BUR_ANA_REC'));

COMMIT;
