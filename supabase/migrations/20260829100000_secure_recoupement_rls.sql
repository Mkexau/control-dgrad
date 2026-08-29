-- =============================================================================
-- Étape 13 : cloisonnement RLS des assujettis, recoupements et analyses
-- =============================================================================

BEGIN;

-- Les politiques initiales autorisaient trop largement les lectures et les
-- écritures. Cette migration les remplace sans modifier ni supprimer de données.
DROP POLICY IF EXISTS "Lecture des assujettis selon périmètre" ON assujettis;
DROP POLICY IF EXISTS "Gestion des assujettis par Analystes et Chefs de Bureau" ON assujettis;
DROP POLICY IF EXISTS "Lecture des notes de perception" ON notes_perception;
DROP POLICY IF EXISTS "Gestion des notes de perception par Analystes et Chefs de Bureau" ON notes_perception;
DROP POLICY IF EXISTS "Lecture des ordonnancements" ON ordonnancements;
DROP POLICY IF EXISTS "Gestion des ordonnancements par Analystes et Chefs de Bureau" ON ordonnancements;
DROP POLICY IF EXISTS "Lecture des analyses selon périmètre" ON analyses;
DROP POLICY IF EXISTS "Création et modification des analyses par Analystes et Chefs de Bureau" ON analyses;
DROP POLICY IF EXISTS "Lecture des assujettis d'analyse" ON analyse_assujettis;
DROP POLICY IF EXISTS "Gestion des assujettis d'analyse" ON analyse_assujettis;

CREATE OR REPLACE FUNCTION can_access_assujetti(target_assujetti_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM assujettis a
    LEFT JOIN secteurs s ON s.id = a.secteur_principal_id
    WHERE a.id = target_assujetti_id
      AND (
        auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CONSULTATION')
        OR (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU', 'CHEF_SECTION') AND s.bureau_id = auth_user_bureau_id())
        OR (auth_user_role() = 'CHEF_EQUIPE' AND EXISTS (
          SELECT 1 FROM equipe_assujettis ea
          JOIN equipes e ON e.id = ea.equipe_id
          WHERE ea.assujetti_id = a.id AND e.chef_equipe_id = auth_user_agent_id()
        ))
        OR (auth_user_role() = 'CONTROLEUR' AND EXISTS (
          SELECT 1 FROM controles c
          WHERE c.assujetti_id = a.id AND c.controleur_responsable_id = auth_user_profile_id()
        ))
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Lecture des assujettis selon périmètre strict"
ON assujettis FOR SELECT TO authenticated
USING (can_access_assujetti(id));

CREATE POLICY "Gestion des assujettis par bureau compétent"
ON assujettis FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND secteur_principal_id IN (SELECT id FROM secteurs WHERE bureau_id = auth_user_bureau_id())
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND secteur_principal_id IN (SELECT id FROM secteurs WHERE bureau_id = auth_user_bureau_id())
);

CREATE POLICY "Lecture des recoupements selon assujetti autorisé"
ON notes_perception FOR SELECT TO authenticated
USING (can_access_assujetti(assujetti_id));

CREATE POLICY "Gestion des notes par bureau compétent"
ON notes_perception FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
);

CREATE POLICY "Lecture des ordonnancements selon assujetti autorisé"
ON ordonnancements FOR SELECT TO authenticated
USING (can_access_assujetti(assujetti_id));

CREATE POLICY "Gestion des ordonnancements par bureau compétent"
ON ordonnancements FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
);

CREATE POLICY "Lecture des analyses selon périmètre strict"
ON analyses FOR SELECT TO authenticated
USING (
  auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CONSULTATION')
  OR bureau_id = auth_user_bureau_id()
);

CREATE POLICY "Gestion des analyses par auteur ou chef du bureau"
ON analyses FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND bureau_id = auth_user_bureau_id()
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND bureau_id = auth_user_bureau_id()
  AND auteur_id = auth_user_profile_id()
);

CREATE POLICY "Lecture des assujettis d'analyse selon analyse autorisée"
ON analyse_assujettis FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM analyses a WHERE a.id = analyse_id));

CREATE POLICY "Gestion des assujettis d'analyse par bureau compétent"
ON analyse_assujettis FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM analyses a
    WHERE a.id = analyse_id
      AND a.bureau_id = auth_user_bureau_id()
      AND auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM analyses a
    JOIN assujettis s ON s.id = assujetti_id
    WHERE a.id = analyse_id
      AND a.bureau_id = auth_user_bureau_id()
      AND a.secteur_id = s.secteur_principal_id
      AND auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  )
);

COMMIT;
