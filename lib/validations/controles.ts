// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : CONTRÔLES OPÉRATIONNELS
// =============================================================================

import { z } from 'zod';

export const ControleStatusEnum = z.enum(['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE']);
export type ControleStatus = z.infer<typeof ControleStatusEnum>;

/**
 * Démarrage d'un contrôle opérationnel
 */
export const ControleStartSchema = z.object({
  controle_id: z.string().uuid('Identifiant de contrôle invalide.'),
  date_debut: z.string().optional(),
});
export type ControleStartInput = z.infer<typeof ControleStartSchema>;

/**
 * Enregistrement des constatations préliminaires / terrain
 */
export const ControleSaveConstatationsSchema = z.object({
  controle_id: z.string().uuid('Identifiant de contrôle invalide.'),
  observations: z
    .string()
    .min(5, 'Les observations doivent contenir au moins 5 caractères.')
    .max(5000, 'Les observations ne doivent pas dépasser 5000 caractères.'),
});
export type ControleSaveConstatationsInput = z.infer<typeof ControleSaveConstatationsSchema>;

/**
 * Clôture du contrôle de terrain
 */
export const ControleFinishSchema = z.object({
  controle_id: z.string().uuid('Identifiant de contrôle invalide.'),
  observations: z
    .string()
    .max(5000, 'Les observations ne doivent pas dépasser 5000 caractères.')
    .optional(),
  date_fin: z.string().optional(),
});
export type ControleFinishInput = z.infer<typeof ControleFinishSchema>;
