-- =============================================================================
-- DGRAD CONTROLE - MIGRATION CORRECTIVE : RÉSOUDRE RÉCURSION CROISÉE MISSIONS / CONTRÔLES
-- Version: 20260828_150000
-- Description: Éliminer la dépendance circulaire RLS entre missions et controles
--              en utilisant des fonctions de résolution d'identifiants SECURITY DEFINER.
-- =============================================================================

BEGIN;

-- 1. Fonctions de résolution sans cycle RLS
CREATE OR REPLACE FUNCTION get_mission_ids_for_controleur(p_profile_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.mission_id FROM controles c
    WHERE c.controleur_responsable_id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_mission_ids_for_bureau(p_bureau_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT m.id FROM missions m
    WHERE m.bureau_id = p_bureau_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_mission_ids_for_controleur(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_mission_ids_for_bureau(UUID) TO authenticated, service_role;

-- 2. Recréer la politique de lecture sur missions
DROP POLICY IF EXISTS "Lecture des missions selon périmètre organisationnel" ON missions;

CREATE POLICY "Lecture des missions selon périmètre organisationnel"
ON missions FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN', 'CONSULTATION') OR
    bureau_id = auth_user_bureau_id() OR
    id IN (
        SELECT eq.mission_id FROM equipes eq
        JOIN equipe_agents ea ON ea.equipe_id = eq.id
        WHERE ea.agent_id = auth_user_agent_id() OR eq.chef_equipe_id = auth_user_agent_id()
    ) OR
    id IN (
        SELECT get_mission_ids_for_controleur(auth_user_profile_id())
    )
);

-- 3. Recréer la politique de lecture sur controles
DROP POLICY IF EXISTS "Lecture des contrôles selon affectation et périmètre" ON controles;

CREATE POLICY "Lecture des contrôles selon affectation et périmètre"
ON controles FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN') OR
    controleur_responsable_id = auth_user_profile_id() OR
    equipe_id IN (
        SELECT eq.id FROM equipes eq
        JOIN equipe_agents ea ON ea.equipe_id = eq.id
        WHERE ea.agent_id = auth_user_agent_id() OR eq.chef_equipe_id = auth_user_agent_id()
    ) OR
    mission_id IN (
        SELECT get_mission_ids_for_bureau(auth_user_bureau_id())
    )
);

COMMIT;
