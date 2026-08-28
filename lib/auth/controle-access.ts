import type { CurrentUser, Role } from '../validations/auth';
import { ForbiddenError, checkAuthenticated, checkRole } from './rules.ts';

export interface ControleMissionScope {
  id: string;
  bureau_id: string;
}

export interface ControleDemandeScope {
  id: string;
  assujetti_id: string;
  type_controle: 'SUR_PLACE' | 'SUR_PIECES';
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  controleur_responsable_id: string | null;
  mission: ControleMissionScope | null;
}

export type DemandeRenseignementsOperation = 'CREATION' | 'REPONSE' | 'RELANCE';

const CONTROLE_STATUSES_ACCEPTING_DEMANDES = ['EN_ATTENTE', 'EN_COURS'] as const;
const DEMANDE_STATUSES_MUTABLE = ['EN_ATTENTE', 'RELANCE'] as const;

/**
 * Autorisation serveur unique pour les demandes de renseignements.
 * Ces opérations font partie de l'exécution du contrôle : seul le contrôleur
 * SUR_PIECES effectivement désigné, actif et rattaché au bureau de la mission
 * peut les effectuer.
 */
export function assertCanManageDemandeRenseignements(
  user: CurrentUser | null,
  controle: ControleDemandeScope,
  operation: DemandeRenseignementsOperation,
  demandeStatus?: string
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);
  checkRole(authenticatedUser, ['CONTROLEUR'] satisfies Role[]);

  if (controle.type_controle !== 'SUR_PIECES') {
    throw new ForbiddenError('Les demandes de renseignements sont réservées aux contrôles sur pièces.');
  }

  if (!controle.mission) {
    throw new ForbiddenError('La mission associée au contrôle est introuvable.');
  }

  if (!(CONTROLE_STATUSES_ACCEPTING_DEMANDES as readonly string[]).includes(controle.statut)) {
    throw new ForbiddenError('Le statut du contrôle ne permet pas cette opération.');
  }

  if (controle.controleur_responsable_id !== authenticatedUser.id) {
    throw new ForbiddenError('Vous n’êtes pas le contrôleur responsable de ce contrôle.');
  }

  if (!authenticatedUser.bureau_id || authenticatedUser.bureau_id !== controle.mission.bureau_id) {
    throw new ForbiddenError('Ce contrôle ne relève pas de votre périmètre organisationnel.');
  }

  if (operation !== 'CREATION' && !DEMANDE_STATUSES_MUTABLE.includes(demandeStatus as (typeof DEMANDE_STATUSES_MUTABLE)[number])) {
    throw new ForbiddenError('Cette demande ne peut plus être modifiée.');
  }

  return authenticatedUser;
}

export interface ControleReadScope {
  type_controle: 'SUR_PLACE' | 'SUR_PIECES';
  controleur_responsable_id: string | null;
  mission_bureau_id: string;
  equipe_chef_id: string | null;
  user_agent_id: string | null;
}

/** Autorise uniquement les acteurs dont le rôle et le périmètre donnent accès au dossier. */
export function assertCanReadControle(user: CurrentUser | null, controle: ControleReadScope): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  if (authenticatedUser.role === 'ADMIN') {
    throw new ForbiddenError('L’administrateur technique ne peut pas consulter un dossier métier par défaut.');
  }

  if (authenticatedUser.role === 'CONTROLEUR') {
    if (
      controle.type_controle === 'SUR_PIECES' &&
      controle.controleur_responsable_id === authenticatedUser.id &&
      authenticatedUser.bureau_id === controle.mission_bureau_id
    ) {
      return authenticatedUser;
    }
    throw new ForbiddenError('Ce contrôle ne vous est pas affecté.');
  }

  if (authenticatedUser.role === 'CHEF_EQUIPE') {
    if (controle.type_controle === 'SUR_PLACE' && controle.equipe_chef_id === controle.user_agent_id) {
      return authenticatedUser;
    }
    throw new ForbiddenError('Ce contrôle ne relève pas de votre équipe.');
  }

  if (
    ['CHEF_BUREAU', 'CHEF_SECTION', 'ANALYSTE', 'CONSULTATION'].includes(authenticatedUser.role) &&
    authenticatedUser.bureau_id === controle.mission_bureau_id
  ) {
    return authenticatedUser;
  }

  if (authenticatedUser.role === 'DIRECTEUR_GENERAL') {
    return authenticatedUser;
  }

  throw new ForbiddenError('Vous n’êtes pas autorisé à consulter ce contrôle.');
}

