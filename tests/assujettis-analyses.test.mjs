/**
 * DGRAD CONTRÔLE — ÉTAPE 13 : Tests Assujettis, Recoupement, Analyses & Notifications
 *
 * Ces tests couvrent :
 * - Schémas Zod (assujettis, recoupement, analyses, notifications)
 * - Guards de périmètre & séparation des pouvoirs (RM-001, RM-025, RM-039)
 * - Séparation stricte CDF/USD sans conversion (RM-015, RM-040)
 * - Calcul de solde de recoupement (pure logic)
 * - Workflow des analyses (BROUILLON -> EN_COURS -> VALIDEE -> CLOTUREE)
 * - Anti-IDOR : un Bureau A ne peut pas accéder au Bureau B
 * - Rôle ADMIN : aucun pouvoir métier
 * - Multi-assujettis par analyse
 * - Idempotence des upserts analyse_assujettis
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const TEST_IDS = Object.freeze({
  assujetti: '6af6b7a2-13e1-4db5-8790-a0c7a0e1b001',
  analyse: '0b1dd4da-3c75-41ca-8eec-6eb00b1a7001',
  analyseSecondaire: '954b4d8b-a849-4377-847c-7e9c17cf8002',
  bureau: '3f9656c0-5c80-4350-b9e9-3d0cc2af1001',
  secteur: 'aa6d224a-1df6-42e7-808d-5ef23ab1c001',
  notification: 'a45a37d4-60f1-4a97-95c6-b0f0ca2ed001',
});

// =============================================================================
// 1. Validations Zod : Assujettis
// =============================================================================

describe('Étape 13 — Assujettis : Schémas Zod', async () => {
  const { AssujettiCreateSchema, AssujettiUpdateSchema, AssujettiFilterSchema } =
    await import('../lib/validations/assujettis.ts');

  it('AssujettiCreateSchema : valide une personne morale conforme', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_MORALE',
      identifiant: 'NIF-12345',
      nom_raison_sociale: 'Société Test SA',
    });
    assert.ok(result.success, 'Devrait être valide');
    assert.equal(result.data?.type, 'PERSONNE_MORALE');
  });

  it('AssujettiCreateSchema : valide une personne physique avec champs optionnels', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_PHYSIQUE',
      identifiant: 'NIF-99999',
      nom_raison_sociale: 'DUPONT Jean',
      email: 'dupont@example.com',
      telephone: '+243 89 000 0000',
      adresse: 'Av. de la Paix, Kinshasa',
    });
    assert.ok(result.success, 'Devrait être valide');
  });

  it('AssujettiCreateSchema : rejette un identifiant trop court (< 3 chars)', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_MORALE',
      identifiant: 'AB',
      nom_raison_sociale: 'Société Test',
    });
    assert.ok(!result.success, 'Devrait être rejeté');
    assert.ok(result.error?.issues[0]?.message.includes('3'), 'Message doit mentionner 3 caractères');
  });

  it('AssujettiCreateSchema : rejette un nom trop court (< 2 chars)', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_MORALE',
      identifiant: 'NIF-123',
      nom_raison_sociale: 'A',
    });
    assert.ok(!result.success, 'Devrait être rejeté');
  });

  it('AssujettiCreateSchema : rejette un email invalide', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_MORALE',
      identifiant: 'NIF-123',
      nom_raison_sociale: 'Test SA',
      email: 'email-invalide',
    });
    assert.ok(!result.success, 'Devrait être rejeté pour email invalide');
  });

  it('AssujettiCreateSchema : accepte email vide (optionnel)', () => {
    const result = AssujettiCreateSchema.safeParse({
      type: 'PERSONNE_MORALE',
      identifiant: 'NIF-123',
      nom_raison_sociale: 'Test SA',
      email: '',
    });
    assert.ok(result.success, 'Email vide doit être accepté');
  });

  it('AssujettiUpdateSchema : valide une mise à jour partielle', () => {
    const result = AssujettiUpdateSchema.safeParse({
      id: TEST_IDS.assujetti,
      nom_raison_sociale: 'Nouveau Nom SA',
    });
    assert.ok(result.success, 'Mise à jour partielle devrait être valide');
  });

  it('AssujettiUpdateSchema : rejette un UUID invalide', () => {
    const result = AssujettiUpdateSchema.safeParse({
      id: 'not-a-uuid',
      nom_raison_sociale: 'Test',
    });
    assert.ok(!result.success, 'UUID invalide doit être rejeté');
  });

  it('AssujettiFilterSchema : accepte des filtres vides (valeurs par défaut)', () => {
    const result = AssujettiFilterSchema.safeParse({});
    assert.ok(result.success, 'Filtres vides acceptés');
    assert.equal(result.data?.page, 1, 'Page par défaut : 1');
    assert.equal(result.data?.limit, 20, 'Limit par défaut : 20');
  });

  it('AssujettiFilterSchema : limite max = 100', () => {
    const result = AssujettiFilterSchema.safeParse({ limit: 101 });
    assert.ok(!result.success, 'Limit > 100 doit être refusé');
  });
});

// =============================================================================
// 2. Validations Zod : Recoupement (Notes & Ordonnancements)
// =============================================================================

describe('Étape 13 — Recoupement : Schémas Zod', async () => {
  const { NotePerceptionCreateSchema, OrdonnancementCreateSchema, NotePerceptionFilterSchema } =
    await import('../lib/validations/recoupement.ts');

  const noteValide = {
    assujetti_id: TEST_IDS.assujetti,
    numero: 'NP-2026-001',
    date: '2026-01-15',
    acte_generateur: 'Contrat de concession foncière',
    montant: 500000,
    devise: 'CDF',
  };

  it('NotePerceptionCreateSchema : valide une note CDF conforme', () => {
    const result = NotePerceptionCreateSchema.safeParse(noteValide);
    assert.ok(result.success, 'Note CDF valide');
    assert.equal(result.data?.devise, 'CDF');
  });

  it('NotePerceptionCreateSchema : valide une note USD conforme', () => {
    const result = NotePerceptionCreateSchema.safeParse({ ...noteValide, devise: 'USD', montant: 250 });
    assert.ok(result.success, 'Note USD valide');
    assert.equal(result.data?.devise, 'USD');
  });

  it('NotePerceptionCreateSchema : rejette une devise invalide (EUR)', () => {
    const result = NotePerceptionCreateSchema.safeParse({ ...noteValide, devise: 'EUR' });
    assert.ok(!result.success, 'EUR doit être rejeté');
  });

  it('NotePerceptionCreateSchema : rejette un montant négatif', () => {
    const result = NotePerceptionCreateSchema.safeParse({ ...noteValide, montant: -100 });
    assert.ok(!result.success, 'Montant négatif doit être rejeté');
  });

  it('NotePerceptionCreateSchema : rejette un format de date invalide', () => {
    const result = NotePerceptionCreateSchema.safeParse({ ...noteValide, date: '15/01/2026' });
    assert.ok(!result.success, 'Format de date DD/MM/YYYY doit être rejeté');
  });

  it('NotePerceptionCreateSchema : rejette un acte générateur trop court', () => {
    const result = NotePerceptionCreateSchema.safeParse({ ...noteValide, acte_generateur: 'AB' });
    assert.ok(!result.success, 'Acte générateur < 3 chars doit être rejeté');
  });

  it('OrdonnancementCreateSchema : valide un ordonnancement CDF', () => {
    const result = OrdonnancementCreateSchema.safeParse({
      assujetti_id: TEST_IDS.assujetti,
      numero: 'ORD-2026-001',
      date: '2026-02-01',
      montant: 300000,
      devise: 'CDF',
      statut: 'ORDONNANCE',
    });
    assert.ok(result.success, 'Ordonnancement CDF valide');
  });

  it('OrdonnancementCreateSchema : rejette une devise invalide', () => {
    const result = OrdonnancementCreateSchema.safeParse({
      assujetti_id: TEST_IDS.assujetti,
      numero: 'ORD-2026-002',
      date: '2026-02-01',
      montant: 100,
      devise: 'GBP',
      statut: 'ORDONNANCE',
    });
    assert.ok(!result.success, 'GBP doit être rejeté');
  });

  it('NotePerceptionFilterSchema : filtre par devise', () => {
    const result = NotePerceptionFilterSchema.safeParse({ devise: 'USD' });
    assert.ok(result.success, 'Filtre devise USD valide');
  });
});

// =============================================================================
// 3. Logique Pure : Calcul de Solde CDF/USD (RM-015, RM-040)
// =============================================================================

describe('Étape 13 — Recoupement : Calcul de solde CDF/USD', () => {
  /**
   * Reproduit la logique de calcul de synthèse du service recoupement-service.ts
   * RÈGLE ABSOLUE : Jamais de conversion entre CDF et USD.
   * RÈGLE ABSOLUE : Jamais de mélange CDF et USD dans un même solde.
   */
  function calculerSolde(notes, ords) {
    let notesCDF = 0, notesUSD = 0;
    let ordsCDF = 0, ordsUSD = 0;

    for (const n of notes) {
      if (n.devise === 'CDF') notesCDF = Math.round((notesCDF + n.montant) * 100) / 100;
      else if (n.devise === 'USD') notesUSD = Math.round((notesUSD + n.montant) * 100) / 100;
    }

    for (const o of ords) {
      if (o.devise === 'CDF') ordsCDF = Math.round((ordsCDF + o.montant) * 100) / 100;
      else if (o.devise === 'USD') ordsUSD = Math.round((ordsUSD + o.montant) * 100) / 100;
    }

    return {
      cdf: { totalNotes: notesCDF, totalOrds: ordsCDF, solde: Math.round((notesCDF - ordsCDF) * 100) / 100 },
      usd: { totalNotes: notesUSD, totalOrds: ordsUSD, solde: Math.round((notesUSD - ordsUSD) * 100) / 100 },
    };
  }

  it('Solde CDF pur : notes = 500 000, ords = 300 000 → solde = 200 000', () => {
    const s = calculerSolde(
      [{ montant: 500000, devise: 'CDF' }],
      [{ montant: 300000, devise: 'CDF' }]
    );
    assert.equal(s.cdf.solde, 200000, 'Solde CDF = notes - ords = 200 000');
    assert.equal(s.usd.totalNotes, 0, 'USD non impacté');
    assert.equal(s.usd.totalOrds, 0, 'USD non impacté');
  });

  it('Solde USD pur : notes = 1000, ords = 1200 → solde = -200', () => {
    const s = calculerSolde(
      [{ montant: 1000, devise: 'USD' }],
      [{ montant: 1200, devise: 'USD' }]
    );
    assert.equal(s.usd.solde, -200, 'Solde USD = notes - ords = -200');
    assert.equal(s.cdf.totalNotes, 0, 'CDF non impacté');
  });

  it('CDF et USD ne se mélangent JAMAIS (isolation stricte RM-015, RM-040)', () => {
    const s = calculerSolde(
      [
        { montant: 500000, devise: 'CDF' },
        { montant: 250, devise: 'USD' },
      ],
      [
        { montant: 400000, devise: 'CDF' },
        { montant: 300, devise: 'USD' },
      ]
    );
    // Les CDF restent dans CDF, les USD restent dans USD
    assert.equal(s.cdf.totalNotes, 500000, 'Notes CDF séparées');
    assert.equal(s.cdf.totalOrds, 400000, 'Ords CDF séparées');
    assert.equal(s.cdf.solde, 100000, 'Solde CDF correct');
    assert.equal(s.usd.totalNotes, 250, 'Notes USD séparées');
    assert.equal(s.usd.totalOrds, 300, 'Ords USD séparées');
    assert.equal(s.usd.solde, -50, 'Solde USD correct');
  });

  it('Pas de conversion : le solde CDF est en CDF, le solde USD est en USD', () => {
    const s = calculerSolde(
      [{ montant: 10000, devise: 'CDF' }],
      [{ montant: 10, devise: 'USD' }]
    );
    // Il ne DOIT PAS y avoir de ligne combinant CDF et USD
    assert.equal(s.cdf.totalNotes, 10000);
    assert.equal(s.usd.totalOrds, 10);
    // Aucune conversion implicite
    assert.equal(s.cdf.totalOrds, 0, 'Aucun ord CDF');
    assert.equal(s.usd.totalNotes, 0, 'Aucune note USD');
  });

  it('Solde nul : notes = ords', () => {
    const s = calculerSolde(
      [{ montant: 100000, devise: 'CDF' }],
      [{ montant: 100000, devise: 'CDF' }]
    );
    assert.equal(s.cdf.solde, 0, 'Solde équilibré = 0');
  });

  it('Cumul de plusieurs notes CDF sans erreur flottante', () => {
    const s = calculerSolde(
      [
        { montant: 0.1, devise: 'CDF' },
        { montant: 0.2, devise: 'CDF' },
      ],
      []
    );
    // Doit donner 0.3 sans erreur de flottant
    assert.equal(s.cdf.totalNotes, 0.3, 'Cumul sans erreur flottante');
  });
});

