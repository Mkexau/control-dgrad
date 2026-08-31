// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION : INFORMATIONS REÇUES & FICHES D'ORDONNANCEMENT
// =============================================================================

import { z } from 'zod';

export const StatutInformationRecueEnum = z.enum([
  'A_TRAITER',
  'EN_COURS',
  'TRAITE',
  'REJETE',
]);
export type StatutInformationRecue = z.infer<typeof StatutInformationRecueEnum>;

/** Donnée simulée reçue d'une source externe, avant toute analyse. */
export const InformationRecueCreateSchema = z.object({
  identifiant_assujetti_declare: z.string().trim().min(3).max(50),
  nom_assujetti_declare: z.string().trim().min(2).max(255),
  forme_juridique: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  adresse_declaree: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  secteur_code: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  secteur_id: z.string().uuid('Identifiant de secteur invalide.').optional().nullable(),
});
export type InformationRecueCreateInput = z.infer<typeof InformationRecueCreateSchema>;

export const StatutTransmissionFicheEnum = z.enum([
  'CONSERVEE_BUREAU',
  'TRANSMIS_DIVISION_CONTROLE',
]);
export type StatutTransmissionFiche = z.infer<typeof StatutTransmissionFicheEnum>;

/**
 * Schéma de filtrage des informations reçues
 */
export const InformationRecueFilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  statut: StatutInformationRecueEnum.optional(),
  secteur_id: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});
export type InformationRecueFilterInput = z.infer<typeof InformationRecueFilterSchema>;

/**
 * Schéma de prise en charge d'une information reçue
 */
export const InformationRecuePriseEnChargeSchema = z.object({
  id: z.string().uuid('Identifiant information invalide.'),
});
export type InformationRecuePriseEnChargeInput = z.infer<typeof InformationRecuePriseEnChargeSchema>;

/**
 * Schéma d'association d'un assujetti à une information reçue
 */
export const InformationRecueAssocierAssujettiSchema = z.object({
  information_id: z.string().uuid('Identifiant information invalide.'),
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
});
export type InformationRecueAssocierAssujettiInput = z.infer<typeof InformationRecueAssocierAssujettiSchema>;

/** Crée volontairement un assujetti officiel depuis une arrivée non associée. */
export const InformationRecueCreerAssujettiSchema = z.object({
  information_id: z.string().uuid('Identifiant information invalide.'),
  type: z.enum(['PERSONNE_PHYSIQUE', 'PERSONNE_MORALE']),
  secteur_principal_id: z.string().uuid('Identifiant de secteur invalide.'),
});
export type InformationRecueCreerAssujettiInput = z.infer<typeof InformationRecueCreerAssujettiSchema>;

/**
 * Schéma de création d'une Fiche d'enregistrement des données d'ordonnancement
 */
export const FicheOrdonnancementCreateSchema = z.object({
  information_recue_id: z.string().uuid('Identifiant information reçue invalide.').optional().nullable(),
  assujetti_id: z.string().uuid('Identifiant assujetti invalide.'),
  secteur_id: z.string().uuid('Identifiant secteur invalide.'),
  bureau_id: z.string().uuid('Identifiant bureau invalide.'),
  numero_serie: z
    .string()
    .trim()
    .min(2, 'Le numéro de série doit contenir au moins 2 caractères.')
    .max(100, 'Le numéro de série ne peut pas dépasser 100 caractères.'),
  delai_traitement_jours: z
    .number()
    .int('Le délai de traitement doit être un entier.')
    .min(1, 'Le délai de traitement doit être d’au moins 1 jour.'),
  numero_note_perception: z
    .string()
    .trim()
    .min(3, 'Le numéro de la note de perception doit contenir au moins 3 caractères.')
    .max(100, 'Le numéro de note ne peut pas dépasser 100 caractères.'),
  date_note_perception: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD).'),
  acte_generateur: z
    .string()
    .trim()
    .min(3, 'L’acte générateur doit contenir au moins 3 caractères.')
    .max(255, 'L’acte générateur ne peut pas dépasser 255 caractères.'),
  article_budgetaire: z
    .string()
    .trim()
    .max(100, 'L’article budgétaire ne peut pas dépasser 100 caractères.')
    .optional()
    .nullable()
    .or(z.literal('')),
  nombre_actes: z
    .number()
    .int('Le nombre d’actes doit être un entier.')
    .min(1, 'Le nombre d’actes doit être d’au moins 1.')
    .default(1),
  montant_cdf: z
    .number()
    .min(0, 'Le montant en CDF ne peut pas être négatif.')
    .default(0),
  montant_usd: z
    .number()
    .min(0, 'Le montant en USD ne peut pas être négatif.')
    .default(0),
}).refine(
  (data) => data.montant_cdf > 0 || data.montant_usd > 0,
  { message: 'Au moins un montant (CDF ou USD) doit être strictement positif.', path: ['montant_cdf'] }
);
export type FicheOrdonnancementCreateInput = z.infer<typeof FicheOrdonnancementCreateSchema>;

/**
 * Schéma de transmission d'une fiche d'ordonnancement à la Division Contrôle
 */
export const FicheOrdonnancementTransmissionSchema = z.object({
  fiche_id: z.string().uuid('Identifiant fiche invalide.'),
});
export type FicheOrdonnancementTransmissionInput = z.infer<typeof FicheOrdonnancementTransmissionSchema>;

/**
 * Schéma de filtrage des fiches d'ordonnancement
 */
export const FicheOrdonnancementFilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  statut_transmission: StatutTransmissionFicheEnum.optional(),
  bureau_id: z.string().uuid().optional(),
  secteur_id: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});
export type FicheOrdonnancementFilterInput = z.infer<typeof FicheOrdonnancementFilterSchema>;
