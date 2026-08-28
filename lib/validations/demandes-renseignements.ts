// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : DEMANDES DE RENSEIGNEMENTS (SUR_PIECES)
// =============================================================================

import { z } from 'zod';

export const DemandeRenseignementsStatusEnum = z.enum([
  'EN_ATTENTE',
  'REPONDU',
  'RELANCE',
]);
export type DemandeRenseignementsStatus = z.infer<typeof DemandeRenseignementsStatusEnum>;

/**
 * Schéma pour la création d'une demande de renseignements ou pièces complémentaires
 */
export const DemandeRenseignementsCreateSchema = z.object({
  controle_id: z.string().uuid('Identifiant de contrôle invalide.'),
  assujetti_id: z.string().uuid('Identifiant d\'assujetti invalide.'),
  date_envoi: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date d\'envoi invalide (AAAA-MM-JJ).')
    .optional(),
  date_limite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date limite invalide (AAAA-MM-JJ).')
    .optional()
    .nullable(),
  contenu: z
    .string()
    .trim()
    .min(10, 'Le libellé de la demande doit comporter au moins 10 caractères pour être suffisamment explicite.'),
});
export type DemandeRenseignementsCreateInput = z.infer<typeof DemandeRenseignementsCreateSchema>;

/**
 * Schéma pour l'enregistrement d'une réponse de l'assujetti
 */
export const DemandeRenseignementsReponseSchema = z.object({
  demande_id: z.string().uuid('Identifiant de demande invalide.'),
  date_reponse: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date de réponse invalide (AAAA-MM-JJ).'),
  commentaire: z
    .string()
    .trim()
    .min(1, 'Le contenu de la réponse est obligatoire.'),
});
export type DemandeRenseignementsReponseInput = z.infer<typeof DemandeRenseignementsReponseSchema>;

/**
 * Schéma pour la relance d'une demande en attente
 */
export const DemandeRenseignementsRelanceSchema = z.object({
  demande_id: z.string().uuid('Identifiant de demande invalide.'),
  nouvelle_date_limite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de nouvelle date limite invalide (AAAA-MM-JJ).')
    .optional()
    .nullable(),
  motif_relance: z.string().trim().min(1, 'Le motif de la relance est obligatoire.'),
});
export type DemandeRenseignementsRelanceInput = z.infer<typeof DemandeRenseignementsRelanceSchema>;
