import { AppRole } from '@/lib/types/auth';

export type Permission =
  | 'ADMIN_MANAGE_USERS'
  | 'ADMIN_MANAGE_ORGANIZATION'
  | 'ANALYSE_CREATE'
  | 'ANALYSE_VIEW'
  | 'MISSION_CREATE'
  | 'MISSION_SUBMIT'
  | 'MISSION_EXAMINE_DIVISION'
  | 'MISSION_EXAMINE_DIRECTEUR'
  | 'MISSION_APPROVE_DG'
  | 'MISSION_REJECT_DG'
  | 'MISSION_APPROVE_SECTION'
  | 'MISSION_REJECT_SECTION'
  | 'EQUIPE_MANAGE'
  | 'CONTROLE_RECORD_RESULTAT'
  | 'CONTROLE_CREATE_PV'
  | 'CONTROLE_CREATE_OBSERVATION';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  ADMIN: [
    'ADMIN_MANAGE_USERS',
    'ADMIN_MANAGE_ORGANIZATION',
  ],
  ANALYSTE: [
    'ANALYSE_CREATE',
    'ANALYSE_VIEW',
    'MISSION_CREATE',
  ],
  CHEF_BUREAU: [
    'ANALYSE_CREATE',
    'ANALYSE_VIEW',
    'MISSION_CREATE',
    'MISSION_SUBMIT',
    'EQUIPE_MANAGE',
  ],
  CHEF_SECTION: [
    'MISSION_APPROVE_SECTION',
    'MISSION_REJECT_SECTION',
  ],
  CHEF_DIVISION: [
    'MISSION_EXAMINE_DIVISION',
  ],
  DIRECTEUR_CONTROLES: [
    'MISSION_EXAMINE_DIRECTEUR',
  ],
  DIRECTEUR_GENERAL: [
    'MISSION_APPROVE_DG',
    'MISSION_REJECT_DG',
  ],
  CHEF_EQUIPE: [
    'CONTROLE_RECORD_RESULTAT',
    'CONTROLE_CREATE_PV',
    'CONTROLE_CREATE_OBSERVATION',
  ],
  CONTROLEUR: [
    'CONTROLE_RECORD_RESULTAT',
    'CONTROLE_CREATE_PV',
    'CONTROLE_CREATE_OBSERVATION',
  ],
  CONSULTATION: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  // Absolute prohibition on ADMIN business decision overrides
  const adminForbiddenPermissions: Permission[] = [
    'MISSION_APPROVE_DG',
    'MISSION_REJECT_DG',
    'MISSION_APPROVE_SECTION',
    'MISSION_REJECT_SECTION',
    'CONTROLE_RECORD_RESULTAT',
    'CONTROLE_CREATE_PV',
    'CONTROLE_CREATE_OBSERVATION',
  ];

  if (role === 'ADMIN' && adminForbiddenPermissions.includes(permission)) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
