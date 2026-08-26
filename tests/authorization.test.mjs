import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Import authorization helpers and permissions directly
import {
  requireAuthenticatedUser,
  requireRole,
  assertNotAdminBusinessOverride,
  validateBureauAccess,
  validateMissionAccess,
  validateControlAccess,
} from '../lib/auth/authorization.ts';

import { hasPermission } from '../lib/permissions/roles.ts';

describe('Server Authorization & Role Security Tests', () => {
  const createMockContext = (role, bureauId = 'bureau-101', agentId = 'agent-201', profileId = 'prof-301') => ({
    authUser: { id: 'auth-user-001', email: 'test@dgrad.cd' },
    profile: {
      id: profileId,
      auth_user_id: 'auth-user-001',
      nom: 'MUKENDI',
      prenom: 'Exaucé',
      email: 'test@dgrad.cd',
      telephone: null,
      bureau_id: bureauId,
      role,
      actif: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    agent: agentId ? { id: agentId, profile_id: profileId, matricule: 'AGT-001', specialite: null, domaine_competence: null, actif: true } : null,
    role,
    bureauId,
    divisionId: 'div-001',
  });

  it('1. Unauthenticated user (null context) throws UNAUTHENTICATED error', () => {
    assert.throws(
      () => requireAuthenticatedUser(null),
      (err) => err.code === 'UNAUTHENTICATED'
    );
  });

  it('2. ADMIN allows technical admin actions', () => {
    const adminCtx = createMockContext('ADMIN');
    assert.ok(hasPermission('ADMIN', 'ADMIN_MANAGE_USERS'));
    assert.ok(hasPermission('ADMIN', 'ADMIN_MANAGE_ORGANIZATION'));
    assert.doesNotThrow(() => requireRole(adminCtx, ['ADMIN']));
  });

  it('3. ADMIN -> DG approval is strictly prohibited (assertNotAdminBusinessOverride)', () => {
    assert.throws(
      () => assertNotAdminBusinessOverride('ADMIN', 'VALIDATION_DG'),
      (err) => err.code === 'ADMIN_BUSINESS_OVERRIDE_PROHIBITED'
    );
    assert.strictEqual(hasPermission('ADMIN', 'MISSION_APPROVE_DG'), false);
  });

  it('4. ADMIN -> CHEF_SECTION approval is strictly prohibited', () => {
    assert.throws(
      () => assertNotAdminBusinessOverride('ADMIN', 'VALIDATION_CHEF_SECTION'),
      (err) => err.code === 'ADMIN_BUSINESS_OVERRIDE_PROHIBITED'
    );
    assert.strictEqual(hasPermission('ADMIN', 'MISSION_APPROVE_SECTION'), false);
  });

  it('5. DIRECTEUR_GENERAL -> DG decision is authorized', () => {
    const dgCtx = createMockContext('DIRECTEUR_GENERAL');
    assert.ok(hasPermission('DIRECTEUR_GENERAL', 'MISSION_APPROVE_DG'));
    assert.ok(hasPermission('DIRECTEUR_GENERAL', 'MISSION_REJECT_DG'));
    assert.doesNotThrow(() => requireRole(dgCtx, ['DIRECTEUR_GENERAL']));
  });

  it('6. CHEF_SECTION -> SUR_PIECES decision is authorized', () => {
    const sectionCtx = createMockContext('CHEF_SECTION');
    assert.ok(hasPermission('CHEF_SECTION', 'MISSION_APPROVE_SECTION'));
    assert.doesNotThrow(() => requireRole(sectionCtx, ['CHEF_SECTION']));
  });

  it('7. CHEF_SECTION -> SUR_PLACE DG approval is denied', () => {
    assert.strictEqual(hasPermission('CHEF_SECTION', 'MISSION_APPROVE_DG'), false);
  });

  it('8. CHEF_EQUIPE -> access outside team/assignment is denied', () => {
    const chefEqCtx = createMockContext('CHEF_EQUIPE');
    const mission = { id: 'miss-999', bureau_id: 'bureau-888', type_controle: 'SUR_PLACE' };
    const hasAccess = validateMissionAccess(chefEqCtx, mission, { isTeamLead: false, isTeamMember: false });
    assert.strictEqual(hasAccess, false);
  });

  it('9. CONTROLEUR -> access to unassigned control is denied', () => {
    const ctrlCtx = createMockContext('CONTROLEUR', 'bureau-101', 'agent-201', 'prof-301');
    const control = {
      id: 'ctrl-777',
      mission_id: 'miss-777',
      bureau_id: 'bureau-101',
      controleur_responsable_id: 'prof-999', // Different controller
      chef_equipe_id: 'agent-999',
    };
    const hasAccess = validateControlAccess(ctrlCtx, control, { isTeamMember: false });
    assert.strictEqual(hasAccess, false);
  });

  it('10. Bureau user -> access to a resource of another bureau is denied', () => {
    const cbCtx = createMockContext('CHEF_BUREAU', 'bureau-101');
    const targetBureauId = 'bureau-202';
    const isAllowed = validateBureauAccess(cbCtx, targetBureauId);
    assert.strictEqual(isAllowed, false);
  });

  it('11. Security Audit: Server secrets are NOT exposed via client variables or bundle', () => {
    const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf-8');
    assert.ok(!envExample.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'), 'Service role key MUST NEVER use NEXT_PUBLIC_ prefix');

    const adminClientCode = fs.readFileSync(path.resolve('lib/supabase/admin.ts'), 'utf-8');
    assert.ok(adminClientCode.includes("typeof window !== 'undefined'"), 'Admin client must contain client-side execution guard');
  });
});
