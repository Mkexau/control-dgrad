import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCanReadMissionDossier } from '../lib/auth/controle-access.ts';
import { ForbiddenError } from '../lib/auth/rules.ts';

const projectRoot = process.cwd();

const missionScopeA = {
  id: '11111111-1111-4111-8111-111111111111',
  type_controle: 'SUR_PLACE',
  statut: 'SOUMISE',
  bureau_id: '22222222-2222-4222-8222-222222222222',
  equipes_chefs_ids: ['33333333-3333-4333-8333-333333333333'],
  equipes_agents_ids: ['44444444-4444-4444-8444-444444444444'],
  controleurs_ids: [],
};

const missionScopeB = {
  id: '99999999-9999-4999-8999-999999999999',
  type_controle: 'SUR_PLACE',
  statut: 'SOUMISE',
  bureau_id: '88888888-8888-4888-8888-888888888888',
  equipes_chefs_ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  equipes_agents_ids: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  controleurs_ids: [],
};

const missionSurPieces = {
  id: '55555555-5555-4555-8555-555555555555',
  type_controle: 'SUR_PIECES',
  statut: 'DEMANDE_SOUMISE',
  bureau_id: '22222222-2222-4222-8222-222222222222',
  equipes_chefs_ids: [],
  equipes_agents_ids: [],
  controleurs_ids: ['66666666-6666-4666-8666-666666666666'],
};

describe('Missions — routage canonique, permissions hiérarchiques et anti-IDOR', () => {
  it('1. CHEF_DIVISION Contrôle peut ouvrir une mission SUR_PLACE de son périmètre', () => {
    const chefDivisionControle = {
      id: 'c1111111-1111-4111-8111-111111111111',
      email: 'chef.division.controle@test.local',
      role: 'CHEF_DIVISION',
      bureau_id: null,
      division_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      division_code: 'DIV_CTRL',
      is_active: true,
    };

    assert.doesNotThrow(() => assertCanReadMissionDossier(chefDivisionControle, missionScopeA));
  });

  it('2. Une mission hors périmètre est refusée', () => {
    const chefDivisionRecoupement = {
      id: 'c2222222-2222-4222-8222-222222222222',
      email: 'chef.recoupement@test.local',
      role: 'CHEF_DIVISION',
      bureau_id: null,
      division_id: 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr',
      division_code: 'DIV_REC',
      is_active: true,
    };

    const chefBureauAutre = {
      id: 'c3333333-3333-4333-8333-333333333333',
      email: 'autre.chef.bureau@test.local',
      role: 'CHEF_BUREAU',
      bureau_id: '77777777-7777-4777-8777-777777777777',
      is_active: true,
    };

    // Chef division recoupement ne peut pas ouvrir de mission de contrôle
    assert.throws(() => assertCanReadMissionDossier(chefDivisionRecoupement, missionScopeA), ForbiddenError);

    // Chef de division contrôle ne peut pas ouvrir de mission SUR_PIECES (gérée au niveau section/bureau)
    assert.throws(() => assertCanReadMissionDossier({
      id: 'c1111111-1111-4111-8111-111111111111',
      email: 'chef.division.controle@test.local',
      role: 'CHEF_DIVISION',
      bureau_id: null,
      division_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      division_code: 'DIV_CTRL',
      is_active: true,
    }, missionSurPieces), ForbiddenError);

    // Chef bureau externe ne peut pas ouvrir missionScopeA
    assert.throws(() => assertCanReadMissionDossier(chefBureauAutre, missionScopeA), ForbiddenError);
  });

  it('3. Un UUID modifié dans l\'URL ne permet pas de contourner l\'autorisation (anti-IDOR)', () => {
    const chefBureauA = {
      id: 'c4444444-4444-4444-8444-444444444444',
      email: 'chef.bureau.a@test.local',
      role: 'CHEF_BUREAU',
      bureau_id: missionScopeA.bureau_id,
      is_active: true,
    };

    // Autorisé sur missionScopeA de son propre bureau
    assert.doesNotThrow(() => assertCanReadMissionDossier(chefBureauA, missionScopeA));

    // Refus strict si l'utilisateur substitue l'UUID par missionScopeB (autre bureau)
    assert.throws(() => assertCanReadMissionDossier(chefBureauA, missionScopeB), ForbiddenError);
  });

  it('4. Le téléchargement de documents vérifie l\'autorisation d\'accès à la mission', () => {
    // Vérifie que le code serveur de getMissionDocumentDownloadUrl réutilise assertCanReadMissionDossier
    const actionsSource = readFileSync(join(projectRoot, 'app', 'actions', 'missions.ts'), 'utf8');
    assert.match(actionsSource, /assertCanReadMissionDossier\(currentUser, scope/);
    assert.match(actionsSource, /entity_type', 'missions'/);
    assert.match(actionsSource, /storage_path', input\.storage_path/);
  });

  it('5. La liste ne propose pas une action que la page refuserait ensuite', () => {
    const listSource = readFileSync(join(projectRoot, 'app', 'missions', 'missions-client.tsx'), 'utf8');
    const pageSource = readFileSync(join(projectRoot, 'app', 'missions', 'page.tsx'), 'utf8');

    // Vérifie que la liste filtre côté serveur par division_code pour CHEF_DIVISION
    assert.match(pageSource, /currentUser\.division_code === 'DIV_CTRL'/);
    assert.match(pageSource, /missionsQuery\.eq\('type_controle', 'SUR_PLACE'\)/);

    // Vérifie que l'action requise pour CHEF_DIVISION est réservée au contrôle SUR_PLACE
    assert.match(listSource, /case 'CHEF_DIVISION':\s*return type === 'SUR_PLACE'/);
  });

  it('6. La route canonique /missions/[id] fonctionne', () => {
    const detailRoute = join(projectRoot, 'app', 'missions', '[id]', 'page.tsx');
    const listSource = readFileSync(join(projectRoot, 'app', 'missions', 'missions-client.tsx'), 'utf8');

    assert.equal(existsSync(detailRoute), true);
    assert.match(listSource, /href=\{`\/missions\/\$\{m\.id\}`\}/);
  });
});
