-- Migration séparée : PostgreSQL impose que la nouvelle valeur soit validée
-- avant son emploi dans les politiques RLS de la migration suivante.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'SERVICE_ASSIETTE';
