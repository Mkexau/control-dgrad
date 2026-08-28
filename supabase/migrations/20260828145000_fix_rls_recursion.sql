-- =============================================================================
-- DGRAD CONTROLE - MIGRATION CORRECTIVE : SÉCURISATION DES FONCTIONS RLS (ANTI-RÉCURSION)
-- Version: 20260828_145000
-- Description: Convertir les fonctions de sécurité RLS en PL/pgSQL avec
--              SECURITY DEFINER et SET search_path = public pour empêcher l'inlining
--              du planificateur PostgreSQL et éviter l'erreur 42P17 (infinite recursion).
-- =============================================================================

BEGIN;

-- 1. auth_user_role : renvoie le rôle de l'utilisateur connecté sans récursion RLS
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role app_role;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE auth_user_id = auth.uid();
    RETURN v_role;
END;
$$;

-- 2. auth_user_bureau_id : renvoie le bureau_id de l'utilisateur connecté sans récursion RLS
CREATE OR REPLACE FUNCTION auth_user_bureau_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bureau_id UUID;
BEGIN
    SELECT bureau_id INTO v_bureau_id FROM profiles WHERE auth_user_id = auth.uid();
    RETURN v_bureau_id;
END;
$$;

-- 3. auth_user_profile_id : renvoie l'id profil de l'utilisateur connecté sans récursion RLS
CREATE OR REPLACE FUNCTION auth_user_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM profiles WHERE auth_user_id = auth.uid();
    RETURN v_id;
END;
$$;

-- 4. auth_user_agent_id : renvoie l'agent_id de l'utilisateur connecté sans récursion RLS
CREATE OR REPLACE FUNCTION auth_user_agent_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agent_id UUID;
BEGIN
    SELECT a.id INTO v_agent_id
    FROM agents a
    JOIN profiles p ON p.id = a.profile_id
    WHERE p.auth_user_id = auth.uid();
    RETURN v_agent_id;
END;
$$;

-- 5. Accorder l'exécution de ces fonctions aux rôles nécessaires
GRANT EXECUTE ON FUNCTION auth_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_user_bureau_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_user_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_user_agent_id() TO authenticated, service_role;

COMMIT;
