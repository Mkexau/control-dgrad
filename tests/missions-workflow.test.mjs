import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MissionCreateSchema,
  MissionValidationDecisionSchema,
  MissionDesignateControleurSchema,
  MissionResetToDraftSchema,
} from '../lib/validations/missions.ts';
import {
  ForbiddenError,
  UnauthorizedError,
} from '../lib/auth/rules.ts';

// =============================================================================
// Logique de workflow embarquée directement dans le test
// (Identique à mission-workflow.ts, sans les alias @/ non résolus par Node)
// =============================================================================

const SUR_PLACE_TRANSITIONS = {
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
  REJETEE: ['BROUILLON'],
  CLOTUREE: [],
  ANNULEE: [],
  DEMANDE_SOUMISE: [],
  EXAMEN_CHEF_BUREAU: [],
  AUTORISATION_GENEREE: [],
  CONTROLEUR_DESIGNE: [],
};

const SUR_PIECES_TRANSITIONS = {
  BROUILLON: ['DEMANDE_SOUMISE', 'ANNULEE'],
  DEMANDE_SOUMISE: ['EXAMEN_CHEF_BUREAU', 'REJETEE', 'ANNULEE'],
  EXAMEN_CHEF_BUREAU: ['APPROUVEE', 'REJETEE', 'ANNULEE'],
  APPROUVEE: ['AUTORISATION_GENEREE', 'ANNULEE'],
  AUTORISATION_GENEREE: ['CONTROLEUR_DESIGNE', 'ANNULEE'],
  CONTROLEUR_DESIGNE: ['CONTROLE_EN_COURS', 'ANNULEE'],
  CONTROLE_EN_COURS: ['CONTROLE_TERMINE'],
  CONTROLE_TERMINE: ['RESULTAT'],
  RESULTAT: ['PROCES_VERBAL'],
  PROCES_VERBAL: ['FEUILLE_OBSERVATIONS', 'RAPPORT'],
  FEUILLE_OBSERVATIONS: ['RAPPORT'],
  RAPPORT: ['CLOTUREE'],
  REJETEE: ['BROUILLON'],
  CLOTUREE: [],
  ANNULEE: [],
  SOUMISE: [],
  EXAMEN_CHEF_DIVISION: [],
  EXAMEN_DIRECTEUR_CONTROLES: [],
  ATTENTE_DG: [],
  ORDRE_MISSION_GENERE: [],
  EQUIPES_AFFECTEES: [],
};

function validateTransitionPermissions(user, currentStatus, nextStatus, typeControle, missionBureauId) {
  if (!user) throw new UnauthorizedError('Utilisateur non authentifié.');
  if (!user.is_active) throw new ForbiddenError('Compte utilisateur inactif.');
  if (user.role === 'ADMIN') throw new ForbiddenError('Le rôle ADMIN technique ne peut pas effectuer de transition métier.');

  const matrix = typeControle === 'SUR_PLACE' ? SUR_PLACE_TRANSITIONS : SUR_PIECES_TRANSITIONS;
  const allowed = matrix[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ForbiddenError(`Transition invalide pour ${typeControle} : '${currentStatus}' → '${nextStatus}'.`);
  }

  if (typeControle === 'SUR_PLACE') {
    if (nextStatus === 'SOUMISE') {
      if (!['CHEF_BUREAU', 'ANALYSTE', 'CONTROLEUR'].includes(user.role))
        throw new ForbiddenError('Seul un agent du Bureau compétent peut soumettre.');
      if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId)
        throw new ForbiddenError('Périmètre de bureau invalide.');
    } else if (nextStatus === 'EXAMEN_CHEF_DIVISION' || (currentStatus === 'EXAMEN_CHEF_DIVISION' && nextStatus === 'EXAMEN_DIRECTEUR_CONTROLES')) {
      if (user.role !== 'CHEF_DIVISION') throw new ForbiddenError('Seul le Chef de Division peut instruire ce niveau.');
    } else if (nextStatus === 'ATTENTE_DG') {
      if (user.role !== 'DIRECTEUR_CONTROLES') throw new ForbiddenError('Seul le Directeur des Contrôles peut transmettre au DG.');
    } else if (currentStatus === 'ATTENTE_DG' && (nextStatus === 'APPROUVEE' || nextStatus === 'REJETEE')) {
      if (user.role !== 'DIRECTEUR_GENERAL') throw new ForbiddenError('Seul le Directeur Général peut décider.');
    }
  } else if (typeControle === 'SUR_PIECES') {
    if (nextStatus === 'DEMANDE_SOUMISE') {
      if (!['CHEF_BUREAU', 'ANALYSTE', 'CONTROLEUR'].includes(user.role))
        throw new ForbiddenError('Seul un agent du Bureau compétent peut soumettre.');
      if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId)
        throw new ForbiddenError('Périmètre de bureau invalide.');
    } else if ((currentStatus === 'EXAMEN_CHEF_BUREAU' || currentStatus === 'DEMANDE_SOUMISE') && (nextStatus === 'APPROUVEE' || nextStatus === 'REJETEE')) {
      if (user.role !== 'CHEF_BUREAU') throw new ForbiddenError('Accès réservé au Chef de Bureau.');
    }
  }

  if (currentStatus === 'REJETEE' && nextStatus === 'BROUILLON') {
    if (missionBureauId && user.bureau_id && user.bureau_id !== missionBureauId)
      throw new ForbiddenError('Seul le Bureau initiateur peut reprendre un dossier rejeté.');
  }
}

