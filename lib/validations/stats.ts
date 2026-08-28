// =============================================================================
// DGRAD CONTROLE - VALIDATION ZOD : STATISTIQUES & TABLEAUX DE BORD (ÉTAPE 12)
// =============================================================================

import { z } from 'zod';

/**
 * Schéma de validation pour les filtres de consultation des statistiques
 */
export const StatsFilterSchema = z
  .object({
    date_debut: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date de début doit être au format YYYY-MM-DD.' })
      .optional()
      .or(z.literal('')),
    date_fin: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date de fin doit être au format YYYY-MM-DD.' })
      .optional()
      .or(z.literal('')),
    bureau_id: z
      .string()
      .uuid({ message: 'Identifiant de bureau invalide (UUID attendu).' })
      .optional()
      .or(z.literal('')),
    secteur_id: z
      .string()
      .uuid({ message: 'Identifiant de secteur invalide (UUID attendu).' })
      .optional()
      .or(z.literal('')),
    type_controle: z
      .enum(['SUR_PLACE', 'SUR_PIECES'], {
        error: 'Le type de contrôle doit être SUR_PLACE ou SUR_PIECES.',
      })
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.date_debut && data.date_fin && data.date_debut !== '' && data.date_fin !== '') {
        return new Date(data.date_debut) <= new Date(data.date_fin);
      }
      return true;
    },
    {
      message: 'La date de début ne peut pas être postérieure à la date de fin.',
      path: ['date_debut'],
    }
  );

export type StatsFilterInput = z.infer<typeof StatsFilterSchema>;
