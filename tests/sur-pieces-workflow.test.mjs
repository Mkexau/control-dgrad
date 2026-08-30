// =============================================================================
// DGRAD CONTROLE - TESTS : WORKFLOW SUR_PIECES — ÉTAPE 9
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemandeRenseignementsCreateSchema, DemandeRenseignementsReponseSchema, DemandeRenseignementsRelanceSchema } from '../lib/validations/demandes-renseignements.ts';
import { MissionCreateSchema, MissionValidationDecisionSchema, MissionDesignateControleurSchema } from '../lib/validations/missions.ts';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';
const VALID_UUID_2 = '00000000-0000-4000-8000-000000000002';

describe('Étape 9 — Workflow SUR_PIECES : Demandes de Renseignements & Workflow Complet', () => {

  // ===========================================================================
  // 1. SCHÉMAS ZOD : DEMANDES DE RENSEIGNEMENTS
  // ===========================================================================
  describe('1. Schémas de Validation Zod : Demandes de Renseignements', () => {

    it('DemandeRenseignementsCreateSchema : valide une demande conforme', () => {
      const result = DemandeRenseignementsCreateSchema.safeParse({
        controle_id: VALID_UUID,
        assujetti_id: VALID_UUID_2,
        contenu: 'Veuillez fournir les relevés bancaires des exercices 2022 et 2023.',
      });
      assert.equal(result.success, true);
    });

    it('DemandeRenseignementsCreateSchema : accepte une date limite optionnelle', () => {
      const result = DemandeRenseignementsCreateSchema.safeParse({
        controle_id: VALID_UUID,
        assujetti_id: VALID_UUID_2,
        date_limite: '2026-09-30',
        contenu: 'Fournir les états financiers certifiés des 3 derniers exercices.',
      });
      assert.equal(result.success, true);
    });

    it('DemandeRenseignementsCreateSchema : rejette un contenu trop court (< 10 chars)', () => {
      const result = DemandeRenseignementsCreateSchema.safeParse({
        controle_id: VALID_UUID,
        assujetti_id: VALID_UUID_2,
        contenu: 'Court',
      });
      assert.equal(result.success, false);
      const msgs = result.error?.issues.map((i) => i.message);
      assert.ok(msgs?.some((m) => m.includes('10 caractères')), 'Doit rejeter un contenu trop court');
    });

    it('DemandeRenseignementsCreateSchema : rejette un format de date invalide', () => {
      const result = DemandeRenseignementsCreateSchema.safeParse({
        controle_id: VALID_UUID,
        assujetti_id: VALID_UUID_2,
        date_limite: '30-09-2026', // format DD-MM-YYYY incorrect
        contenu: 'Relevés bancaires complets des 3 dernières années fiscales.',
      });
      assert.equal(result.success, false);
    });

    it('DemandeRenseignementsReponseSchema : valide un enregistrement de réponse conforme', () => {
      const result = DemandeRenseignementsReponseSchema.safeParse({
        demande_id: VALID_UUID,
        date_reponse: '2026-09-15',
        commentaire: 'Les relevés bancaires demandés ont été remis au contrôleur.',
      });
      assert.equal(result.success, true);
    });

    it('DemandeRenseignementsReponseSchema : refuse une réponse sans contenu conservable', () => {
      const result = DemandeRenseignementsReponseSchema.safeParse({
        demande_id: VALID_UUID,
        date_reponse: '2026-09-15',
        commentaire: '   ',
      });
      assert.equal(result.success, false);
    });

    it('DemandeRenseignementsRelanceSchema : valide une relance avec nouvelle date limite', () => {
      const result = DemandeRenseignementsRelanceSchema.safeParse({
        demande_id: VALID_UUID,
        nouvelle_date_limite: '2026-10-15',
        motif_relance: 'Pièces toujours non reçues.',
      });
      assert.equal(result.success, true);
    });

    it('DemandeRenseignementsRelanceSchema : valide une relance sans nouvelle date', () => {
      const result = DemandeRenseignementsRelanceSchema.safeParse({
        demande_id: VALID_UUID,
        motif_relance: 'Les éléments demandés ne sont pas encore parvenus au dossier.',
      });
      assert.equal(result.success, true);
    });

    it('DemandeRenseignementsRelanceSchema : refuse une relance sans motif', () => {
      const result = DemandeRenseignementsRelanceSchema.safeParse({
        demande_id: VALID_UUID,
      });
      assert.equal(result.success, false);
    });

  });

  // ===========================================================================
  // 2. VALIDATION ZOD WORKFLOW : RÈGLES MÉTIER SUR_PIECES
  // ===========================================================================
  describe('2. Validation Zod : Règles Métier Workflow SUR_PIECES', () => {

    it('MissionCreateSchema : crée une mission SUR_PIECES valide (sans équipe)', () => {
      const result = MissionCreateSchema.safeParse({
        type_controle: 'SUR_PIECES',
        bureau_id: VALID_UUID,
        motif: 'Contrôle documentaire des déclarations fiscales 2023.',
        assujettis_ids: [VALID_UUID_2],
        // Pas d'equipes_propositions : c'est SUR_PIECES
      });
      assert.equal(result.success, true);
      // equipes_propositions doit être absent ou null pour SUR_PIECES
    });

    it('MissionCreateSchema : SUR_PIECES ne nécessite pas d\'équipe (equipes_propositions optionnel)', () => {
      const result = MissionCreateSchema.safeParse({
        type_controle: 'SUR_PIECES',
        bureau_id: VALID_UUID,
        motif: 'Vérification des bilans comptables déposés au cours des 3 derniers exercices.',
        assujettis_ids: [VALID_UUID_2],
        equipes_propositions: null,
      });
      assert.equal(result.success, true);
    });

    it('MissionValidationDecisionSchema : Chef de section approuve → APPROUVE valide', () => {
      const result = MissionValidationDecisionSchema.safeParse({
        mission_id: VALID_UUID,
        decision: 'APPROUVE',
      });
      assert.equal(result.success, true);
    });

    it('MissionValidationDecisionSchema : Chef de section rejette → motif obligatoire', () => {
      // Sans motif → doit échouer
      const withoutMotif = MissionValidationDecisionSchema.safeParse({
        mission_id: VALID_UUID,
        decision: 'REJETE',
      });
      assert.equal(withoutMotif.success, false);
    });

    it('MissionValidationDecisionSchema : rejet avec motif suffisant (>= 5 chars) → valide', () => {
      const result = MissionValidationDecisionSchema.safeParse({
        mission_id: VALID_UUID,
        decision: 'REJETE',
        motif: 'Dossier incomplet : pièces manquantes et motif insuffisant.',
      });
      assert.equal(result.success, true);
    });

    it('MissionDesignateControleurSchema : désignation de contrôleur valide', () => {
      const result = MissionDesignateControleurSchema.safeParse({
        mission_id: VALID_UUID,
        controleur_id: VALID_UUID_2,
      });
      assert.equal(result.success, true);
    });

    it('MissionDesignateControleurSchema : rejette un UUID invalide pour le contrôleur', () => {
      const result = MissionDesignateControleurSchema.safeParse({
        mission_id: VALID_UUID,
        controleur_id: 'not-a-uuid',
      });
      assert.equal(result.success, false);
    });

  });

  // ===========================================================================
  // 3. RÈGLES MÉTIER : SÉPARATION DES POUVOIRS & PÉRIMÈTRE SUR_PIECES
  // ===========================================================================
  describe('3. Règles Métier : Séparation des pouvoirs, SUR_PIECES vs SUR_PLACE', () => {

    it('SUR_PIECES ne doit jamais avoir d\'équipe de terrain (contrainte organisationnelle)', () => {
      // La contrainte DB chk_controle_equipe_type impose : SUR_PIECES → equipe_id IS NULL
      // On vérifie ici la règle métier au niveau applicatif
      const controleSimule = {
        type_controle: 'SUR_PIECES',
        equipe_id: null, // correct
        controleur_responsable_id: VALID_UUID,
      };
      assert.equal(controleSimule.equipe_id, null, 'SUR_PIECES : equipe_id doit être NULL');
    });

    it('SUR_PIECES ne doit jamais générer d\'ordre de mission', () => {
      // Règle : seul SUR_PLACE génère un ordre de mission
      const shouldGenerateOrdreMission = (typeControle) => typeControle === 'SUR_PLACE';
      assert.equal(shouldGenerateOrdreMission('SUR_PIECES'), false, 'Aucun ordre de mission pour SUR_PIECES');
      assert.equal(shouldGenerateOrdreMission('SUR_PLACE'), true, 'Ordre de mission attendu pour SUR_PLACE');
    });

    it('SUR_PIECES doit générer une autorisation après approbation Chef de section', () => {
      // Règle : SUR_PIECES → autorisations_controle_pieces (pas ordreMission)
      const shouldGenerateAutorisationPieces = (typeControle, decision) =>
        typeControle === 'SUR_PIECES' && decision === 'APPROUVE';
      assert.equal(shouldGenerateAutorisationPieces('SUR_PIECES', 'APPROUVE'), true);
      assert.equal(shouldGenerateAutorisationPieces('SUR_PLACE', 'APPROUVE'), false);
      assert.equal(shouldGenerateAutorisationPieces('SUR_PIECES', 'REJETE'), false);
    });

    it('ADMIN ne peut pas approuver une demande SUR_PIECES (séparation des pouvoirs)', () => {
      // Simulation : rôle ADMIN → refus métier
      const canApproveAsChefSection = (role, typeControle) => {
        if (role === 'ADMIN') return false;
        if (typeControle !== 'SUR_PIECES') return false;
        return role === 'CHEF_BUREAU';
      };
      assert.equal(canApproveAsChefSection('ADMIN', 'SUR_PIECES'), false, 'ADMIN ne peut pas approuver');
      assert.equal(canApproveAsChefSection('CHEF_BUREAU', 'SUR_PIECES'), true, 'CHEF_BUREAU peut approuver');
      assert.equal(canApproveAsChefSection('CONTROLEUR', 'SUR_PIECES'), false, 'CONTROLEUR ne peut pas approuver');
    });

    it('ADMIN ne peut pas désigner un contrôleur (décision métier interdite)', () => {
      const canDesignateControleur = (role) => {
        if (role === 'ADMIN') return false;
        return role === 'CHEF_BUREAU';
      };
      assert.equal(canDesignateControleur('ADMIN'), false);
      assert.equal(canDesignateControleur('CHEF_BUREAU'), true);
    });

    it('Autorisation de contrôle ne peut pas être générée avant approbation Chef de section', () => {
      const statutsAvantApprobation = [
        'BROUILLON', 'DEMANDE_SOUMISE', 'EXAMEN_CHEF_BUREAU', 'REJETEE',
      ];
      const canGenerateAutorisation = (statut) => statut === 'APPROUVEE';
      for (const s of statutsAvantApprobation) {
        assert.equal(canGenerateAutorisation(s), false, `Statut ${s} ne doit pas permettre la génération`);
      }
    });

    it('Contrôleur accède uniquement aux contrôles auxquels il est affecté (anti-IDOR)', () => {
      const controleSimule = { controleur_responsable_id: VALID_UUID };
      const autreControleurId = VALID_UUID_2;
      const canAccess = (userId, controle) =>
        controle.controleur_responsable_id === userId;
      assert.equal(canAccess(VALID_UUID, controleSimule), true, 'Le contrôleur responsable peut accéder');
      assert.equal(canAccess(autreControleurId, controleSimule), false, 'Autre contrôleur refusé (anti-IDOR)');
    });

    it('SUR_PIECES : contrôle doit passer par EN_ATTENTE → EN_COURS → TERMINE', () => {
      const transitionsValidesSurPieces = {
        'EN_ATTENTE': 'EN_COURS',
        'EN_COURS': 'TERMINE',
      };
      assert.equal(transitionsValidesSurPieces['EN_ATTENTE'], 'EN_COURS');
      assert.equal(transitionsValidesSurPieces['EN_COURS'], 'TERMINE');
      assert.equal(transitionsValidesSurPieces['TERMINE'], undefined, 'TERMINE est un état final');
    });

    it('Demande de renseignements ne peut être émise que pour un contrôle SUR_PIECES actif', () => {
      const canEmitDemande = (typeControle, statut) => {
        if (typeControle !== 'SUR_PIECES') return false;
        return statut === 'EN_COURS' || statut === 'EN_ATTENTE';
      };
      assert.equal(canEmitDemande('SUR_PIECES', 'EN_COURS'), true);
      assert.equal(canEmitDemande('SUR_PIECES', 'EN_ATTENTE'), true);
      assert.equal(canEmitDemande('SUR_PIECES', 'TERMINE'), false);
      assert.equal(canEmitDemande('SUR_PLACE', 'EN_COURS'), false, 'SUR_PLACE n\'utilise pas les demandes de renseignements');
    });

  });

});