export interface MissionRapportScope {
  id: string;
  type_controle: 'SUR_PLACE' | 'SUR_PIECES';
  statut: string;
  bureau_id: string;
  equipes_chefs_ids?: string[];
  controleurs_ids?: string[];
}

/**
 * Autorise la rédaction et la mise à jour du rapport de mission selon le workflow et le périmètre.
 */
export function assertCanManageRapportMission(
  user: CurrentUser | null,
  mission: MissionRapportScope,
  userAgentId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  if (authenticatedUser.role === 'ADMIN') {
    throw new ForbiddenError('L’administrateur technique ne peut pas rédiger ou gérer de rapport métier.');
  }

  if (authenticatedUser.role === 'DIRECTEUR_GENERAL') {
    return authenticatedUser;
  }

  if (authenticatedUser.role === 'DIRECTEUR_CONTROLES' || authenticatedUser.role === 'CHEF_DIVISION') {
    return authenticatedUser;
  }

  if (authenticatedUser.role === 'CHEF_BUREAU' && authenticatedUser.bureau_id === mission.bureau_id) {
    return authenticatedUser;
  }

  if (mission.type_controle === 'SUR_PIECES') {
    if (authenticatedUser.role === 'CHEF_SECTION' && authenticatedUser.bureau_id === mission.bureau_id) {
      return authenticatedUser;
    }
    if (
      authenticatedUser.role === 'CONTROLEUR' &&
      authenticatedUser.bureau_id === mission.bureau_id &&
      mission.controleurs_ids?.includes(authenticatedUser.id)
    ) {
      return authenticatedUser;
    }
  } else if (mission.type_controle === 'SUR_PLACE') {
    if (
      authenticatedUser.role === 'CHEF_EQUIPE' &&
      userAgentId &&
      mission.equipes_chefs_ids?.includes(userAgentId)
    ) {
      return authenticatedUser;
    }
  }

  throw new ForbiddenError('Vous n’êtes pas habilité à rédiger ou modifier le rapport de cette mission.');
}

/**
 * Autorise la consultation du dossier complet d'une mission.
 */
export function assertCanReadMissionDossier(
  user: CurrentUser | null,
  mission: MissionRapportScope,
  userAgentId?: string | null
): CurrentUser {
  const authenticatedUser = checkAuthenticated(user);

  if (authenticatedUser.role === 'ADMIN') {
    throw new ForbiddenError('L’administrateur technique ne peut pas consulter un dossier de mission par défaut.');
  }

  if (['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION'].includes(authenticatedUser.role)) {
    return authenticatedUser;
  }

  if (
    ['CHEF_BUREAU', 'CHEF_SECTION', 'ANALYSTE', 'CONSULTATION'].includes(authenticatedUser.role) &&
    authenticatedUser.bureau_id === mission.bureau_id
  ) {
    return authenticatedUser;
  }

  if (mission.type_controle === 'SUR_PIECES') {
    if (
      authenticatedUser.role === 'CONTROLEUR' &&
      authenticatedUser.bureau_id === mission.bureau_id &&
      mission.controleurs_ids?.includes(authenticatedUser.id)
    ) {
      return authenticatedUser;
    }
  } else if (mission.type_controle === 'SUR_PLACE') {
    if (
      authenticatedUser.role === 'CHEF_EQUIPE' &&
      userAgentId &&
      mission.equipes_chefs_ids?.includes(userAgentId)
    ) {
      return authenticatedUser;
    }
    if (authenticatedUser.role === 'CONTROLEUR' && authenticatedUser.bureau_id === mission.bureau_id) {
      return authenticatedUser;
    }
  }

  throw new ForbiddenError('Vous n’êtes pas autorisé à consulter cette mission.');
}

