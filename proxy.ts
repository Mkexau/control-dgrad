// =============================================================================
// DGRAD CONTROLE — PROXY (anciennement middleware.ts)
// Remplace middleware.ts — renommé proxy.ts dans Next.js 16
//
// Rôle : protection optimiste des routes et rafraîchissement de session.
// Ce fichier ne fait PAS de vérification de rôle ou de logique métier :
//   → celles-ci sont effectuées côté serveur dans les guards.ts
//
// La protection de route ici est "best-effort" (cookie de session).
// Elle complète, mais ne remplace jamais, l'autorisation serveur.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseProxyClient } from '@/lib/supabase/server';

// Routes accessibles sans session
const PUBLIC_ROUTES = ['/connexion', '/favicon.ico'];

// Préfixes d'assets qui ne doivent jamais passer par ce proxy
const ASSET_PREFIXES = ['/_next', '/api', '/public'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isAssetRoute(pathname: string): boolean {
  return ASSET_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les assets sans aucun traitement
  if (isAssetRoute(pathname)) {
    return NextResponse.next();
  }

  // Créer la réponse de base pour y attacher les cookies de session rafraîchis
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Créer le client Supabase avec accès en lecture/écriture aux cookies
  // pour permettre le rafraîchissement automatique du token.
  const supabase = createSupabaseProxyClient(request, response);

  // Rafraîchir la session si nécessaire.
  // IMPORTANT : utiliser getUser() plutôt que getSession() pour valider le JWT côté serveur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes publiques : si l'utilisateur est déjà connecté, rediriger vers le tableau de bord
  if (isPublicRoute(pathname)) {
    if (user && pathname === '/connexion') {
      return NextResponse.redirect(new URL('/tableau-de-bord', request.nextUrl));
    }
    return response;
  }

  // Routes protégées : rediriger vers /connexion si pas de session
  if (!user) {
    const loginUrl = new URL('/connexion', request.nextUrl);
    // Conserver l'URL cible pour une redirection post-login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session valide — laisser passer avec les cookies potentiellement rafraîchis
  return response;
}

// Appliquer le proxy à toutes les routes sauf les assets statiques
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
