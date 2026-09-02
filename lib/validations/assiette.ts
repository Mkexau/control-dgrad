import { z } from 'zod';

export const ServiceAssietteAssujettiSchema = z.object({
  type: z.enum(['PERSONNE_PHYSIQUE', 'PERSONNE_MORALE']),
  nom_raison_sociale: z.string().trim().min(2).max(255),
  forme_juridique: z.string().trim().max(100).optional().nullable(),
  numero_rccm: z.string().trim().max(50).optional().nullable(),
  adresse: z.string().trim().max(500).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
  ville: z.string().trim().max(100).optional().nullable(),
  commune: z.string().trim().max(100).optional().nullable(),
  telephone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  activite_principale: z.string().trim().max(255).optional().nullable(),
  secteur_principal_id: z.string().uuid().optional().nullable(),
  date_creation: z.string().date().optional().nullable(),
});

export type ServiceAssietteAssujettiInput = z.infer<typeof ServiceAssietteAssujettiSchema>;
