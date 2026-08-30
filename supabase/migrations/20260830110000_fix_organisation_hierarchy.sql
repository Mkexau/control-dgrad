-- =============================================================================
-- DGRAD CONTROLE - HIERARCHIE ORGANISATIONNELLE DEFINITIVE
-- Suppression de CHEF_SECTION : le Chef de bureau approuve les SUR_PIECES.
-- =============================================================================

BEGIN;

-- Les chefs de division sont rattachés explicitement à leur division. Les autres
-- profils rattachés à un bureau héritent de sa division pour les contrôles de périmètre.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE RESTRICT;

UPDATE profiles p
SET division_id = b.division_id
FROM bureaux b
WHERE p.bureau_id = b.id
  AND p.division_id IS DISTINCT FROM b.division_id;

-- Le seul compte de recette qui portait le rôle supprimé devient chef d'équipe.
-- Ses identifiants Auth ne sont pas modifiés. Un dossier agent est nécessaire à
-- l'affectation ultérieure à une équipe de mission.
UPDATE profiles SET role = 'CHEF_EQUIPE' WHERE role = 'CHEF_SECTION';

INSERT INTO agents (profile_id, matricule, specialite, domaine_competence, actif)
SELECT p.id,
       'REC-CEQ-' || upper(substr(replace(p.id::text, '-', ''), 1, 8)),
       'Contrôle',
       'Chef d''équipe de recette',
       p.actif
FROM profiles p
WHERE p.email = 'chef.section.a@test.local'
  AND NOT EXISTS (SELECT 1 FROM agents a WHERE a.profile_id = p.id);

-- Les politiques et la fonction qui dépendent des anciens enums sont remplacées
-- plus bas par des politiques à périmètre explicite.
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Lecture des profils par permission métier" ON profiles;
DROP POLICY IF EXISTS "Gestion des profils par ADMIN" ON profiles;
DROP POLICY IF EXISTS "Modification de son propre profil" ON profiles;
DROP POLICY IF EXISTS "Lecture des agents par permission métier" ON agents;
DROP POLICY IF EXISTS "Gestion technique des agents par ADMIN" ON agents;
DROP POLICY IF EXISTS "Lecture des missions selon périmètre organisationnel" ON missions;
DROP POLICY IF EXISTS "Création des missions par les Chefs de Bureau et Analystes" ON missions;
DROP POLICY IF EXISTS "Modification des missions en brouillon par le bureau créateur" ON missions;
DROP POLICY IF EXISTS "Lecture des validations" ON mission_validations;
DROP POLICY IF EXISTS "Insertion des validations par les rôles décisionnaires habilités" ON mission_validations;
DROP POLICY IF EXISTS "Lecture des équipes" ON equipes;
DROP POLICY IF EXISTS "Gestion des équipes par Chef de Bureau" ON equipes;
DROP POLICY IF EXISTS "Lecture des agents d'équipe" ON equipe_agents;
DROP POLICY IF EXISTS "Gestion des agents d'équipe par Chef de Bureau" ON equipe_agents;
DROP POLICY IF EXISTS "Lecture des assujettis d'équipe" ON equipe_assujettis;
DROP POLICY IF EXISTS "Gestion des assujettis d'équipe par Chef de Bureau" ON equipe_assujettis;
DROP POLICY IF EXISTS "Lecture des contrôles selon affectation et périmètre" ON controles;
DROP POLICY IF EXISTS "Lecture des controles selon affectation et perimetre securise" ON controles;
DROP POLICY IF EXISTS "Mise à jour des contrôles par le Chef d'équipe ou Contrôleur assigné" ON controles;
DROP POLICY IF EXISTS "Lecture des assujettis selon périmètre strict" ON assujettis;
DROP POLICY IF EXISTS "Gestion des assujettis par bureau compétent" ON assujettis;
DROP POLICY IF EXISTS "Lecture des analyses selon périmètre strict" ON analyses;
DROP POLICY IF EXISTS "Gestion des analyses par auteur ou chef du bureau" ON analyses;
DROP POLICY IF EXISTS "Lecture des assujettis d'analyse selon analyse autorisée" ON analyse_assujettis;
DROP POLICY IF EXISTS "Gestion des assujettis d'analyse par bureau compétent" ON analyse_assujettis;
DROP POLICY IF EXISTS "Lecture des recoupements selon assujetti autorisé" ON notes_perception;
DROP POLICY IF EXISTS "Gestion des notes par bureau compétent" ON notes_perception;
DROP POLICY IF EXISTS "Lecture des ordonnancements selon assujetti autorisé" ON ordonnancements;
DROP POLICY IF EXISTS "Gestion des ordonnancements par bureau compétent" ON ordonnancements;
DROP POLICY IF EXISTS "Lecture des demandes de renseignements selon affectation" ON demandes_renseignements;
DROP POLICY IF EXISTS "Creation des demandes avec delai reglementaire" ON demandes_renseignements;
DROP POLICY IF EXISTS "Transition des demandes par controleur designe" ON demandes_renseignements;
DROP POLICY IF EXISTS "Lecture des audits des demandes par controleur designe" ON audit_logs;

