-- =============================================================================
-- DGRAD CONTROLE - MIGRATION CORRECTIVE : PRIVILÈGES DE TABLES POSTGRESQL
-- Version: 20260828_143000
-- Description: Rétablir les privilèges d'accès aux tables pour les rôles Supabase
--              (authenticated, service_role, anon) sans modifier les politiques RLS.
-- =============================================================================

BEGIN;

-- 1. Accorder l'usage du schéma public aux rôles Supabase
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Accorder les privilèges de manipulation sur les tables existantes
-- Le rôle service_role (utilisé par createAdminClient) bénéficie des pleins privilèges de table
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;

-- Le rôle authenticated (utilisé par createClient) bénéficie des privilèges DML standards
-- L'accès réel ligne par ligne reste strictement contrôlé et filtré par les politiques RLS existantes
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Le rôle anon dispose du droit de lecture pour les tables non protégées par RLS
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Accorder les privilèges sur les séquences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. Accorder l'exécution sur toutes les fonctions et routines
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

-- 5. Configurer les privilèges par défaut pour les futures tables et objets créés
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, authenticated, service_role;

COMMIT;
