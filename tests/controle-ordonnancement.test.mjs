import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// TESTS MODULE DE CONTROLE DES DONNEES D'ORDONNANCEMENT
// =============================================================================

const TEST_IDS = {
  fiche: '6af6b7a2-13e1-4db5-8790-a0c7a0e1b001',
  bureauSol: '33333333-3333-4333-8333-333333333303',
  bureauSousSol: '33333333-3333-4333-8333-333333333304',
  bureauRJP: '33333333-3333-4333-8333-333333333305',
  bureauADM1: '33333333-3333-4333-8333-333333333306',
  bureauADM2: '33333333-3333-4333-8333-333333333307',
  bureauADM3: '33333333-3333-4333-8333-333333333308',
  bureauAnalyse: '33333333-3333-4333-8333-333333333301',
};

// 1. CALCULS FINANCIERS PURS : Reste Du
describe("1. Calculs Financiers Purs : Reste Du CDF et USD", async () => {
  const {
    calculerResteDu,
    calculerPenalite,
    calculerTotalDu,
  } = await import('../lib/validations/controle-ordonnancement.ts');

  it("Reste du CDF : 18 500 000 - 17 000 000 = 1 500 000", () => {
    assert.equal(calculerResteDu(18500000, 17000000), 1500000);
  });

  it("Reste du USD : 50 000 - 35 000 = 15 000", () => {
    assert.equal(calculerResteDu(50000, 35000), 15000);
  });

  it("Reste du = 0 quand le montant paye est egal au montant ordonnance", () => {
    assert.equal(calculerResteDu(500000, 500000), 0);
  });

  it("Reste du = 0 quand le montant paye depasse l ordonnancement", () => {
    assert.equal(calculerResteDu(500000, 600000), 0);
  });

  it("Penalite 5% sur le reste du CDF : 1 500 000 -> 75 000", () => {
    assert.equal(calculerPenalite(1500000), 75000);
  });

  it("Penalite 5% sur le reste du USD : 20 000 -> 1 000", () => {
    assert.equal(calculerPenalite(20000), 1000);
  });

  it("Aucune penalite si le montant est solde (reste 0)", () => {
    assert.equal(calculerPenalite(0), 0);
  });

  it("Total exigible CDF : reste 1 500 000 + penalite 75 000 = 1 575 000", () => {
    assert.equal(calculerTotalDu(1500000, 75000), 1575000);
  });

  it("Total exigible USD : reste 15 000 + penalite 750 = 15 750", () => {
    assert.equal(calculerTotalDu(15000, 750), 15750);
  });

  it("Total exigible = 0 si solde", () => {
    assert.equal(calculerTotalDu(0, 0), 0);
  });
});

// 2. DATES D ECHEANCE ET RETARD
describe("2. Calcul Dates d Echeance et Retard de Paiement", async () => {
  const { calculerDateEcheance, calculerRetard } = await import('../lib/validations/controle-ordonnancement.ts');

  it("Date d echeance : 2026-08-01 + 10 jours = 2026-08-11", () => {
    assert.equal(calculerDateEcheance('2026-08-01'), '2026-08-11');
  });

  it("Date d echeance : 2026-01-20 + 10 jours = 2026-01-30", () => {
    assert.equal(calculerDateEcheance('2026-01-20'), '2026-01-30');
  });

  it("Retard : Echeance 2026-08-16, paye 2026-08-25 -> 9 jours de retard", () => {
    const { joursRetard, estEnRetard } = calculerRetard('2026-08-16', '2026-08-25');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 9);
  });

  it("Pas de retard : Echeance 2026-08-16, paye 2026-08-10 -> 0 jour", () => {
    const { joursRetard, estEnRetard } = calculerRetard('2026-08-16', '2026-08-10');
    assert.equal(estEnRetard, false);
    assert.equal(joursRetard, 0);
  });

  it("Pas de retard si date de paiement non renseignee", () => {
    const { joursRetard, estEnRetard } = calculerRetard('2026-08-16', undefined);
    assert.equal(estEnRetard, false);
    assert.equal(joursRetard, 0);
  });
});

