// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : RÉSULTATS, REDRESSEMENTS, PÉNALITÉS
// =============================================================================

import { z } from 'zod';

export const ResultatTypeEnum = z.enum(['CHARGEE', 'DECHARGEE']);
export type ResultatType = z.infer<typeof ResultatTypeEnum>;

export const CurrencyTypeEnum = z.enum(['CDF', 'USD']);
export type CurrencyType = z.infer<typeof CurrencyTypeEnum>;

/**
 * Schéma pour un poste de redressement
 */
export const RedressementItemSchema = z.object({
  id: z.string().uuid().optional(),
  montant: z.number().min(0, 'Le montant du redressement doit être positif ou nul.'),
  motif: z.string().min(3, 'Le motif du redressement doit contenir au moins 3 caractères.'),
  statut: z.string().optional(),
});
export type RedressementItemInput = z.infer<typeof RedressementItemSchema>;

/**
 * Schéma pour une pénalité (sans formule inventée, conforme QM-023)
 */
export const PenaliteItemSchema = z.object({
  id: z.string().uuid().optional(),
  montant: z.number().min(0, 'Le montant de la pénalité doit être positif ou nul.'),
  motif: z.string().min(3, 'Le fondement/motif de la pénalité doit contenir au moins 3 caractères.'),
});
export type PenaliteItemInput = z.infer<typeof PenaliteItemSchema>;

/**
 * Schéma principal de création / mise à jour du résultat de contrôle
 */
export const ResultatSaveSchema = z
  .object({
    controle_id: z.string().uuid('Identifiant de contrôle invalide.'),
    type_resultat: ResultatTypeEnum,
    devise: CurrencyTypeEnum,
    montant_du: z.number().min(0, 'Le montant dû doit être positif ou nul.').optional().nullable(),
    montant_penalites: z
      .number()
      .min(0, 'Le montant des pénalités doit être positif ou nul.')
      .optional()
      .nullable(),
    montant_total: z
      .number()
      .min(0, 'Le montant total doit être positif ou nul.')
      .optional()
      .nullable(),
    justification: z.string().optional().nullable(),
    redressements: z.array(RedressementItemSchema).optional(),
    penalites: z.array(PenaliteItemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Règle pour DECHARGEE (RM-017, chk_resultat_dechargee_justification)
    if (data.type_resultat === 'DECHARGEE') {
      if (!data.justification || data.justification.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Une justification détaillée (au moins 5 caractères) est obligatoire pour un résultat déchargé.',
          path: ['justification'],
        });
      }
    }

    // 2. Règle pour CHARGEE : intégrité du montant total (RM-041, chk_resultat_total_coherence)
    if (data.type_resultat === 'CHARGEE') {
      const du = Number(data.montant_du ?? 0);
      const pen = Number(data.montant_penalites ?? 0);
      const tot = Number(data.montant_total ?? 0);

      const expectedTotal = Math.round((du + pen) * 100) / 100;
      const actualTotal = Math.round(tot * 100) / 100;

      if (Math.abs(expectedTotal - actualTotal) > 0.001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Incohérence du montant total : ${actualTotal} ${data.devise} ne correspond pas à la somme montant dû (${du}) + pénalités (${pen}) = ${expectedTotal} ${data.devise}.`,
          path: ['montant_total'],
        });
      }
    }
  });

export type ResultatSaveInput = z.infer<typeof ResultatSaveSchema>;

/**
 * Schéma pour l'ajout individuel d'un redressement
 */
export const RedressementAddSchema = z.object({
  resultat_id: z.string().uuid('Identifiant de résultat invalide.'),
  montant: z.number().min(0, 'Le montant doit être positif ou nul.'),
  devise: CurrencyTypeEnum,
  motif: z.string().min(3, 'Le motif doit contenir au moins 3 caractères.'),
  statut: z.string().optional(),
});
export type RedressementAddInput = z.infer<typeof RedressementAddSchema>;

/**
 * Schéma pour la suppression d'un redressement
 */
export const RedressementDeleteSchema = z.object({
  redressement_id: z.string().uuid('Identifiant de redressement invalide.'),
});
export type RedressementDeleteInput = z.infer<typeof RedressementDeleteSchema>;

/**
 * Schéma pour l'ajout individuel d'une pénalité
 */
export const PenaliteAddSchema = z.object({
  resultat_id: z.string().uuid('Identifiant de résultat invalide.'),
  montant: z.number().min(0, 'Le montant doit être positif ou nul.'),
  devise: CurrencyTypeEnum,
  motif: z.string().min(3, 'Le motif doit contenir au moins 3 caractères.'),
});
export type PenaliteAddInput = z.infer<typeof PenaliteAddSchema>;

/**
 * Schéma pour la suppression d'une pénalité
 */
export const PenaliteDeleteSchema = z.object({
  penalite_id: z.string().uuid('Identifiant de pénalité invalide.'),
});
export type PenaliteDeleteInput = z.infer<typeof PenaliteDeleteSchema>;

/**
 * Schéma de génération d'un avis de recouvrement
 */
export const AvisRecouvrementGenerateSchema = z.object({
  resultat_id: z.string().uuid('Identifiant de résultat invalide.'),
});
export type AvisRecouvrementGenerateInput = z.infer<typeof AvisRecouvrementGenerateSchema>;
