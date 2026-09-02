import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Audit & Validation du Calcul du Délai de Paiement (10 jours) et Pénalité de Retard (5 %)', async () => {
  const {
    DELAI_PAIEMENT_STANDARD,
    TAUX_PENALITE_RETARD_STANDARD,
    calculerDateEcheance,
    calculerRetard,
    calculerResteDu,
    calculerPenalite,
    calculerTotalDu,
    determinerSituationAssujetti,
  } = await import('../lib/validations/controle-ordonnancement.ts');

  // Constantes
  it('Délai standard de paiement est fixé à 10 jours et taux de pénalité à 5 %', () => {
    assert.equal(DELAI_PAIEMENT_STANDARD, 10);
    assert.equal(TAUX_PENALITE_RETARD_STANDARD, 0.05);
  });

  it('La date limite ne peut pas être modifiée par un délai transmis par l’interface', () => {
    // Le second argument est volontairement fourni ici pour couvrir un ancien
    // appel client : il doit être ignoré au runtime, la règle reste 10 jours.
    assert.equal(calculerDateEcheance('2026-06-01', 30), '2026-06-11');
  });

  // Test 1 : Date émission 01/06/2026, Paiement 11/06/2026 => date limite 11/06/2026, 0 jour retard, pénalité 0
  it('1. Date émission 01/06/2026, Paiement 11/06/2026 => date limite 11/06/2026 => 0 jour de retard => pénalité 0', () => {
    const dateEmission = '2026-06-01';
    const datePaiement = '2026-06-11';
    const dateLimite = calculerDateEcheance(dateEmission, DELAI_PAIEMENT_STANDARD);
    assert.equal(dateLimite, '2026-06-11');

    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, datePaiement);
    assert.equal(estEnRetard, false);
    assert.equal(joursRetard, 0);

    const resteDu = calculerResteDu(10000000, 7000000);
    const penalite = calculerPenalite(resteDu, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    assert.equal(penalite, 0);
  });

  // Test 2 : Date émission 01/06/2026, Paiement 12/06/2026 => 1 jour de retard
  it('2. Date émission 01/06/2026, Paiement 12/06/2026 => 1 jour de retard', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, '2026-06-12');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 1);
  });

  // Test 3 : Date émission 01/06/2026, Paiement 15/06/2026 => 4 jours de retard
  it('3. Date émission 01/06/2026, Paiement 15/06/2026 => 4 jours de retard', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, '2026-06-15');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 4);
  });

  // Test 4 : Date émission 01/06/2026, Paiement 21/06/2026 => 10 jours de retard
  it('4. Date émission 01/06/2026, Paiement 21/06/2026 => 10 jours de retard', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, '2026-06-21');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 10);
  });

  // Test 5 : Paiement effectué avant la date limite => aucune pénalité
  it('5. Paiement effectué avant la date limite => aucune pénalité', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, '2026-06-05');
    assert.equal(estEnRetard, false);
    assert.equal(joursRetard, 0);

    const resteDu = calculerResteDu(10000000, 10000000);
    const penalite = calculerPenalite(resteDu, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    assert.equal(penalite, 0);
  });

  // Test 6 : Paiement effectué après la date limite avec penalite_applicable=true => pénalité = manque à gagner × 5 %
  it('6. Paiement effectué après la date limite avec penalite_applicable=true => pénalité = manque à gagner × 5 %', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { estEnRetard } = calculerRetard(dateLimite, '2026-06-20');
    assert.equal(estEnRetard, true);

    const montantDu = 10000000;
    const montantPaye = 7000000;
    const manqueAGagner = calculerResteDu(montantDu, montantPaye);
    assert.equal(manqueAGagner, 3000000);

    const penaliteApplicable = true;
    const penalite = penaliteApplicable ? calculerPenalite(manqueAGagner, TAUX_PENALITE_RETARD_STANDARD, estEnRetard) : 0;
    assert.equal(penalite, 150000);

    const totalRestant = calculerTotalDu(manqueAGagner, penalite);
    assert.equal(totalRestant, 3150000);
  });

  // Test 7 : Paiement partiel dans le délai => manque à gagner calculé => aucune pénalité de retard
  it('7. Paiement partiel dans le délai => manque à gagner calculé => aucune pénalité de retard', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { estEnRetard } = calculerRetard(dateLimite, '2026-06-08');
    assert.equal(estEnRetard, false);

    const manqueAGagner = calculerResteDu(10000000, 7000000);
    assert.equal(manqueAGagner, 3000000);

    // Même si le flag penalite_applicable était coché par erreur, pas de retard => pénalité = 0
    const penalite = calculerPenalite(manqueAGagner, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    assert.equal(penalite, 0);
    assert.equal(calculerTotalDu(manqueAGagner, penalite), 3000000);
  });

  // Test 8 : Paiement partiel après le délai => manque à gagner calculé => pénalité 5 % si penalite_applicable=true
  it('8. Paiement partiel après le délai => manque à gagner calculé => pénalité 5 % si penalite_applicable=true', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { estEnRetard } = calculerRetard(dateLimite, '2026-06-15');
    assert.equal(estEnRetard, true);

    const manqueAGagner = calculerResteDu(10000000, 7000000);
    assert.equal(manqueAGagner, 3000000);

    const penalite = calculerPenalite(manqueAGagner, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    assert.equal(penalite, 150000);
    assert.equal(calculerTotalDu(manqueAGagner, penalite), 3150000);
  });

  // Test 9 : Aucun paiement => ne pas inventer une date de paiement
  it('9. Aucun paiement => ne pas inventer une date de paiement', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { joursRetard, estEnRetard } = calculerRetard(dateLimite, null);
    assert.equal(joursRetard, 0);
    assert.equal(estEnRetard, false);

    const manqueAGagner = calculerResteDu(10000000, 0);
    assert.equal(manqueAGagner, 10000000);

    const situation = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 0,
      montantPayeUSD: 0,
      joursRetard: 0,
    });
    assert.equal(situation, 'DEBITEUR');
  });

  // Test 10 : Vérifier séparément CDF et USD
  it('10. Vérifier séparément CDF et USD sans conversion monétaire', () => {
    const dateLimite = calculerDateEcheance('2026-06-01', DELAI_PAIEMENT_STANDARD);
    const { estEnRetard } = calculerRetard(dateLimite, '2026-06-25');

    // CDF
    const manqueCDF = calculerResteDu(10000000, 7000000);
    const penCDF = calculerPenalite(manqueCDF, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    const totCDF = calculerTotalDu(manqueCDF, penCDF);
    assert.equal(manqueCDF, 3000000);
    assert.equal(penCDF, 150000);
    assert.equal(totCDF, 3150000);

    // USD
    const manqueUSD = calculerResteDu(50000, 30000);
    const penUSD = calculerPenalite(manqueUSD, TAUX_PENALITE_RETARD_STANDARD, estEnRetard);
    const totUSD = calculerTotalDu(manqueUSD, penUSD);
    assert.equal(manqueUSD, 20000);
    assert.equal(penUSD, 1000);
    assert.equal(totUSD, 21000);
  });
});
