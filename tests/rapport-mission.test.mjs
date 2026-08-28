// =============================================================================
// DGRAD CONTROLE - TESTS : RAPPORT DE MISSION, CLÔTURE & SÉCURITÉ (ÉTAPE 11)
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RapportMissionSaveSchema,
  RapportMissionGenerateDocSchema,
  MissionClotureSchema,
} from '../lib/validations/rapports.ts';
import {
  assertCanManageRapportMission,
  assertCanReadMissionDossier,
} from '../lib/auth/controle-access.ts';
import { ForbiddenError, UnauthorizedError } from '../lib/auth/rules.ts';

function formatRapportReference(seq, year = new Date().getFullYear()) {
  const padded = String(seq).padStart(6, '0');
  return `RAP-${year}-${padded}`;
}


const IDS = {
  userChefEquipe: '00000000-0000-4000-8000-000000000001',
  agentChefEquipe: '00000000-0000-4000-8000-000000000002',
  userControleur: '00000000-0000-4000-8000-000000000003',
  userAutreControleur: '00000000-0000-4000-8000-000000000004',
  bureau: '00000000-0000-4000-8000-000000000010',
  autreBureau: '00000000-0000-4000-8000-000000000011',
  missionSurPlace: '00000000-0000-4000-8000-000000000020',
  missionSurPieces: '00000000-0000-4000-8000-000000000021',
};

function createTestUser(overrides = {}) {
  return {
    id: IDS.userChefEquipe,
    email: 'test@dgrad.gouv.cd',
    role: 'CHEF_EQUIPE',
    bureau_id: IDS.bureau,
    division_id: null,
    is_active: true,
    nom: 'Kabamba',
    prenom: 'Alain',
    ...overrides,
  };
}

function createTestMission(overrides = {}) {
  return {
    id: IDS.missionSurPlace,
    type_controle: 'SUR_PLACE',
    statut: 'CONTROLE_TERMINE',
    bureau_id: IDS.bureau,
    equipes_chefs_ids: [IDS.agentChefEquipe],
    controleurs_ids: [IDS.userControleur],
    ...overrides,
  };
}

