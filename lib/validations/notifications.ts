// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : NOTIFICATIONS INTERNES
// =============================================================================

import { z } from 'zod';

export const NotificationMarkReadSchema = z.object({
  id: z.string().uuid('Identifiant notification invalide.'),
});
export type NotificationMarkReadInput = z.infer<typeof NotificationMarkReadSchema>;

export const NotificationFilterSchema = z.object({
  lu: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type NotificationFilterInput = z.infer<typeof NotificationFilterSchema>;