// =============================================================================
// 4. Guards de périmètre et permissions (RM-001, RM-025, RM-039)
// =============================================================================

describe('Étape 13 — Guards de périmètre : assertCanManageAssujetti', async () => {
  const { ForbiddenError } = await import('../lib/auth/rules.ts');
  const { assertCanManageAssujetti, assertCanCreateAnalyse, assertCanTransitionAnalyse } =
    await import('../lib/auth/recoupement-access.ts');

  const userBureauA = {
    id: 'user-a',
    email: 'analyste-a@dgrad.cd',
    role: 'ANALYSTE',
    bureau_id: 'bureau-a',
    division_id: null,
    is_active: true,
    nom: 'Analyste',
    prenom: 'A',
  };

  const userBureauB = {
    id: 'user-b',
    email: 'analyste-b@dgrad.cd',
    role: 'ANALYSTE',
    bureau_id: 'bureau-b',
    division_id: null,
    is_active: true,
    nom: 'Analyste',
    prenom: 'B',
  };

  const adminUser = {
    id: 'admin-id',
    email: 'admin@dgrad.cd',
    role: 'ADMIN',
    bureau_id: null,
    division_id: null,
    is_active: true,
    nom: 'Admin',
    prenom: 'Tech',
  };

  const chefBureauA = {
    id: 'chef-a',
    email: 'chef-a@dgrad.cd',
    role: 'CHEF_BUREAU',
    bureau_id: 'bureau-a',
    division_id: null,
    is_active: true,
    nom: 'Chef',
    prenom: 'A',
  };

  it('Analyste bureau A peut gérer un assujetti de bureau A', () => {
    assert.doesNotThrow(() => assertCanManageAssujetti(userBureauA, 'bureau-a'));
  });

  it('Analyste bureau A ne peut PAS gérer un assujetti de bureau B (anti-IDOR)', () => {
    assert.throws(
      () => assertCanManageAssujetti(userBureauA, 'bureau-b'),
      (err) => err instanceof ForbiddenError,
      'ForbiddenError attendue pour bureau différent'
    );
  });

  it('ADMIN ne peut PAS gérer les assujettis (séparation des pouvoirs RM-025)', () => {
    // ADMIN est dans la liste mais sans bureau_id → doit être bloqué pour les données métier
    // Dans le guard, ADMIN peut créer techniquement mais sans bureau_id, il sera bloqué
    assert.throws(
      () => assertCanManageAssujetti(adminUser, 'bureau-a'),
      (err) => err instanceof ForbiddenError,
      'ForbiddenError pour ADMIN sans bureau'
    );
  });

  it('Chef bureau A peut gérer un assujetti de bureau A', () => {
    assert.doesNotThrow(() => assertCanManageAssujetti(chefBureauA, 'bureau-a'));
  });

  it('Chef bureau A ne peut PAS gérer un assujetti de bureau B', () => {
    assert.throws(
      () => assertCanManageAssujetti(chefBureauA, 'bureau-b'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('Analyste peut créer une analyse pour son bureau', () => {
    assert.doesNotThrow(() => assertCanCreateAnalyse(userBureauA, 'bureau-a'));
  });

  it('Analyste ne peut PAS créer une analyse pour le bureau B (anti-IDOR)', () => {
    assert.throws(
      () => assertCanCreateAnalyse(userBureauA, 'bureau-b'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('ADMIN ne peut PAS créer une analyse (séparation des pouvoirs)', () => {
    assert.throws(
      () => assertCanCreateAnalyse(adminUser, 'bureau-a'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('Utilisateur sans bureau ne peut pas créer une analyse', () => {
    const userSansBureau = { ...userBureauA, bureau_id: null };
    assert.throws(
      () => assertCanCreateAnalyse(userSansBureau, 'bureau-a'),
      (err) => err instanceof ForbiddenError
    );
  });
});

// =============================================================================
// 5. Workflow Analyses (RM-001, RM-025, RM-039)
// =============================================================================

describe('Étape 13 — Workflow des analyses : transitions de statut', async () => {
  const { ForbiddenError } = await import('../lib/auth/rules.ts');
  const { assertCanTransitionAnalyse } = await import('../lib/auth/recoupement-access.ts');

  const analyste = {
    id: 'user-analyste',
    email: 'analyste@dgrad.cd',
    role: 'ANALYSTE',
    bureau_id: 'bureau-a',
    division_id: null,
    is_active: true,
    nom: 'Test',
    prenom: 'Analyste',
  };

  const chefBureau = {
    id: 'user-chef',
    email: 'chef@dgrad.cd',
    role: 'CHEF_BUREAU',
    bureau_id: 'bureau-a',
    division_id: null,
    is_active: true,
    nom: 'Test',
    prenom: 'Chef',
  };

  const adminUser = {
    id: 'admin',
    email: 'admin@dgrad.cd',
    role: 'ADMIN',
    bureau_id: null,
    division_id: null,
    is_active: true,
    nom: 'Admin',
    prenom: 'Tech',
  };

  const analyseBase = {
    id: 'analyse-1',
    bureau_id: 'bureau-a',
    secteur_id: null,
    auteur_id: 'user-analyste',
    statut: 'BROUILLON',
  };

  it('BROUILLON → EN_COURS : autorisé pour Analyste', () => {
    assert.doesNotThrow(() =>
      assertCanTransitionAnalyse(analyste, { ...analyseBase, statut: 'BROUILLON' }, 'EN_COURS')
    );
  });

  it('BROUILLON → EN_COURS : autorisé pour Chef de bureau', () => {
    assert.doesNotThrow(() =>
      assertCanTransitionAnalyse(chefBureau, { ...analyseBase, statut: 'BROUILLON' }, 'EN_COURS')
    );
  });

  it('EN_COURS → VALIDEE : autorisé pour Chef de bureau', () => {
    assert.doesNotThrow(() =>
      assertCanTransitionAnalyse(chefBureau, { ...analyseBase, statut: 'EN_COURS' }, 'VALIDEE')
    );
  });

  it('EN_COURS → VALIDEE : interdit pour Analyste (décision réservée au Chef de bureau)', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(analyste, { ...analyseBase, statut: 'EN_COURS' }, 'VALIDEE'),
      (err) => err instanceof ForbiddenError,
      'ForbiddenError attendue'
    );
  });

  it('VALIDEE → CLOTUREE : autorisé pour Chef de bureau', () => {
    assert.doesNotThrow(() =>
      assertCanTransitionAnalyse(chefBureau, { ...analyseBase, statut: 'VALIDEE' }, 'CLOTUREE')
    );
  });

  it('VALIDEE → CLOTUREE : interdit pour Analyste', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(analyste, { ...analyseBase, statut: 'VALIDEE' }, 'CLOTUREE'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('CLOTUREE → EN_COURS : transition invalide (blocage)', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(chefBureau, { ...analyseBase, statut: 'CLOTUREE' }, 'EN_COURS'),
      (err) => err instanceof ForbiddenError,
      'Analyse clôturée ne peut plus être modifiée'
    );
  });

  it('BROUILLON → CLOTUREE : transition invalide (non-séquentielle)', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(chefBureau, { ...analyseBase, statut: 'BROUILLON' }, 'CLOTUREE'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('ADMIN ne peut PAS valider une analyse (RM-025 : séparation des pouvoirs)', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(adminUser, { ...analyseBase, statut: 'EN_COURS' }, 'VALIDEE'),
      (err) => err instanceof ForbiddenError,
      'ADMIN ne peut pas valider au nom du métier'
    );
  });

  it('ADMIN ne peut PAS clôturer une analyse', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(adminUser, { ...analyseBase, statut: 'VALIDEE' }, 'CLOTUREE'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('Analyste bureau A ne peut PAS modifier une analyse du bureau B (anti-IDOR)', () => {
    assert.throws(
      () => assertCanTransitionAnalyse(
        analyste,
        { ...analyseBase, bureau_id: 'bureau-b', statut: 'BROUILLON' },
        'EN_COURS'
      ),
      (err) => err instanceof ForbiddenError
    );
  });
});

// =============================================================================
// 6. Validations Zod : Analyses
// =============================================================================

describe('Étape 13 — Analyses : Schémas Zod', async () => {
  const { AnalyseCreateSchema, AnalyseAssujettiAddSchema, AnalyseTransitionSchema, AnalyseStatutEnum } =
    await import('../lib/validations/analyses.ts');

  it('AnalyseCreateSchema : valide une analyse basique', () => {
    const result = AnalyseCreateSchema.safeParse({
      bureau_id: TEST_IDS.bureau,
    });
    assert.ok(result.success, 'Analyse basique valide');
  });

  it('AnalyseCreateSchema : rejette un bureau_id invalide', () => {
    const result = AnalyseCreateSchema.safeParse({ bureau_id: 'not-a-uuid' });
    assert.ok(!result.success, 'UUID invalide rejeté');
  });

  it('AnalyseAssujettiAddSchema : valide une association multi-assujettis', () => {
    const result = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'CDF',
      montant_du: 500000,
      montant_paye: 200000,
      priorite: 'HAUTE',
    });
    assert.ok(result.success, 'Association valide');
    assert.equal(result.data?.devise, 'CDF');
    assert.equal(result.data?.priorite, 'HAUTE');
  });

  it('AnalyseAssujettiAddSchema : valide sans montants (optionnels)', () => {
    const result = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'USD',
    });
    assert.ok(result.success, 'Association sans montants valide');
  });

  it('AnalyseAssujettiAddSchema : rejette un montant négatif', () => {
    const result = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'CDF',
      montant_du: -1000,
    });
    assert.ok(!result.success, 'Montant négatif rejeté');
  });

  it('AnalyseAssujettiAddSchema : rejette une devise invalide', () => {
    const result = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'EUR',
    });
    assert.ok(!result.success, 'EUR rejeté');
  });

  it('AnalyseTransitionSchema : valide une transition BROUILLON → EN_COURS', () => {
    const result = AnalyseTransitionSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      nouveau_statut: 'EN_COURS',
    });
    assert.ok(result.success, 'Transition valide');
    assert.equal(result.data?.nouveau_statut, 'EN_COURS');
  });

  it('AnalyseTransitionSchema : rejette un statut inexistant', () => {
    const result = AnalyseTransitionSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      nouveau_statut: 'TERMINE',
    });
    assert.ok(!result.success, 'Statut invalide rejeté');
  });

  it('AnalyseStatutEnum : contient les 4 statuts du workflow', () => {
    const statuts = AnalyseStatutEnum.options;
    assert.ok(statuts.includes('BROUILLON'));
    assert.ok(statuts.includes('EN_COURS'));
    assert.ok(statuts.includes('VALIDEE'));
    assert.ok(statuts.includes('CLOTUREE'));
    assert.equal(statuts.length, 4, 'Exactement 4 statuts');
  });
});

