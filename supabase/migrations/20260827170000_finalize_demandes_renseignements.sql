-- =============================================================================
-- DGRAD CONTROLE - FINALISATION DU CYCLE DES DEMANDES DE RENSEIGNEMENTS
-- La réponse textuelle et les transitions sont conservées dans le dossier.
-- L'historique détaillé des événements reste dans audit_logs.
-- =============================================================================

ALTER TABLE demandes_renseignements
    ADD COLUMN IF NOT EXISTS reponse_contenu TEXT;

-- Les anciennes lignes restent lisibles. Les nouvelles écritures doivent toutefois
-- respecter les données attendues pour chacun des trois statuts existants.
ALTER TABLE demandes_renseignements
    ADD CONSTRAINT chk_demandes_renseignements_statut_reponse
    CHECK (
        (statut IN ('EN_ATTENTE', 'RELANCE') AND date_reponse IS NULL AND reponse_contenu IS NULL)
        OR
        (statut = 'REPONDU' AND date_reponse IS NOT NULL AND length(btrim(reponse_contenu)) > 0)
    ) NOT VALID;

-- QM-015 / RM-050 : le délai de réponse est de 20 jours calendaires.
ALTER TABLE demandes_renseignements
    ADD CONSTRAINT chk_demandes_renseignements_delai_20_jours
    CHECK (date_limite IS NULL OR date_limite = (date_envoi + 20)) NOT VALID;

-- La policy de création précédente ne fixait ni le statut initial ni l'échéance.
DROP POLICY IF EXISTS "Creation des demandes par controleur designe" ON demandes_renseignements;

CREATE POLICY "Creation des demandes avec delai reglementaire"
ON demandes_renseignements FOR INSERT TO authenticated WITH CHECK (
    auteur_id = auth_user_profile_id()
    AND auth_user_role() = 'CONTROLEUR'
    AND statut = 'EN_ATTENTE'
    AND date_reponse IS NULL
    AND reponse_contenu IS NULL
    AND date_limite = (date_envoi + 20)
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

-- Seules les demandes encore ouvertes peuvent transiter vers une réponse ou une relance.
DROP POLICY IF EXISTS "Mise a jour des demandes par controleur designe" ON demandes_renseignements;

CREATE POLICY "Transition des demandes par controleur designe"
ON demandes_renseignements FOR UPDATE TO authenticated
USING (
    statut IN ('EN_ATTENTE', 'RELANCE')
    AND auth_user_role() = 'CONTROLEUR'
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
    statut IN ('REPONDU', 'RELANCE')
    AND auth_user_role() = 'CONTROLEUR'
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
