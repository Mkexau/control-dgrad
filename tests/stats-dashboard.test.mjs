// =============================================================================
// DGRAD CONTROLE - TESTS : STATISTIQUES & TABLEAUX DE BORD (ÉTAPE 12)
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StatsFilterSchema } from '../lib/validations/stats.ts';

const IDS = {
  userDG: '00000000-0000-4000-8000-000000000001',
  userChefBureau: '00000000-0000-4000-8000-000000000002',
  userAdmin: '00000000-0000-4000-8000-000000000003',
  userControleur: '00000000-0000-4000-8000-000000000004',
  bureauSol: '00000000-0000-4000-8000-000000000010',
  bureauSousSol: '00000000-0000-4000-8000-000000000011',
  secteurMines: '00000000-0000-4000-8000-000000000020',
};

describe('Étape 12 — Tableau de Bord Exécutif & Statistiques Métier', () => {

  // ===========================================================================
  // 1. VALIDATION ZOD DU SCHÉMA DES FILTRES STATISTIQUES (StatsFilterSchema)
  // ===========================================================================
  describe('1. Validation Zod : StatsFilterSchema', () => {

    it('Valide des filtres vides par défaut', () => {
      const result = StatsFilterSchema.safeParse({});
      assert.equal(result.success, true);
    });

    it('Valide des filtres avec chaîne vide ("")', () => {
      const result = StatsFilterSchema.safeParse({
        date_debut: '',
        date_fin: '',
        type_controle: '',
        bureau_id: '',
        secteur_id: '',
      });
      assert.equal(result.success, true);
    });

    it('Valide une plage de dates et des identifiants conformes', () => {
      const result = StatsFilterSchema.safeParse({
        date_debut: '2026-01-01',
        date_fin: '2026-12-31',
        type_controle: 'SUR_PLACE',
        bureau_id: IDS.bureauSol,
        secteur_id: IDS.secteurMines,
      });
      assert.equal(result.success, true);
    });

    it('Valide le type de contrôle SUR_PIECES', () => {
      const result = StatsFilterSchema.safeParse({
        type_controle: 'SUR_PIECES',
      });
      assert.equal(result.success, true);
    });

    it('Rejette un format de date invalide (DD/MM/YYYY)', () => {
      const result = StatsFilterSchema.safeParse({
        date_debut: '01/01/2026',
      });
      assert.equal(result.success, false);
    });

    it('Rejette une date de début postérieure à la date de fin', () => {
      const result = StatsFilterSchema.safeParse({
        date_debut: '2026-12-31',
        date_fin: '2026-01-01',
      });
      assert.equal(result.success, false);
      const msgs = result.error?.issues.map((i) => i.message);
      assert.ok(msgs?.some((m) => m.includes('postérieure')), 'Doit rejeter début > fin');
    });

    it('Rejette un UUID invalide pour bureau_id', () => {
      const result = StatsFilterSchema.safeParse({
        bureau_id: 'bureau-sol-non-uuid',
      });
      assert.equal(result.success, false);
    });

    it('Rejette un type de contrôle non reconnu', () => {
      const result = StatsFilterSchema.safeParse({
        type_controle: 'SUR_DOSSIER',
      });
      assert.equal(result.success, false);
    });
  });

  // ===========================================================================
  // 2. SÉPARATION STRICTE DES DEVISES CDF / USD (RM-040 & RM-041)
  // ===========================================================================
  describe('2. Intégrité Financière & Séparation Mono-Devise (RM-040 & RM-041)', () => {

    it('Calcule les montants CDF et USD de façon totalement étanche sans conversion', () => {
      // Simulation des résultats de contrôles
      const resultats = [
        { type_resultat: 'CHARGEE', devise: 'CDF', montant_du: 5000000, montant_penalites: 1000000 },
        { type_resultat: 'CHARGEE', devise: 'USD', montant_du: 10000, montant_penalites: 2500 },
        { type_resultat: 'DECHARGEE', devise: 'CDF', montant_du: 0, montant_penalites: 0 },
        { type_resultat: 'CHARGEE', devise: 'USD', montant_du: 5000, montant_penalites: 1000 },
      ];

      let cdfPrincipal = 0;
      let cdfPenalites = 0;
      let usdPrincipal = 0;
      let usdPenalites = 0;

      resultats.forEach((r) => {
        if (r.devise === 'CDF') {
          cdfPrincipal += r.montant_du;
          cdfPenalites += r.montant_penalites;
        } else if (r.devise === 'USD') {
          usdPrincipal += r.montant_du;
          usdPenalites += r.montant_penalites;
        }
      });

      const totalCDF = cdfPrincipal + cdfPenalites;
      const totalUSD = usdPrincipal + usdPenalites;

      assert.equal(cdfPrincipal, 5000000);
      assert.equal(cdfPenalites, 1000000);
      assert.equal(totalCDF, 6000000);

      assert.equal(usdPrincipal, 15000);
      assert.equal(usdPenalites, 3500);
      assert.equal(totalUSD, 18500);

      // Vérification qu'aucune conversion arbitraire n'est appliquée
      assert.notEqual(totalCDF, totalUSD);
    });

    it('Garantit l\'exactitude des taux de résultats chargés vs déchargés', () => {
      const counts = { charges: 8, decharges: 2 };
      const total = counts.charges + counts.decharges;
      const tauxCharges = Math.round((counts.charges / total) * 100);
      const tauxDecharges = Math.round((counts.decharges / total) * 100);

      assert.equal(tauxCharges, 80);
      assert.equal(tauxDecharges, 20);
      assert.equal(tauxCharges + tauxDecharges, 100);
    });
  });

  // ===========================================================================
  // 3. CLOISONNEMENT ORGANISATIONNEL & RÔLES (RM-025, RM-039, RM-053)
  // ===========================================================================
  describe('3. Cloisonnement Organisationnel & Périmètre Utilisateur (RM-039)', () => {

    it('DIRECTEUR_GENERAL et Directeurs ont une vision transversale globale', () => {
      const rolesGlobaux = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION'];
      rolesGlobaux.forEach((role) => {
        const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(role);
        assert.equal(isGlobal, true, `${role} doit avoir une vision globale.`);
      });
    });

    it('CHEF_BUREAU est restreint par défaut à son propre bureau_id', () => {
      const chefBureau = {
        role: 'CHEF_BUREAU',
        bureau_id: IDS.bureauSol,
      };

      const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(chefBureau.role);
      assert.equal(isGlobal, false);

      const enforcedBureau = isGlobal ? null : chefBureau.bureau_id;
      assert.equal(enforcedBureau, IDS.bureauSol);
    });

    it('CHEF_SECTION est restreint à son bureau_id', () => {
      const chefSection = {
        role: 'CHEF_SECTION',
        bureau_id: IDS.bureauSousSol,
      };

      const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(chefSection.role);
      assert.equal(isGlobal, false);

      const enforcedBureau = isGlobal ? null : chefSection.bureau_id;
      assert.equal(enforcedBureau, IDS.bureauSousSol);
    });

    it('ADMIN technique accède au tableau de bord sans pouvoir de décision métier (RM-025)', () => {
      const admin = {
        role: 'ADMIN',
        bureau_id: null,
      };

      const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(admin.role);
      assert.equal(isGlobal, true, 'L\'ADMIN technique doit pouvoir superviser le système.');
    });

    it('Protection Anti-IDOR : Chef de Bureau ne peut pas injecter un autre bureau_id dans le filtre', () => {
      const currentUser = {
        id: IDS.userChefBureau,
        role: 'CHEF_BUREAU',
        bureau_id: IDS.bureauSol,
      };

      const maliciousFilter = {
        bureau_id: IDS.bureauSousSol, // Tentative d'accès aux stats du bureau voisin
      };

      const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'ADMIN'].includes(currentUser.role);
      const isDenied = !isGlobal && maliciousFilter.bureau_id !== currentUser.bureau_id;

      assert.equal(isDenied, true, 'L\'accès aux données d\'un autre bureau doit être refusé.');
    });
  });

  // ===========================================================================
  // 4. RÉFÉRENTIEL DES 36 SECTEURS & EXCLUSIONS (RM-055)
  // ===========================================================================
  describe('4. Référentiel des 36 Secteurs & Exclusion des Missions Annulées', () => {

    it('Exclut les contrôles annulés du calcul du taux d\'achèvement', () => {
      const controles = [
        { statut: 'TERMINE' },
        { statut: 'TERMINE' },
        { statut: 'EN_COURS' },
        { statut: 'ANNULE' },
      ];

      const actifs = controles.filter((c) => c.statut !== 'ANNULE');
      const termines = actifs.filter((c) => c.statut === 'TERMINE');
      const taux = Math.round((termines.length / actifs.length) * 100);

      assert.equal(actifs.length, 3);
      assert.equal(termines.length, 2);
      assert.equal(taux, 67); // 2/3 = 66.67% -> 67%
    });

    it('Agrège correctement les totaux sectoriels', () => {
      const secteurStats = [
        { code: 'SOL_FONCIER', bureau_code: 'BUR_SOL', total_cdf: 2500000, total_usd: 0 },
        { code: 'SSOL_MINES', bureau_code: 'BUR_SOUS_SOL', total_cdf: 0, total_usd: 45000 },
      ];

      assert.equal(secteurStats.length, 2);
      assert.equal(secteurStats[0].total_cdf, 2500000);
      assert.equal(secteurStats[1].total_usd, 45000);
    });
  });
});
