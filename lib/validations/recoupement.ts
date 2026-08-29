// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : RECOUPEMENT, NOTES & ORDONNANCEMENTS
// =============================================================================

import { z } from 'zod';
import { CurrencyTypeEnum } from './results.ts';

/**
 * Schéma de création d'une note de perception
 */
export const NotePerceptionCreateSchema = z.object({
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
  numero: z
    .string()
    .trim()
    .min(3, 'Le numéro de la note de perception doit contenir au moins 3 caractères.')
    .max(100, 'Le numéro ne peut pas dépasser 100 caractères.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD).'),
  acte_generateur: z
    .string()
    .trim()
    .min(3, "L'acte générateur doit contenir au moins 3 caractères.")
    .max(255, "L'acte générateur ne peut pas dépasser 255 caractères."),
  article_budgetaire: z
    .string()
    .trim()
    .max(100, "L'article budgétaire ne peut pas dépasser 100 caractères.")
    .optional()
    .nullable()
    .or(z.literal('')),
  nombre_actes: z.number().int().min(1, 'Le nombre d’actes doit être au moins 1.').default(1),
  montant: z.number().min(0, 'Le montant de la note de perception doit être positif ou nul.'),
  devise: CurrencyTypeEnum,
});
export type NotePerceptionCreateInput = z.infer<typeof NotePerceptionCreateSchema>;

/**
 * Schéma de création d'un ordonnancement
 */
export const OrdonnancementCreateSchema = z.object({
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
  numero: z
    .string()
    .trim()
    .min(3, "Le numéro d'ordonnancement doit contenir au moins 3 caractères.")
    .max(100, 'Le numéro ne peut pas dépasser 100 caractères.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD).'),
  montant: z.number().min(0, "Le montant de l'ordonnancement doit être positif ou nul."),
  devise: CurrencyTypeEnum,
  statut: z.string().trim().min(2, 'Le statut est requis.').default('ORDONNANCE'),
});
export type OrdonnancementCreateInput = z.infer<typeof OrdonnancementCreateSchema>;

/**
 * Schéma de filtrage des notes de perception
 */
export const NotePerceptionFilterSchema = z.object({
  assujetti_id: z.string().uuid().optional(),
  devise: CurrencyTypeEnum.optional(),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
});
export type NotePerceptionFilterInput = z.infer<typeof NotePerceptionFilterSchema>;