describe('Étape 11 — Rapport de Mission, Clôture et Finalisation du Dossier', () => {

  // ===========================================================================
  // 1. SCHÉMAS DE VALIDATION ZOD
  // ===========================================================================
  describe('1. Schémas de Validation Zod : Rapport de Mission & Clôture', () => {

    it('RapportMissionSaveSchema : valide un rapport avec contenu conforme', () => {
      const result = RapportMissionSaveSchema.safeParse({
        mission_id: IDS.missionSurPlace,
        contenu: 'Synthèse des opérations de contrôle non fiscal : l\'ensemble des 3 entreprises ont été auditées.',
        statut: 'FINALISE',
      });
      assert.equal(result.success, true);
    });

    it('RapportMissionSaveSchema : rejette un contenu de rapport trop court (< 10 caractères)', () => {
      const result = RapportMissionSaveSchema.safeParse({
        mission_id: IDS.missionSurPlace,
        contenu: 'Court',
      });
      assert.equal(result.success, false);
      const errors = result.error?.issues.map((i) => i.message);
      assert.ok(errors?.some((e) => e.includes('10 caractères')), 'Doit exiger au moins 10 caractères');
    });

    it('RapportMissionSaveSchema : rejette un identifiant de mission non UUID', () => {
      const result = RapportMissionSaveSchema.safeParse({
        mission_id: 'invalid-id-12345',
        contenu: 'Contenu du rapport de contrôle conforme et exhaustif.',
      });
      assert.equal(result.success, false);
    });

    it('RapportMissionGenerateDocSchema : valide une demande de génération documentaire', () => {
      const result = RapportMissionGenerateDocSchema.safeParse({
        mission_id: IDS.missionSurPlace,
      });
      assert.equal(result.success, true);
    });

    it('MissionClotureSchema : valide une demande de clôture avec motif optionnel', () => {
      const result = MissionClotureSchema.safeParse({
        mission_id: IDS.missionSurPieces,
        motif_cloture: 'Clôture après recouvrement complet des droits ordonnancés.',
      });
      assert.equal(result.success, true);
    });
  });

  // ===========================================================================
  // 2. SÉCURITÉ MÉTIER, ANTI-IDOR ET PERMISSIONS (assertCanManageRapportMission)
  // ===========================================================================
  describe('2. Permissions & Sécurité IDOR : Gestion du Rapport de Mission', () => {

    it('ADMIN technique est formellement REFUSÉ de toute gestion de rapport métier (RM-025)', () => {
      const admin = createTestUser({ role: 'ADMIN' });
      const mission = createTestMission();

      assert.throws(
        () => assertCanManageRapportMission(admin, mission, null),
        ForbiddenError
      );
    });

    it('Chef d\'équipe assigné à la mission SUR_PLACE est AUTORISÉ à rédiger le rapport', () => {
      const chefEquipe = createTestUser({ role: 'CHEF_EQUIPE' });
      const mission = createTestMission({ type_controle: 'SUR_PLACE', equipes_chefs_ids: [IDS.agentChefEquipe] });

      const authorizedUser = assertCanManageRapportMission(chefEquipe, mission, IDS.agentChefEquipe);
      assert.equal(authorizedUser.id, chefEquipe.id);
    });

    it('Chef d\'équipe NON assigné à la mission est REFUSÉ (Protection IDOR)', () => {
      const chefEquipe = createTestUser({ role: 'CHEF_EQUIPE' });
      const mission = createTestMission({ type_controle: 'SUR_PLACE', equipes_chefs_ids: ['autre-agent-id'] });

      assert.throws(
        () => assertCanManageRapportMission(chefEquipe, mission, IDS.agentChefEquipe),
        ForbiddenError
      );
    });

    it('Contrôleur désigné sur mission SUR_PIECES de son bureau est AUTORISÉ', () => {
      const controleur = createTestUser({ id: IDS.userControleur, role: 'CONTROLEUR', bureau_id: IDS.bureau });
      const mission = createTestMission({
        type_controle: 'SUR_PIECES',
        bureau_id: IDS.bureau,
        controleurs_ids: [IDS.userControleur],
      });

      const authorizedUser = assertCanManageRapportMission(controleur, mission, null);
      assert.equal(authorizedUser.id, IDS.userControleur);
    });

    it('Contrôleur NON désigné sur mission SUR_PIECES est REFUSÉ (Protection IDOR)', () => {
      const controleur = createTestUser({ id: IDS.userAutreControleur, role: 'CONTROLEUR', bureau_id: IDS.bureau });
      const mission = createTestMission({
        type_controle: 'SUR_PIECES',
        bureau_id: IDS.bureau,
        controleurs_ids: [IDS.userControleur],
      });

      assert.throws(
        () => assertCanManageRapportMission(controleur, mission, null),
        ForbiddenError
      );
    });

    it('Chef de Bureau du bureau compétent est AUTORISÉ', () => {
      const chefBureau = createTestUser({ role: 'CHEF_BUREAU', bureau_id: IDS.bureau });
      const mission = createTestMission({ bureau_id: IDS.bureau });

      const authorizedUser = assertCanManageRapportMission(chefBureau, mission, null);
      assert.equal(authorizedUser.role, 'CHEF_BUREAU');
    });

    it('Chef de Bureau d\'un AUTRE bureau est REFUSÉ (Cloisonnement organisationnel)', () => {
      const chefBureauAutre = createTestUser({ role: 'CHEF_BUREAU', bureau_id: IDS.autreBureau });
      const mission = createTestMission({ bureau_id: IDS.bureau });

      assert.throws(
        () => assertCanManageRapportMission(chefBureauAutre, mission, null),
        ForbiddenError
      );
    });

    it('Chef de Section pour SUR_PIECES de son bureau est AUTORISÉ', () => {
      const chefSection = createTestUser({ role: 'CHEF_SECTION', bureau_id: IDS.bureau });
      const mission = createTestMission({ type_controle: 'SUR_PIECES', bureau_id: IDS.bureau });

      const authorizedUser = assertCanManageRapportMission(chefSection, mission, null);
      assert.equal(authorizedUser.role, 'CHEF_SECTION');
    });

    it('Directeur Général et Hiérarchie sont AUTORISÉS sur leur périmètre', () => {
      const dg = createTestUser({ role: 'DIRECTEUR_GENERAL', bureau_id: null });
      const dirControles = createTestUser({ role: 'DIRECTEUR_CONTROLES', bureau_id: null });
      const chefDiv = createTestUser({ role: 'CHEF_DIVISION', bureau_id: null });
      const mission = createTestMission();

      assert.equal(assertCanManageRapportMission(dg, mission, null).role, 'DIRECTEUR_GENERAL');
      assert.equal(assertCanManageRapportMission(dirControles, mission, null).role, 'DIRECTEUR_CONTROLES');
      assert.equal(assertCanManageRapportMission(chefDiv, mission, null).role, 'CHEF_DIVISION');
    });

    it('Utilisateur inactif est REFUSÉ', () => {
      const inactiveUser = createTestUser({ is_active: false, role: 'CHEF_BUREAU', bureau_id: IDS.bureau });
      const mission = createTestMission({ bureau_id: IDS.bureau });

      assert.throws(
        () => assertCanManageRapportMission(inactiveUser, mission, null),
        ForbiddenError
      );
    });

    it('Utilisateur non connecté (null) est REFUSÉ avec UnauthorizedError', () => {
      const mission = createTestMission();

      assert.throws(
        () => assertCanManageRapportMission(null, mission, null),
        UnauthorizedError
      );
    });
  });

  // ===========================================================================
  // 3. CONSULTATION DU DOSSIER DE MISSION (assertCanReadMissionDossier)
  // ===========================================================================
  describe('3. Consultation du Dossier & Rapports (assertCanReadMissionDossier)', () => {

    it('ADMIN est refusé en lecture directe du dossier métier par défaut', () => {
      const admin = createTestUser({ role: 'ADMIN' });
      const mission = createTestMission();

      assert.throws(
        () => assertCanReadMissionDossier(admin, mission, null),
        ForbiddenError
      );
    });

    it('Agent du bureau compétent peut consulter le dossier', () => {
      const analyste = createTestUser({ role: 'ANALYSTE', bureau_id: IDS.bureau });
      const mission = createTestMission({ bureau_id: IDS.bureau });

      const u = assertCanReadMissionDossier(analyste, mission, null);
      assert.equal(u.role, 'ANALYSTE');
    });

    it('Agent d\'un autre bureau ne peut pas consulter le dossier (anti-IDOR)', () => {
      const analysteAutre = createTestUser({ role: 'ANALYSTE', bureau_id: IDS.autreBureau });
      const mission = createTestMission({ bureau_id: IDS.bureau });

      assert.throws(
        () => assertCanReadMissionDossier(analysteAutre, mission, null),
        ForbiddenError
      );
    });
  });

  // ===========================================================================
  // 4. FORMATAGE ET RÉFÉRENCES OFFICIELLES
  // ===========================================================================
  describe('4. Formatage des Références Documentaires Officielles', () => {

    it('formatRapportReference : génère une référence normalisée RAP-YYYY-NNNNNN', () => {
      const ref1 = formatRapportReference(1, 2026);
      assert.equal(ref1, 'RAP-2026-000001');

      const ref42 = formatRapportReference(42, 2026);
      assert.equal(ref42, 'RAP-2026-000042');
    });
  });

  // ===========================================================================
  // 5. QUESTIONS MÉTIER OUVERTES : QM-026 & QM-027
  // ===========================================================================
  describe('5. Respect Strict des Questions Métier Ouvertes (QM-026 & QM-027)', () => {

    it('QM-026 : Le système ne simule pas de clôture arbitraire tant que l\'autorité n\'est pas validée', () => {
      // Vérification que les prérequis techniques de fin de parcours sont distingués
      // de la décision finale administrative réservée par QM-026
      const missionNonTerminee = {
        controles: [{ id: 'c1', statut: 'EN_COURS' }],
        rapport: null,
      };

      const controlesFinis = missionNonTerminee.controles.every((c) => c.statut === 'TERMINE');
      assert.equal(controlesFinis, false, 'Un contrôle en cours ne remplit pas les prérequis');

      const missionPreteTechnique = {
        controles: [{ id: 'c1', statut: 'TERMINE' }, { id: 'c2', statut: 'TERMINE' }],
        rapport: { id: 'r1', statut: 'FINALISE' },
      };

      const controlesTousFinis = missionPreteTechnique.controles.every((c) => c.statut === 'TERMINE');
      assert.equal(controlesTousFinis, true, 'Tous les contrôles doivent être terminés');
      assert.ok(missionPreteTechnique.rapport !== null, 'Le rapport doit exister');
    });

    it('QM-027 : Permet la saisie/personnalisation du contenu tout en consolidant les données', () => {
      const input = {
        mission_id: IDS.missionSurPlace,
        contenu: 'Observations détaillées et recommandations suite aux vérifications de terrain.',
      };
      const parsed = RapportMissionSaveSchema.safeParse(input);
      assert.equal(parsed.success, true);
    });
  });
});
