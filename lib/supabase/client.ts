// =============================================================================
// DGRAD CONTROLE — CLIENT SUPABASE CÔTÉ NAVIGATEUR
// Usage : composants client ('use client') uniquement
// Ne jamais importer ce fichier dans du code serveur
// =============================================================================

import { createBrowserClient } from '@supabase/ssr';

/**
 * Crée un client Supabase côté navigateur.
 * Utilise uniquement les variables NEXT_PUBLIC_* (jamais de secret).
 * Doit être appelé dans un Client Component uniquement.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
