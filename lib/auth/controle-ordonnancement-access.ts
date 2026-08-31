import type { CurrentUser, Role } from '../validations/auth.ts';
import { ForbiddenError, checkAuthenticated } from './rules.ts';

const GLOBAL_VIEW_ROLES: Role[] = [
  'DIRECTEUR_GENERAL',
  'DIRECTEUR_CONTROLES',
  'CHEF_DIVISION',
  'CONSULTATION',
];

/**
 * Vérifie si l'utilisateur peut consulter les données de contrôle d'un bureau de contrôle.
 */
export function assertCanReadControleOrdonnancement(
  user: CurrentUser | null,
  bureauId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  // Hiérarchie globale & consultation
  if (GLOBAL_VIEW_ROLES.includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  // Chef de bureau et Analyste de la Division Contrôle
  if (['CHEF_BUREAU', 'ANALYSTE'].includes(authenticatedUser.role)) {
    if (!authenticatedUser.bureau_id || (bureauId && authenticatedUser.bureau_id !== bureauId)) {
      throw new ForbiddenError('Ces données d’ordonnancement ne relèvent pas de votre bureau de contrôle.');
    }
    return authenticatedUser;
  }

  // Contrôleurs et chefs d'équipe
  if (['CHEF_EQUIPE', 'CONTROLEUR'].includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  throw new ForbiddenError('Vous n’avez pas l’autorisation de consulter ces données de contrôle.');
}

/**
 * Vérifie si l'utilisateur peut enregistrer ou modifier une vérification d'ordonnancement.
 * Réservé aux Chefs de Bureau et Analystes pour leur propre bureau de contrôle.
 */
export function assertCanManageControleOrdonnancement(
  user: CurrentUser | null,
  targetBureauId: string
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  if (authenticatedUser.role === 'ADMIN') {
    throw new ForbiddenError('L’administrateur technique ne peut pas enregistrer de vérification métier.');
  }

  const allowedRoles: Role[] = ['CHEF_BUREAU', 'ANALYSTE'];
  if (!allowedRoles.includes(authenticatedUser.role)) {
    throw new ForbiddenError('Rôle non autorisé pour le contrôle des données d’ordonnancement.');
  }

  if (!authenticatedUser.bureau_id) {
    throw new ForbiddenError('Votre profil doit être rattaché à un bureau de contrôle compétent.');
  }

  if (authenticatedUser.bureau_id !== targetBureauId) {
    throw new ForbiddenError('Vous ne pouvez vérifier que les ordonnancements relevant de votre bureau.');
  }

  return authenticatedUser;
}
