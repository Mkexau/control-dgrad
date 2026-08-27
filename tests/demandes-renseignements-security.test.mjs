// =============================================================================
// DGRAD CONTROLE - SECURITE ET ANTI-IDOR DES DEMANDES DE RENSEIGNEMENTS
// Ces tests appellent les guards de production utilisés par les Server Actions
// et par la page /controles/[id].
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertCanManageDemandeRenseignements,
  assertCanReadControle,
} from '../lib/auth/controle-access.ts';
import { ForbiddenError, UnauthorizedError } from '../lib/auth/rules.ts';

const IDS = {
  controleur: '00000000-0000-4000-8000-000000000001',
  autreControleur: '00000000-0000-4000-8000-000000000002',
  bureau: '00000000-0000-4000-8000-000000000003',
  autreBureau: '00000000-0000-4000-8000-000000000004',
  mission: '00000000-0000-4000-8000-000000000005',
};

function user(overrides = {}) {
  return {
    id: IDS.controleur,
    email: 'controleur@example.test',
    role: 'CONTROLEUR',
    bureau_id: IDS.bureau,
    division_id: null,
    is_active: true,
    nom: 'Contrôleur',
    prenom: 'Test',
    ...overrides,
  };
}

function controle(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    assujetti_id: '00000000-0000-4000-8000-000000000011',
    type_controle: 'SUR_PIECES',
    statut: 'EN_COURS',
    controleur_responsable_id: IDS.controleur,
    mission: { id: IDS.mission, bureau_id: IDS.bureau },
    ...overrides,
  };
}

function assertDenied(action, errorType = ForbiddenError) {
  assert.throws(action, errorType);
}

describe('Sécurité production — demandes de renseignements SUR_PIECES', () => {
  it('applique une migration RLS restrictive sans privilège ADMIN métier', () => {
    const migration = readFileSync(
      new URL('../supabase/migrations/20260827160000_secure_demandes_renseignements_rls.sql', import.meta.url),
      'utf8'
    );
    assert.match(migration, /DROP POLICY IF EXISTS "Gestion des demandes de renseignements par contrôleur ou chef de bureau"/);
    assert.match(migration, /ON demandes_renseignements FOR INSERT TO authenticated WITH CHECK/);
    assert.match(migration, /auth_user_role\(\) = 'CONTROLEUR'/);
    assert.match(migration, /DROP POLICY IF EXISTS "Lecture des contrôles selon affectation et périmètre" ON controles/);
  });

  it('refuse un utilisateur non authentifié', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(null, controle(), 'CREATION'), UnauthorizedError);
  });

  it('refuse un compte inactif', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(user({ is_active: false }), controle(), 'CREATION'));
  });

  it('refuse un rôle non autorisé et ADMIN', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(user({ role: 'CHEF_BUREAU' }), controle(), 'CREATION'));
    assertDenied(() => assertCanManageDemandeRenseignements(user({ role: 'ADMIN' }), controle(), 'CREATION'));
  });

  it('refuse un contrôleur d’un autre bureau', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(user({ bureau_id: IDS.autreBureau }), controle(), 'CREATION'));
  });

  it('refuse un contrôleur non affecté, même s’il connaît le demande_id', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(
      user({ id: IDS.autreControleur }), controle(), 'REPONSE', 'EN_ATTENTE'
    ));
    assertDenied(() => assertCanManageDemandeRenseignements(
      user({ id: IDS.autreControleur }), controle(), 'RELANCE', 'EN_ATTENTE'
    ));
  });

  it('refuse une demande liée à un contrôle SUR_PLACE', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(
      user(), controle({ type_controle: 'SUR_PLACE' }), 'CREATION'
    ));
  });

  it('refuse les contrôles terminés et annulés', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(user(), controle({ statut: 'TERMINE' }), 'CREATION'));
    assertDenied(() => assertCanManageDemandeRenseignements(user(), controle({ statut: 'ANNULE' }), 'CREATION'));
  });

  it('refuse réponse et relance lorsque la demande est déjà répondue', () => {
    assertDenied(() => assertCanManageDemandeRenseignements(user(), controle(), 'REPONSE', 'REPONDU'));
    assertDenied(() => assertCanManageDemandeRenseignements(user(), controle(), 'RELANCE', 'REPONDU'));
  });

  it('autorise le contrôleur actif, affecté et dans son bureau', () => {
    assert.doesNotThrow(() => assertCanManageDemandeRenseignements(user(), controle(), 'CREATION'));
    assert.doesNotThrow(() => assertCanManageDemandeRenseignements(user(), controle(), 'REPONSE', 'EN_ATTENTE'));
    assert.doesNotThrow(() => assertCanManageDemandeRenseignements(user(), controle(), 'RELANCE', 'RELANCE'));
  });

  it('refuse la lecture de /controles/[id] hors périmètre', () => {
    assertDenied(() => assertCanReadControle(user({ id: IDS.autreControleur }), {
      type_controle: 'SUR_PIECES',
      controleur_responsable_id: IDS.controleur,
      mission_bureau_id: IDS.bureau,
      equipe_chef_id: null,
      user_agent_id: null,
    }));
  });

  it('refuse la lecture au contrôleur désigné mais hors du bureau de la mission', () => {
    assertDenied(() => assertCanReadControle(user({ bureau_id: IDS.autreBureau }), {
      type_controle: 'SUR_PIECES',
      controleur_responsable_id: IDS.controleur,
      mission_bureau_id: IDS.bureau,
      equipe_chef_id: null,
      user_agent_id: null,
    }));
  });

  it('autorise la lecture du contrôle SUR_PIECES au contrôleur désigné', () => {
    assert.doesNotThrow(() => assertCanReadControle(user(), {
      type_controle: 'SUR_PIECES',
      controleur_responsable_id: IDS.controleur,
      mission_bureau_id: IDS.bureau,
      equipe_chef_id: null,
      user_agent_id: null,
    }));
  });
});
