import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Met à jour et rafraîchit la session Supabase Auth sur chaque requête entrante.
 * Conforme à Next.js 16.3.2 (proxy.ts) et @supabase/ssr.
 * Ne constitue PAS la seule barrière de sécurité : les Server Components et Server Actions
 * doivent toujours exécuter leurs propres vérifications d'autorisation.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit le jeton d'authentification si nécessaire
  const { data: { user } } = await supabase.auth.getUser();

  // Le Service d'assiette n'a accès qu'à son tableau de bord et à son
  // répertoire. Cette protection de route complète les contrôles serveur/RLS.
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const allowedAssiettePath =
      request.nextUrl.pathname === '/dashboard' ||
      request.nextUrl.pathname === '/assiette/assujettis' ||
      request.nextUrl.pathname.startsWith('/assiette/assujettis/') ||
      request.nextUrl.pathname.startsWith('/assujettis/');

    if (profile?.role === 'SERVICE_ASSIETTE' && !allowedAssiettePath) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
  }

  return response;
}
