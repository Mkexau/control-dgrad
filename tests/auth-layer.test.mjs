/**
 * Tests d'autorisation — Couche auth guards
 *
 * Ces tests exécutent DIRECTEMENT les fonctions métier pures issues de lib/auth/rules.ts (TypeScript).
 * Il n'y a AUCUNE duplication de code : lib/auth/rules.ts est la source UNIQUE de vérité,
 * consommée à la fois par lib/auth/guards.ts en production et par cette suite de tests.
 *
 * Tests RLS réels : NON TESTÉS (aucune instance Supabase/PostgreSQL connectée).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAuthenticated,
  checkAdmin,
  checkApprobationDG,
  checkApprobationChefBureau,
  checkEquipeAccess,
  checkControleurAccess,
  checkBureauAccess,
  ForbiddenError,
  UnauthorizedError,
} from "../lib/auth/rules.ts";

// =============================================================================
// Données de test (mocks conformes au type CurrentUser de lib/validations/auth.ts)
// =============================================================================

const BUREAU_A = "11111111-1111-1111-1111-111111111111";
const BUREAU_B = "22222222-2222-2222-2222-222222222222";
const AGENT_1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const AGENT_2_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const mockAdmin = {
  id: AGENT_1_ID,
  email: "admin@dgrad.cd",
  role: "ADMIN",
  bureau_id: null,
  division_id: null,
  is_active: true,
};

const mockDG = {
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  email: "dg@dgrad.cd",
  role: "DIRECTEUR_GENERAL",
  bureau_id: null,
  division_id: null,
  is_active: true,
};

const mockChefBureauPieces = {
  id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  email: "chef.section@dgrad.cd",
  role: "CHEF_BUREAU",
  bureau_id: BUREAU_A,
  division_id: null,
  is_active: true,
};

const mockChefEquipe = {
  id: AGENT_1_ID,
  email: "chef.equipe@dgrad.cd",
  role: "CHEF_EQUIPE",
  bureau_id: BUREAU_A,
  division_id: null,
  is_active: true,
};

const mockControleur = {
  id: AGENT_1_ID,
  email: "controleur@dgrad.cd",
  role: "CONTROLEUR",
  bureau_id: BUREAU_A,
  division_id: null,
  is_active: true,
};

const mockChefBureau = {
  id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  email: "chef.bureau@dgrad.cd",
  role: "CHEF_BUREAU",
  bureau_id: BUREAU_A,
  division_id: null,
  is_active: true,
};

// =============================================================================
// Scénario 1 — Utilisateur non authentifié (null) → accès refusé
// =============================================================================

test("Scénario 1 — Utilisateur non authentifié : accès refusé", () => {
  assert.throws(
    () => checkAuthenticated(null),
    (err) => err instanceof UnauthorizedError,
    "Un utilisateur null doit lever UnauthorizedError"
  );
});

// =============================================================================
// Scénario 2 — ADMIN : administration technique autorisée
// =============================================================================

test("Scénario 2 — ADMIN : administration technique autorisée", () => {
  const user = checkAdmin(mockAdmin);
  assert.strictEqual(user.role, "ADMIN");
  assert.strictEqual(user.id, mockAdmin.id);
});

// =============================================================================
// Scénario 3 — ADMIN : approbation DG refusée
// =============================================================================

test("Scénario 3 — ADMIN : approbation DG refusée", () => {
  assert.throws(
    () => checkApprobationDG(mockAdmin),
    (err) =>
      err instanceof ForbiddenError &&
      err.message.includes("ADMIN"),
    "L'ADMIN ne peut pas approuver au nom du DG"
  );
});

// =============================================================================
// Scénario 4 — ADMIN : rejet DG refusé (même garde que l'approbation)
// =============================================================================

test("Scénario 4 — ADMIN : rejet DG refusé", () => {
  assert.throws(
    () => checkApprobationDG(mockAdmin),
    (err) => err instanceof ForbiddenError,
    "L'ADMIN ne peut pas rejeter au nom du DG"
  );
});

// =============================================================================
// Scénario 5 — ADMIN : approbation CHEF_SECTION refusée
// =============================================================================

test("Scénario 5 — ADMIN : approbation CHEF_SECTION refusée", () => {
  assert.throws(
    () => checkApprobationChefBureau(mockAdmin),
    (err) =>
      err instanceof ForbiddenError &&
      err.message.includes("ADMIN"),
    "L'ADMIN ne peut pas approuver au nom du Chef de section"
  );
});

// =============================================================================
// Scénario 6 — DIRECTEUR_GENERAL : opération DG autorisée
// =============================================================================

test("Scénario 6 — DIRECTEUR_GENERAL : opération DG autorisée", () => {
  const user = checkApprobationDG(mockDG);
  assert.strictEqual(user.role, "DIRECTEUR_GENERAL");
});

// =============================================================================
// Scénario 7 — CHEF_SECTION : approbation mission SUR_PIECES autorisée
// =============================================================================

test("Scénario 7 — CHEF_SECTION : approbation mission SUR_PIECES autorisée", () => {
  const user = checkApprobationChefBureau(mockChefBureauPieces);
  assert.strictEqual(user.role, "CHEF_BUREAU");
});

// =============================================================================
// Scénario 8 — CHEF_SECTION : approbation mission SUR_PLACE refusée
// =============================================================================

test("Scénario 8 — CHEF_SECTION : approbation mission SUR_PLACE (DG) refusée", () => {
  assert.throws(
    () => checkApprobationDG(mockChefBureauPieces),
    (err) =>
      err instanceof ForbiddenError &&
      err.message.includes("CHEF_BUREAU"),
    "Le CHEF_SECTION ne peut pas approuver une mission sur place au nom du DG"
  );
});

// =============================================================================
// Scénario 9 — CHEF_EQUIPE : accès à une ressource de son équipe autorisé
// =============================================================================

test("Scénario 9 — CHEF_EQUIPE : accès à sa propre équipe autorisé", () => {
  const user = checkEquipeAccess(mockChefEquipe, AGENT_1_ID);
  assert.strictEqual(user.role, "CHEF_EQUIPE");
  assert.strictEqual(user.id, AGENT_1_ID);
});

// =============================================================================
// Scénario 10 — CHEF_EQUIPE : accès à une ressource d'une autre équipe refusé
// =============================================================================

test("Scénario 10 — CHEF_EQUIPE : accès à une autre équipe refusé", () => {
  assert.throws(
    () => checkEquipeAccess(mockChefEquipe, AGENT_2_ID),
    (err) => err instanceof ForbiddenError,
    "Un chef d'équipe ne peut pas accéder à l'équipe d'un autre chef"
  );
});

// =============================================================================
// Scénario 11 — CONTROLEUR : accès à un contrôle affecté autorisé
// =============================================================================

test("Scénario 11 — CONTROLEUR : accès à un contrôle affecté autorisé", () => {
  const user = checkControleurAccess(mockControleur, AGENT_1_ID);
  assert.strictEqual(user.role, "CONTROLEUR");
  assert.strictEqual(user.id, AGENT_1_ID);
});

// =============================================================================
// Scénario 12 — CONTROLEUR : accès à un contrôle non affecté refusé
// =============================================================================

test("Scénario 12 — CONTROLEUR : accès à un contrôle non affecté refusé", () => {
  assert.throws(
    () => checkControleurAccess(mockControleur, AGENT_2_ID),
    (err) => err instanceof ForbiddenError,
    "Un contrôleur ne peut pas accéder à un contrôle qui ne lui est pas affecté"
  );
});

// =============================================================================
// Scénario 13 — Utilisateur d'un bureau : accès à un autre bureau refusé
// =============================================================================

test("Scénario 13 — Utilisateur bureau A : accès à bureau B refusé", () => {
  assert.throws(
    () => checkBureauAccess(mockChefBureau, BUREAU_B),
    (err) => err instanceof ForbiddenError,
    "Un utilisateur du bureau A ne peut pas accéder aux données du bureau B"
  );
});

// =============================================================================
// Vérifications complémentaires de la séparation ADMIN / métier
// =============================================================================

test("ADMIN : accès aux données d'un bureau (métier) refusé", () => {
  assert.throws(
    () => checkBureauAccess(mockAdmin, BUREAU_A),
    (err) => err instanceof ForbiddenError,
    "L'ADMIN ne doit pas avoir accès aux données métier d'un bureau"
  );
});

test("CHEF_EQUIPE ne peut pas approuver au nom du DG", () => {
  assert.throws(
    () => checkApprobationDG(mockChefEquipe),
    (err) => err instanceof ForbiddenError,
    "Un chef d'équipe n'a pas le pouvoir d'approbation DG"
  );
});

test("CONTROLEUR ne peut pas approuver au nom du CHEF_SECTION", () => {
  assert.throws(
    () => checkApprobationChefBureau(mockControleur),
    (err) => err instanceof ForbiddenError,
    "Un contrôleur ne peut pas approuver au nom du Chef de section"
  );
});