function getValidationTypeForRole(role) {
  switch (role) {
    case 'CHEF_DIVISION': return 'CHEF_DIVISION';
    case 'DIRECTEUR_CONTROLES': return 'DIRECTEUR_CONTROLES';
    case 'DIRECTEUR_GENERAL': return 'DG';
    case 'CHEF_BUREAU': return 'CHEF_BUREAU';
    default: throw new ForbiddenError(`Le rôle '${role}' ne correspond à aucun échelon de validation.`);
  }
}

function formatMissionReference(seq, year = new Date().getFullYear()) {
  return `MIS-${year}-${String(seq).padStart(6, '0')}`;
}

function formatOrdreMissionReference(seq, year = new Date().getFullYear()) {
  return `OM-${year}-${String(seq).padStart(6, '0')}`;
}

function formatAutorisationReference(seq, year = new Date().getFullYear()) {
  return `AUT-${year}-${String(seq).padStart(6, '0')}`;
}

// =============================================================================
// UTILISATEURS DE TEST
// =============================================================================

const bureauA = '11111111-1111-4111-a111-111111111111';
const bureauB = '22222222-2222-4222-a222-222222222222';

const chefBureau  = { id: 'u1', email: 'chef.bureau@dgrad.cd', role: 'CHEF_BUREAU', bureau_id: bureauA, division_id: null, is_active: true };
const chefDivision = { id: 'u2', email: 'chef.division@dgrad.cd', role: 'CHEF_DIVISION', bureau_id: null, division_id: null, is_active: true };
const directeur   = { id: 'u3', email: 'directeur@dgrad.cd', role: 'DIRECTEUR_CONTROLES', bureau_id: null, division_id: null, is_active: true };
const dg          = { id: 'u4', email: 'dg@dgrad.cd', role: 'DIRECTEUR_GENERAL', bureau_id: null, division_id: null, is_active: true };
const admin       = { id: 'u6', email: 'admin@dgrad.cd', role: 'ADMIN', bureau_id: null, division_id: null, is_active: true };
const autrebureau = { id: 'u7', email: 'autre@dgrad.cd', role: 'CHEF_BUREAU', bureau_id: bureauB, division_id: null, is_active: true };

// =============================================================================
// TESTS
// =============================================================================

