import { createBrowserClient } from "@supabase/ssr";

/**
 * Crée un client Supabase pour une utilisation exclusive dans les Client Components (navigateur).
 * Utilise uniquement les variables d'environnement publiques.
 * Ne contient JAMAIS la Service Role Key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
