import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TESTS MODULE AGENTS DE RECETTE & PRÉPARATION DES ÉQUIPES
// Portée : 144 agents de recette, 8 bureaux, 48 secteurs, RLS & isolation
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variables d environnement Supabase manquantes pour les tests.');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('1. Vérification du Référentiel des 144 Agents de Recette', async () => {
  // 1. Nombre total d'agents de recette
  it('Doit contenir exactement 144 agents de recette métier (sans compte Auth)', async () => {
    const { data: agents, error } = await adminSupabase
      .from('agents')
      .select('id, matricule, nom, prenom, bureau_id, secteur_id, specialite, actif, profile_id')
      .not('secteur_id', 'is', null);

    assert.ifError(error);
    assert.equal(agents?.length, 144, 'Il doit y avoir exactement 144 agents de recette métier');

    // Vérifier qu'aucun n'a de profile_id (pas de compte Auth)
    const withProfile = agents?.filter((a) => a.profile_id !== null);
    assert.equal(withProfile?.length, 0, 'Les 144 agents de recette ne doivent pas avoir de compte Auth (profile_id null)');
  });

  // 2. Répartition par bureau (8 bureaux x 18 agents = 144)
  it('Chacun des 8 bureaux doit compter exactement 18 agents de recette', async () => {
    const { data: bureaux, error: bErr } = await adminSupabase
      .from('bureaux')
      .select('id, code, nom')
      .order('code');

    assert.ifError(bErr);
    assert.equal(bureaux?.length, 8, 'Il doit y avoir exactement 8 bureaux');

    const { data: agents, error: aErr } = await adminSupabase
      .from('agents')
      .select('id, bureau_id')
      .not('secteur_id', 'is', null);

    assert.ifError(aErr);

    const countByBureau = {};
    for (const ag of agents || []) {
      countByBureau[ag.bureau_id] = (countByBureau[ag.bureau_id] || 0) + 1;
    }

    for (const b of bureaux || []) {
      const count = countByBureau[b.id] || 0;
      assert.equal(
        count,
        18,
        `Le bureau ${b.code} (${b.nom}) doit avoir exactement 18 agents de recette (obtenu: ${count})`
      );
    }
  });

  // 3. Répartition par secteur (48 secteurs x 3 agents = 144)
  it('Chacun des 48 secteurs doit compter exactement 3 agents de recette', async () => {
    const { data: secteurs, error: sErr } = await adminSupabase
      .from('secteurs')
      .select('id, code, nom, bureau_id')
      .order('code');

    assert.ifError(sErr);
    assert.equal(secteurs?.length, 48, 'Il doit y avoir exactement 48 secteurs répartis sur les 8 bureaux');

    const { data: agents, error: aErr } = await adminSupabase
      .from('agents')
      .select('id, secteur_id, specialite')
      .not('secteur_id', 'is', null);

    assert.ifError(aErr);

    const countBySecteur = {};
    for (const ag of agents || []) {
      countBySecteur[ag.secteur_id] = (countBySecteur[ag.secteur_id] || 0) + 1;
    }

    for (const s of secteurs || []) {
      const count = countBySecteur[s.id] || 0;
      assert.equal(
        count,
        3,
        `Le secteur ${s.code} (${s.nom}) doit avoir exactement 3 agents de recette (obtenu: ${count})`
      );
    }
  });

  // 4. Tous actifs et données complètes
  it('Tous les 144 agents doivent être actifs avec nom, prénom, matricule et spécialité', async () => {
    const { data: agents, error } = await adminSupabase
      .from('agents')
      .select('id, matricule, nom, prenom, specialite, actif')
      .not('secteur_id', 'is', null);

    assert.ifError(error);

    for (const ag of agents || []) {
      assert.equal(ag.actif, true, `L agent ${ag.matricule} doit être actif`);
      assert.ok(ag.nom && ag.nom.trim().length > 0, `L agent ${ag.matricule} doit avoir un nom`);
      assert.ok(ag.prenom && ag.prenom.trim().length > 0, `L agent ${ag.matricule} doit avoir un prénom`);
      assert.ok(ag.specialite && ag.specialite.trim().length > 0, `L agent ${ag.matricule} doit avoir une spécialité`);
      assert.ok(ag.matricule && ag.matricule.startsWith('AGT-'), `Le matricule ${ag.matricule} doit respecter la nomenclature AGT-`);
    }
  });

  // 5. Unicité stricte des matricules
  it('Aucun doublon de matricule parmi les agents', async () => {
    const { data: agents, error } = await adminSupabase
      .from('agents')
      .select('matricule');

    assert.ifError(error);
    const matricules = (agents || []).map((a) => a.matricule);
    const uniqueMatricules = new Set(matricules);
    assert.equal(matricules.length, uniqueMatricules.size, 'Tous les matricules doivent être strictement uniques');
  });
});

describe('2. Tests d Isolation et de Cloisonnement des Bureaux', async () => {
  it('Vérifie le cloisonnement des agents par bureau de contrôle', async () => {
    const { data: bureauSol } = await adminSupabase
      .from('bureaux')
      .select('id')
      .eq('code', 'BUR_CTRL_SOL')
      .single();

    const { data: bureauSousSol } = await adminSupabase
      .from('bureaux')
      .select('id')
      .eq('code', 'BUR_CTRL_SOUS_SOL')
      .single();

    assert.ok(bureauSol && bureauSousSol);

    // Agents du Bureau Sol
    const { data: agentsSol } = await adminSupabase
      .from('agents')
      .select('id, matricule, bureau_id')
      .eq('bureau_id', bureauSol.id);

    // Agents du Bureau Sous-Sol
    const { data: agentsSousSol } = await adminSupabase
      .from('agents')
      .select('id, matricule, bureau_id')
      .eq('bureau_id', bureauSousSol.id);

    assert.equal(agentsSol?.length, 21, 'Bureau Sol a 18 agents de recette + 3 profils existants');
    assert.equal(agentsSousSol?.length, 19, 'Bureau Sous-Sol a 18 agents de recette + 1 profil existant');

    // Aucun chevauchement entre les agents des deux bureaux
    const idsSol = new Set(agentsSol?.map((a) => a.id));
    for (const agSS of agentsSousSol || []) {
      assert.equal(idsSol.has(agSS.id), false, 'Un agent du bureau Sous-Sol ne doit pas appartenir au bureau Sol');
    }
  });
});