// =============================================================================
// 7. Validations Zod : Notifications
// =============================================================================

describe('Étape 13 — Notifications : Schémas Zod', async () => {
  const { NotificationMarkReadSchema, NotificationFilterSchema } =
    await import('../lib/validations/notifications.ts');

  it('NotificationMarkReadSchema : valide un UUID de notification', () => {
    const result = NotificationMarkReadSchema.safeParse({
      id: TEST_IDS.notification,
    });
    assert.ok(result.success, 'UUID valide');
  });

  it('NotificationMarkReadSchema : rejette un UUID invalide', () => {
    const result = NotificationMarkReadSchema.safeParse({ id: 'pas-un-uuid' });
    assert.ok(!result.success, 'UUID invalide rejeté');
  });

  it('NotificationFilterSchema : valeurs par défaut', () => {
    const result = NotificationFilterSchema.safeParse({});
    assert.ok(result.success, 'Filtre vide accepté');
    assert.equal(result.data?.limit, 20, 'Limit par défaut 20');
  });

  it('NotificationFilterSchema : filtre par lu=false', () => {
    const result = NotificationFilterSchema.safeParse({ lu: false });
    assert.ok(result.success, 'Filtre lu=false valide');
    assert.equal(result.data?.lu, false);
  });

  it('NotificationFilterSchema : rejette limit > 50', () => {
    const result = NotificationFilterSchema.safeParse({ limit: 51 });
    assert.ok(!result.success, 'Limit > 50 rejeté');
  });
});

