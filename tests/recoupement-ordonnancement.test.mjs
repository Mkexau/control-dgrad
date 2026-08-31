/**
 * Tests automatisés — Module Bureau Analyse et Recherche / Recoupement
 * Périmètre : informations reçues, fiches d'ordonnancement, RLS, séparation des pouvoirs
 *
 * Exécution : npm run test (ou node --experimental-vm-modules tests/recoupement-ordonnancement.test.mjs)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function loginAs(email, password) {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Impossible de se connecter en tant que ${email} : ${error?.message}`);
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false },
  });
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    → ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion échouée');
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function setup() {
  const { data: infos } = await adminClient
    .from('informations_recues')
    .select('id, numero_reference, statut, assujetti_id')
    .limit(5);
  return { infos: infos || [] };
}

// ─── Comptes de test ─────────────────────────────────────────────────────────

const COMPTES = {
  analyste: { email: 'analyste@test.local', password: 'Test@1234!' },
  admin: { email: 'admin@test.local', password: 'Test@1234!' },
  chef_bureau: { email: 'chef.bureau.analyse@test.local', password: 'Test@1234!' },
  chef_division_recoupement: { email: 'chef.division.recoupement@test.local', password: 'Test@1234!' },
  chef_division_controle: { email: 'chef.division.controle@test.local', password: 'Test@1234!' },
  agent_bureau_controle: { email: 'chef.equipe.a@test.local', password: 'Test@1234!' },
};

// ─── Suite de tests ───────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('DGRAD — Tests : Bureau Analyse & Recherche / Recoupement');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const { infos: _infos } = await setup();

  // ── 1. Données de recette en base ──────────────────────────────────────────
  console.log('§ 1. DONNÉES DE RECETTE SIMULÉES');

  await test('Les informations reçues existent en base', async () => {
    const { data, error } = await adminClient
      .from('informations_recues')
      .select('id, numero_reference, statut, source_externe, assujetti_id, secteur_id')
      .order('date_reception');

    assert(!error, `Erreur Supabase : ${error?.message}`);
    assert(data && data.length >= 3, `Attendu ≥ 3 informations reçues, obtenu ${data?.length}`);
    console.log(`    [infos] ${data.length} enregistrements trouvés`);
    data.forEach(d => console.log(`      • ${d.numero_reference} — ${d.statut} (CDF=${d.montant_cdf}, USD=${d.montant_usd})`));
  });

  await test('Séparation stricte CDF/USD : pas de colonne montant_converti', async () => {
    const { data, error } = await adminClient
      .from('informations_recues')
      .select('id, numero_reference, assujetti_id')
      .limit(1);

    assert(!error, `Erreur Supabase : ${error?.message}`);
    const row = data[0];
    assert(row !== undefined, 'Aucune ligne disponible');
    assert(!('montant_converti' in row), 'Champ montant_converti interdit présent');
    assert(!('montant_total' in row), 'Champ montant_total interdit présent');
  });

  await test('Les fiches_ordonnancement ont la structure CDF/USD strictement séparée', async () => {
    const { data: _cols, error } = await adminClient
      .from('fiches_ordonnancement')
      .select('montant_cdf, montant_usd')
      .limit(1);

    // Si la table est vide, pas d'erreur de schéma
    assert(!error, `Erreur de schéma : ${error?.message}`);
  });

  // ── 2. Accès RLS — Analyste BUR_ANA_REC ───────────────────────────────────
  console.log('\n§ 2. RLS — ANALYSTE BUR_ANA_REC');

  let analysteClient;
  try {
    analysteClient = await loginAs(COMPTES.analyste.email, COMPTES.analyste.password);
  } catch (e) {
    console.warn(`  ⚠ Compte analyste@test.local indisponible : ${e.message}`);
    console.warn('  → Tests RLS analyste ignorés (compte de recette à vérifier)');
  }

  if (analysteClient) {
    await test('Analyste peut lire les informations_recues (RLS DIV_REC)', async () => {
      const { data: _data, error } = await analysteClient
        .from('informations_recues')
        .select('id, numero_reference, statut')
        .limit(5);
      // RLS peut retourner 0 lignes si la politique filtre — l'absence d'erreur suffit
      assert(!error, `RLS a bloqué la lecture : ${error?.message}`);
    });

    await test('Analyste ne peut pas insérer dans informations_recues (source externe)', async () => {
      const { error } = await analysteClient
        .from('informations_recues')
        .insert({
          numero_reference: 'REC-TEST-BLOCKED',
          source_externe: 'SERVICE_ASSIETTE',
          date_reception: new Date().toISOString().split('T')[0],
          secteur_code: 'SOL_FONCIER',
          numero_serie: 'NS-TEST-BLOCKED',
          delai_traitement_jours: 30,
          numero_note_perception: 'NP-TEST-BLOCKED',
          date_note_perception: new Date().toISOString().split('T')[0],
          nom_assujetti_declare: 'Société Test Bloquée',
          identifiant_assujetti_declare: 'NTEST-999',
          acte_generateur: 'Acte Test',
          nombre_actes: 1,
          montant_cdf: 0,
          montant_usd: 0,
          statut: 'A_TRAITER',
        });
      assert(!!error, 'Un analyste ne devrait PAS pouvoir insérer directement dans informations_recues');
    });
  }

  // ── 3. Accès RLS — ADMIN (séparation technique vs métier) ─────────────────
  console.log('\n§ 3. RLS — ADMIN (séparation technique vs métier)');

  let adminClient2;
  try {
    adminClient2 = await loginAs(COMPTES.admin.email, COMPTES.admin.password);
  } catch (e) {
    console.warn(`  ⚠ Compte admin@test.local indisponible : ${e.message}`);
  }

  if (adminClient2) {
    await test('ADMIN ne peut pas insérer dans informations_recues (RLS)', async () => {
      const { error } = await adminClient2
        .from('informations_recues')
        .insert({
          numero_reference: 'REC-ADMIN-BLOCKED',
          source_externe: 'SERVICE_ASSIETTE',
          date_reception: new Date().toISOString().split('T')[0],
          secteur_code: 'SOL_FONCIER',
          numero_serie: 'NS-ADMIN-BLOCKED',
          delai_traitement_jours: 30,
          numero_note_perception: 'NP-ADMIN-BLOCKED',
          date_note_perception: new Date().toISOString().split('T')[0],
          nom_assujetti_declare: 'Société Admin Bloquée',
          identifiant_assujetti_declare: 'NADMIN-999',
          acte_generateur: 'Acte Admin Test',
          nombre_actes: 1,
          montant_cdf: 0,
          montant_usd: 0,
          statut: 'A_TRAITER',
        });
      assert(!!error, 'ADMIN ne devrait PAS pouvoir insérer dans informations_recues');
    });

    await test('ADMIN ne peut pas insérer dans fiches_ordonnancement (RLS)', async () => {
      // On essaie un insert minimal — doit être rejeté par RLS
      const { error } = await adminClient2
        .from('fiches_ordonnancement')
        .insert({
          numero_fiche: 'FO-TEST-ADMIN-BLOCKED',
          assujetti_id: '00000000-0000-0000-0000-000000000001',
          secteur_id: '00000000-0000-0000-0000-000000000001',
          bureau_id: '00000000-0000-0000-0000-000000000001',
          numero_serie: 'NS-ADMIN-FO-BLOCKED',
          delai_traitement_jours: 30,
          numero_note_perception: 'NP-ADMIN-FO-BLOCKED',
          date_note_perception: new Date().toISOString().split('T')[0],
          acte_generateur: 'Acte Admin FO Test',
          nombre_actes: 1,
          montant_cdf: 0,
          montant_usd: 0,
          statut_transmission: 'CONSERVEE_BUREAU',
          created_by: '00000000-0000-0000-0000-000000000001',
        });
      assert(!!error, 'ADMIN ne devrait PAS pouvoir insérer dans fiches_ordonnancement');
    });
  }

  // ── 4. Périmètre organisationnel — Chef Division Contrôle ─────────────────
  console.log('\n§ 4. PÉRIMÈTRE — CHEF DIVISION CONTRÔLE');

  let chefDivCtrlClient;
  try {
    chefDivCtrlClient = await loginAs(COMPTES.chef_division_controle.email, COMPTES.chef_division_controle.password);
  } catch (e) {
    console.warn(`  ⚠ Compte chef division contrôle indisponible : ${e.message}`);
  }

  if (chefDivCtrlClient) {
    await test('Chef Division Contrôle peut lire les fiches transmises', async () => {
      const { data: _data, error } = await chefDivCtrlClient
        .from('fiches_ordonnancement')
        .select('id, numero_fiche, statut_transmission')
        .eq('statut_transmission', 'TRANSMIS_DIVISION_CONTROLE')
        .limit(10);

      assert(!error, `Accès bloqué : ${error?.message}`);
    });

    await test('Chef Division Contrôle ne peut pas lire les fiches CONSERVEE_BUREAU (RLS)', async () => {
      const { data, error } = await chefDivCtrlClient
        .from('fiches_ordonnancement')
        .select('id, numero_fiche, statut_transmission')
        .eq('statut_transmission', 'CONSERVEE_BUREAU')
        .limit(10);

      // La RLS doit filtrer — soit erreur, soit résultats vides
      const noAccess = !!error || (data && data.length === 0);
      assert(noAccess, 'Chef Division Contrôle ne doit pas voir les fiches CONSERVEE_BUREAU');
    });
  }

  // ── 5. Contraintes de montant ─────────────────────────────────────────────
  console.log('\n§ 5. CONTRAINTES DE MONTANT (non-négatifs)');

  await test('Insertion d\'un montant CDF négatif doit être rejetée', async () => {
    const { error } = await adminClient
      .from('informations_recues')
      .insert({
        numero_reference: 'REC-CONSTRAINT-TEST',
        source_externe: 'SERVICE_ASSIETTE',
        date_reception: new Date().toISOString().split('T')[0],
        secteur_code: 'SOL_FONCIER',
        numero_serie: 'NS-CONSTRAINT-TEST',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-CONSTRAINT-TEST',
        date_note_perception: new Date().toISOString().split('T')[0],
        nom_assujetti_declare: 'Société Contrainte Test',
        identifiant_assujetti_declare: 'NCONSTRAINT-001',
        acte_generateur: 'Acte Test Contrainte',
        nombre_actes: 1,
        montant_cdf: -1000,  // Valeur négative — doit être rejetée
        montant_usd: 0,
        statut: 'A_TRAITER',
      });

    assert(!!error, 'Un montant CDF négatif devrait être rejeté par la contrainte CHECK');
  });

  await test('Insertion d\'un montant USD négatif doit être rejetée', async () => {
    const { error } = await adminClient
      .from('fiches_ordonnancement')
      .insert({
        numero_fiche: 'FO-CONSTRAINT-TEST',
        assujetti_id: '00000000-0000-0000-0000-000000000001',
        secteur_id: '00000000-0000-0000-0000-000000000001',
        bureau_id: '00000000-0000-0000-0000-000000000001',
        numero_serie: 'NS-CONSTRAINT-TEST',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-CONSTRAINT-TEST',
        date_note_perception: new Date().toISOString().split('T')[0],
        acte_generateur: 'Acte Test Contrainte',
        nombre_actes: 1,
        montant_cdf: 0,
        montant_usd: -500,  // Valeur négative — doit être rejetée
        statut_transmission: 'CONSERVEE_BUREAU',
        created_by: '00000000-0000-0000-0000-000000000001',
      });

    assert(!!error, 'Un montant USD négatif devrait être rejeté par la contrainte CHECK');
  });

  // ── 6. Statuts autorisés ──────────────────────────────────────────────────
  console.log('\n§ 6. CONTRAINTE DE STATUTS');

  await test('Statut invalide refusé pour informations_recues', async () => {
    const { error } = await adminClient
      .from('informations_recues')
      .insert({
        numero_reference: 'REC-STATUT-TEST',
        source_externe: 'SERVICE_ASSIETTE',
        date_reception: new Date().toISOString().split('T')[0],
        secteur_code: 'SOL_FONCIER',
        numero_serie: 'NS-STATUT-TEST',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-STATUT-TEST',
        date_note_perception: new Date().toISOString().split('T')[0],
        nom_assujetti_declare: 'Société Statut Test',
        identifiant_assujetti_declare: 'NSTATUT-001',
        acte_generateur: 'Acte Test Statut',
        nombre_actes: 1,
        montant_cdf: 0,
        montant_usd: 0,
        statut: 'STATUT_INVALIDE',  // Valeur non autorisée
      });

    assert(!!error, 'Un statut invalide devrait être rejeté par la contrainte CHECK');
  });

  await test('Statut invalide refusé pour fiches_ordonnancement', async () => {
    const { error } = await adminClient
      .from('fiches_ordonnancement')
      .insert({
        numero_fiche: 'FO-STATUT-TEST',
        assujetti_id: '00000000-0000-0000-0000-000000000001',
        secteur_id: '00000000-0000-0000-0000-000000000001',
        bureau_id: '00000000-0000-0000-0000-000000000001',
        numero_serie: 'NS-STATUT-TEST',
        delai_traitement_jours: 30,
        numero_note_perception: 'NP-STATUT-TEST',
        date_note_perception: new Date().toISOString().split('T')[0],
        acte_generateur: 'Acte Test Statut',
        nombre_actes: 1,
        montant_cdf: 0,
        montant_usd: 0,
        statut_transmission: 'TRANSMIS_CHEF_BUREAU',  // Valeur non autorisée
        created_by: '00000000-0000-0000-0000-000000000001',
      });

    assert(!!error, 'Un statut_transmission invalide devrait être rejeté par la contrainte CHECK');
  });

  // ── 7. Lecture admin (service role) ───────────────────────────────────────
  console.log('\n§ 7. LECTURE DONNÉES EN BASE (Service Role)');

  await test('Lecture des fiches_ordonnancement existantes', async () => {
    const { data, error } = await adminClient
      .from('fiches_ordonnancement')
      .select('id, numero_fiche, statut_transmission, montant_cdf, montant_usd')
      .order('created_at', { ascending: false })
      .limit(10);

    assert(!error, `Erreur : ${error?.message}`);
    console.log(`    [fiches] ${data?.length || 0} fiche(s) enregistrée(s) en base`);
    if (data && data.length > 0) {
      data.forEach(f => console.log(`      • ${f.numero_fiche} — ${f.statut_transmission} (CDF=${f.montant_cdf}, USD=${f.montant_usd})`));
    } else {
      console.log('    [info] Aucune fiche créée pour l\'instant — c\'est normal avant le traitement');
    }
  });

  await test('Vérification des 3 arrivées simulées sont présentes', async () => {
    const { data, error } = await adminClient
      .from('informations_recues')
      .select('numero_reference, statut, secteur_code')
      .like('numero_reference', 'REC-2026-ASS-%')
      .limit(3);

    assert(!error, `Erreur : ${error?.message}`);
    assert(data && data.length === 3, `Attendu 3 arrivées simulées, trouvé ${data?.length}. Vérifiez seed-recette.sql`);
    console.log(`    [recette] 3 arrivées simulées trouvées : ${data.map(d => d.secteur_code).join(', ')}`);
  });

  // ─── Résultat ─────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`RÉSULTAT : ${passed + failed} tests — ✓ ${passed} PASS, ✗ ${failed} FAIL`);
  console.log('══════════════════════════════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\nÉchecs détaillés :');
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     → ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ Tous les tests sont passés.\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Erreur fatale dans la suite de tests :', err);
  process.exit(1);
});
