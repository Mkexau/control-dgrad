// =============================================================================
// DGRAD CONTROLE - TYPES D'AUTHENTIFICATION ET DE PROFIL MÉTIER
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
  created_at: string;
  updated_at: string;
}

export interface UserAgent {
  id: string;
  profile_id: string;
  matricule: string;
  specialite: string | null;
  domaine_competence: string | null;
  actif: boolean;
}

export interface UserContext {
  authUser: {
    id: string;
    email?: string;
  };
  profile: UserProfile;
  agent?: UserAgent | null;
  role: AppRole;
  bureauId: string | null;
  divisionId: string | null;
}

export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'ACCOUNT_INACTIVE'
  | 'FORBIDDEN_ROLE'
  | 'FORBIDDEN_SCOPE'
  | 'ADMIN_BUSINESS_OVERRIDE_PROHIBITED';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
