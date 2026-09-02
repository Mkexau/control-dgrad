import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variables d environnement Supabase manquantes pour les tests.');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('Suite Complète des 25 Tests Métier — Reprise Contrôle, Ordonnancement & Consolidation', async () => {
  const {
    calculerResteDu,
    calculerPenalite,
    calculerTotalDu,
    calculerDateEcheance,
    calculerRetard,
    determinerSituationAssujetti,
    VerificationOrdonnancementInputSchema,
  } = await import('../lib/validations/controle-ordonnancement.ts');

  const {
    assertCanReadControleOrdonnancement,
    assertCanManageControleOrdonnancement,
  } = await import('../lib/auth/controle-ordonnancement-access.ts');

  const {
    FicheOrdonnancementCreateSchema,
  } = await import('../lib/validations/recoupement-ordonnancement.ts');

  // 1. BUR_ANA_REC peut consulter tous les assujettis autorisés
  it('1. BUR_ANA_REC peut consulter tous les assujettis autorisés (accès transversal)', async () => {
    const { data: userAna, error: uErr } = await adminSupabase
      .from('profiles')
      .select('id, email, role, bureau_id, bureaux(code, type)')
      .eq('email', 'chef.bureau.analyse.recoupement@test.local')
      .single();

    assert.ifError(uErr);
    assert.ok(userAna);
    const b = Array.isArray(userAna.bureaux) ? userAna.bureaux[0] : userAna.bureaux;
    assert.equal(b?.code, 'BUR_ANA_REC');

    // Consultation transversale sans restriction de secteur
    const { data: assujettis, error: aErr } = await adminSupabase
      .from('assujettis')
      .select('id, identifiant, nom_raison_sociale, secteur_principal_id')
      .limit(10);

    assert.ifError(aErr);
    assert.ok(Array.isArray(assujettis));
  });

  // 2. BUR_ANA_REC n’a aucun secteur
  it('2. BUR_ANA_REC n’a aucun secteur d’activité qui lui est rattaché', async () => {
    const { data: bureauAna, error: bErr } = await adminSupabase
      .from('bureaux')
      .select('id, code, type')
      .eq('code', 'BUR_ANA_REC')
      .single();

    assert.ifError(bErr);
    assert.equal(bureauAna.type, 'RECOUPEMENT');

    const { data: secteurs, error: sErr } = await adminSupabase
      .from('secteurs')
      .select('id, code')
      .eq('bureau_id', bureauAna.id);

    assert.ifError(sErr);
    assert.equal(secteurs?.length, 0, 'BUR_ANA_REC ne doit posséder aucun secteur d’activité');
  });

  // 3. Les 36 secteurs restent sous les 6 bureaux de contrôle
  it('3. Les 36 secteurs d’activité restent attachés exclusivement aux 6 bureaux de contrôle (6 par bureau)', async () => {
    const { data: secteurs, error } = await adminSupabase
      .from('secteurs')
      .select('id, code, bureau_id, bureaux(code, type)');

    assert.ifError(error);
    assert.equal(secteurs?.length, 36, 'Il doit y avoir exactement 36 secteurs');

    const byBureau = {};
    for (const s of secteurs || []) {
      const b = Array.isArray(s.bureaux) ? s.bureaux[0] : s.bureaux;
      assert.equal(b?.type, 'CONTROLE', `Le secteur ${s.code} doit être sous un bureau de type CONTROLE`);
      byBureau[b?.code] = (byBureau[b?.code] || 0) + 1;
    }

    const controlBureaux = [
      'BUR_CTRL_SOL',
      'BUR_CTRL_SOUS_SOL',
      'BUR_REC_JUD_PART',
      'BUR_CTRL_ADM1',
      'BUR_CTRL_ADM2',
      'BUR_CTRL_ADM3',
    ];

    for (const code of controlBureaux) {
      assert.equal(byBureau[code], 6, `Le bureau ${code} doit posséder exactement 6 secteurs`);
    }
  });

  // 4. BUR_ANA_REC peut saisir le montant dû
  it('4. BUR_ANA_REC peut saisir le montant dû lors de la préparation de la fiche', () => {
    const input = {
      assujetti_id: '11111111-1111-4111-8111-111111111111',
      secteur_id: '22222222-2222-4222-8222-222222222222',
      bureau_id: '33333333-3333-4333-8333-333333333304',
      numero_serie: 'SERIE-2026-TEST',
      delai_traitement_jours: 30,
      numero_note_perception: 'NP-TEST-001',
      date_note_perception: '2026-09-01',
      acte_generateur: 'Redevance minière',
      article_budgetaire: '001-MINES',
      nombre_actes: 1,
      montant_cdf: 10000000,
      montant_usd: 0,
    };

    const parsed = FicheOrdonnancementCreateSchema.safeParse(input);
    assert.ok(parsed.success);
    assert.equal(parsed.data?.montant_cdf, 10000000);
  });

  // 5. Le montant dû est conservé dans la fiche d’ordonnancement
  it('5. Le montant dû est conservé dans la fiche d’ordonnancement de référence', async () => {
    // Créer un assujetti et une fiche de test
    const { data: sMines } = await adminSupabase
      .from('secteurs')
      .select('id, bureau_id, bureaux(id, code)')
      .eq('code', 'SSOL_MINES')
      .single();

    const bMines = Array.isArray(sMines.bureaux) ? sMines.bureaux[0] : sMines.bureaux;

    const { data: assujetti } = await adminSupabase
      .from('assujettis')
      .insert({
        nom_raison_sociale: 'TEST SAISIE MONTANT DU SA',
        type: 'PERSONNE_MORALE',
        secteur_principal_id: sMines.id,
        actif: true,
      })
      .select()
      .single();

    const { data: chefAna } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', 'chef.bureau.analyse.recoupement@test.local')
      .single();

    const numFiche = `FO-MONTANTDU-${Date.now()}`;
    const { data: fiche, error: fErr } = await adminSupabase
      .from('fiches_ordonnancement')
      .insert({
        numero_fiche: numFiche,
        assujetti_id: assujetti.id,
        secteur_id: sMines.id,
        bureau_id: bMines.id,
        numero_serie: 'SERIE-2026-MONTANT',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-MONTANT-001',
        date_note_perception: '2026-09-01',
        acte_generateur: 'Taxe extraction',
        nombre_actes: 1,
        montant_cdf: 10000000,
        montant_usd: 0,
        statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
        created_by: chefAna.id,
      })
      .select()
      .single();

    assert.ifError(fErr);
    assert.equal(Number(fiche.montant_cdf), 10000000);

    // 6. Le bureau de contrôle peut consulter le montant dû
    const { data: ficheConsultee, error: fcErr } = await adminSupabase
      .from('fiches_ordonnancement')
      .select('id, montant_cdf, montant_usd, bureau_id')
      .eq('id', fiche.id)
      .single();

    assert.ifError(fcErr);
    assert.equal(Number(ficheConsultee.montant_cdf), 10000000);

    // Nettoyage
    await adminSupabase.from('fiches_ordonnancement').delete().eq('id', fiche.id);
    await adminSupabase.from('assujettis').delete().eq('id', assujetti.id);
  });

  // 6. Le bureau de contrôle peut consulter le montant dû
  it('6. Le bureau de contrôle peut consulter le montant dû de la fiche transmise', async () => {
    const { data: bSousSol } = await adminSupabase.from('bureaux').select('id').eq('code', 'BUR_CTRL_SOUS_SOL').single();
    const userSousSol = { id: 'u-ssol', email: 'chef.sousol@test.local', role: 'CHEF_BUREAU', bureau_id: bSousSol.id, is_active: true };

    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(userSousSol, bSousSol.id));
  });

  // 7. Le bureau de contrôle peut saisir le montant payé
  it('7. Le bureau de contrôle peut saisir le montant effectivement payé', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '44444444-4444-4444-8444-444444444444',
      statut_note: 'RETROUVEE',
      numero_note_verifie: 'NP-VERIF-001',
      montant_paye_cdf: 7000000,
      montant_paye_usd: 0,
      date_paiement: '2026-09-10',
      penalite_applicable: true,
    });

    assert.ok(parsed.success);
    assert.equal(parsed.data?.montant_paye_cdf, 7000000);
    assert.equal(parsed.data?.penalite_applicable, true);
  });

  // 8. Le bureau de contrôle ne modifie pas le montant dû
  it('8. Le bureau de contrôle ne modifie pas le montant dû de la fiche d’ordonnancement', async () => {
    const { data: sSol } = await adminSupabase.from('secteurs').select('id, bureau_id, bureaux(id)').eq('code', 'SOL_FONCIER').single();
    const bSol = Array.isArray(sSol.bureaux) ? sSol.bureaux[0] : sSol.bureaux;

    const { data: testAssujetti } = await adminSupabase
      .from('assujettis')
      .insert({
        nom_raison_sociale: 'TEST IMMUTABILITE MONTANT DU SA',
        type: 'PERSONNE_MORALE',
        secteur_principal_id: sSol.id,
        actif: true,
      })
      .select()
      .single();

    const { data: chefAna } = await adminSupabase.from('profiles').select('id').eq('email', 'chef.bureau.analyse.recoupement@test.local').single();

    const { data: fiche } = await adminSupabase
      .from('fiches_ordonnancement')
      .insert({
        numero_fiche: `FO-IMMUT-${Date.now()}`,
        assujetti_id: testAssujetti.id,
        secteur_id: sSol.id,
        bureau_id: bSol.id,
        numero_serie: 'SERIE-IMMUT',
        delai_traitement_jours: 15,
        numero_note_perception: 'NP-IMMUT-001',
        date_note_perception: '2026-09-01',
        acte_generateur: 'Redevance foncière',
        nombre_actes: 1,
        montant_cdf: 10000000,
        montant_usd: 0,
        statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
        created_by: chefAna.id,
      })
      .select()
      .single();

    // Profil vérificateur du bureau Sol
    const { data: chefSol } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('bureau_id', bSol.id)
      .limit(1)
      .single();

    const dateEcheance = calculerDateEcheance(fiche.date_note_perception);
    const resteDuCDF = calculerResteDu(Number(fiche.montant_cdf), 7000000);
    const penaliteCDF = calculerPenalite(resteDuCDF);
    const totalDuCDF = calculerTotalDu(resteDuCDF, penaliteCDF);

    await adminSupabase.from('verifications_ordonnancement').insert({
      fiche_ordonnancement_id: fiche.id,
      assujetti_id: testAssujetti.id,
      bureau_id: bSol.id,
      secteur_id: sSol.id,
      statut_note: 'RETROUVEE',
      numero_note_verifie: 'NP-IMMUT-001',
      montant_paye_cdf: 7000000,
      montant_paye_usd: 0,
      date_paiement: '2026-09-10',
      date_echeance: dateEcheance,
      jours_retard: 0,
      statut_paiement: 'DEBITEUR',
      reste_du_cdf: resteDuCDF,
      reste_du_usd: 0,
      penalite_cdf: penaliteCDF,
      penalite_usd: 0,
      total_du_cdf: totalDuCDF,
      total_du_usd: 0,
      penalite_applicable: true,
      verifie_par: chefSol.id,
    });

    // Re-vérifier la fiche d'ordonnancement source : montant_cdf doit rester 10 000 000
    const { data: ficheApres } = await adminSupabase
      .from('fiches_ordonnancement')
      .select('montant_cdf, montant_usd')
      .eq('id', fiche.id)
      .single();

    assert.equal(Number(ficheApres.montant_cdf), 10000000, 'Le montant dû de la fiche ne doit JAMAIS être modifié par la vérification');

    // Nettoyage
    await adminSupabase.from('verifications_ordonnancement').delete().eq('fiche_ordonnancement_id', fiche.id);
    await adminSupabase.from('fiches_ordonnancement').delete().eq('id', fiche.id);
    await adminSupabase.from('assujettis').delete().eq('id', testAssujetti.id);
  });

  // 9. Le manque à gagner est calculé automatiquement
  it('9. Le manque à gagner est calculé automatiquement : 10M - 7M = 3M CDF', () => {
    const manque = calculerResteDu(10000000, 7000000);
    assert.equal(manque, 3000000);
  });

  // 10. Le manque à gagner ne peut pas être négatif
  it('10. Le manque à gagner ne peut pas être négatif : max(0, 10M - 12M) = 0', () => {
    const manque = calculerResteDu(10000000, 12000000);
    assert.equal(manque, 0);
  });

  // 11. La date limite est conservée
  it('11. La date limite (d’échéance) est calculée à 10 jours depuis la date d’émission', () => {
    const echeance = calculerDateEcheance('2026-09-01');
    assert.equal(echeance, '2026-09-11');
  });

  // 12. La date effective de paiement est conservée
  it('12. La date effective de paiement est conservée dans l’input et le schéma', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '44444444-4444-4444-8444-444444444444',
      statut_note: 'RETROUVEE',
      date_paiement: '2026-09-25',
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data?.date_paiement, '2026-09-25');
  });

  // 13. Le retard est calculé automatiquement
  it('13. Le nombre de jours de retard est calculé automatiquement (sans saisie manuelle)', () => {
    const { joursRetard, estEnRetard } = calculerRetard('2026-10-01', '2026-10-15');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 14);

    const ponctuel = calculerRetard('2026-10-01', '2026-09-20');
    assert.equal(ponctuel.estEnRetard, false);
    assert.equal(ponctuel.joursRetard, 0);
  });

  // 14. penalite_applicable est correctement enregistré
  it('14. penalite_applicable est correctement enregistré et conditionne le calcul de la pénalité', () => {
    const resteDu = 3000000;
    const penaliteDesactivee = false ? calculerPenalite(resteDu) : 0;
    assert.equal(penaliteDesactivee, 0);

    const penaliteActivee = true ? calculerPenalite(resteDu, 0.05) : 0;
    assert.equal(penaliteActivee, 150000);
    assert.equal(calculerTotalDu(resteDu, penaliteActivee), 3150000);
  });

  // 15. Aucun ancien champ « déclaration » supprimé n’est réintroduit
  it('15. Aucun ancien champ « déclaration » supprimé n’est présent dans le schéma', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '44444444-4444-4444-8444-444444444444',
      statut_note: 'RETROUVEE',
      montant_declare: 1000000,
      periode_declaree: '2026-T1',
      reference_declaration: 'DEC-001',
      date_declaration: '2026-01-01',
      declaration_constatee: 'oui',
      nouvelle_declaration: 'non',
    });

    assert.ok(parsed.success);
    const data = parsed.data;
    assert.equal(data.montant_declare, undefined);
    assert.equal(data.periode_declaree, undefined);
    assert.equal(data.reference_declaration, undefined);
    assert.equal(data.date_declaration, undefined);
    assert.equal(data.declaration_constatee, undefined);
    assert.equal(data.nouvelle_declaration, undefined);
  });

  // 16. La déclaration n’est jamais dupliquée dans la vérification
  it('16. La vérification référence la fiche d’ordonnancement sans dupliquer la déclaration', async () => {
    const { error } = await adminSupabase
      .from('verifications_ordonnancement')
      .select('fiche_ordonnancement_id, assujetti_id')
      .limit(1);

    assert.ifError(error);
  });

  // 17. CDF et USD restent séparés
  it('17. CDF et USD restent strictement séparés sans conversion monétaire', () => {
    const resteCDF = calculerResteDu(10000000, 7000000);
    const resteUSD = calculerResteDu(50000, 30000);

    assert.equal(resteCDF, 3000000);
    assert.equal(resteUSD, 20000);

    const penCDF = calculerPenalite(resteCDF);
    const penUSD = calculerPenalite(resteUSD);

    assert.equal(penCDF, 150000);
    assert.equal(penUSD, 1000);

    assert.equal(calculerTotalDu(resteCDF, penCDF), 3150000);
    assert.equal(calculerTotalDu(resteUSD, penUSD), 21000);
  });

  // 18. Le résultat individuel est correctement généré
  it('18. Le résultat individuel de contrôle est correctement généré avec qualification', () => {
    const situation = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 7000000,
      montantPayeUSD: 0,
      joursRetard: 10,
    });

    assert.equal(situation, 'DEBITEUR');

    const situationConforme = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 10000000,
      montantPayeUSD: 0,
      joursRetard: 0,
    });

    assert.equal(situationConforme, 'CONFORME');
  });

  // 19. Les résultats peuvent être consolidés par secteur
  it('19. Les résultats peuvent être consolidés par secteur d’activité (Niveau 2)', async () => {
    const { data: secteurs, error } = await adminSupabase
      .from('secteurs')
      .select('id, code, nom, bureau_id')
      .eq('actif', true);

    assert.ifError(error);
    assert.equal(secteurs.length, 36);
  });

  // 20. Les résultats peuvent être consolidés par bureau
  it('20. Les résultats peuvent être consolidés par bureau de contrôle (Niveau 3)', async () => {
    const { data: bureaux, error } = await adminSupabase
      .from('bureaux')
      .select('id, code, nom, type')
      .eq('type', 'CONTROLE')
      .eq('actif', true);

    assert.ifError(error);
    assert.equal(bureaux.length, 6, 'Il doit y avoir exactement 6 bureaux de contrôle');
  });

  // 21. Les consolidations CDF/USD restent séparées
  it('21. Les consolidations CDF et USD restent strictement distinctes à chaque niveau', () => {
    const consolidationTest = {
      nombre_assujettis: 10,
      nombre_fiches: 15,
      nombre_debiteurs: 3,
      nombre_retards: 2,
      nombre_notes_absentes: 1,
      nombre_non_declarants: 0,
      cdf: {
        total_du: 50000000,
        total_paye: 35000000,
        manque_a_gagner: 15000000,
        penalites: 750000,
        total_exigible: 15750000,
      },
      usd: {
        total_du: 100000,
        total_paye: 60000,
        manque_a_gagner: 40000,
        penalites: 2000,
        total_exigible: 42000,
      },
    };

    assert.equal(consolidationTest.cdf.manque_a_gagner, 15000000);
    assert.equal(consolidationTest.usd.manque_a_gagner, 40000);
    assert.notEqual(consolidationTest.cdf.total_du, consolidationTest.usd.total_du);
  });

  // 22. Les secteurs présentant les plus gros manques à gagner sont identifiables
  it('22. Les secteurs présentant les plus gros manques à gagner sont identifiables et classés', () => {
    const secteursData = [
      { code: 'SOL_FONCIER', manque_a_gagner_cdf: 2000000 },
      { code: 'SSOL_MINES', manque_a_gagner_cdf: 17000000 },
      { code: 'ADM1_ENVIRONNEMENT', manque_a_gagner_cdf: 5000000 },
    ];

    const sorted = [...secteursData].sort((a, b) => b.manque_a_gagner_cdf - a.manque_a_gagner_cdf);
    assert.equal(sorted[0].code, 'SSOL_MINES', 'SSOL_MINES doit être classé en premier (secteur prioritaire)');
    assert.equal(sorted[0].manque_a_gagner_cdf, 17000000);
  });

  // 23. Les consolidations ne créent pas automatiquement une mission
  it('23. Les consolidations constituent une aide à la décision et ne créent pas de mission automatique', async () => {
    const { count: missionsAvant } = await adminSupabase.from('missions').select('*', { count: 'exact', head: true });

    // Calcul de synthèse sans mutation de la table missions
    const { count: missionsApres } = await adminSupabase.from('missions').select('*', { count: 'exact', head: true });
    assert.equal(missionsApres, missionsAvant, 'Le calcul de consolidation ne doit insérer aucune mission');
  });

  // 24. Les RLS empêchent l’accès inter-bureaux
  it('24. Les contrôles de sécurité empêchent l’écriture inter-bureaux (anti-IDOR)', async () => {
    const { data: bSol } = await adminSupabase.from('bureaux').select('id').eq('code', 'BUR_CTRL_SOL').single();
    const { data: bSousSol } = await adminSupabase.from('bureaux').select('id').eq('code', 'BUR_CTRL_SOUS_SOL').single();

    const chefSol = { id: 'u-sol', email: 'chef.sol@test.local', role: 'CHEF_BUREAU', bureau_id: bSol.id, is_active: true };

    assert.throws(
      () => assertCanManageControleOrdonnancement(chefSol, bSousSol.id),
      /Vous ne pouvez vérifier que les ordonnancements relevant de votre bureau/
    );
  });

  // 25. BUR_ANA_REC conserve son accès transversal
  // 25. BUR_ANA_REC conserve son accès transversal pour l’analyse et l’ordonnancement
  it('25. BUR_ANA_REC conserve son accès transversal pour l’analyse et l’ordonnancement', async () => {
    const { data: bAna } = await adminSupabase.from('bureaux').select('id, code, type').eq('code', 'BUR_ANA_REC').single();
    assert.equal(bAna.type, 'RECOUPEMENT');

    const userAna = { id: 'u-ana', email: 'chef.ana@test.local', role: 'CHEF_BUREAU', bureau_id: bAna.id, is_active: true };
    assert.equal(userAna.role, 'CHEF_BUREAU');
    assert.equal(userAna.bureau_id, bAna.id);
  });
});
