// =============================================================================
// DGRAD CONTROLE — GUARDS D'AUTORISATION SERVEUR
// Serveur uniquement — ne jamais importer dans un Client Component
//
// Ces fonctions sont des "portes" que les Server Actions et Route Handlers
// DOIVENT appeler pour vérifier l'identité et les droits avant toute mutation.
// En cas d'échec elles lèvent une erreur ou redirigent — jamais silencieusement.
// =============================================================================
import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { AppRole, AuthContext } from '@/lib/types/auth';

// -----------------------------------------------------------------------------
// TYPES INTERNES
// -----------------------------------------------------------------------------
type RequireAuthOptions = {
  /** Si true, redirige vers /connexion au lieu de lever une erreur */
  redirectOnFailure?: boolean;
};

// -----------------------------------------------------------------------------
// GUARD — AUTHENTIFICATION SIMPLE
// Garantit qu'un utilisateur est connecté et son compte actif.
// Utilisation typique : début de tout Server Action ou Route Handler.
// -----------------------------------------------------------------------------

/**
 * Exige que l'utilisateur courant soit authentifié.
 * Retourne AuthContext si tout va bien.
 * Redirige vers /connexion ou lève une erreur sinon.
 */
export async function requireAuthenticated(
  options: RequireAuthOptions = {},
): Promise<AuthContext> {
  const result = await getCurrentUser();

  if (!result.ok) {
    const { error } = result;

    if (error.kind === 'UNAUTHENTICATED') {
      if (options.redirectOnFailure !== false) {
        redirect('/connexion');
      }
      throw new Error('Non authentifié.');
    }

    if (error.kind === 'ACCOUNT_DISABLED') {
      redirect('/connexion?raison=compte-desactive');
    }

    if (error.kind === 'FORBIDDEN') {
      throw new Error('Accès interdit : profil introuvable ou compte non provisionné.');
    }

    throw new Error('Erreur d'authentification inattendue.');
  }

  return result.data;
}

// -----------------------------------------------------------------------------
// GUARD — RÔLE REQUIS
// Garantit que l'utilisateur a l'un des rôles attendus.
// -----------------------------------------------------------------------------

/**
 * Exige que l'utilisateur courant ait au moins un des rôles listés.
 * Lève une erreur 403 si ce n'est pas le cas.
 *
 * Note : ne jamais faire confiance à un rôle passé depuis le front.
 * Cette fonction relit toujours le profil depuis Supabase Auth.
 */
export async function requireRole(
  allowedRoles: AppRole[],
): Promise<AuthContext> {
  const ctx = await requireAuthenticated();

  if (!allowedRoles.includes(ctx.role)) {
    // Ne pas divulguer quel rôle est requis pour éviter l'énumération
    throw new Error('Accès interdit : rôle insuffisant.');
  }

  return ctx;
}

// -----------------------------------------------------------------------------
// GUARD — PÉRIMÈTRE BUREAU
// Garantit que l'utilisateur appartient au bureau requis (ou a une visibilité globale).
// -----------------------------------------------------------------------------

/**
 * Exige que l'utilisateur soit rattaché au bureau indiqué,
 * ou qu'il ait un rôle de supervision globale.
 *
 * Empêche les accès horizontaux (IDOR) entre bureaux.
 */
export async function requireBureauAccess(
  targetBureauId: string,
  globalRoles: AppRole[] = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'],
): Promise<AuthContext> {
  const ctx = await requireAuthenticated();

  const hasAccess =
    globalRoles.includes(ctx.role) || ctx.bureauId === targetBureauId;

  if (!hasAccess) {
    throw new Error('Accès interdit : périmètre organisationnel non autorisé.');
  }

  return ctx;
}

// -----------------------------------------------------------------------------
// GUARD — PROPRIÉTAIRE DE RESSOURCE (protection anti-IDOR)
// -----------------------------------------------------------------------------

/**
 * Exige que l'utilisateur soit le propriétaire de la ressource OU
 * qu'il ait un rôle de supervision autorisant l'accès.
 *
 * Utiliser pour toutes les ressources appartenant à un utilisateur individuel.
 */
export async function requireOwnerOrRole(
  ownerProfileId: string,
  superuserRoles: AppRole[] = ['ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'],
): Promise<AuthContext> {
  const ctx = await requireAuthenticated();

  const allowed =
    ctx.profile.id === ownerProfileId || superuserRoles.includes(ctx.role);

  if (!allowed) {
    throw new Error('Accès interdit : vous n'êtes pas propriétaire de cette ressource.');
  }

  return ctx;
}

// -----------------------------------------------------------------------------
// UTILITAIRE — Conversion erreur en réponse HTTP safe (pour les Route Handlers)
// -----------------------------------------------------------------------------

/**
 * Convertit une erreur d'autorisation en code HTTP approprié.
 * Utiliser uniquement dans les Route Handlers (pas dans les Server Actions).
 */
export function authErrorToHttpStatus(message: string): 401 | 403 | 404 {
  if (message.includes('Non authentifié')) return 401;
  if (message.includes('introuvable')) return 404;
  return 403;
}
