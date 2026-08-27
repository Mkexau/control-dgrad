-- =============================================================================
-- DGRAD CONTROLE - POLITIQUES RLS : DEMANDES DE RENSEIGNEMENTS (SUR_PIECES)
-- =============================================================================

CREATE POLICY "Lecture des demandes de renseignements"
ON demandes_renseignements FOR SELECT TO authenticated USING (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CHEF_SECTION', 'ADMIN') OR
    auteur_id = auth_user_profile_id() OR
    controle_id IN (
        SELECT c.id FROM controles c
        WHERE c.controleur_responsable_id = auth_user_profile_id()
           OR c.mission_id IN (SELECT m.id FROM missions m WHERE m.bureau_id = auth_user_bureau_id())
    )
);

CREATE POLICY "Gestion des demandes de renseignements par contrôleur ou chef de bureau"
ON demandes_renseignements FOR ALL TO authenticated USING (
    auth_user_role() IN ('CHEF_BUREAU', 'CHEF_SECTION', 'CONTROLEUR') AND
    (
        auteur_id = auth_user_profile_id() OR
        controle_id IN (
            SELECT c.id FROM controles c
            WHERE c.controleur_responsable_id = auth_user_profile_id()
               OR c.mission_id IN (SELECT m.id FROM missions m WHERE m.bureau_id = auth_user_bureau_id())
        )
    )
);
