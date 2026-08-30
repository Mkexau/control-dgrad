import { getCurrentUser } from "./get-current-user";
import type { Role, CurrentUser } from "@/lib/validations/auth";
import {
  checkAuthenticated,
  checkRole,
  checkAdmin,
  checkApprobationDG,
  checkApprobationChefBureau,
  checkBureauAccess,
  checkEquipeAccess,
  checkControleurAccess,
} from "./rules";

// Re-export des erreurs et fonctions pures pour que guards.ts reste le point d'entrée unifié
export * from "./rules";

// =============================================================================
// Wrappers ASYNC pour Server Components, Server Actions et Route Handlers
// Récupèrent la session / profil via getCurrentUser() puis délèguent aux règles métier pures.
// =============================================================================

/**
 * Assure qu'un utilisateur est authentifié et actif.
 */
export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkAuthenticated(user);
}

/**
 * Assure que l'utilisateur possède l'un des rôles spécifiés.
 */
export async function requireRole(allowedRoles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkRole(user, allowedRoles);
}

/**
 * Assure que l'utilisateur est un administrateur technique (ADMIN).
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkAdmin(user);
}

/**
 * Assure que l'utilisateur est DIRECTEUR_GENERAL pour approuver/rejeter une mission sur place.
 */
export async function requireApprobationDG(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkApprobationDG(user);
}

/**
 * Assure que l'utilisateur est CHEF_BUREAU pour approuver/rejeter un contrôle sur pièces.
 */
export async function requireApprobationChefBureau(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkApprobationChefBureau(user);
}

/**
 * Assure que l'utilisateur appartient au bureau spécifié.
 */
export async function requireBureauAccess(bureauId: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkBureauAccess(user, bureauId);
}

/**
 * Assure que l'utilisateur est le chef de l'équipe spécifiée.
 */
export async function requireEquipeAccess(chefEquipeId: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkEquipeAccess(user, chefEquipeId);
}

/**
 * Assure que l'utilisateur est le contrôleur affecté au contrôle spécifié.
 */
export async function requireControleurAccess(controleurId: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  return checkControleurAccess(user, controleurId);
}
