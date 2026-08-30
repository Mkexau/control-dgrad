import type { Role, CurrentUser } from "../validations/auth.ts";

// =============================================================================
// DGRAD CONTROLE - RÈGLES ET GUARDS D'AUTORISATION MÉTIER (SOURCE UNIQUE)
// =============================================================================

export class UnauthorizedError extends Error {
  constructor(message = "Authentification requise") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// =============================================================================
// Fonctions PURES de vérification métier
// Prennent un CurrentUser | null en paramètre.
// Lèvent UnauthorizedError ou ForbiddenError.
// Exécutées à la fois par les Server Actions (via guards.ts) et les tests unitaires.
// =============================================================================

/**
 * Vérifie qu'un utilisateur est authentifié et actif.
 */
export function checkAuthenticated(user: CurrentUser | null): CurrentUser {
  if (!user) {
    throw new UnauthorizedError();
  }
  if (!user.is_active) {
    throw new ForbiddenError('Compte utilisateur inactif');
  }
  return user;
}

/**
 * Vérifie que l'utilisateur possède l'un des rôles spécifiés.
 * ADMIN ne bénéficie jamais d'un accès implicite aux opérations métier.
 * Les rôles autorisés doivent être déclarés explicitement.
 */
export function checkRole(user: CurrentUser | null, allowedRoles: Role[]): CurrentUser {
  const u = checkAuthenticated(user);
  if (!allowedRoles.includes(u.role)) {
    throw new ForbiddenError(
      `Le rôle ${u.role} n'est pas autorisé pour cette opération`
    );
  }
  return u;
}

/**
 * Vérifie que l'utilisateur est un administrateur technique (ADMIN).
 * ADMIN peut gérer les comptes et référentiels mais n'a aucun pouvoir métier.
 */
export function checkAdmin(user: CurrentUser | null): CurrentUser {
  return checkRole(user, ["ADMIN"]);
}

/**
 * Vérifie que l'utilisateur est DIRECTEUR_GENERAL.
 * Seul le DG peut approuver ou rejeter une mission sur place.
 * ADMIN ne peut pas se substituer au DG.
 */
export function checkApprobationDG(user: CurrentUser | null): CurrentUser {
  return checkRole(user, ["DIRECTEUR_GENERAL"]);
}

/**
 * Vérifie que l'utilisateur est CHEF_BUREAU.
 * Seul le Chef du bureau compétent peut approuver ou rejeter un contrôle sur pièces.
 * ADMIN, CONTROLEUR et CHEF_EQUIPE ne peuvent pas se substituer au Chef de bureau.
 */
export function checkApprobationChefBureau(user: CurrentUser | null): CurrentUser {
  return checkRole(user, ["CHEF_BUREAU"]);
}

/**
 * Vérifie que l'utilisateur appartient au bureau spécifié.
 * ADMIN est explicitement exclu des données métier d'un bureau.
 * Les vérifications hiérarchiques (CHEF_DIVISION accédant aux bureaux de sa division)
 * sont PRÉVUES mais PAS ENCORE IMPLÉMENTÉES — elles nécessiteront une requête DB.
 */
export function checkBureauAccess(
  user: CurrentUser | null,
  bureauId: string
): CurrentUser {
  const u = checkAuthenticated(user);
  if (u.role === "ADMIN") {
    throw new ForbiddenError(
      "L'administrateur n'a pas accès aux données métier d'un bureau"
    );
  }
  if (u.bureau_id === bureauId) {
    return u;
  }
  throw new ForbiddenError("Vous n'avez pas accès à ce bureau");
}

/**
 * Vérifie que le CHEF_EQUIPE a accès à l'équipe spécifiée.
 * Un chef d'équipe ne peut accéder qu'aux équipes auxquelles il est affecté.
 * La vérification se fait par équipe_id stockée sur le profil de l'agent.
 * NOTE : La correspondance chef_equipe_id ↔ equipes.chef_agent_id doit être
 * vérifiée dans la couche métier (requête DB) — cette fonction vérifie le rôle
 * et que le champ fourni est non-null.
 */
export function checkEquipeAccess(
  user: CurrentUser | null,
  chefEquipeId: string
): CurrentUser {
  const u = checkRole(user, ["CHEF_EQUIPE"]);
  if (u.id !== chefEquipeId) {
    throw new ForbiddenError(
      "Accès refusé : vous n'êtes pas le chef de cette équipe"
    );
  }
  return u;
}

/**
 * Vérifie que le CONTROLEUR a accès à un contrôle qui lui est affecté.
 * Un contrôleur ne peut accéder qu'aux contrôles sur pièces où il est désigné.
 * NOTE : La correspondance controleur_id ↔ controles.controleur_id doit être
 * vérifiée dans la couche métier (requête DB) — cette fonction vérifie le rôle
 * et que l'identifiant correspond.
 */
export function checkControleurAccess(
  user: CurrentUser | null,
  controleurId: string
): CurrentUser {
  const u = checkRole(user, ["CONTROLEUR"]);
  if (u.id !== controleurId) {
    throw new ForbiddenError(
      "Accès refusé : ce contrôle ne vous est pas affecté"
    );
  }
  return u;
}
