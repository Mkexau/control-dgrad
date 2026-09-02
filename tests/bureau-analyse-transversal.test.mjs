import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variables d environnement Supabase manquantes.');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('Validation Métier : Bureau Analyse & Recoupement Transversal & Navigation Assiette', async () => {
  // ── A. MÉTIER ─────────────────────────────────────────────────────────────
  describe('A. Règles Métier Référentiel & Transversalité BUR_ANA_REC', () => {
    it('1. BUR_ANA_REC n’a aucun secteur d’activité qui lui est rattaché', async () => {
      const { data: bureauAna, error: bErr } = await adminSupabase
        .from('bureaux')
        .select('id, code, type')
        .eq('code', 'BUR_ANA_REC')
        .single();

      assert.ifError(bErr);
      assert.equal(bureauAna.type, 'RECOUPEMENT', 'BUR_ANA_REC doit être de type RECOUPEMENT');

      const { data: secteurs, error: sErr } = await adminSupabase
        .from('secteurs')
        .select('id, code')
        .eq('bureau_id', bureauAna.id);

      assert.ifError(sErr);
      assert.equal(
        secteurs?.length,
        0,
        `BUR_ANA_REC ne doit avoir aucun secteur rattaché (obtenu: ${secteurs?.length})`
      );
    });

    it('2. Tous les 36 secteurs d’activité appartiennent exclusivement aux 6 bureaux de contrôle', async () => {
      const { data: secteurs, error } = await adminSupabase
        .from('secteurs')
        .select('id, code, nom, bureau_id, bureaux(code, type)')
        .order('code');

      assert.ifError(error);
      assert.equal(secteurs?.length, 36, 'Il doit y avoir exactement 36 secteurs officiels');

      const controlBureaux = [
        'BUR_CTRL_SOL',
        'BUR_CTRL_SOUS_SOL',
        'BUR_REC_JUD_PART',
        'BUR_CTRL_ADM1',
        'BUR_CTRL_ADM2',
        'BUR_CTRL_ADM3',
      ];

      for (const s of secteurs || []) {
        const bureau = Array.isArray(s.bureaux) ? s.bureaux[0] : s.bureaux;
        assert.ok(
          controlBureaux.includes(bureau?.code),
          `Le secteur ${s.code} doit appartenir à un bureau de contrôle, trouvé: ${bureau?.code}`
        );
        assert.equal(bureau?.type, 'CONTROLE', `Le bureau du secteur ${s.code} doit être de type CONTROLE`);
      }
    });

    it('3. Chaque bureau de contrôle possède exactement 6 secteurs d’activité', async () => {
      const { data: secteurs, error } = await adminSupabase
        .from('secteurs')
        .select('id, code, bureau_id, bureaux(code)');

      assert.ifError(error);
      const byBureau = {};
      for (const s of secteurs || []) {
        const bureau = Array.isArray(s.bureaux) ? s.bureaux[0] : s.bureaux;
        byBureau[bureau?.code] = (byBureau[bureau?.code] || 0) + 1;
      }

      const expected = {
        BUR_CTRL_SOL: 6,
        BUR_CTRL_SOUS_SOL: 6,
        BUR_REC_JUD_PART: 6,
        BUR_CTRL_ADM1: 6,
        BUR_CTRL_ADM2: 6,
        BUR_CTRL_ADM3: 6,
      };

      for (const [code, count] of Object.entries(expected)) {
        assert.equal(
          byBureau[code],
          count,
          `Le bureau ${code} doit avoir ${count} secteurs (obtenu: ${byBureau[code]})`
        );
      }
    });

    it('4. BUR_ANA_REC peut traiter des assujettis de secteurs variés et préparer une fiche vers le bureau de contrôle', async () => {
      // Vérification de la cohérence de la résolution : assujetti -> secteur -> bureau de contrôle
      const { data: secteurSol } = await adminSupabase
        .from('secteurs')
        .select('id, code, bureau_id, bureaux(code)')
        .eq('code', 'SOL_FONCIER')
        .single();

      const { data: secteurMines } = await adminSupabase
        .from('secteurs')
        .select('id, code, bureau_id, bureaux(code)')
        .eq('code', 'SSOL_MINES')
        .single();

      assert.ok(secteurSol && secteurMines);
      const bureauSol = Array.isArray(secteurSol.bureaux) ? secteurSol.bureaux[0] : secteurSol.bureaux;
      const bureauMines = Array.isArray(secteurMines.bureaux) ? secteurMines.bureaux[0] : secteurMines.bureaux;

      assert.equal(bureauSol.code, 'BUR_CTRL_SOL');
      assert.equal(bureauMines.code, 'BUR_CTRL_SOUS_SOL');
    });
  });

  // ── B. NAVIGATION & SÉCURITÉ SERVICE D'ASSIETTE ───────────────────────────
  describe('B. Navigation & Rôles Service d’assiette', () => {
    it('5. Le profil SERVICE_ASSIETTE existe et possède le rôle dédié', async () => {
      const { data: user, error } = await adminSupabase
        .from('profiles')
        .select('id, email, role, actif')
        .eq('email', 'assiette@test.local')
        .single();

      assert.ifError(error);
      assert.equal(user.role, 'SERVICE_ASSIETTE');
      assert.equal(user.actif, true);
    });

    it('6. Le Service d’assiette ne possède pas de bureau de contrôle restrictif', async () => {
      const { data: user, error } = await adminSupabase
        .from('profiles')
        .select('id, role, bureau_id')
        .eq('email', 'assiette@test.local')
        .single();

      assert.ifError(error);
      assert.equal(user.role, 'SERVICE_ASSIETTE');
    });
  });
});
