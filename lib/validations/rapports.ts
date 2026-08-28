// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD : RAPPORTS DE MISSION (ÉTAPE 11)
// =============================================================================

import { z } from 'zod';

export const RapportMissionSaveSchema = z.object({
  mission_id: z.string().uuid({ message: 'Identifiant de mission invalide (UUID attendu).' }),
  contenu: z
    .string()
    .trim()
    .min(10, { message: 'Le contenu du rapport doit comporter au moins 10 caractères.' }),
  statut: z.string().trim().optional(),
});


export type RapportMissionSaveInput = z.infer<typeof RapportMissionSaveSchema>;

export const RapportMissionGenerateDocSchema = z.object({
  mission_id: z.string().uuid({ message: 'Identifiant de mission invalide (UUID attendu).' }),
});

export type RapportMissionGenerateDocInput = z.infer<typeof RapportMissionGenerateDocSchema>;

export const MissionClotureSchema = z.object({
  mission_id: z.string().uuid({ message: 'Identifiant de mission invalide (UUID attendu).' }),
  motif_cloture: z.string().trim().optional(),
});

export type MissionClotureInput = z.infer<typeof MissionClotureSchema>;