// 3. QUALIFICATION DE LA SITUATION DE L ASSUJETTI
describe("3. Qualification de la Situation de l Assujetti", async () => {
  const { determinerSituationAssujetti } = await import('../lib/validations/controle-ordonnancement.ts');

  it("NOTE_ABSENTE : note absente -> situation NOTE_ABSENTE", () => {
    const sit = determinerSituationAssujetti({
      statutNote: 'ABSENTE',
      montantOrdonnanceCDF: 1000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 0,
      montantPayeUSD: 0,
      joursRetard: 0,
    });
    assert.equal(sit, 'NOTE_ABSENTE');
  });

  it("DEBITEUR : reste du > 0 -> DEBITEUR", () => {
    const sit = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 8000000,
      montantPayeUSD: 0,
      joursRetard: 0,
    });
    assert.equal(sit, 'DEBITEUR');
  });

  it("CONFORME : montant solde a temps -> CONFORME", () => {
    const sit = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 5000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 5000000,
      montantPayeUSD: 0,
      joursRetard: 0,
    });
    assert.equal(sit, 'CONFORME');
  });

  it("PAIEMENT_RETARD : solde mais paye en retard -> PAIEMENT_RETARD", () => {
    const sit = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 5000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 5000000,
      montantPayeUSD: 0,
      joursRetard: 5,
    });
    assert.equal(sit, 'PAIEMENT_RETARD');
  });

  it("NON_DECLARE : qualification explicite -> NON_DECLARE", () => {
    const sit = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 5000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 0,
      montantPayeUSD: 0,
      joursRetard: 0,
      situationExplicite: 'NON_DECLARE',
    });
    assert.equal(sit, 'NON_DECLARE');
  });
});

// 4. SCHEMAS ZOD DE VERIFICATION D ORDONNANCEMENT
describe("4. Validation Zod : VerificationOrdonnancementInputSchema", async () => {
  const { VerificationOrdonnancementInputSchema } = await import('../lib/validations/controle-ordonnancement.ts');

  it("Valide un enregistrement de verification conforme", () => {
    const res = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: TEST_IDS.fiche,
      statut_note: 'RETROUVEE',
      numero_note_verifie: 'NP-2026-VERIF-001',
      montant_paye_cdf: 17000000,
      montant_paye_usd: 0,
      date_paiement: '2026-08-20',
      observations: 'Controle effectue au bureau',
    });
    assert.ok(res.success, 'Doit etre valide');
    assert.equal(res.data?.montant_paye_cdf, 17000000);
  });

  it("Accepte une verification sans numero de note verifie ni date", () => {
    const res = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: TEST_IDS.fiche,
      statut_note: 'ABSENTE',
    });
    assert.ok(res.success, 'Doit etre valide : champs optionnels absents');
  });

  it("Refuse un montant paye CDF negatif", () => {
    const res = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: TEST_IDS.fiche,
      statut_note: 'RETROUVEE',
      montant_paye_cdf: -500,
    });
    assert.ok(!res.success, 'Montant negatif doit etre refuse');
  });

  it("Refuse un UUID de fiche invalide", () => {
    const res = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: 'pas-un-uuid',
      statut_note: 'RETROUVEE',
    });
    assert.ok(!res.success, 'UUID invalide doit etre refuse');
  });

  it("Refuse un statut de note inconnu", () => {
    const res = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: TEST_IDS.fiche,
      statut_note: 'INEXISTANT',
    });
    assert.ok(!res.success, 'Statut de note inconnu doit etre refuse');
  });
});

describe('Transmission groupée des fiches d’ordonnancement', async () => {
  const { FichesOrdonnancementTransmissionMasseSchema } = await import('../lib/validations/recoupement-ordonnancement.ts');
  const ficheA = '6af6b7a2-13e1-4db5-8790-a0c7a0e1b001';
  const ficheB = '6af6b7a2-13e1-4db5-8790-a0c7a0e1b002';

  it('accepte une sélection multiple de fiches distinctes', () => {
    assert.ok(FichesOrdonnancementTransmissionMasseSchema.safeParse({ fiche_ids: [ficheA, ficheB] }).success);
  });

  it('refuse une sélection vide ou contenant un doublon', () => {
    assert.ok(!FichesOrdonnancementTransmissionMasseSchema.safeParse({ fiche_ids: [] }).success);
    assert.ok(!FichesOrdonnancementTransmissionMasseSchema.safeParse({ fiche_ids: [ficheA, ficheA] }).success);
  });
});