DROP FUNCTION IF EXISTS can_access_assujetti(UUID);

-- Les valeurs enum historiques restent techniquement présentes pour préserver
-- les dépendances PostgreSQL existantes, mais aucun profil, workflow, écran ou
-- politique ne les utilise désormais.
ALTER TYPE mission_status ADD VALUE IF NOT EXISTS 'EXAMEN_CHEF_BUREAU' BEFORE 'APPROUVEE';

ALTER TYPE validation_type RENAME VALUE 'CHEF_SECTION' TO 'CHEF_BUREAU';

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS app_role LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role app_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE auth_user_id = auth.uid();
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION auth_user_division_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.division_id, b.division_id)
  FROM profiles p LEFT JOIN bureaux b ON b.id = p.bureau_id
  WHERE p.auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION can_access_bureau(target_bureau_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM bureaux b
    WHERE b.id = target_bureau_id AND (
      auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES')
      OR (auth_user_role() = 'CHEF_DIVISION' AND b.division_id = auth_user_division_id())
      OR (auth_user_role() IN ('CHEF_BUREAU', 'ANALYSTE', 'CONSULTATION') AND b.id = auth_user_bureau_id())
    )
  )
$$;

CREATE OR REPLACE FUNCTION can_access_mission(target_mission_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = target_mission_id AND (
      can_access_bureau(m.bureau_id)
      OR (auth_user_role() = 'CHEF_EQUIPE' AND EXISTS (
        SELECT 1 FROM equipes e WHERE e.mission_id = m.id AND e.chef_equipe_id = auth_user_agent_id()
      ))
      OR (auth_user_role() = 'CONTROLEUR' AND EXISTS (
        SELECT 1 FROM controles c WHERE c.mission_id = m.id AND c.controleur_responsable_id = auth_user_profile_id()
      ))
    )
  )
$$;

CREATE OR REPLACE FUNCTION can_access_equipe(target_equipe_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM equipes e
    WHERE e.id = target_equipe_id AND (
      can_access_mission(e.mission_id)
      OR (auth_user_role() = 'CHEF_EQUIPE' AND e.chef_equipe_id = auth_user_agent_id())
      OR (auth_user_role() = 'CONTROLEUR' AND EXISTS (
        SELECT 1 FROM equipe_agents ea WHERE ea.equipe_id = e.id AND ea.agent_id = auth_user_agent_id()
      ))
    )
  )
$$;

CREATE OR REPLACE FUNCTION can_access_assujetti(target_assujetti_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM assujettis a
    LEFT JOIN secteurs s ON s.id = a.secteur_principal_id
    WHERE a.id = target_assujetti_id AND (
      can_access_bureau(s.bureau_id)
      OR (auth_user_role() = 'CHEF_EQUIPE' AND EXISTS (
        SELECT 1 FROM equipe_assujettis ea JOIN equipes e ON e.id = ea.equipe_id
        WHERE ea.assujetti_id = a.id AND e.chef_equipe_id = auth_user_agent_id()
      ))
      OR (auth_user_role() = 'CONTROLEUR' AND EXISTS (
        SELECT 1 FROM controles c WHERE c.assujetti_id = a.id AND c.controleur_responsable_id = auth_user_profile_id()
      ))
    )
  )
$$;

