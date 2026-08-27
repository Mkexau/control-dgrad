import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DirectionCreateSchema,
  DirectionUpdateSchema,
  DivisionCreateSchema,
  DivisionUpdateSchema,
  BureauCreateSchema,
  BureauUpdateSchema,
  SecteurCreateSchema,
  SecteurUpdateSchema,
  UserCreateSchema,
  UserUpdateSchema,
  AgentCreateSchema,
  AgentUpdateSchema,
  ToggleStatusSchema,
} from '../lib/validations/admin.ts';
import {
  checkAdmin,
  checkApprobationDG,
  checkApprobationChefSection,
  checkBureauAccess,
  UnauthorizedError,
  ForbiddenError,
} from '../lib/auth/rules.ts';

describe('Module Administration — Validation Zod & Règles Métier', () => {
  // ===========================================================================
  // 1. Tests des Schémas de Validation Zod
  // ===========================================================================

  describe('1. Validation des Schémas Référentiels', () => {
    it('DirectionCreateSchema : valide une direction conforme', () => {
      const input = {
        code: 'DCR',
        nom: 'Direction des Contrôles et du Recoupement',
        actif: true,
      };
      const res = DirectionCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('DirectionCreateSchema : rejette un code en minuscules ou avec espaces', () => {
      const input = {
        code: 'dcr invalid',
        nom: 'Direction Invalide',
        actif: true,
      };
      const res = DirectionCreateSchema.safeParse(input);
      assert.strictEqual(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('code')));
    });

    it('DivisionCreateSchema : valide une division avec UUID direction valide', () => {
      const input = {
        direction_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        code: 'DIV_CTRL',
        nom: 'Division Contrôle',
        actif: true,
      };
      const res = DivisionCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('DivisionCreateSchema : rejette un direction_id non UUID', () => {
      const input = {
        direction_id: 'not-a-uuid',
        code: 'DIV_CTRL',
        nom: 'Division Contrôle',
        actif: true,
      };
      const res = DivisionCreateSchema.safeParse(input);
      assert.strictEqual(res.success, false);
    });

    it('BureauCreateSchema : valide un bureau avec type CONTROLE', () => {
      const input = {
        division_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        code: 'BUR_CTRL_SOL',
        nom: 'Bureau Contrôle Sol',
        type: 'CONTROLE',
        actif: true,
      };
      const res = BureauCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('BureauCreateSchema : rejette un type de bureau non énuméré', () => {
      const input = {
        division_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        code: 'BUR_INVALID',
        nom: 'Bureau Invalide',
        type: 'INVENTE_NON_CONFORME',
        actif: true,
      };
      const res = BureauCreateSchema.safeParse(input);
      assert.strictEqual(res.success, false);
    });

    it('SecteurCreateSchema : valide un secteur rattaché à un bureau', () => {
      const input = {
        bureau_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        code: 'SOL_FONCIER',
        nom: 'Affaires Foncières et Concessions',
        actif: true,
      };
      const res = SecteurCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('UserCreateSchema : valide la création d\'un utilisateur conforme', () => {
      const input = {
        email: 'jean.mukendi@dgrad.cd',
        password: 'Password123!',
        nom: 'MUKENDI',
        prenom: 'Jean',
        telephone: '+243810000000',
        bureau_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        role: 'CONTROLEUR',
        actif: true,
      };
      const res = UserCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('UserCreateSchema : rejette un mot de passe trop court (< 8 caractères)', () => {
      const input = {
        email: 'agent@dgrad.cd',
        password: 'short',
        nom: 'KABEYA',
        prenom: 'Paul',
        role: 'CONTROLEUR',
        actif: true,
      };
      const res = UserCreateSchema.safeParse(input);
      assert.strictEqual(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('password')));
    });

    it('AgentCreateSchema : valide un agent avec matricule', () => {
      const input = {
        profile_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        matricule: 'AG-2026-0042',
        specialite: 'Fiscalité minière',
        domaine_competence: 'Contrôle sur place',
        actif: true,
      };
      const res = AgentCreateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('ToggleStatusSchema : valide un basculement de statut', () => {
      const input = {
        id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        actif: false,
      };
      const res = ToggleStatusSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('DirectionUpdateSchema : valide la mise à jour d\'une direction', () => {
      const input = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        code: 'DCR',
        nom: 'Direction des Contrôles et Recoupements',
        actif: true,
      };
      const res = DirectionUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('DivisionUpdateSchema : valide la mise à jour d\'une division', () => {
      const input = {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        direction_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        code: 'DIV_CTRL',
        nom: 'Division Contrôle',
        actif: true,
      };
      const res = DivisionUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('BureauUpdateSchema : valide la mise à jour d\'un bureau', () => {
      const input = {
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        division_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        code: 'BUR_CTRL_SOL',
        nom: 'Bureau Contrôle Sol',
        type: 'CONTROLE',
        actif: true,
      };
      const res = BureauUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('SecteurUpdateSchema : valide la mise à jour d\'un secteur', () => {
      const input = {
        id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        bureau_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        code: 'SOL_FONCIER',
        nom: 'Affaires Foncières et Concessions',
        actif: true,
      };
      const res = SecteurUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('UserUpdateSchema : valide la mise à jour d\'un utilisateur', () => {
      const input = {
        id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        nom: 'MUKENDI',
        prenom: 'Jean-Paul',
        telephone: '+243810000000',
        bureau_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        role: 'CHEF_EQUIPE',
        actif: true,
      };
      const res = UserUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });

    it('AgentUpdateSchema : valide la mise à jour d\'un agent', () => {
      const input = {
        id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
        profile_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        matricule: 'AG-2026-0042',
        specialite: 'Fiscalité minière',
        domaine_competence: 'Contrôle sur place et sur pièces',
        actif: true,
      };
      const res = AgentUpdateSchema.safeParse(input);
      assert.strictEqual(res.success, true);
    });
  });

  // ===========================================================================
  // 2. Tests de Sécurité et Permissions Administrateur
  // ===========================================================================

  describe('2. Permissions et Séparation des Pouvoirs ADMIN', () => {
    const adminUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'admin.tech@dgrad.cd',
      role: 'ADMIN',
      bureau_id: null,
      division_id: null,
      is_active: true,
    };

    const controleurUser = {
      id: '22222222-2222-4222-a222-222222222222',
      email: 'controleur@dgrad.cd',
      role: 'CONTROLEUR',
      bureau_id: '33333333-3333-4333-a333-333333333333',
      division_id: '44444444-4444-4444-a444-444444444444',
      is_active: true,
    };

    it('ADMIN est autorisé pour les opérations administratives', () => {
      const result = checkAdmin(adminUser);
      assert.strictEqual(result.role, 'ADMIN');
    });

    it('Utilisateur non authentifié est rejeté (UnauthorizedError)', () => {
      assert.throws(() => checkAdmin(null), UnauthorizedError);
    });

    it('CONTROLEUR est rejeté sur les opérations ADMIN (ForbiddenError)', () => {
      assert.throws(() => checkAdmin(controleurUser), ForbiddenError);
    });

    it('ADMIN ne peut PAS approuver au nom du Directeur Général (DG)', () => {
      assert.throws(() => checkApprobationDG(adminUser), ForbiddenError);
    });

    it('ADMIN ne peut PAS approuver au nom du Chef de Section', () => {
      assert.throws(() => checkApprobationChefSection(adminUser), ForbiddenError);
    });

    it('ADMIN est exclu des accès directs aux données métier d\'un bureau', () => {
      assert.throws(
        () => checkBureauAccess(adminUser, '33333333-3333-4333-a333-333333333333'),
        ForbiddenError
      );
    });
  });
});
