// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : ANALYSES & CIBLAGE
// =============================================================================

import { z } from 'zod';
import { CurrencyTypeEnum } from './results.ts';

export const AnalyseStatutEnum = z.enum(['BROUILLON', 'EN_COURS', 'VALIDEE', 'CLOTUREE']);
export type AnalyseStatut = z.infer<typeof AnalyseStatutEnum>;

export const PrioriteEnum = z.enum(['HAUTE', 'MOYENNE', 'BASSE']);
export type Priorite = z.infer<typeof PrioriteEnum>;

/**
 * Schéma de création d'une analyse
 */
export const AnalyseCreateSchema = z.object({
  bureau_id: z.string().uuid('Identifiant bureau invalide.'),
  secteur_id: z.string().uuid('Identifiant secteur invalide.').optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD).')
    .optional(),
  observations: z.string().trim().max(2000, 'Les observations ne peuvent pas dépasser 2000 caractères.').optional().nullable(),
});
export type AnalyseCreateInput = z.infer<typeof AnalyseCreateSchema>;

/**
 * Schéma pour associer un assujetti à une analyse
 */
export const AnalyseAssujettiAddSchema = z.object({
  analyse_id: z.string().uuid('Identifiant analyse invalide.'),
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
  montant_du: z.number().min(0, 'Le montant dû doit être positif ou nul.').optional().nullable(),
  montant_paye: z.number().min(0, 'Le montant payé doit être positif ou nul.').optional().nullable(),
  montant_restant: z.number().min(0, 'Le montant restant doit être positif ou nul.').optional().nullable(),
  devise: CurrencyTypeEnum,
  manque_a_gagner: z.number().min(0, 'Le manque à gagner doit être positif ou nul.').optional().nullable(),
  priorite: PrioriteEnum.optional().nullable(),
});
export type AnalyseAssujettiAddInput = z.infer<typeof AnalyseAssujettiAddSchema>;

export const AnalyseAssujettiRemoveSchema = z.object({
  analyse_id: z.string().uuid('Identifiant analyse invalide.'),
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
});
export type AnalyseAssujettiRemoveInput = z.infer<typeof AnalyseAssujettiRemoveSchema>;

/**
 * Schéma de transition de statut d'une analyse
 */
export const AnalyseTransitionSchema = z.object({
  analyse_id: z.string().uuid('Identifiant analyse invalide.'),
  nouveau_statut: AnalyseStatutEnum,
  observations: z.string().trim().optional().nullable(),
});
export type AnalyseTransitionInput = z.infer<typeof AnalyseTransitionSchema>;

/**
 * Schéma de filtrage des analyses
 */
export const AnalyseFilterSchema = z.object({
  bureau_id: z.string().uuid().optional().nullable().or(z.literal('')),
  secteur_id: z.string().uuid().optional().nullable().or(z.literal('')),
  statut: AnalyseStatutEnum.optional().nullable().or(z.literal('')),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type AnalyseFilterInput = z.infer<typeof AnalyseFilterSchema>;
