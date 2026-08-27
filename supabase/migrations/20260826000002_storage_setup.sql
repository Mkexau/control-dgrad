-- =============================================================================
-- DGRAD CONTROLE - CONFIGURATION SUPABASE STORAGE
-- Version: 20260826_000002
-- Description: Bucket privé pour les documents métier et politiques d'accès restreintes
-- =============================================================================

BEGIN;

-- 1. CRÉATION DU BUCKET PRIVÉ STRICTEMENT FERMÉ
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'dgrad-documents',
    'dgrad-documents',
    false,
    52428800, -- 50 MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

-- 2. POLITIQUES RLS SUR STORAGE.OBJECTS (Principe du moindre privilège)
-- Note: Les documents officiels sont privés et protégés. La consultation finale
-- passe par une vérification serveur avant génération d'URL signée temporaire.

-- Lecture directe : Restreinte aux administrateurs et aux utilisateurs habilités ayant accès aux métadonnées
CREATE POLICY "Lecture restreinte des documents DGRAD selon habilitation"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'dgrad-documents' AND
    (
        -- Administration technique et direction
        (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) IN ('ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION') OR
        -- Documents liés aux métadonnées accessibles
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.storage_path = storage.objects.name AND (
                d.uploaded_by = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR
                (d.entity_type = 'missions' AND d.entity_id IN (
                    SELECT m.id FROM public.missions m
                    WHERE m.bureau_id = (SELECT bureau_id FROM public.profiles WHERE auth_user_id = auth.uid())
                ))
            )
        ) OR
        -- Ordres de mission rattachés
        EXISTS (
            SELECT 1 FROM public.ordres_mission om
            WHERE om.storage_path = storage.objects.name
        ) OR
        -- Autorisations sur pièces rattachées
        EXISTS (
            SELECT 1 FROM public.autorisations_controle_pieces acp
            WHERE acp.storage_path = storage.objects.name
        )
    )
);

-- Téléversement : Réservé aux utilisateurs authentifiés enregistrés dans public.profiles
CREATE POLICY "Téléversement de documents DGRAD par utilisateurs authentifiés"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'dgrad-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid() AND actif = true)
);

-- Suppression : Strictement interdite aux utilisateurs ordinaires pour préserver la valeur probante
CREATE POLICY "Suppression restreinte aux administrateurs techniques"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'dgrad-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN')
);

COMMIT;
