import { z } from 'zod';

export const StatutNoteVerificationEnum = z.enum(['RETROUVEE', 'ABSENTE', 'A_VERIFIER']);
export type StatutNoteVerification = z.infer<typeof StatutNoteVerificationEnum>;

export const StatutPaiementAssujettiEnum = z.enum([
  'CONFORME',
  'DEBITEUR',
  'NOTE_ABSENTE',
  'PAIEMENT_RETARD',
  'NON_DECLARE',
]);
export type StatutPaiementAssujetti = z.infer<typeof StatutPaiementAssujettiEnum>;

export const VerificationOrdonnancementInputSchema = z.object({
  fiche_ordonnancement_id: z.string().uuid('Identifiant de fiche d’ordonnancement invalide.'),
  statut_note: StatutNoteVerificationEnum,
  numero_note_verifie: z.string().trim().max(100).optional().nullable(),

  // --- PAIEMENT CONSTATÉ ---
  montant_paye_cdf: z.number().min(0, 'Le montant payé CDF ne peut pas être négatif.').default(0),
  montant_paye_usd: z.number().min(0, 'Le montant payé USD ne peut pas être négatif.').default(0),
  date_paiement: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ).')
    .optional()
    .nullable(),

  // --- PÉNALITÉ CONDITIONNELLE ---
  // La pénalité de 5 % ne s'applique que si l'agent la valide explicitement.
  // Les informations de la "déclaration" sont celles de la fiche d'ordonnancement (BUR_ANA_REC).
  penalite_applicable: z.boolean().default(false),

  observations: z.string().trim().max(1000).optional().nullable(),
  situation_explicite: StatutPaiementAssujettiEnum.optional().nullable(),
});

export type VerificationOrdonnancementInput = z.infer<typeof VerificationOrdonnancementInputSchema>;

