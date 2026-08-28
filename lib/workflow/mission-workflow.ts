// =============================================================================
// DGRAD CONTROLE - MOTEUR DE WORKFLOW DES MISSIONS (SUR_PLACE & SUR_PIECES)
// =============================================================================

import { ForbiddenError, UnauthorizedError } from '@/lib/auth/rules';
import type { CurrentUser } from '@/lib/validations/auth';
import type { MissionStatus, MissionType, ValidationType } from '@/lib/validations/missions';

// Matrice des transitions permises pour le Contrôle SUR PLACE
export const SUR_PLACE_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  BROUILLON: ['SOUMISE', 'ANNULEE'],
  SOUMISE: ['EXAMEN_CHEF_DIVISION', 'REJETEE', 'ANNULEE'],
  EXAMEN_CHEF_DIVISION: ['EXAMEN_DIRECTEUR_CONTROLES', 'REJETEE', 'ANNULEE'],
  EXAMEN_DIRECTEUR_CONTROLES: ['ATTENTE_DG', 'REJETEE', 'ANNULEE'],
  ATTENTE_DG: ['APPROUVEE', 'REJETEE', 'ANNULEE'],
  APPROUVEE: ['ORDRE_MISSION_GENERE', 'ANNULEE'],
  ORDRE_MISSION_GENERE: ['EQUIPES_AFFECTEES', 'ANNULEE'],
  EQUIPES_AFFECTEES: ['CONTROLE_EN_COURS', 'ANNULEE'],
  CONTROLE_EN_COURS: ['CONTROLE_TERMINE'],
  CONTROLE_TERMINE: ['RESULTAT'],
  RESULTAT: ['PROCES_VERBAL'],
  PROCES_VERBAL: ['FEUILLE_OBSERVATIONS', 'RAPPORT'],
  FEUILLE_OBSERVATIONS: ['RAPPORT'],
  RAPPORT: ['CLOTUREE'],
  REJETEE: ['BROUILLON'], // Reprise du dossier pour correction
  CLOTUREE: [],
  ANNULEE: [],
  // Statuts non applicables à SUR_PLACE
  DEMANDE_SOUMISE: [],
  EXAMEN_CHEF_SECTION: [],
  AUTORISATION_GENEREE: [],
  CONTROLEUR_DESIGNE: [],
};

// Matrice des transitions permises pour le Contrôle SUR PIÈCES
export const SUR_PIECES_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  BROUILLON: ['DEMANDE_SOUMISE', 'ANNULEE'],
  DEMANDE_SOUMISE: ['EXAMEN_CHEF_SECTION', 'REJETEE', 'ANNULEE'],
  EXAMEN_CHEF_SECTION: ['APPROUVEE', 'REJETEE', 'ANNULEE'],
  APPROUVEE: ['AUTORISATION_GENEREE', 'ANNULEE'],
  AUTORISATION_GENEREE: ['CONTROLEUR_DESIGNE', 'ANNULEE'],
  CONTROLEUR_DESIGNE: ['CONTROLE_EN_COURS', 'ANNULEE'],
  CONTROLE_EN_COURS: ['CONTROLE_TERMINE'],
  CONTROLE_TERMINE: ['RESULTAT'],
  RESULTAT: ['PROCES_VERBAL'],
  PROCES_VERBAL: ['FEUILLE_OBSERVATIONS', 'RAPPORT'],
  FEUILLE_OBSERVATIONS: ['RAPPORT'],
  RAPPORT: ['CLOTUREE'],
  REJETEE: ['BROUILLON'], // Reprise du dossier pour correction
  CLOTUREE: [],
  ANNULEE: [],
  // Statuts non applicables à SUR_PIECES
  SOUMISE: [],
  EXAMEN_CHEF_DIVISION: [],
  EXAMEN_DIRECTEUR_CONTROLES: [],
  ATTENTE_DG: [],
  ORDRE_MISSION_GENERE: [],
  EQUIPES_AFFECTEES: [],
};

/**
 * Rôles autorisés pour chaque transition clé
 */
