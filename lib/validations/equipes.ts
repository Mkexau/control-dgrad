// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : GESTION DES ÉQUIPES (SUR_PLACE)
// =============================================================================

import { z } from 'zod';

export const EquipeStatusEnum = z.enum(['PROPOSEE', 'CONFIRMEE', 'ANNULEE']);
export type EquipeStatus = z.infer<typeof EquipeStatusEnum>;

/**
 * Création d'une proposition d'équipe
 */
export const EquipeCreateSchema = z.object({
  mission_id: z.string().uuid('Identifiant de mission invalide.'),
  nom: z
    .string()
    .min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères.')
    .max(100, 'Le nom de l\'équipe ne doit pas dépasser 100 caractères.'),
  chef_equipe_id: z.string().uuid('Identifiant du chef d\'équipe invalide.'),
  agents_ids: z.array(z.string().uuid('Identifiant agent invalide.')).default([]),
  assujettis_ids: z.array(z.string().uuid('Identifiant assujetti invalide.')).default([]),
});
export type EquipeCreateInput = z.infer<typeof EquipeCreateSchema>;

/**
 * Mise à jour générale d'une équipe
 */
export const EquipeUpdateSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  nom: z
    .string()
    .min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères.')
    .max(100, 'Le nom de l\'équipe ne doit pas dépasser 100 caractères.')
    .optional(),
  chef_equipe_id: z.string().uuid('Identifiant du chef d\'équipe invalide.').optional(),
});
export type EquipeUpdateInput = z.infer<typeof EquipeUpdateSchema>;

/**
 * Ajout d'un agent à une équipe
 */
export const EquipeAddAgentSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  agent_id: z.string().uuid('Identifiant d\'agent invalide.'),
});
export type EquipeAddAgentInput = z.infer<typeof EquipeAddAgentSchema>;

/**
 * Retrait d'un agent d'une équipe
 */
export const EquipeRemoveAgentSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  agent_id: z.string().uuid('Identifiant d\'agent invalide.'),
});
export type EquipeRemoveAgentInput = z.infer<typeof EquipeRemoveAgentSchema>;

/**
 * Ajout d'un assujetti à une équipe
 */
export const EquipeAddAssujettiSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  assujetti_id: z.string().uuid('Identifiant d\'assujetti invalide.'),
});
export type EquipeAddAssujettiInput = z.infer<typeof EquipeAddAssujettiSchema>;

/**
 * Retrait d'un assujetti d'une équipe
 */
export const EquipeRemoveAssujettiSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  assujetti_id: z.string().uuid('Identifiant d\'assujetti invalide.'),
});
export type EquipeRemoveAssujettiInput = z.infer<typeof EquipeRemoveAssujettiSchema>;

/**
 * Désignation / Changement du Chef d'équipe
 */
export const EquipeDesignateChefSchema = z.object({
  equipe_id: z.string().uuid('Identifiant d\'équipe invalide.'),
  chef_equipe_id: z.string().uuid('Identifiant du chef d\'équipe invalide.'),
});
export type EquipeDesignateChefInput = z.infer<typeof EquipeDesignateChefSchema>;
