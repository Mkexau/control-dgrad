-- Flux définitif : le Service d'assiette enregistre directement les assujettis.
-- Les suppressions sont limitées aux données de recette réinitialisées
-- explicitement ; elles ne touchent ni aux comptes ni au référentiel DGRAD.

ALTER TABLE assujettis
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS numero_rccm TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS commune TEXT,
  ADD COLUMN IF NOT EXISTS activite_principale TEXT,
  ADD COLUMN IF NOT EXISTS date_creation DATE,
  ADD COLUMN IF NOT EXISTS cree_par_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assujettis_numero_rccm_unique
  ON assujettis (numero_rccm) WHERE numero_rccm IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS assujettis_nif_sequence START WITH 1;
CREATE OR REPLACE FUNCTION next_assujetti_nif() RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'NIF-' || lpad(nextval('assujettis_nif_sequence')::text, 6, '0')
$$;
ALTER TABLE assujettis ALTER COLUMN identifiant SET DEFAULT next_assujetti_nif();

-- Ordre FK vérifié : vérifications → fiches → liaisons → assujettis.
DELETE FROM verifications_ordonnancement;
DELETE FROM fiches_ordonnancement;
DELETE FROM demandes_renseignements;
DELETE FROM controles;
DELETE FROM equipe_assujettis;
DELETE FROM mission_assujettis;
DELETE FROM analyse_assujettis;
DELETE FROM notes_perception;
DELETE FROM ordonnancements;
DELETE FROM informations_recues;
DELETE FROM assujettis;
ALTER SEQUENCE assujettis_nif_sequence RESTART WITH 1;

CREATE POLICY "assujettis_service_assiette_read" ON assujettis FOR SELECT TO authenticated
USING (auth_user_role() = 'SERVICE_ASSIETTE');
CREATE POLICY "assujettis_service_assiette_manage" ON assujettis FOR INSERT TO authenticated
WITH CHECK (auth_user_role() = 'SERVICE_ASSIETTE' AND cree_par_id = auth_user_profile_id());
CREATE POLICY "assujettis_service_assiette_update" ON assujettis FOR UPDATE TO authenticated
USING (auth_user_role() = 'SERVICE_ASSIETTE') WITH CHECK (auth_user_role() = 'SERVICE_ASSIETTE');

GRANT USAGE, SELECT ON SEQUENCE assujettis_nif_sequence TO authenticated;