export function validateTransitionPermissions(
  user: CurrentUser | null,
  currentStatus: MissionStatus,
  nextStatus: MissionStatus,
  typeControle: MissionType,
  missionBureauId?: string | null
): void {
  if (!user) {
    throw new UnauthorizedError('Utilisateur non authentifié.');
  }

  if (!user.is_active) {
    throw new ForbiddenError('Compte utilisateur inactif ou désactivé.');
  }

  // Règle absolue : ADMIN est un rôle technique et ne peut pas valider de mission métier
  if (user.role === 'ADMIN') {
    throw new ForbiddenError('Le rôle ADMIN technique ne peut pas effectuer d\'approbation ou transition métier.');
  }

  // Vérification de la matrice de transition
  const allowedNextStatuses =
    typeControle === 'SUR_PLACE'
      ? SUR_PLACE_TRANSITIONS[currentStatus] || []
      : SUR_PIECES_TRANSITIONS[currentStatus] || [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new ForbiddenError(
      `Transition invalide pour une mission ${typeControle} : de '${currentStatus}' vers '${nextStatus}'.`
    );
  }

  // Contrôles spécifiques par échelon et rôle
  if (typeControle === 'SUR_PLACE') {
    if (nextStatus === 'SOUMISE') {
      // Soumission : réservée au bureau initiateur
      if (user.role !== 'CHEF_BUREAU' && user.role !== 'ANALYSTE' && user.role !== 'CONTROLEUR') {
        throw new ForbiddenError('Seul un agent ou responsable du Bureau de contrôle compétent peut soumettre la mission.');
      }
      if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId) {
        throw new ForbiddenError('Vous ne pouvez soumettre une mission que pour votre propre Bureau de contrôle.');
      }
    } else if (nextStatus === 'EXAMEN_CHEF_DIVISION' || (currentStatus === 'SOUMISE' && nextStatus === 'EXAMEN_DIRECTEUR_CONTROLES')) {
      if (user.role !== 'CHEF_DIVISION') {
        throw new ForbiddenError('Seul le Chef de Division Contrôle peut instruire ce niveau d\'examen.');
      }
    } else if (currentStatus === 'EXAMEN_CHEF_DIVISION' && nextStatus === 'EXAMEN_DIRECTEUR_CONTROLES') {
      if (user.role !== 'CHEF_DIVISION') {
        throw new ForbiddenError('Seul le Chef de Division Contrôle peut transmettre au Directeur des Contrôles.');
      }
    } else if (nextStatus === 'ATTENTE_DG') {
      if (user.role !== 'DIRECTEUR_CONTROLES') {
        throw new ForbiddenError('Seul le Directeur des Contrôles et Recoupements peut transmettre au Directeur Général.');
      }
    } else if (currentStatus === 'ATTENTE_DG' && (nextStatus === 'APPROUVEE' || nextStatus === 'REJETEE')) {
      if (user.role !== 'DIRECTEUR_GENERAL') {
        throw new ForbiddenError('Seul le Directeur Général peut approuver ou rejeter une mission de contrôle sur place.');
      }
    }
  } else if (typeControle === 'SUR_PIECES') {
    if (nextStatus === 'DEMANDE_SOUMISE') {
      if (user.role !== 'CHEF_BUREAU' && user.role !== 'ANALYSTE' && user.role !== 'CONTROLEUR') {
        throw new ForbiddenError('Seul un agent ou responsable du Bureau compétent peut soumettre une demande de contrôle sur pièces.');
      }
      if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId) {
        throw new ForbiddenError('Vous ne pouvez soumettre une mission que pour votre propre Bureau de contrôle.');
      }
    } else if (nextStatus === 'EXAMEN_CHEF_SECTION') {
      if (user.role !== 'CHEF_SECTION' && user.role !== 'CHEF_BUREAU') {
        throw new ForbiddenError('Seul le Chef de Section ou Chef de Bureau peut examiner ce dossier.');
      }
    } else if (
      (currentStatus === 'EXAMEN_CHEF_SECTION' || currentStatus === 'DEMANDE_SOUMISE') &&
      (nextStatus === 'APPROUVEE' || nextStatus === 'REJETEE')
    ) {
      if (user.role !== 'CHEF_SECTION') {
        throw new ForbiddenError('Seul le Chef de Section peut approuver ou rejeter un contrôle sur pièces.');
      }
    }
  }

  // Reprise d'une mission rejetée vers BROUILLON
  if (currentStatus === 'REJETEE' && nextStatus === 'BROUILLON') {
    if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId) {
      throw new ForbiddenError('Seul le Bureau initiateur peut reprendre une mission rejetée en brouillon pour correction.');
    }
  }
}

/**
 * Détermine le type de validation associé au rôle
 */
export function getValidationTypeForRole(role: string): ValidationType {
  switch (role) {
    case 'CHEF_DIVISION':
      return 'CHEF_DIVISION';
    case 'DIRECTEUR_CONTROLES':
      return 'DIRECTEUR_CONTROLES';
    case 'DIRECTEUR_GENERAL':
      return 'DG';
    case 'CHEF_SECTION':
      return 'CHEF_SECTION';
    default:
      throw new ForbiddenError(`Le rôle '${role}' ne correspond à aucun échelon de validation officielle.`);
  }
}

/**
 * Générateur de référence technique standardisée pour les missions : MIS-YYYY-NNNNNN
 */
export function formatMissionReference(seq: number, year: number = new Date().getFullYear()): string {
  const padded = String(seq).padStart(6, '0');
  return `MIS-${year}-${padded}`;
}

/**
 * Générateur de référence pour l'Ordre de mission : OM-YYYY-NNNNNN
 */
export function formatOrdreMissionReference(seq: number, year: number = new Date().getFullYear()): string {
  const padded = String(seq).padStart(6, '0');
  return `OM-${year}-${padded}`;
}

/**
 * Générateur de référence pour l'Autorisation sur pièces : AUT-YYYY-NNNNNN
 */
export function formatAutorisationReference(seq: number, year: number = new Date().getFullYear()): string {
  const padded = String(seq).padStart(6, '0');
  return `AUT-${year}-${padded}`;
}

/**
 * Générateur de référence pour le Rapport de mission : RAP-YYYY-NNNNNN
 */
export function formatRapportReference(seq: number, year: number = new Date().getFullYear()): string {
  const padded = String(seq).padStart(6, '0');
  return `RAP-${year}-${padded}`;
}