export const VerificationFilterSchema = z.object({
  bureau_id: z.string().uuid().optional(),
  secteur_id: z.string().uuid().optional(),
  statut_note: StatutNoteVerificationEnum.optional(),
  statut_paiement: StatutPaiementAssujettiEnum.optional(),
  search: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type VerificationFilter = z.infer<typeof VerificationFilterSchema>;

// =============================================================================
// CONSTANTES MÉTIER CENTRALISÉES (RM-042)
// =============================================================================

/**
 * Délai standard de paiement d'une note de perception : 10 jours calendaires.
 */
export const DELAI_PAIEMENT_STANDARD = 10;

/**
 * Taux indicatif de pénalité en cas de dépassement du délai de paiement : 5 % (0.05).
 * Applicable UNIQUEMENT sur le reste dû effectif en cas de retard validé par le contrôleur.
 */
export const TAUX_PENALITE_RETARD_STANDARD = 0.05;

// =============================================================================
// FONCTIONS DE CALCUL MÉTIER PURS
// =============================================================================

/**
 * Calcule le reste dû (strictement >= 0).
 * Montant ordonnancé - Montant payé.
 */
export function calculerResteDu(montantOrdonnance: number, montantPaye: number): number {
  const ord = Math.max(0, Number(montantOrdonnance) || 0);
  const pay = Math.max(0, Number(montantPaye) || 0);
  const reste = ord - pay;
  return reste > 0 ? Number(reste.toFixed(2)) : 0;
}

/**
 * Calcule la pénalité sur le reste dû au taux configuré (par défaut 5 % / 0.05).
 * Conditions d'application :
 * - Le paiement est en retard (estEnRetard === true)
 * - Le reste dû est supérieur à zéro (resteDu > 0)
 * Si le paiement est effectué dans les délais (estEnRetard === false), la pénalité est STRICTEMENT égale à 0.
 */
export function calculerPenalite(
  resteDu: number,
  taux: number = TAUX_PENALITE_RETARD_STANDARD,
  estEnRetard: boolean = true
): number {
  if (!estEnRetard) return 0;
  const reste = Math.max(0, Number(resteDu) || 0);
  if (reste <= 0 || taux <= 0) return 0;
  return Number((reste * taux).toFixed(2));
}

/**
 * Calcule le montant total après pénalité.
 */
export function calculerTotalDu(resteDu: number, penalite: number): number {
  return Number(((Number(resteDu) || 0) + (Number(penalite) || 0)).toFixed(2));
}

// =============================================================================
// TYPES DE CONSOLIDATION MULTI-NIVEAUX (RM-040, RM-041)
// =============================================================================

export interface ConsolidationFinanciereDevise {
  total_du: number;
  total_paye: number;
  manque_a_gagner: number;
  penalites: number;
  total_exigible: number;
}

export interface ConsolidationLigneBase {
  nombre_assujettis: number;
  nombre_fiches: number;
  nombre_debiteurs: number;
  nombre_retards: number;
  nombre_notes_absentes: number;
  nombre_non_declarants: number;
  cdf: ConsolidationFinanciereDevise;
  usd: ConsolidationFinanciereDevise;
}

export interface SyntheseBureauConsolidation extends ConsolidationLigneBase {
  bureau_id: string;
  bureau_code: string;
  bureau_nom: string;
  nombre_secteurs: number;
}

export interface SyntheseDivisionConsolidation extends ConsolidationLigneBase {
  nombre_bureaux: number;
  nombre_secteurs: number;
}

/**
 * Calcule la date limite exclusivement depuis la date d'émission de la note de
 * perception, avec le délai réglementaire fixe de dix jours calendaires.
 * Aucun délai reçu de l'interface ne peut modifier ce calcul.
 */
export function calculerDateEcheance(dateEmissionNote: string): string {
  const date = new Date(dateEmissionNote);
  if (isNaN(date.getTime())) {
    return dateEmissionNote;
  }
  date.setDate(date.getDate() + DELAI_PAIEMENT_STANDARD);
  return date.toISOString().slice(0, 10);
}

/**
 * Détermine le retard de paiement et le nombre de jours de retard.
 */
export function calculerRetard(
  dateEcheance: string,
  datePaiement?: string | null
): { joursRetard: number; estEnRetard: boolean } {
  if (!datePaiement) {
    return { joursRetard: 0, estEnRetard: false };
  }

  const dEcheance = new Date(dateEcheance);
  const dPaiement = new Date(datePaiement);

  if (isNaN(dEcheance.getTime()) || isNaN(dPaiement.getTime())) {
    return { joursRetard: 0, estEnRetard: false };
  }

  const diffMs = dPaiement.getTime() - dEcheance.getTime();
  const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffJours > 0) {
    return { joursRetard: diffJours, estEnRetard: true };
  }

  return { joursRetard: 0, estEnRetard: false };
}

/**
 * Détermine la situation de l'assujetti selon les constats du contrôle.
 */
export function determinerSituationAssujetti(params: {
  statutNote: StatutNoteVerification;
  montantOrdonnanceCDF: number;
  montantOrdonnanceUSD: number;
  montantPayeCDF: number;
  montantPayeUSD: number;
  joursRetard: number;
  situationExplicite?: StatutPaiementAssujetti | null;
}): StatutPaiementAssujetti {
  if (params.situationExplicite === 'NON_DECLARE') {
    return 'NON_DECLARE';
  }

  if (params.statutNote === 'ABSENTE') {
    return 'NOTE_ABSENTE';
  }

  const resteCDF = calculerResteDu(params.montantOrdonnanceCDF, params.montantPayeCDF);
  const resteUSD = calculerResteDu(params.montantOrdonnanceUSD, params.montantPayeUSD);

  if (resteCDF > 0 || resteUSD > 0) {
    return 'DEBITEUR';
  }

  if (params.joursRetard > 0) {
    return 'PAIEMENT_RETARD';
  }

  return 'CONFORME';
}
