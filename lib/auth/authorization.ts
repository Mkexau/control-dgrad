import { AppRole, UserContext, AuthError } from '@/lib/types/auth';

/**
 * Validates that an authenticated user context is present.
 */
export function requireAuthenticatedUser(context: UserContext | null): UserContext {
  if (!context) {
    throw new AuthError('UNAUTHENTICATED', 'Authentification requise pour cette opération.');
  }
  if (!context.profile.actif) {
    throw new AuthError('ACCOUNT_INACTIVE', 'Compte utilisateur désactivé.');
  }
  return context;
}

/**
 * Validates that the user possesses one of the allowed roles.
 */
export function requireRole(context: UserContext, allowedRoles: AppRole[]): void {
  requireAuthenticatedUser(context);
  if (!allowedRoles.includes(context.role)) {
    throw new AuthError(
      'FORBIDDEN_ROLE',
      `Accès refusé : Le rôle ${context.role} n'est pas autorisé à exécuter cette action.`
    );
  }
}

/**
 * Strict boundary check prohibiting technical ADMIN from overriding business decisions.
 */
export function assertNotAdminBusinessOverride(role: AppRole, actionType: string): void {
  const businessActions = [
    'VALIDATION_DG',
    'REJET_DG',
    'VALIDATION_CHEF_SECTION',
    'REJET_CHEF_SECTION',
    'VALIDATION_CHEF_DIVISION',
    'MODIFICATION_RESULTAT',
    'MODIFICATION_PV',
    'CREATION_FEUILLE_OBSERVATION',
    'AFFECTATION_EQUIPES',
  ];

  if (role === 'ADMIN' && businessActions.includes(actionType)) {
    throw new AuthError(
      'ADMIN_BUSINESS_OVERRIDE_PROHIBITED',
      `Sécurité métier : L'administrateur technique (ADMIN) ne peut en aucun cas exécuter une décision métier [${actionType}].`
    );
  }
}

/**
 * Validates bureau scope access for a user.
 */
export function validateBureauAccess(context: UserContext, targetBureauId: string): boolean {
  // Global hierarchy & technical admin have cross-bureau visibility
  if (['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(context.role)) {
    return true;
  }

  // Bureau level roles (Chef de Bureau, Analyste, Chef de Section) are strictly scoped to their bureau
  if (['CHEF_BUREAU', 'ANALYSTE', 'CHEF_SECTION'].includes(context.role)) {
    return context.bureauId === targetBureauId;
  }

  // Field roles (Chef d'équipe, Contrôleur) must be evaluated via assignment or bureau scope
  return context.bureauId === targetBureauId;
}

export function requireBureauAccess(context: UserContext, targetBureauId: string): void {
  requireAuthenticatedUser(context);
  if (!validateBureauAccess(context, targetBureauId)) {
    throw new AuthError(
      'FORBIDDEN_SCOPE',
      'Accès refusé : Ressource hors périmètre organisationnel de votre bureau.'
    );
  }
}

/**
 * Validates mission scope access based on role, bureau and operational assignments.
 */
export function validateMissionAccess(
  context: UserContext,
  mission: { id: string; bureau_id: string; type_controle: 'SUR_PLACE' | 'SUR_PIECES' },
  assignmentInfo?: { isTeamMember?: boolean; isTeamLead?: boolean; isControllerAssigned?: boolean }
): boolean {
  // 1. Global hierarchy and consultation
  if (['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN', 'CONSULTATION'].includes(context.role)) {
    return true;
  }

  // 2. Bureau scope for Chef de bureau, Analyste, Chef de section
  if (['CHEF_BUREAU', 'ANALYSTE', 'CHEF_SECTION'].includes(context.role)) {
    return context.bureauId === mission.bureau_id;
  }

  // 3. SUR_PLACE field team lead & team agents
  if (context.role === 'CHEF_EQUIPE') {
    return Boolean(assignmentInfo?.isTeamLead || assignmentInfo?.isTeamMember);
  }

  // 4. Field controller
  if (context.role === 'CONTROLEUR') {
    return Boolean(assignmentInfo?.isControllerAssigned || assignmentInfo?.isTeamMember);
  }

  return false;
}

export function requireMissionAccess(
  context: UserContext,
  mission: { id: string; bureau_id: string; type_controle: 'SUR_PLACE' | 'SUR_PIECES' },
  assignmentInfo?: { isTeamMember?: boolean; isTeamLead?: boolean; isControllerAssigned?: boolean }
): void {
  requireAuthenticatedUser(context);
  if (!validateMissionAccess(context, mission, assignmentInfo)) {
    throw new AuthError(
      'FORBIDDEN_SCOPE',
      'Accès refusé : Vous n\'avez pas accès à cette mission de contrôle.'
    );
  }
}

/**
 * Validates operational control access.
 */
export function validateControlAccess(
  context: UserContext,
  control: {
    id: string;
    mission_id: string;
    bureau_id: string;
    controleur_responsable_id?: string | null;
    chef_equipe_id?: string | null;
  },
  assignmentInfo?: { isTeamMember?: boolean }
): boolean {
  if (['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(context.role)) {
    return true;
  }

  if (['CHEF_BUREAU', 'CHEF_SECTION'].includes(context.role)) {
    return context.bureauId === control.bureau_id;
  }

  if (context.role === 'CHEF_EQUIPE') {
    return context.agent?.id === control.chef_equipe_id || Boolean(assignmentInfo?.isTeamMember);
  }

  if (context.role === 'CONTROLEUR') {
    return (
      context.profile.id === control.controleur_responsable_id ||
      Boolean(assignmentInfo?.isTeamMember)
    );
  }

  return false;
}
