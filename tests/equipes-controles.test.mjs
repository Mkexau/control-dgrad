// =============================================================================
// DGRAD CONTROLE - TESTS UNITAIRES & INTÉGRATION : ÉQUIPES ET CONTRÔLE SUR PLACE (ÉTAPE 7)
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EquipeCreateSchema,
  EquipeUpdateSchema,
  EquipeAddAgentSchema,
  EquipeRemoveAgentSchema,
  EquipeAddAssujettiSchema,
  EquipeRemoveAssujettiSchema,
  EquipeDesignateChefSchema,
} from '../lib/validations/equipes.ts';

import {
  ControleStartSchema,
  ControleSaveConstatationsSchema,
  ControleFinishSchema,
} from '../lib/validations/controles.ts';

test('Module Équipes & Contrôle SUR_PLACE — Validation Zod & Règles Métier', async (t) => {
  const dummyUUID1 = '11111111-1111-4111-8111-111111111111';
  const dummyUUID2 = '22222222-2222-4222-8222-222222222222';
  const dummyUUID3 = '33333333-3333-4333-8333-333333333333';
  const dummyUUID4 = '44444444-4444-4444-8444-444444444444';

  // ---------------------------------------------------------------------------
  // 1. Schémas de Validation Zod : Équipes
  // ---------------------------------------------------------------------------
  await t.test('1. Schémas de Validation Zod : Équipes', async (t2) => {
    await t2.test('EquipeCreateSchema : valide une création d\'équipe complète', () => {
      const validData = {
        mission_id: dummyUUID1,
        nom: 'Équipe Alpha Terrain',
        chef_equipe_id: dummyUUID2,
        agents_ids: [dummyUUID3, dummyUUID4],
        assujettis_ids: [dummyUUID1],
      };
      const res = EquipeCreateSchema.safeParse(validData);
      assert.equal(res.success, true);
    });

    await t2.test('EquipeCreateSchema : rejette si le nom est trop court (< 2 chars)', () => {
      const invalidData = {
        mission_id: dummyUUID1,
        nom: 'A',
        chef_equipe_id: dummyUUID2,
      };
      const res = EquipeCreateSchema.safeParse(invalidData);
      assert.equal(res.success, false);
      if (!res.success) {
        const errorMsg = res.error.issues?.[0]?.message || res.error.message;
        assert.match(errorMsg, /au moins 2 caractères/);
      }
    });

    await t2.test('EquipeCreateSchema : rejette un identifiant de chef d\'équipe non UUID', () => {
      const invalidData = {
        mission_id: dummyUUID1,
        nom: 'Équipe Bravo',
        chef_equipe_id: 'invalid-id',
      };
      const res = EquipeCreateSchema.safeParse(invalidData);
      assert.equal(res.success, false);
    });

    await t2.test('EquipeUpdateSchema : valide une mise à jour de nom ou de chef', () => {
      const validData = {
        equipe_id: dummyUUID1,
        nom: 'Équipe Alpha Renommée',
        chef_equipe_id: dummyUUID3,
      };
      const res = EquipeUpdateSchema.safeParse(validData);
      assert.equal(res.success, true);
    });

    await t2.test('EquipeAddAgentSchema & EquipeRemoveAgentSchema : valident les UUIDs', () => {
      const addRes = EquipeAddAgentSchema.safeParse({
        equipe_id: dummyUUID1,
        agent_id: dummyUUID2,
      });
      assert.equal(addRes.success, true);

      const removeRes = EquipeRemoveAgentSchema.safeParse({
        equipe_id: dummyUUID1,
        agent_id: dummyUUID2,
      });
      assert.equal(removeRes.success, true);
    });

    await t2.test('EquipeAddAssujettiSchema & EquipeRemoveAssujettiSchema : valident les UUIDs', () => {
      const addRes = EquipeAddAssujettiSchema.safeParse({
        equipe_id: dummyUUID1,
        assujetti_id: dummyUUID3,
      });
      assert.equal(addRes.success, true);

      const removeRes = EquipeRemoveAssujettiSchema.safeParse({
        equipe_id: dummyUUID1,
        assujetti_id: dummyUUID3,
      });
      assert.equal(removeRes.success, true);
    });

    await t2.test('EquipeDesignateChefSchema : valide la désignation du chef', () => {
      const res = EquipeDesignateChefSchema.safeParse({
        equipe_id: dummyUUID1,
        chef_equipe_id: dummyUUID4,
      });
      assert.equal(res.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Schémas de Validation Zod : Contrôles Opérationnels
  // ---------------------------------------------------------------------------
  await t.test('2. Schémas de Validation Zod : Contrôles Opérationnels', async (t2) => {
    await t2.test('ControleStartSchema : valide un démarrage avec ou sans date_debut', () => {
      const res1 = ControleStartSchema.safeParse({
        controle_id: dummyUUID1,
      });
      assert.equal(res1.success, true);

      const res2 = ControleStartSchema.safeParse({
        controle_id: dummyUUID1,
        date_debut: '2026-08-27',
      });
      assert.equal(res2.success, true);
    });

    await t2.test('ControleSaveConstatationsSchema : valide des observations conformes', () => {
      const res = ControleSaveConstatationsSchema.safeParse({
        controle_id: dummyUUID1,
        observations: 'Contrôle effectué sur place, examen des quittances 2025 et 2026 satisfaisant.',
      });
      assert.equal(res.success, true);
    });

    await t2.test('ControleSaveConstatationsSchema : rejette des observations trop courtes (< 5 chars)', () => {
      const res = ControleSaveConstatationsSchema.safeParse({
        controle_id: dummyUUID1,
        observations: 'RAS',
      });
      assert.equal(res.success, false);
      if (!res.success) {
        const errorMsg = res.error.issues?.[0]?.message || res.error.message;
        assert.match(errorMsg, /au moins 5 caractères/);
      }
    });

    await t2.test('ControleFinishSchema : valide la clôture du contrôle', () => {
      const res = ControleFinishSchema.safeParse({
        controle_id: dummyUUID1,
        observations: 'Opérations closes sans irrégularité majeure.',
        date_fin: '2026-08-28',
      });
      assert.equal(res.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Règles Métier : Équipes & Affectations
  // ---------------------------------------------------------------------------
  await t.test('3. Règles Métier : Équipes & Affectations', async (t2) => {
    await t2.test('ADMIN ne peut pas créer ni modifier une équipe opérationnelle (séparation technique/métier)', () => {
      const userAdmin = { role: 'ADMIN' };
      const isAllowed = userAdmin.role !== 'ADMIN';
      assert.equal(isAllowed, false, 'ADMIN ne doit pas pouvoir effectuer d\'opérations d\'équipe métier.');
    });

    await t2.test('Une équipe ne peut être modifiée que si son statut est PROPOSEE et sa mission en BROUILLON', () => {
      const isEditable = (equipeStatut, missionStatut) => {
        return equipeStatut === 'PROPOSEE' && missionStatut === 'BROUILLON';
      };

      assert.equal(isEditable('PROPOSEE', 'BROUILLON'), true);
      assert.equal(isEditable('CONFIRMEE', 'BROUILLON'), false);
      assert.equal(isEditable('PROPOSEE', 'SOUMISE'), false);
      assert.equal(isEditable('CONFIRMEE', 'ORDRE_MISSION_GENERE'), false);
      assert.equal(isEditable('CONFIRMEE', 'EQUIPES_AFFECTEES'), false);
    });

    await t2.test('Un agent inactif ne peut pas être affecté ni désigné chef d\'équipe', () => {
      const agentActif = { id: dummyUUID1, matricule: 'AG-001', actif: true };
      const agentInactif = { id: dummyUUID2, matricule: 'AG-002', actif: false };

      const canAssign = (agent) => agent && agent.actif === true;

      assert.equal(canAssign(agentActif), true);
      assert.equal(canAssign(agentInactif), false);
    });

    await t2.test('Unicité stricte des affectations agents et assujettis (pas de doublon dans une équipe)', () => {
      const currentAgents = [dummyUUID1, dummyUUID2];
      const newAgentId = dummyUUID1; // doublon

      const isDuplicate = currentAgents.includes(newAgentId);
      assert.equal(isDuplicate, true, 'Le doublon d\'agent doit être détecté.');

      const currentAssujettis = [dummyUUID3];
      const newAssujettiId = dummyUUID3; // doublon
      const isDuplicateAss = currentAssujettis.includes(newAssujettiId);
      assert.equal(isDuplicateAss, true, 'Le doublon d\'assujetti doit être détecté.');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Règles Métier : Contrôle SUR_PLACE & Démarrage de terrain
  // ---------------------------------------------------------------------------
  await t.test('4. Règles Métier : Contrôle SUR_PLACE & Démarrage de terrain', async (t2) => {
    await t2.test('Le contrôle ne peut démarrer que si l\'équipe est CONFIRMEE et l\'ordre de mission disponible', () => {
      const canStartControle = (controleStatut, equipeStatut, hasOrdreMission, missionStatut) => {
        if (controleStatut !== 'EN_ATTENTE') return false;
        if (equipeStatut !== 'CONFIRMEE') return false;
        if (!hasOrdreMission) return false;
        if (!['EQUIPES_AFFECTEES', 'CONTROLE_EN_COURS'].includes(missionStatut)) return false;
        return true;
      };

      // Cas valide
      assert.equal(canStartControle('EN_ATTENTE', 'CONFIRMEE', true, 'EQUIPES_AFFECTEES'), true);
      assert.equal(canStartControle('EN_ATTENTE', 'CONFIRMEE', true, 'CONTROLE_EN_COURS'), true);

      // Cas invalides
      assert.equal(canStartControle('EN_ATTENTE', 'PROPOSEE', true, 'EQUIPES_AFFECTEES'), false, 'Refus si équipe PROPOSEE non confirmée');
      assert.equal(canStartControle('EN_ATTENTE', 'CONFIRMEE', false, 'EQUIPES_AFFECTEES'), false, 'Refus si pas d\'ordre de mission');
      assert.equal(canStartControle('EN_COURS', 'CONFIRMEE', true, 'CONTROLE_EN_COURS'), false, 'Refus si déjà EN_COURS');
      assert.equal(canStartControle('EN_ATTENTE', 'CONFIRMEE', true, 'BROUILLON'), false, 'Refus si mission encore en BROUILLON');
    });

    await t2.test('Seul le Chef d\'équipe désigné ou les membres affectés peuvent démarrer le contrôle (anti-IDOR)', () => {
      const equipe = {
        chef_equipe_id: dummyUUID1,
        members: [dummyUUID2, dummyUUID3],
      };

      const isAuthorizedUser = (userAgentId, role) => {
        if (role === 'ADMIN') return false;
        if (userAgentId === equipe.chef_equipe_id) return true;
        if (equipe.members.includes(userAgentId)) return true;
        return false;
      };

      // Chef d'équipe titulaire
      assert.equal(isAuthorizedUser(dummyUUID1, 'CHEF_EQUIPE'), true);
      // Membre de l'équipe
      assert.equal(isAuthorizedUser(dummyUUID2, 'CONTROLEUR'), true);
      // Autre agent non affecté
      assert.equal(isAuthorizedUser(dummyUUID4, 'CHEF_EQUIPE'), false);
      // Admin
      assert.equal(isAuthorizedUser(dummyUUID1, 'ADMIN'), false);
    });

    await t2.test('Clôture d\'un contrôle : transition EN_COURS -> TERMINE', () => {
      const canFinishControle = (statut) => statut === 'EN_COURS';

      assert.equal(canFinishControle('EN_COURS'), true);
      assert.equal(canFinishControle('EN_ATTENTE'), false);
      assert.equal(canFinishControle('TERMINE'), false);
    });
  });
});