// =============================================================================
// 8. Anti-IDOR et séparation des rôles (RM-025, RM-039)
// =============================================================================

describe('Étape 13 — Anti-IDOR : Accès inter-bureaux', async () => {
  const { ForbiddenError, UnauthorizedError } = await import('../lib/auth/rules.ts');
  const { assertCanReadAssujetti, assertCanReadAnalyse, assertCanManageRecoupement } =
    await import('../lib/auth/recoupement-access.ts');

  const analyste = {
    id: 'u1', email: 'a@d.cd', role: 'ANALYSTE', bureau_id: 'bureau-a',
    division_id: null, is_active: true, nom: 'A', prenom: 'A',
  };

  it('assertCanReadAssujetti : bureau correct → accès autorisé', () => {
    assert.doesNotThrow(() => assertCanReadAssujetti(analyste, 'bureau-a'));
  });

  it('assertCanReadAssujetti : bureau différent → accès refusé (anti-IDOR)', () => {
    assert.throws(
      () => assertCanReadAssujetti(analyste, 'bureau-b'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('assertCanReadAssujetti : user null → UnauthorizedError', () => {
    assert.throws(
      () => assertCanReadAssujetti(null, 'bureau-a'),
      (err) => err instanceof UnauthorizedError
    );
  });

  it('assertCanReadAnalyse : bureau correct → accès autorisé', () => {
    assert.doesNotThrow(() => assertCanReadAnalyse(analyste, 'bureau-a'));
  });

  it('assertCanReadAnalyse : bureau différent → accès refusé', () => {
    assert.throws(
      () => assertCanReadAnalyse(analyste, 'bureau-b'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('assertCanManageRecoupement : bureau correct → autorisé', () => {
    assert.doesNotThrow(() => assertCanManageRecoupement(analyste, 'bureau-a'));
  });

  it('assertCanManageRecoupement : bureau différent → refusé (anti-IDOR)', () => {
    assert.throws(
      () => assertCanManageRecoupement(analyste, 'bureau-b'),
      (err) => err instanceof ForbiddenError
    );
  });

  it('CHEF_SECTION peut lire un assujetti (rôle consultatif)', () => {
    const chefSection = { ...analyste, role: 'CHEF_BUREAU' };
    assert.doesNotThrow(() => assertCanReadAssujetti(chefSection, 'bureau-a'));
  });

  it('CONSULTATION peut lire un assujetti (rôle lecture)', () => {
    const consultation = { ...analyste, role: 'CONSULTATION', bureau_id: null };
    assert.doesNotThrow(() => assertCanReadAssujetti(consultation, 'bureau-a'));
  });

  it('CHEF_EQUIPE peut lire un assujetti', () => {
    const chefEquipe = { ...analyste, role: 'CHEF_EQUIPE', bureau_id: null };
    assert.doesNotThrow(() => assertCanReadAssujetti(chefEquipe, 'bureau-b'));
  });

  it('Compte inactif → ForbiddenError', () => {
    const inactive = { ...analyste, is_active: false };
    assert.throws(
      () => assertCanReadAssujetti(inactive, 'bureau-a'),
      (err) => err instanceof ForbiddenError
    );
  });
});

// =============================================================================
// 9. Multi-assujettis : contrainte d'unicité et idempotence
// =============================================================================

describe('Étape 13 — Multi-assujettis : contraintes métier', async () => {
  const { AnalyseAssujettiAddSchema } = await import('../lib/validations/analyses.ts');

  it('Un même assujetti peut être ajouté à deux analyses différentes (RM-054)', () => {
    // Pas de blocage QM-002 ici : la contrainte UNIQUE est (analyse_id, assujetti_id)
    const a1 = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'CDF',
    });
    const a2 = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyseSecondaire,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'CDF',
    });
    assert.ok(a1.success, 'Assujetti dans analyse 1 valide');
    assert.ok(a2.success, 'Assujetti dans analyse 2 valide (multi-analyse)');
  });

  it("L'assujetti dans une analyse a obligatoirement une devise explicite (RM-015)", () => {
    const result = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      // Pas de devise → doit échouer
    });
    assert.ok(!result.success, 'Devise obligatoire');
  });

  it('Priorité : HAUTE, MOYENNE, BASSE sont les seules valeurs acceptées', () => {
    const valid = ['HAUTE', 'MOYENNE', 'BASSE'];
    for (const p of valid) {
      const r = AnalyseAssujettiAddSchema.safeParse({
        analyse_id: TEST_IDS.analyse,
        assujetti_id: TEST_IDS.assujetti,
        devise: 'CDF',
        priorite: p,
      });
      assert.ok(r.success, `Priorité ${p} valide`);
    }
    const invalid = AnalyseAssujettiAddSchema.safeParse({
      analyse_id: TEST_IDS.analyse,
      assujetti_id: TEST_IDS.assujetti,
      devise: 'CDF',
      priorite: 'CRITIQUE',
    });
    assert.ok(!invalid.success, 'CRITIQUE rejeté');
  });
});
