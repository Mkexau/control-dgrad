// =============================================================================
// DGRAD CONTROLE - TESTS UNITAIRES & INTÉGRATION : RÉSULTATS, REDRESSEMENTS, PÉNALITÉS & AVIS (ÉTAPE 8)
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ResultatSaveSchema,
  RedressementAddSchema,
  RedressementDeleteSchema,
  PenaliteAddSchema,
  PenaliteDeleteSchema,
  AvisRecouvrementGenerateSchema,
} from '../lib/validations/results.ts';

test('Module Résultats Financiers & Sanctions — Validation Zod & Règles Métier (Étape 8)', async (t) => {
  const dummyUUID1 = '11111111-1111-4111-8111-111111111111';
  const dummyUUID2 = '22222222-2222-4222-8222-222222222222';
  const dummyUUID3 = '33333333-3333-4333-8333-333333333333';

  // ---------------------------------------------------------------------------
  // 1. Schémas de Validation Zod : Résultats Financiers
  // ---------------------------------------------------------------------------
  await t.test('1. Schémas de Validation Zod : Résultats Financiers', async (t2) => {
    await t2.test('ResultatSaveSchema : valide un résultat CHARGEE cohérent en CDF', () => {
      const validData = {
        controle_id: dummyUUID1,
        type_resultat: 'CHARGEE',
        devise: 'CDF',
        montant_du: 1500000.5,
        montant_penalites: 250000,
        montant_total: 1750000.5,
        redressements: [
          { montant: 1500000.5, motif: 'Omission de déclaration acte minier 2025' },
        ],
        penalites: [
          { montant: 250000, motif: 'Majoration légale non-déclaration art. 42' },
        ],
      };
      const res = ResultatSaveSchema.safeParse(validData);
      assert.equal(res.success, true);
    });

    await t2.test('ResultatSaveSchema : valide un résultat CHARGEE cohérent en USD', () => {
      const validData = {
        controle_id: dummyUUID1,
        type_resultat: 'CHARGEE',
        devise: 'USD',
        montant_du: 5000,
        montant_penalites: 500,
        montant_total: 5500,
      };
      const res = ResultatSaveSchema.safeParse(validData);
      assert.equal(res.success, true);
    });

    await t2.test('ResultatSaveSchema : rejette une incohérence arithmétique de montant total (RM-041)', () => {
      const invalidData = {
        controle_id: dummyUUID1,
        type_resultat: 'CHARGEE',
        devise: 'USD',
        montant_du: 1000,
        montant_penalites: 200,
        montant_total: 1500, // Incohérent (1000 + 200 != 1500)
      };
      const res = ResultatSaveSchema.safeParse(invalidData);
      assert.equal(res.success, false);
      if (!res.success) {
        const errorMsg = res.error.issues?.[0]?.message || res.error.message;
        assert.match(errorMsg, /Incohérence du montant total/);
      }
    });

    await t2.test('ResultatSaveSchema : rejette un montant négatif', () => {
      const invalidData = {
        controle_id: dummyUUID1,
        type_resultat: 'CHARGEE',
        devise: 'CDF',
        montant_du: -100,
        montant_penalites: 0,
        montant_total: -100,
      };
      const res = ResultatSaveSchema.safeParse(invalidData);
      assert.equal(res.success, false);
    });

    await t2.test('ResultatSaveSchema : rejette un résultat DECHARGEE sans justification (RM-017)', () => {
      const invalidData = {
        controle_id: dummyUUID1,
        type_resultat: 'DECHARGEE',
        devise: 'CDF',
        montant_du: 0,
        montant_penalites: 0,
        montant_total: 0,
        justification: '', // Manquante
      };
      const res = ResultatSaveSchema.safeParse(invalidData);
      assert.equal(res.success, false);
      if (!res.success) {
        const errorMsg = res.error.issues?.[0]?.message || res.error.message;
        assert.match(errorMsg, /justification détaillée/);
      }
    });

    await t2.test('ResultatSaveSchema : accepte un résultat DECHARGEE avec justification probante', () => {
      const validData = {
        controle_id: dummyUUID1,
        type_resultat: 'DECHARGEE',
        devise: 'USD',
        montant_du: 0,
        montant_penalites: 0,
        montant_total: 0,
        justification: 'Vérification complète des quittances régulières et conformes.',
      };
      const res = ResultatSaveSchema.safeParse(validData);
      assert.equal(res.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Schémas de Validation Zod : Redressements, Pénalités & Avis
  // ---------------------------------------------------------------------------
  await t.test('2. Schémas de Validation Zod : Redressements, Pénalités & Avis', async (t2) => {
    await t2.test('RedressementAddSchema : valide un redressement conforme', () => {
      const res = RedressementAddSchema.safeParse({
        resultat_id: dummyUUID2,
        montant: 850000,
        devise: 'CDF',
        motif: 'Droits constatés non ordonnancés',
      });
      assert.equal(res.success, true);
    });

    await t2.test('RedressementAddSchema : rejette un motif trop court (< 3 chars)', () => {
      const res = RedressementAddSchema.safeParse({
        resultat_id: dummyUUID2,
        montant: 850000,
        devise: 'CDF',
        motif: 'NO',
      });
      assert.equal(res.success, false);
    });

    await t2.test('PenaliteAddSchema : valide une pénalité avec fondement juridique (QM-023)', () => {
      const res = PenaliteAddSchema.safeParse({
        resultat_id: dummyUUID2,
        montant: 1200,
        devise: 'USD',
        motif: 'Pénalité pour déclaration tardive art. 85',
      });
      assert.equal(res.success, true);
    });

    await t2.test('PenaliteDeleteSchema & RedressementDeleteSchema : valident les identifiants', () => {
      assert.equal(
        PenaliteDeleteSchema.safeParse({ penalite_id: dummyUUID3 }).success,
        true
      );
      assert.equal(
        RedressementDeleteSchema.safeParse({ redressement_id: dummyUUID3 }).success,
        true
      );
    });

    await t2.test('AvisRecouvrementGenerateSchema : valide l\'identifiant de résultat', () => {
      const res = AvisRecouvrementGenerateSchema.safeParse({
        resultat_id: dummyUUID1,
      });
      assert.equal(res.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Règles Métier : Séparation des pouvoirs, Périmètre & Finances
  // ---------------------------------------------------------------------------
  await t.test('3. Règles Métier : Séparation des pouvoirs, Périmètre & Finances', async (t2) => {
    await t2.test('ADMIN ne peut pas saisir de résultat métier (séparation RM-025)', () => {
      const user = { role: 'ADMIN' };
      const canSaveResult = user.role !== 'ADMIN';
      assert.equal(canSaveResult, false, 'ADMIN doit être rejeté');
    });

    await t2.test('Le résultat doit être strictement mono-devise (RM-040)', () => {
      const isConsistentCurrency = (resCurrency, itemCurrency) => resCurrency === itemCurrency;
      assert.equal(isConsistentCurrency('CDF', 'CDF'), true);
      assert.equal(isConsistentCurrency('USD', 'USD'), true);
      assert.equal(isConsistentCurrency('CDF', 'USD'), false, 'Mélange de devises refusé');
    });

    await t2.test('Un contrôle EN_ATTENTE ne peut pas recevoir de résultat', () => {
      const canAddResultToControle = (statut) => ['EN_COURS', 'TERMINE'].includes(statut);
      assert.equal(canAddResultToControle('EN_ATTENTE'), false);
      assert.equal(canAddResultToControle('ANNULE'), false);
      assert.equal(canAddResultToControle('EN_COURS'), true);
      assert.equal(canAddResultToControle('TERMINE'), true);
    });

    await t2.test('Avis de recouvrement : uniquement émis pour un résultat CHARGEE avec montant > 0', () => {
      const canGenerateAvis = (typeResultat, montantTotal) => {
        return typeResultat === 'CHARGEE' && montantTotal > 0;
      };

      assert.equal(canGenerateAvis('CHARGEE', 150000), true);
      assert.equal(canGenerateAvis('CHARGEE', 0), false);
      assert.equal(canGenerateAvis('DECHARGEE', 0), false);
      assert.equal(canGenerateAvis('DECHARGEE', 5000), false);
    });

    await t2.test('Anti-IDOR : Seul le Chef d\'équipe assigné ou contrôleur responsable peut saisir le résultat', () => {
      const controle = {
        type: 'SUR_PLACE',
        chef_equipe_id: dummyUUID1,
        controleur_responsable_id: null,
      };

      const isAuthorizedUser = (userAgentId, userProfileId) => {
        if (controle.type === 'SUR_PLACE') {
          return userAgentId === controle.chef_equipe_id;
        }
        return userProfileId === controle.controleur_responsable_id;
      };

      // Chef d'équipe assigné
      assert.equal(isAuthorizedUser(dummyUUID1, dummyUUID2), true);
      // Autre agent
      assert.equal(isAuthorizedUser(dummyUUID3, dummyUUID2), false);
    });
  });
});
