// =============================================================================
// DGRAD CONTROLE — RÉCUPÉRATION DU PROFIL APPLICATIF COURANT
// Serveur uniquement — ne jamais importer dans un Client Component
// =============================================================================
import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthContext, AuthorizationError, UserProfile } from '@/lib/types/auth';

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthorizationError };

/**
 * Résout le contexte complet de l'utilisateur courant :
 *   Auth user → profil applicatif → rôle → bureau → division
 *
 * Retourne un Result discriminé pour forcer la gestion explicite des cas
 * d'erreur dans les Server Components et Server Actions.
 *
 * Ne jamais appeler cette fonction côté navigateur.
 * Créer un nouveau contexte par requête.
 */
export async function getCurrentUser(): Promise<Result<AuthContext>> {
  const supabase = await createSupabaseServerClient();

  // 1. Récupérer l'utilisateur Auth Supabase via le cookie de session
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { ok: false, error: { kind: 'UNAUTHENTICATED' } };
  }

  // 2. Récupérer le profil applicatif avec le bureau et la division
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      auth_user_id,
      nom,
      prenom,
      email,
      telephone,
      bureau_id,
      role,
      actif,
      bureaux:bureau_id (
        id,
        code,
        nom,
        division_id,
        divisions:division_id (
          id,
          code,
          nom,
          direction_id
        )
      )
    `)
    .eq('auth_user_id', authUser.id)
    .single();

  if (profileError || !profileRow) {
    // L'utilisateur Auth existe mais n'a pas de profil applicatif (compte non provisionné)
    return { ok: false, error: { kind: 'FORBIDDEN', reason: 'Profil applicatif introuvable.' } };
  }

  // 3. Vérifier que le compte est actif
  if (!profileRow.actif) {
    return { ok: false, error: { kind: 'ACCOUNT_DISABLED' } };
  }

  // 4. Construire le profil typé
  const bureauRow = Array.isArray(profileRow.bureaux) ? profileRow.bureaux[0] : profileRow.bureaux;
  const divisionRow = bureauRow && (Array.isArray((bureauRow as { divisions?: unknown }).divisions)
    ? ((bureauRow as { divisions?: unknown[] }).divisions)?.[0]
    : (bureauRow as { divisions?: unknown }).divisions);

  const profile: UserProfile = {
    id: profileRow.id as string,
    auth_user_id: profileRow.auth_user_id as string,
    nom: profileRow.nom as string,
    prenom: profileRow.prenom as string,
    email: profileRow.email as string,
    telephone: profileRow.telephone as string | null,
    bureau_id: profileRow.bureau_id as string | null,
    role: profileRow.role as UserProfile['role'],
    actif: profileRow.actif as boolean,
    bureau: bureauRow
      ? {
          id: (bureauRow as { id: string }).id,
          code: (bureauRow as { code: string }).code,
          nom: (bureauRow as { nom: string }).nom,
          division_id: (bureauRow as { division_id: string }).division_id,
        }
      : null,
    division: divisionRow
      ? {
          id: (divisionRow as { id: string }).id,
          code: (divisionRow as { code: string }).code,
          nom: (divisionRow as { nom: string }).nom,
          direction_id: (divisionRow as { direction_id: string }).direction_id,
        }
      : null,
  };

  const context: AuthContext = {
    authUserId: authUser.id,
    profile,
    role: profile.role,
    bureauId: profile.bureau_id,
    divisionId: profile.division?.id ?? null,
  };

  return { ok: true, data: context };
}