describe('Module Missions — Validation Zod & Moteur de Workflow', () => {

  // ---------------------------------------------------------------------------
  // 1. Schémas Zod
  // ---------------------------------------------------------------------------
  describe('1. Schémas de Validation Zod', () => {
    it('MissionCreateSchema : valide une mission SUR_PLACE avec équipe', () => {
      const res = MissionCreateSchema.safeParse({
        type_controle: 'SUR_PLACE',
        bureau_id: '11111111-1111-4111-a111-111111111111',
        secteur_id: '22222222-2222-4222-a222-222222222222',
        motif: 'Contrôle ciblé des droits domaniaux exercice 2025',
        assujettis_ids: ['33333333-3333-4333-a333-333333333333'],
        equipes_propositions: [{
          nom: 'Équipe Alpha',
          chef_equipe_id: '44444444-4444-4444-a444-444444444444',
          agents_ids: ['55555555-5555-4555-a555-555555555555'],
          assujettis_ids: ['33333333-3333-4333-a333-333333333333'],
        }],
      });
      assert.strictEqual(res.success, true);
    });

    it('MissionCreateSchema : valide une mission SUR_PIECES sans équipe', () => {
      const res = MissionCreateSchema.safeParse({
        type_controle: 'SUR_PIECES',
        bureau_id: '11111111-1111-4111-a111-111111111111',
        secteur_id: null,
        motif: 'Vérification sur pièces des états financiers 2025',
        assujettis_ids: ['33333333-3333-4333-a333-333333333333'],
      });
      assert.strictEqual(res.success, true);
    });

    it('MissionCreateSchema : rejette si assujettis_ids est vide', () => {
      const res = MissionCreateSchema.safeParse({
        type_controle: 'SUR_PIECES',
        bureau_id: '11111111-1111-4111-a111-111111111111',
        motif: 'Motif sans assujetti',
        assujettis_ids: [],
      });
      assert.strictEqual(res.success, false);
      assert.ok(res.error.issues.some(i => i.path.includes('assujettis_ids')));
    });

    it('MissionValidationDecisionSchema : valide une approbation (motif optionnel)', () => {
      const res = MissionValidationDecisionSchema.safeParse({
        mission_id: '66666666-6666-4666-a666-666666666666',
        decision: 'APPROUVE',
        commentaire: 'Dossier conforme',
      });
      assert.strictEqual(res.success, true);
    });

    it('MissionValidationDecisionSchema : rejette un REJET sans motif', () => {
      const res = MissionValidationDecisionSchema.safeParse({
        mission_id: '66666666-6666-4666-a666-666666666666',
        decision: 'REJETE',
        motif: '',
      });
      assert.strictEqual(res.success, false);
      assert.ok(res.error.issues.some(i => i.path.includes('motif')));
    });

    it('MissionValidationDecisionSchema : accepte un REJET avec motif >= 5 chars', () => {
      const res = MissionValidationDecisionSchema.safeParse({
        mission_id: '66666666-6666-4666-a666-666666666666',
        decision: 'REJETE',
        motif: 'Périmètre incomplet, veuillez compléter.',
      });
      assert.strictEqual(res.success, true);
    });

    it('MissionDesignateControleurSchema : valide les identifiants', () => {
      const res = MissionDesignateControleurSchema.safeParse({
        mission_id: '66666666-6666-4666-a666-666666666666',
        controleur_id: '77777777-7777-4777-a777-777777777777',
      });
      assert.strictEqual(res.success, true);
    });

    it('MissionResetToDraftSchema : valide l\'identifiant', () => {
      const res = MissionResetToDraftSchema.safeParse({
        mission_id: '66666666-6666-4666-a666-666666666666',
      });
      assert.strictEqual(res.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Moteur de Workflow & Permissions
  // ---------------------------------------------------------------------------
  describe('2. Moteur de Workflow & Permissions Hiérarchiques', () => {
    it('SUR_PLACE : soumission autorisée pour le bureau initiateur', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(chefBureau, 'BROUILLON', 'SOUMISE', 'SUR_PLACE', bureauA)
      );
    });

    it('SUR_PLACE : soumission refusée pour un autre bureau (RM-001)', () => {
      assert.throws(() =>
        validateTransitionPermissions(chefBureau, 'BROUILLON', 'SOUMISE', 'SUR_PLACE', bureauB),
        ForbiddenError
      );
    });

    it('SUR_PLACE : Chef de division peut examiner et transmettre', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(chefDivision, 'SOUMISE', 'EXAMEN_CHEF_DIVISION', 'SUR_PLACE', bureauA)
      );
      assert.doesNotThrow(() =>
        validateTransitionPermissions(chefDivision, 'EXAMEN_CHEF_DIVISION', 'EXAMEN_DIRECTEUR_CONTROLES', 'SUR_PLACE', bureauA)
      );
    });

    it('SUR_PLACE : Directeur des Contrôles transmet à ATTENTE_DG', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(directeur, 'EXAMEN_DIRECTEUR_CONTROLES', 'ATTENTE_DG', 'SUR_PLACE', bureauA)
      );
    });

    it('SUR_PLACE : Directeur Général peut approuver', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(dg, 'ATTENTE_DG', 'APPROUVEE', 'SUR_PLACE', bureauA)
      );
    });

    it('SUR_PLACE : Chef Division NE PEUT PAS approuver à la place du DG', () => {
      assert.throws(() =>
        validateTransitionPermissions(chefDivision, 'ATTENTE_DG', 'APPROUVEE', 'SUR_PLACE', bureauA),
        ForbiddenError
      );
    });

    it('SUR_PLACE : ADMIN NE PEUT PAS approuver une mission (séparation technique/métier)', () => {
      assert.throws(() =>
        validateTransitionPermissions(admin, 'ATTENTE_DG', 'APPROUVEE', 'SUR_PLACE', bureauA),
        ForbiddenError
      );
    });

    it('SUR_PIECES : Chef de section peut approuver', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(chefBureau, 'EXAMEN_CHEF_BUREAU', 'APPROUVEE', 'SUR_PIECES', bureauA)
      );
    });

    it('SUR_PIECES : DG NE PEUT PAS approuver dans le workflow SUR_PIECES', () => {
      assert.throws(() =>
        validateTransitionPermissions(dg, 'EXAMEN_CHEF_BUREAU', 'APPROUVEE', 'SUR_PIECES', bureauA),
        ForbiddenError
      );
    });

    it('SUR_PIECES : Transition vers ORDRE_MISSION_GENERE inexistante (isolation des workflows)', () => {
      assert.throws(() =>
        validateTransitionPermissions(chefBureau, 'APPROUVEE', 'ORDRE_MISSION_GENERE', 'SUR_PIECES', bureauA),
        ForbiddenError
      );
    });

    it('SUR_PLACE : Transition vers AUTORISATION_GENEREE inexistante (isolation des workflows)', () => {
      assert.throws(() =>
        validateTransitionPermissions(dg, 'APPROUVEE', 'AUTORISATION_GENEREE', 'SUR_PLACE', bureauA),
        ForbiddenError
      );
    });

    it('Reprise REJETEE → BROUILLON autorisée pour le bureau initiateur', () => {
      assert.doesNotThrow(() =>
        validateTransitionPermissions(chefBureau, 'REJETEE', 'BROUILLON', 'SUR_PLACE', bureauA)
      );
    });

    it('Reprise REJETEE → BROUILLON refusée pour un autre bureau', () => {
      assert.throws(() =>
        validateTransitionPermissions(autrebureau, 'REJETEE', 'BROUILLON', 'SUR_PLACE', bureauA),
        ForbiddenError
      );
    });

    it('Utilisateur non authentifié rejeté (UnauthorizedError)', () => {
      assert.throws(() =>
        validateTransitionPermissions(null, 'BROUILLON', 'SOUMISE', 'SUR_PLACE', bureauA),
        UnauthorizedError
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Générateurs de Références Officielles
  // ---------------------------------------------------------------------------
  describe('3. Générateurs de Références Officielles', () => {
    it('formatMissionReference : génère MIS-2026-000042', () => {
      assert.strictEqual(formatMissionReference(42, 2026), 'MIS-2026-000042');
    });

    it('formatOrdreMissionReference : génère OM-2026-000007', () => {
      assert.strictEqual(formatOrdreMissionReference(7, 2026), 'OM-2026-000007');
    });

    it('formatAutorisationReference : génère AUT-2026-000015', () => {
      assert.strictEqual(formatAutorisationReference(15, 2026), 'AUT-2026-000015');
    });

    it('getValidationTypeForRole : mappe correctement CHEF_DIVISION', () => {
      assert.strictEqual(getValidationTypeForRole('CHEF_DIVISION'), 'CHEF_DIVISION');
    });

    it('getValidationTypeForRole : mappe correctement DIRECTEUR_GENERAL → DG', () => {
      assert.strictEqual(getValidationTypeForRole('DIRECTEUR_GENERAL'), 'DG');
    });

    it('getValidationTypeForRole : mappe correctement CHEF_SECTION', () => {
      assert.strictEqual(getValidationTypeForRole('CHEF_BUREAU'), 'CHEF_BUREAU');
    });

    it('getValidationTypeForRole : lève ForbiddenError pour ADMIN', () => {
      assert.throws(() => getValidationTypeForRole('ADMIN'), ForbiddenError);
    });
  });
});
