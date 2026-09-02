/**
 * Recette du flux direct Service d'assiette → assujettis → ordonnancement.
 * Aucun jeu de données n'est créé : la base de recette démarre volontairement vide.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !serviceKey || !anonKey) {
  throw new Error('Variables Supabase de recette manquantes.');
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loginAs(email, password) {
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anonymous.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? 'Session absente.');
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

let failed = 0;
async function test(name, callback) {
  try {
    await callback();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}: ${error.message}`);
  }
}

console.log('\nDGRAD — Recette flux direct assujettis');

await test('Le répertoire et les anciennes informations sont vides après réinitialisation', async () => {
  const [{ count: assujettis, error: assujettisError }, { count: informations, error: informationsError }, { count: fiches, error: fichesError }] = await Promise.all([
    admin.from('assujettis').select('*', { count: 'exact', head: true }),
    admin.from('informations_recues').select('*', { count: 'exact', head: true }),
    admin.from('fiches_ordonnancement').select('*', { count: 'exact', head: true }),
  ]);
  assert(!assujettisError && !informationsError && !fichesError, 'Lecture de recette impossible.');
  assert(assujettis === 0, `Répertoire attendu vide, obtenu ${assujettis}.`);
  assert(informations === 0, `Ancien flux attendu vide, obtenu ${informations}.`);
  assert(fiches === 0, `Fiches attendues vides, obtenu ${fiches}.`);
});

await test('Le schéma conserve la séparation CDF/USD pour les fiches', async () => {
  const { error } = await admin.from('fiches_ordonnancement').select('montant_cdf, montant_usd').limit(1);
  assert(!error, `Colonnes CDF/USD indisponibles : ${error?.message}`);
});

await test('Un analyste BUR_ANA_REC lit le répertoire national mais ne peut pas le créer', async () => {
  let analyste;
  try {
    analyste = await loginAs('analyste@test.local', 'Test@1234!');
  } catch (error) {
    console.log(`  - Compte analyste indisponible, contrôle RLS ignoré : ${error.message}`);
    return;
  }

  const { error: readError } = await analyste.from('assujettis').select('id, identifiant').limit(5);
  assert(!readError, `Lecture nationale refusée : ${readError.message}`);

  const { error: insertError } = await analyste.from('assujettis').insert({
    type: 'PERSONNE_MORALE', identifiant: 'NIF-BLOCKED', nom_raison_sociale: 'Insertion analyste bloquée', actif: true,
  });
  assert(insertError, 'Un analyste ne doit pas pouvoir créer un assujetti.');
});

await test('ADMIN technique ne peut pas créer un assujetti métier via RLS', async () => {
  let technicalAdmin;
  try {
    technicalAdmin = await loginAs('admin@test.local', 'Test@1234!');
  } catch (error) {
    console.log(`  - Compte ADMIN indisponible, contrôle RLS ignoré : ${error.message}`);
    return;
  }

  const { error } = await technicalAdmin.from('assujettis').insert({
    type: 'PERSONNE_MORALE', identifiant: 'NIF-ADMIN-BLOCKED', nom_raison_sociale: 'Insertion admin bloquée', actif: true,
  });
  assert(error, 'ADMIN ne doit pas créer un assujetti métier via RLS.');
});

if (failed > 0) process.exit(1);
