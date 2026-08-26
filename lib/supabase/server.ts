import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crée un client Supabase pour une utilisation dans les Server Components,
 * les Server Actions, et les Route Handlers (API).
 * 
 * Les cookies sont lus et écrits via l'API async de Next.js 16.3.2.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // L'erreur est déclenchée lors de l'appel depuis un Server Component,
            // on peut l'ignorer car la mise à jour sera gérée par le middleware.
            console.error("Failed to set cookies in Server Component", error);
          }
        },
      },
    }
  );
}

/**
 * Crée un client Supabase utilisant la Service Role Key.
 * DANGER : Ce client contourne toutes les règles RLS (Row Level Security).
 * NE JAMAIS exposer ce client au navigateur ou l'utiliser pour des requêtes utilisateur standard.
 * Utilisé uniquement pour des tâches d'administration côté serveur ou webhooks vérifiés.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  );
}
