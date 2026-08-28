-- =============================================================================
-- DGRAD CONTROLE - MIGRATION CORRECTIVE : RÉSOUDRE RÉCURSION RLS SUR PROFILES
-- Version: 20260828_145500
-- Description: Supprimer les politiques circulaires sur public.profiles et établir
--              des politiques directes non récursives (auth_user_id = auth.uid()).
-- =============================================================================

BEGIN;

-- 1. Supprimer les anciennes politiques récursives sur profiles
DROP POLICY IF EXISTS "Lecture des profils par permission métier" ON profiles;
DROP POLICY IF EXISTS "Gestion des profils par ADMIN" ON profiles;
DROP POLICY IF EXISTS "Modification de son propre profil" ON profiles;

-- 2. Recréer des politiques RLS simples et strictes sur profiles sans appel circulaire
-- Tout utilisateur authentifié peut lire son propre profil
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Tout utilisateur authentifié peut mettre à jour son propre profil
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

COMMIT;
