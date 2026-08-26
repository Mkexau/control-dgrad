// =============================================================================
// DGRAD CONTROLE — POLITIQUES DE PERMISSIONS MÉTIER
// Serveur uniquement — ne jamais importer dans un Client Component
//
// Ce module définit les règles d'autorisation métier de façon centralisée.
// Aucune condition if (role === 'X') ne doit être dispersée dans l'application.
// =============================================================================
import 'server-only';

import type { AppRole } from '@/lib/types/auth';

// -----------------------------------------------------------------------------
// 1. GROUPES DE RÔLES (DRY — utilisés dans les politiques ci-dessous)
// -----------------------------------------------------------------------------

/** Rôles pouvant accéder aux données à l'échelle de toute la direction */
export const DIRECTION_ROLES: AppRole[] = [
  'DIRECTEUR_GENERAL',
  'DIRECTEUR_CONTROLES',
];

/** Rôles hiérarchiques (lecture large + supervision) */
export const SUPERVISION_ROLES: AppRole[] = [
  'DIRECTEUR_GENERAL',
  'DIRECTEUR_CONTROLES',
  'CHEF_DIVISION',
];

/** Rôles opérationnels de contrôle */
export const CONTROL_OPERATION_ROLES: AppRole[] = [
  'CHEF_EQUIPE',
  'CONTROLEUR',
];

/** Rôles pouvant créer ou initier une mission */
export const MISSION_INITIATOR_ROLES: AppRole[] = [
  'CHEF_BUREAU',
  'ANALYSTE',
];

// -----------------------------------------------------------------------------
// 2. POLITIQUES D'AUTORISATION MÉTIER
// -----------------------------------------------------------------------------

/**
 * Vérifie si un rôle peut valider/approuver une étape DG (SUR_PLACE uniquement).
 * ADMIN ne peut jamais exercer ce pouvoir.
 */
export function canApproveAsDG(role: AppRole): boolean {
  return role === 'DIRECTEUR_GENERAL';
}

/**
 * Vérifie si un rôle peut approuver/rejeter une demande SUR_PIECES.
 * Réservé exclusivement au CHEF_SECTION.
 * ADMIN ne peut jamais exercer ce pouvoir.
 */
export function canApproveAsSectionChief(role: AppRole): boolean {
  return role === 'CHEF_SECTION';
}

/**
 * Vérifie si un rôle peut examiner une mission SUR_PLACE
 * au niveau Chef de Division.
 */
export function canReviewAsChefDivision(role: AppRole): boolean {
  return role === 'CHEF_DIVISION';
}

/**
 * Vérifie si un rôle peut examiner une mission SUR_PLACE
 * au niveau Directeur des Contrôles.
 */
export function canReviewAsDirecteurControles(role: AppRole): boolean {
  return role === 'DIRECTEUR_CONTROLES';
}

/**
 * Vérifie si un rôle peut créer ou initier une mission de contrôle.
 */
export function canInitiateMission(role: AppRole): boolean {
  return MISSION_INITIATOR_ROLES.includes(role);
}

/**
 * Vérifie si un rôle permet d'accéder aux fonctions d'administration technique.
 * ADMIN peut gérer les comptes, profils et référentiels.
 * ADMIN ne peut PAS contourner les décisions métier.
 */
export function canAdministerTechnically(role: AppRole): boolean {
  return role === 'ADMIN';
}

/**
 * Vérifie si un rôle permet une supervision hiérarchique de lecture large.
 */
export function canSupervise(role: AppRole): boolean {
  return SUPERVISION_ROLES.includes(role);
}

/**
 * Vérifie si un rôle permet un accès opérationnel de contrôle de terrain.
 */
export function canOperateControl(role: AppRole): boolean {
  return CONTROL_OPERATION_ROLES.includes(role);
}

/**
 * Vérifie qu'un utilisateur a accès à un bureau donné.
 * Règle fondamentale : le rôle seul ne suffit jamais — le périmètre compte.
 */
export function hasBureauAccess(
  userBureauId: string | null,
  targetBureauId: string,
  role: AppRole,
): boolean {
  // La hiérarchie globale peut accéder à tous les bureaux
  if (SUPERVISION_ROLES.includes(role) || role === 'ADMIN') return true;
  // Sinon l'utilisateur doit appartenir au bureau
  return userBureauId === targetBureauId;
}

/**
 * Vérifie qu'un utilisateur peut accéder à une mission.
 * Un utilisateur ne peut jamais accéder à une mission simplement en connaissant son UUID.
 */
export function hasMissionAccess({
  role,
  userBureauId,
  missionBureauId,
  isTeamMember,
  isAssignedController,
}: {
  role: AppRole;
  userBureauId: string | null;
  missionBureauId: string;
  isTeamMember: boolean;
  isAssignedController: boolean;
}): boolean {
  if (SUPERVISION_ROLES.includes(role) || role === 'ADMIN') return true;
  if (userBureauId === missionBureauId) return true;
  if (isTeamMember) return true;
  if (isAssignedController) return true;
  return false;
}

// -----------------------------------------------------------------------------
// 3. TABLE D'INTERDICTIONS ADMIN EXPLICITE
// Ces fonctions doivent être appelées avant toute opération sensible.
// -----------------------------------------------------------------------------

/** ADMIN ne peut pas insérer une validation DG */
export function adminCannotValidateAsDG(role: AppRole): boolean {
  if (role === 'ADMIN') return false; // interdit
  return true;
}

/** ADMIN ne peut pas modifier un résultat de contrôle */
export function adminCannotModifyResult(role: AppRole): boolean {
  if (role === 'ADMIN') return false; // interdit
  return true;
}

/** ADMIN ne peut pas modifier un procès-verbal */
export function adminCannotModifyPV(role: AppRole): boolean {
  if (role === 'ADMIN') return false; // interdit
  return true;
}
