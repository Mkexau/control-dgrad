// =============================================================================
// DGRAD CONTROLE - GUARDS DE SÉCURITÉ ET PÉRIMÈTRE : RECOUPEMENT & ASSUJETTIS
// =============================================================================

import type { CurrentUser, Role } from '../validations/auth.ts';
import { ForbiddenError, checkAuthenticated, checkRole } from './rules.ts';

export interface AssujettiScope {
  id: string;
  secteur_principal_id: string | null;
  bureau_id?: string | null;
}

export interface AnalyseScope {
  id: string;
  bureau_id: string;
  secteur_id: string | null;
  auteur_id: string;
  statut: 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'CLOTUREE';
}

const GLOBAL_VIEW_ROLES: Role[] = [
  'DIRECTEUR_GENERAL',
  'DIRECTEUR_CONTROLES',
  'CONSULTATION',
];

/**
 * Vérifie si l'utilisateur peut consulter un assujetti.
 * Conforme à RM-039 et la matrice des permissions.
 */
export function assertCanReadAssujetti(
  user: CurrentUser | null,
  assujettiBureauId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  // Hiérarchie globale & consultation
  if (GLOBAL_VIEW_ROLES.includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  // Chef de bureau et Analyste : selon le bureau
  if (['CHEF_BUREAU', 'ANALYSTE'].includes(authenticatedUser.role)) {
    if (!authenticatedUser.bureau_id || (assujettiBureauId && authenticatedUser.bureau_id !== assujettiBureauId)) {
      throw new ForbiddenError('Cet assujetti ne relève pas de votre bureau de contrôle.');
    }
    return authenticatedUser;
  }

  // Chefs d'équipe et Contrôleurs : lecture autorisée dans leur cadre
  if (['CHEF_EQUIPE', 'CONTROLEUR'].includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  throw new ForbiddenError("Vous n'avez pas l'autorisation de consulter cet assujetti.");
}

/**
 * Vérifie si l'utilisateur peut créer ou modifier un assujetti.
 * Réservé aux Analystes et Chefs de bureau pour leur bureau compétent (RM-001, RM-025, RM-039).
 * L'ADMIN technique n'effectue pas de création métier ordinaire d'assujetti.
 */
export function assertCanManageAssujetti(
  user: CurrentUser | null,
  targetBureauId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  checkRole(authenticatedUser, ['ANALYSTE', 'CHEF_BUREAU'] satisfies Role[]);

  if (!authenticatedUser.bureau_id) {
    throw new ForbiddenError('Votre profil doit être rattaché à un bureau compétent.');
  }
  if (targetBureauId && authenticatedUser.bureau_id !== targetBureauId) {
    throw new ForbiddenError('Vous ne pouvez pas gérer un assujetti rattaché à un autre bureau de contrôle.');
  }

  return authenticatedUser;
}

/**
 * Vérifie si l'utilisateur peut créer ou modifier des notes de perception ou ordonnancements.
 * Réservé aux Analystes et Chefs de bureau de contrôle (RM-015, RM-039).
 */
export function assertCanManageRecoupement(
  user: CurrentUser | null,
  assujettiBureauId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  checkRole(authenticatedUser, ['ANALYSTE', 'CHEF_BUREAU'] satisfies Role[]);

  if (!authenticatedUser.bureau_id) {
    throw new ForbiddenError('Votre profil doit être rattaché à un bureau de contrôle.');
  }
  if (assujettiBureauId && authenticatedUser.bureau_id !== assujettiBureauId) {
    throw new ForbiddenError('Cet assujetti ne relève pas de votre bureau de contrôle.');
  }

  return authenticatedUser;
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'analyse (RM-001, RM-039).
 */
export function assertCanCreateAnalyse(
  user: CurrentUser | null,
  bureauId: string
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  checkRole(authenticatedUser, ['ANALYSTE', 'CHEF_BUREAU'] satisfies Role[]);

  if (!authenticatedUser.bureau_id || authenticatedUser.bureau_id !== bureauId) {
    throw new ForbiddenError('Vous ne pouvez initier une analyse que pour votre propre bureau de contrôle.');
  }

  return authenticatedUser;
}

/**
 * Vérifie si l'utilisateur peut consulter un dossier d'analyse.
 */
export function assertCanReadAnalyse(
  user: CurrentUser | null,
  analyseBureauId: string
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  if (GLOBAL_VIEW_ROLES.includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  if (['CHEF_BUREAU', 'ANALYSTE'].includes(authenticatedUser.role)) {
    if (!authenticatedUser.bureau_id || authenticatedUser.bureau_id !== analyseBureauId) {
      throw new ForbiddenError("Ce dossier d'analyse ne relève pas de votre bureau de contrôle.");
    }
    return authenticatedUser;
  }

  throw new ForbiddenError("Vous n'êtes pas autorisé à consulter ce dossier d'analyse.");
}

/**
 * Vérifie si l'utilisateur peut modifier ou modifier les assujettis d'une analyse.
 * Seuls l'auteur ou le Chef de bureau du même bureau peuvent modifier en statut non clôturé.
 */
export function assertCanManageAnalyse(
  user: CurrentUser | null,
  analyse: AnalyseScope
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  checkRole(authenticatedUser, ['ANALYSTE', 'CHEF_BUREAU'] satisfies Role[]);

  if (!authenticatedUser.bureau_id || authenticatedUser.bureau_id !== analyse.bureau_id) {
    throw new ForbiddenError("Cette analyse ne relève pas de votre bureau de contrôle.");
  }

  if (analyse.statut === 'CLOTUREE') {
    throw new ForbiddenError("Une analyse clôturée ne peut plus être modifiée.");
  }

  return authenticatedUser;
}

/**
 * Vérifie si l'utilisateur peut faire transiter le statut d'une analyse (RM-025, RM-039).
 * Workflow : BROUILLON -> EN_COURS -> VALIDEE -> CLOTUREE
 * Seul le Chef de bureau peut VALIDER ou CLOTURER.
 * L'Analyste peut passer de BROUILLON à EN_COURS.
 * ADMIN ne peut jamais valider ou clôturer au nom du métier.
 */
export function assertCanTransitionAnalyse(
  user: CurrentUser | null,
  analyse: AnalyseScope,
  nouveauStatut: 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'CLOTUREE'
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  checkRole(authenticatedUser, ['ANALYSTE', 'CHEF_BUREAU'] satisfies Role[]);

  if (!authenticatedUser.bureau_id || authenticatedUser.bureau_id !== analyse.bureau_id) {
    throw new ForbiddenError("Cette analyse ne relève pas de votre bureau de contrôle.");
  }

  // Transitions autorisées
  const VALID_TRANSITIONS: Record<string, string[]> = {
    BROUILLON: ['EN_COURS'],
    EN_COURS: ['VALIDEE'],
    VALIDEE: ['CLOTUREE'],
    CLOTUREE: [],
  };

  const allowedNext = VALID_TRANSITIONS[analyse.statut] || [];
  if (!allowedNext.includes(nouveauStatut)) {
    throw new ForbiddenError(`Transition invalide : de ${analyse.statut} vers ${nouveauStatut}.`);
  }

  // Validation ou Clôture : réservé au Chef de bureau
  if (['VALIDEE', 'CLOTUREE'].includes(nouveauStatut)) {
    checkRole(authenticatedUser, ['CHEF_BUREAU'] satisfies Role[]);
  }

  return authenticatedUser;
}
