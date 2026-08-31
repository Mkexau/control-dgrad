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
  montant_paye_cdf: z.number().min(0, 'Le montant payé CDF ne peut pas être négatif.').default(0),
  montant_paye_usd: z.number().min(0, 'Le montant payé USD ne peut pas être négatif.').default(0),
  date_paiement: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ).')
    .optional()
    .nullable(),
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
 * Calcule la pénalité légale de 5 % appliquée STRICTEMENT sur le reste dû.
 * Si le montant est déjà soldé (reste dû = 0), la pénalité est nulle.
 */
export function calculerPenalite(resteDu: number): number {
  const reste = Math.max(0, Number(resteDu) || 0);
  if (reste <= 0) return 0;
  return Number((reste * 0.05).toFixed(2));
}

/**
 * Calcule le montant total après pénalité.
 */
export function calculerTotalDu(resteDu: number, penalite: number): number {
  return Number(((Number(resteDu) || 0) + (Number(penalite) || 0)).toFixed(2));
}

/**
 * Calcule la date d'échéance à partir de la date de note et du délai en jours.
 */
export function calculerDateEcheance(dateNote: string, delaiJours: number): string {
  const date = new Date(dateNote);
  if (isNaN(date.getTime())) {
    return dateNote;
  }
  const jours = Math.max(1, Number(delaiJours) || 1);
  date.setDate(date.getDate() + jours);
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