CREATE OR REPLACE FUNCTION can_access_controle(target_controle_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM controles c
    WHERE c.id = target_controle_id AND (
      can_access_mission(c.mission_id)
      OR (auth_user_role() = 'CHEF_EQUIPE' AND c.equipe_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM equipes e WHERE e.id = c.equipe_id AND e.chef_equipe_id = auth_user_agent_id()
      ))
      OR (auth_user_role() = 'CONTROLEUR' AND c.controleur_responsable_id = auth_user_profile_id())
    )
  )
$$;

GRANT EXECUTE ON FUNCTION auth_user_role(), auth_user_division_id(), can_access_bureau(UUID),
  can_access_mission(UUID), can_access_equipe(UUID), can_access_assujetti(UUID), can_access_controle(UUID)
TO authenticated, service_role;

-- Profils et organisation : ADMIN gère les comptes et référentiels, mais ne
-- reçoit aucun accès implicite aux données de missions, contrôles ou assujettis.
CREATE POLICY "profiles_select_hierarchie" ON profiles FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid() OR auth_user_role() = 'ADMIN'
  OR (auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'))
  OR (auth_user_role() = 'CHEF_DIVISION' AND division_id = auth_user_division_id())
  OR (auth_user_role() = 'CHEF_BUREAU' AND bureau_id = auth_user_bureau_id())
);
CREATE POLICY "profiles_admin_manage" ON profiles FOR ALL TO authenticated
  USING (auth_user_role() = 'ADMIN') WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "profiles_update_own_safe" ON profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "agents_select_hierarchie" ON agents FOR SELECT TO authenticated USING (
  profile_id = auth_user_profile_id() OR auth_user_role() = 'ADMIN'
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = agents.profile_id AND (
    auth_user_role() IN ('DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES')
    OR (auth_user_role() = 'CHEF_DIVISION' AND p.division_id = auth_user_division_id())
    OR (auth_user_role() = 'CHEF_BUREAU' AND p.bureau_id = auth_user_bureau_id())
  ))
);
CREATE POLICY "agents_admin_manage" ON agents FOR ALL TO authenticated
  USING (auth_user_role() = 'ADMIN') WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "directions_authenticated_read" ON directions FOR SELECT TO authenticated USING (auth_user_role() IS NOT NULL);
CREATE POLICY "divisions_authenticated_read" ON divisions FOR SELECT TO authenticated USING (auth_user_role() IS NOT NULL);
CREATE POLICY "bureaux_authenticated_read" ON bureaux FOR SELECT TO authenticated USING (auth_user_role() IS NOT NULL);
CREATE POLICY "secteurs_authenticated_read" ON secteurs FOR SELECT TO authenticated USING (auth_user_role() IS NOT NULL);

-- Assujettis, recoupements et analyses restent strictement filtrés par bureau,
-- division ou affectation opérationnelle.
CREATE POLICY "assujettis_select_scope" ON assujettis FOR SELECT TO authenticated USING (can_access_assujetti(id));
CREATE POLICY "assujettis_manage_own_bureau" ON assujettis FOR ALL TO authenticated
  USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND EXISTS (SELECT 1 FROM secteurs s WHERE s.id = secteur_principal_id AND s.bureau_id = auth_user_bureau_id()))
  WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND EXISTS (SELECT 1 FROM secteurs s WHERE s.id = secteur_principal_id AND s.bureau_id = auth_user_bureau_id()));
CREATE POLICY "notes_select_scope" ON notes_perception FOR SELECT TO authenticated USING (can_access_assujetti(assujetti_id));
CREATE POLICY "notes_manage_own_bureau" ON notes_perception FOR ALL TO authenticated
  USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND can_access_assujetti(assujetti_id))
  WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND can_access_assujetti(assujetti_id));
CREATE POLICY "ordonnancements_select_scope" ON ordonnancements FOR SELECT TO authenticated USING (can_access_assujetti(assujetti_id));
CREATE POLICY "ordonnancements_manage_own_bureau" ON ordonnancements FOR ALL TO authenticated
  USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND can_access_assujetti(assujetti_id))
  WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND can_access_assujetti(assujetti_id));
CREATE POLICY "analyses_select_scope" ON analyses FOR SELECT TO authenticated USING (can_access_bureau(bureau_id));
CREATE POLICY "analyses_manage_own_bureau" ON analyses FOR ALL TO authenticated
  USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id())
  WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id() AND auteur_id = auth_user_profile_id());
