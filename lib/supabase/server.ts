// =============================================================================
// DGRAD CONTROLE — CLIENT SUPABASE CÔTÉ SERVEUR
// Usage : Server Components, Server Actions, Route Handlers
// Serveur uniquement — ne jamais importer dans un Client Component
// Créer une instance par requête, jamais de singleton partagé
// =============================================================================
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crée un client Supabase par requête côté serveur.
 * La session utilisateur est résolue depuis les cookies HTTP (httpOnly).
 * Compatible avec Server Components, Server Actions et Route Handlers.
 *
 * IMPORTANT : Appeler cette fonction à l'intérieur de la fonction handler,
 * jamais au niveau module (pour éviter le partage d'état entre requêtes).
 */
export async function createSupabaseServerClient() {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll échoue silencieusement dans les Server Components
            // La session est tout de même lisible ; seul le rafraîchissement du token est impacté.
            // Le proxy.ts doit gérer le rafraîchissement pour ces cas.
          }
        },
      },
    },
  );
}

/**
 * Client Supabase pour le proxy (proxy.ts) uniquement.
 * Nécessite un accès aux cookies de la requête ET de la réponse
 * pour que le rafraîchissement de token puisse écrire les cookies de session.
 */
export function createSupabaseProxyClient(
  request: { cookies: { getAll(): Array<{ name: string; value: string }> } },
  response: { headers: Headers },
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Écriture dans la réponse pour que le navigateur reçoive la session rafraîchie
            response.headers.append(
              'Set-Cookie',
              `${name}=${value}; Path=${options?.path ?? '/'}; HttpOnly; SameSite=Lax${options?.secure ? '; Secure' : ''}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ''}`,
            );
          });
        },
      },
    },
  );
}
