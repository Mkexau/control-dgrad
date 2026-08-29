// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : ASSUJETTIS
// =============================================================================

import { z } from 'zod';

export const AssujettiTypeEnum = z.enum(['PERSONNE_PHYSIQUE', 'PERSONNE_MORALE']);
export type AssujettiType = z.infer<typeof AssujettiTypeEnum>;

/**
 * Schéma de création d'un assujetti
 */
export const AssujettiCreateSchema = z.object({
  type: AssujettiTypeEnum,
  identifiant: z
    .string()
    .trim()
    .min(3, "L'identifiant (NIF/RCCM) doit contenir au moins 3 caractères.")
    .max(50, "L'identifiant ne peut pas dépasser 50 caractères."),
  nom_raison_sociale: z
    .string()
    .trim()
    .min(2, 'Le nom ou la raison sociale doit contenir au moins 2 caractères.')
    .max(255, 'Le nom ou la raison sociale ne peut pas dépasser 255 caractères.'),
  adresse: z.string().trim().max(500, "L'adresse ne peut pas dépasser 500 caractères.").optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Adresse e-mail invalide.')
    .optional()
    .nullable()
    .or(z.literal('')),
  telephone: z
    .string()
    .trim()
    .max(30, 'Le numéro de téléphone ne peut pas dépasser 30 caractères.')
    .optional()
    .nullable()
    .or(z.literal('')),
  secteur_principal_id: z.string().uuid('Identifiant de secteur invalide.').optional().nullable(),
});
export type AssujettiCreateInput = z.infer<typeof AssujettiCreateSchema>;

/**
 * Schéma de mise à jour d'un assujetti
 */
export const AssujettiUpdateSchema = z.object({
  id: z.string().uuid('Identifiant assujetti invalide.'),
  type: AssujettiTypeEnum.optional(),
  identifiant: z
    .string()
    .trim()
    .min(3, "L'identifiant doit contenir au moins 3 caractères.")
    .max(50, "L'identifiant ne peut pas dépasser 50 caractères.")
    .optional(),
  nom_raison_sociale: z
    .string()
    .trim()
    .min(2, 'Le nom ou la raison sociale doit contenir au moins 2 caractères.')
    .max(255, 'Le nom ou la raison sociale ne peut pas dépasser 255 caractères.')
    .optional(),
  adresse: z.string().trim().max(500).optional().nullable(),
  email: z.string().trim().email('Adresse e-mail invalide.').optional().nullable().or(z.literal('')),
  telephone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  secteur_principal_id: z.string().uuid('Identifiant de secteur invalide.').optional().nullable(),
  actif: z.boolean().optional(),
});
export type AssujettiUpdateInput = z.infer<typeof AssujettiUpdateSchema>;

/**
 * Schéma de filtrage et recherche d'assujettis
 */
export const AssujettiFilterSchema = z.object({
  search: z.string().optional(),
  secteur_id: z.string().uuid().optional().nullable().or(z.literal('')),
  bureau_id: z.string().uuid().optional().nullable().or(z.literal('')),
  type: AssujettiTypeEnum.optional().nullable().or(z.literal('')),
  actif: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type AssujettiFilterInput = z.infer<typeof AssujettiFilterSchema>;