CREATE POLICY "analyse_assujettis_select_scope" ON analyse_assujettis FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM analyses a WHERE a.id = analyse_id AND can_access_bureau(a.bureau_id)));

-- Missions, équipes et contrôles : aucune politique USING (true), ni ancien
-- accès global ADMIN. Les chefs de division sont limités à leur division.
CREATE POLICY "missions_select_scope" ON missions FOR SELECT TO authenticated USING (can_access_mission(id));
CREATE POLICY "missions_create_own_bureau" ON missions FOR INSERT TO authenticated WITH CHECK (
  auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id() AND created_by = auth_user_profile_id()
);
CREATE POLICY "missions_update_draft_own_bureau" ON missions FOR UPDATE TO authenticated
  USING (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id() AND statut = 'BROUILLON')
  WITH CHECK (auth_user_role() IN ('ANALYSTE', 'CHEF_BUREAU') AND bureau_id = auth_user_bureau_id());
CREATE POLICY "mission_validations_select_scope" ON mission_validations FOR SELECT TO authenticated
  USING (can_access_mission(mission_id));
CREATE POLICY "mission_validations_insert_authority" ON mission_validations FOR INSERT TO authenticated WITH CHECK (
  (type_validation = 'CHEF_DIVISION' AND auth_user_role() = 'CHEF_DIVISION')
  OR (type_validation = 'DIRECTEUR_CONTROLES' AND auth_user_role() = 'DIRECTEUR_CONTROLES')
  OR (type_validation = 'DG' AND auth_user_role() = 'DIRECTEUR_GENERAL')
  OR (type_validation = 'CHEF_BUREAU' AND auth_user_role() = 'CHEF_BUREAU' AND EXISTS (
    SELECT 1 FROM missions m WHERE m.id = mission_id AND m.bureau_id = auth_user_bureau_id()
  ))
);
CREATE POLICY "equipes_select_scope" ON equipes FOR SELECT TO authenticated USING (can_access_equipe(id));
CREATE POLICY "equipes_manage_own_bureau" ON equipes FOR ALL TO authenticated
  USING (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.bureau_id = auth_user_bureau_id()))
  WITH CHECK (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_id AND m.bureau_id = auth_user_bureau_id()));
CREATE POLICY "equipe_agents_select_scope" ON equipe_agents FOR SELECT TO authenticated USING (can_access_equipe(equipe_id));
CREATE POLICY "equipe_agents_manage_own_bureau" ON equipe_agents FOR ALL TO authenticated
  USING (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM equipes e JOIN missions m ON m.id = e.mission_id WHERE e.id = equipe_id AND m.bureau_id = auth_user_bureau_id()))
  WITH CHECK (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM equipes e JOIN missions m ON m.id = e.mission_id WHERE e.id = equipe_id AND m.bureau_id = auth_user_bureau_id()));
CREATE POLICY "equipe_assujettis_select_scope" ON equipe_assujettis FOR SELECT TO authenticated USING (can_access_equipe(equipe_id));
CREATE POLICY "equipe_assujettis_manage_own_bureau" ON equipe_assujettis FOR ALL TO authenticated
  USING (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM equipes e JOIN missions m ON m.id = e.mission_id WHERE e.id = equipe_id AND m.bureau_id = auth_user_bureau_id()))
  WITH CHECK (auth_user_role() = 'CHEF_BUREAU' AND EXISTS (SELECT 1 FROM equipes e JOIN missions m ON m.id = e.mission_id WHERE e.id = equipe_id AND m.bureau_id = auth_user_bureau_id()));
CREATE POLICY "controles_select_scope" ON controles FOR SELECT TO authenticated USING (can_access_controle(id));
CREATE POLICY "controles_update_assignment" ON controles FOR UPDATE TO authenticated
  USING ((auth_user_role() = 'CONTROLEUR' AND controleur_responsable_id = auth_user_profile_id()) OR (auth_user_role() = 'CHEF_EQUIPE' AND equipe_id IN (SELECT id FROM equipes WHERE chef_equipe_id = auth_user_agent_id())))
  WITH CHECK ((auth_user_role() = 'CONTROLEUR' AND controleur_responsable_id = auth_user_profile_id()) OR (auth_user_role() = 'CHEF_EQUIPE' AND equipe_id IN (SELECT id FROM equipes WHERE chef_equipe_id = auth_user_agent_id())));

COMMIT;
