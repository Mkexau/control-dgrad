// =============================================================================
// DGRAD CONTROLE — TYPES APPLICATIFS UTILISATEUR ET AUTORISATION
// Serveur uniquement — ne jamais importer dans un Client Component
// =============================================================================

export type AppRole =
  | 'ADMIN'
  | 'ANALYSTE'
  | 'CHEF_BUREAU'
  | 'CHEF_SECTION'
  | 'CHEF_DIVISION'
  | 'DIRECTEUR_CONTROLES'
  | 'DIRECTEUR_GENERAL'
  | 'CHEF_EQUIPE'
  | 'CONTROLEUR'
  | 'CONSULTATION';

export const ALL_ROLES: AppRole[] = [
  'ADMIN',
  'ANALYSTE',
  'CHEF_BUREAU',
  'CHEF_SECTION',
  'CHEF_DIVISION',
  'DIRECTEUR_CONTROLES',
  'DIRECTEUR_GENERAL',
  'CHEF_EQUIPE',
  'CONTROLEUR',
  'CONSULTATION',
];

export interface BureauInfo {
  id: string;
  code: string;
  nom: string;
  division_id: string;
}

export interface DivisionInfo {
  id: string;
  code: string;
  nom: string;
  direction_id: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  bureau_id: string | null;
  role: AppRole;
  actif: boolean;
  bureau: BureauInfo | null;
  division: DivisionInfo | null;
}

/**
 * Contexte résolu de l'utilisateur courant côté serveur.
 * Combine l'identité Auth Supabase et le profil applicatif.
 */
export interface AuthContext {
  authUserId: string;
  profile: UserProfile;
  role: AppRole;
  bureauId: string | null;
  divisionId: string | null;
}

/**
 * Représentation sûre à passer aux composants (pas de données sensibles inutiles).
 */
export type SafeUserContext = Pick<
  AuthContext,
  'authUserId' | 'role' | 'bureauId' | 'divisionId'
> & {
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  nomComplet: string;
};

/**
 * Erreurs d'autorisation standardisées.
 * Toutes se résolvent en 403/404 côté applicatif pour éviter l'IDOR.
 */
export type AuthorizationError =
  | { kind: 'UNAUTHENTICATED' }
  | { kind: 'FORBIDDEN'; reason?: string }
  | { kind: 'NOT_FOUND' }
  | { kind: 'ACCOUNT_DISABLED' };