// 5. GUARDS D AUTORISATION ET CLOISONNEMENT DES BUREAUX
describe("5. Guards d Autorisation : Cloisonnement des Bureaux de Controle", async () => {
  const {
    assertCanReadControleOrdonnancement,
    assertCanManageControleOrdonnancement,
  } = await import('../lib/auth/controle-ordonnancement-access.ts');

  it("Chef Bureau Controle Sol peut lire son bureau", () => {
    const chefSol = { id: 'u-sol', email: 'chef.sol@test.local', role: 'CHEF_BUREAU', bureau_id: TEST_IDS.bureauSol, is_active: true };
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(chefSol, TEST_IDS.bureauSol));
  });

  it("Chef Bureau Controle Sol ne peut pas lire un autre bureau (Sous-sol)", () => {
    const chefSol = { id: 'u-sol', email: 'chef.sol@test.local', role: 'CHEF_BUREAU', bureau_id: TEST_IDS.bureauSol, is_active: true };
    assert.throws(() => assertCanReadControleOrdonnancement(chefSol, TEST_IDS.bureauSousSol));
  });

  it("Chef Bureau Controle Sol peut gerer son bureau", () => {
    const chefSol = { id: 'u-sol', email: 'chef.sol@test.local', role: 'CHEF_BUREAU', bureau_id: TEST_IDS.bureauSol, is_active: true };
    assert.doesNotThrow(() => assertCanManageControleOrdonnancement(chefSol, TEST_IDS.bureauSol));
  });

  it("Chef Bureau Controle Sol ne peut pas gerer un autre bureau (ADM1)", () => {
    const chefSol = { id: 'u-sol', email: 'chef.sol@test.local', role: 'CHEF_BUREAU', bureau_id: TEST_IDS.bureauSol, is_active: true };
    assert.throws(
      () => assertCanManageControleOrdonnancement(chefSol, TEST_IDS.bureauADM1),
      /Vous ne pouvez vérifier que les ordonnancements relevant de votre bureau/
    );
  });

  it("Chef Bureau Analyse ne peut pas gerer un bureau de controle", () => {
    const chefAnalyse = { id: 'u-ana', email: 'chef.analyse@test.local', role: 'CHEF_BUREAU', bureau_id: TEST_IDS.bureauAnalyse, is_active: true };
    assert.throws(
      () => assertCanManageControleOrdonnancement(chefAnalyse, TEST_IDS.bureauSol),
      /Vous ne pouvez vérifier que les ordonnancements relevant de votre bureau/
    );
  });

  it("ADMIN technique ne peut pas enregistrer de verification metier (separation des pouvoirs)", () => {
    const admin = { id: 'u-admin', email: 'admin@test.local', role: 'ADMIN', bureau_id: TEST_IDS.bureauSol, is_active: true };
    assert.throws(
      () => assertCanManageControleOrdonnancement(admin, TEST_IDS.bureauSol),
      /L’administrateur technique ne peut pas enregistrer de vérification métier/
    );
  });

  it("DIRECTEUR_GENERAL peut lire les donnees de tous les bureaux", () => {
    const dg = { id: 'u-dg', email: 'dg@test.local', role: 'DIRECTEUR_GENERAL', bureau_id: null, is_active: true };
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(dg, TEST_IDS.bureauSol));
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(dg, TEST_IDS.bureauADM3));
  });

  it("CHEF_DIVISION peut lire les donnees de tous les bureaux", () => {
    const chef = { id: 'u-cd', email: 'chefdiv@test.local', role: 'CHEF_DIVISION', bureau_id: null, is_active: true };
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(chef, TEST_IDS.bureauRJP));
  });

  it("CONSULTATION peut lire mais pas gerer", () => {
    const consult = { id: 'u-cons', email: 'consult@test.local', role: 'CONSULTATION', bureau_id: null, is_active: true };
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(consult, TEST_IDS.bureauADM2));
    assert.throws(() => assertCanManageControleOrdonnancement(consult, TEST_IDS.bureauADM2));
  });
});
