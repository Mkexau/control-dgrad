-- Le Bureau Analyse et Recoupement gère le répertoire national et les données
-- d'ordonnancement. Les bureaux de contrôle conservent leur périmètre propre.
-- Cette migration ne modifie aucune donnée métier ni aucune transmission.

BEGIN;

CREATE OR REPLACE FUNCTION is_bureau_analyse_recoupement()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_user_bureau_id() = (
    SELECT id
    FROM bureaux
    WHERE code = 'BUR_ANA_REC'
  )
$$;

CREATE OR REPLACE FUNCTION can_access_assujetti(target_assujetti_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM assujettis a
    LEFT JOIN secteurs s ON s.id = a.secteur_principal_id
    WHERE a.id = target_assujetti_id
      AND (
        is_bureau_analyse_recoupement()
        OR can_access_bureau(s.bureau_id)
        OR (auth_user_role() = 'CHEF_EQUIPE' AND EXISTS (
          SELECT 1
          FROM equipe_assujettis ea
          JOIN equipes e ON e.id = ea.equipe_id
          WHERE ea.assujetti_id = a.id
            AND e.chef_equipe_id = auth_user_agent_id()
        ))
        OR (auth_user_role() = 'CONTROLEUR' AND EXISTS (
          SELECT 1
          FROM controles c
          WHERE c.assujetti_id = a.id
            AND c.controleur_responsable_id = auth_user_profile_id()
        ))
      )
  )
$$;

DROP POLICY IF EXISTS "assujettis_manage_own_bureau" ON assujettis;

CREATE POLICY "assujettis_manage_own_bureau" ON assujettis
FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND (
    is_bureau_analyse_recoupement()
    OR EXISTS (
      SELECT 1
      FROM secteurs s
      WHERE s.id = secteur_principal_id
        AND s.bureau_id = auth_user_bureau_id()
    )
  )
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND (
    is_bureau_analyse_recoupement()
    OR EXISTS (
      SELECT 1
      FROM secteurs s
      WHERE s.id = secteur_principal_id
        AND s.bureau_id = auth_user_bureau_id()
    )
  )
);

DROP POLICY IF EXISTS "notes_manage_own_bureau" ON notes_perception;
CREATE POLICY "notes_manage_own_bureau" ON notes_perception
FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
);

DROP POLICY IF EXISTS "ordonnancements_manage_own_bureau" ON ordonnancements;
CREATE POLICY "ordonnancements_manage_own_bureau" ON ordonnancements
FOR ALL TO authenticated
USING (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
)
WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU')
  AND can_access_assujetti(assujetti_id)
);

GRANT EXECUTE ON FUNCTION is_bureau_analyse_recoupement() TO authenticated, service_role;

COMMIT;
