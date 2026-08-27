-- =============================================================================
-- DGRAD CONTROLE - DURCISSEMENT RLS DES DEMANDES DE RENSEIGNEMENTS
-- Les mutations sont exclusivement réservées au contrôleur SUR_PIECES désigné.
-- =============================================================================

DROP POLICY IF EXISTS "Lecture des demandes de renseignements" ON demandes_renseignements;
DROP POLICY IF EXISTS "Gestion des demandes de renseignements par contrôleur ou chef de bureau" ON demandes_renseignements;

CREATE POLICY "Lecture des demandes de renseignements selon affectation"
ON demandes_renseignements FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.auth_user_id = auth.uid()
          AND p.actif = true
    )
    AND EXISTS (
        SELECT 1
        FROM controles c
        JOIN missions m ON m.id = c.mission_id
        WHERE c.id = demandes_renseignements.controle_id
          AND c.type_controle = 'SUR_PIECES'
          AND (
              c.controleur_responsable_id = auth_user_profile_id()
              OR auth_user_role() = 'DIRECTEUR_GENERAL'
              OR (
                  auth_user_role() IN ('CHEF_BUREAU', 'CHEF_SECTION', 'ANALYSTE', 'CONSULTATION')
                  AND m.bureau_id = auth_user_bureau_id()
              )
          )
    )
);

CREATE POLICY "Creation des demandes par controleur designe"
ON demandes_renseignements FOR INSERT TO authenticated WITH CHECK (
    auteur_id = auth_user_profile_id()
    AND auth_user_role() = 'CONTROLEUR'
    AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.auth_user_id = auth.uid()
          AND p.actif = true
          AND p.bureau_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1
        FROM controles c
        JOIN missions m ON m.id = c.mission_id
        WHERE c.id = demandes_renseignements.controle_id
          AND c.assujetti_id = demandes_renseignements.assujetti_id
          AND c.type_controle = 'SUR_PIECES'
          AND c.statut IN ('EN_ATTENTE', 'EN_COURS')
          AND c.controleur_responsable_id = auth_user_profile_id()
          AND m.bureau_id = auth_user_bureau_id()
    )
);

CREATE POLICY "Mise a jour des demandes par controleur designe"
ON demandes_renseignements FOR UPDATE TO authenticated
USING (
    auth_user_role() = 'CONTROLEUR'
    AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.auth_user_id = auth.uid() AND p.actif = true
    )
    AND EXISTS (
        SELECT 1
        FROM controles c
        JOIN missions m ON m.id = c.mission_id
        WHERE c.id = demandes_renseignements.controle_id
          AND c.type_controle = 'SUR_PIECES'
          AND c.statut IN ('EN_ATTENTE', 'EN_COURS')
          AND c.controleur_responsable_id = auth_user_profile_id()
          AND m.bureau_id = auth_user_bureau_id()
    )
)
WITH CHECK (
    auth_user_role() = 'CONTROLEUR'
    AND EXISTS (
        SELECT 1
        FROM controles c
        JOIN missions m ON m.id = c.mission_id
        WHERE c.id = demandes_renseignements.controle_id
          AND c.type_controle = 'SUR_PIECES'
          AND c.statut IN ('EN_ATTENTE', 'EN_COURS')
          AND c.controleur_responsable_id = auth_user_profile_id()
          AND m.bureau_id = auth_user_bureau_id()
    )
);

CREATE POLICY "Lecture des audits des demandes par controleur designe"
ON audit_logs FOR SELECT TO authenticated USING (
    entity_type = 'demandes_renseignements'
    AND auth_user_role() = 'CONTROLEUR'
    AND EXISTS (
        SELECT 1
        FROM demandes_renseignements dr
        JOIN controles c ON c.id = dr.controle_id
        WHERE dr.id = audit_logs.entity_id
          AND c.type_controle = 'SUR_PIECES'
          AND c.controleur_responsable_id = auth_user_profile_id()
    )
);

-- La policy initiale autorisait ADMIN à lire tous les contrôles. ADMIN est un
-- rôle technique : l'accès métier reste soumis à la même affectation/périmètre.
DROP POLICY IF EXISTS "Lecture des contrôles selon affectation et périmètre" ON controles;

CREATE POLICY "Lecture des controles selon affectation et perimetre securise"
ON controles FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid() AND p.actif = true
    )
    AND (
        controleur_responsable_id = auth_user_profile_id()
        OR equipe_id IN (
            SELECT eq.id FROM equipes eq
            JOIN equipe_agents ea ON ea.equipe_id = eq.id
            WHERE ea.agent_id = auth_user_agent_id()
               OR eq.chef_equipe_id = auth_user_agent_id()
        )
        OR auth_user_role() = 'DIRECTEUR_GENERAL'
        OR (
            auth_user_role() IN ('CHEF_BUREAU', 'CHEF_SECTION', 'ANALYSTE', 'CONSULTATION')
            AND mission_id IN (
                SELECT m.id FROM missions m WHERE m.bureau_id = auth_user_bureau_id()
            )
        )
        OR (
            auth_user_role() IN ('CHEF_DIVISION', 'DIRECTEUR_CONTROLES')
            AND mission_id IN (
                SELECT m.id
                FROM missions m
                JOIN bureaux bureau_mission ON bureau_mission.id = m.bureau_id
                JOIN bureaux bureau_utilisateur ON bureau_utilisateur.id = auth_user_bureau_id()
                WHERE bureau_mission.division_id = bureau_utilisateur.division_id
            )
        )
    )
);
