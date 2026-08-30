// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD POUR LE MODULE ADMINISTRATION
// =============================================================================

import { z } from 'zod';

export const RoleEnum = z.enum([
  'ADMIN',
  'ANALYSTE',
  'CHEF_BUREAU',
  'CHEF_DIVISION',
  'DIRECTEUR_CONTROLES',
  'DIRECTEUR_GENERAL',
  'CHEF_EQUIPE',
  'CONTROLEUR',
  'CONSULTATION',
]);

export type Role = z.infer<typeof RoleEnum>;

// =============================================================================
// 1. Schémas Référentiels : Directions
// =============================================================================

export const DirectionCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code de la direction doit contenir au moins 2 caractères.' })
    .max(20, { message: 'Le code de la direction ne peut excéder 20 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules sans espaces (ex: DCR).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom de la direction doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean().default(true),
});

export const DirectionUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID de direction invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code de la direction doit contenir au moins 2 caractères.' })
    .max(20, { message: 'Le code de la direction ne peut excéder 20 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules sans espaces (ex: DCR).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom de la direction doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean(),
});

export type DirectionCreateInput = z.infer<typeof DirectionCreateSchema>;
export type DirectionUpdateInput = z.infer<typeof DirectionUpdateSchema>;

// =============================================================================
// 2. Schémas Référentiels : Divisions
// =============================================================================

export const DivisionCreateSchema = z.object({
  direction_id: z.string().uuid({ message: 'Identifiant de direction invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code de la division doit contenir au moins 2 caractères.' })
    .max(20, { message: 'Le code de la division ne peut excéder 20 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: DIV_CTRL).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom de la division doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean().default(true),
});

export const DivisionUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID de division invalide.' }),
  direction_id: z.string().uuid({ message: 'Identifiant de direction invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code de la division doit contenir au moins 2 caractères.' })
    .max(20, { message: 'Le code de la division ne peut excéder 20 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: DIV_CTRL).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom de la division doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean(),
});

export type DivisionCreateInput = z.infer<typeof DivisionCreateSchema>;
export type DivisionUpdateInput = z.infer<typeof DivisionUpdateSchema>;

// =============================================================================
// 3. Schémas Référentiels : Bureaux
// =============================================================================

export const BureauTypeEnum = z.enum(['CONTROLE', 'RECOUPEMENT', 'ADMINISTRATIF', 'AUTRE']);

export const BureauCreateSchema = z.object({
  division_id: z.string().uuid({ message: 'Identifiant de division invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code du bureau doit contenir au moins 2 caractères.' })
    .max(30, { message: 'Le code du bureau ne peut excéder 30 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: BUR_CTRL_SOL).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom du bureau doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  type: BureauTypeEnum,
  actif: z.boolean().default(true),
});

export const BureauUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID de bureau invalide.' }),
  division_id: z.string().uuid({ message: 'Identifiant de division invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code du bureau doit contenir au moins 2 caractères.' })
    .max(30, { message: 'Le code du bureau ne peut excéder 30 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: BUR_CTRL_SOL).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom du bureau doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  type: BureauTypeEnum,
  actif: z.boolean(),
});

export type BureauCreateInput = z.infer<typeof BureauCreateSchema>;
export type BureauUpdateInput = z.infer<typeof BureauUpdateSchema>;

// =============================================================================
// 4. Schémas Référentiels : Secteurs
// =============================================================================

export const SecteurCreateSchema = z.object({
  bureau_id: z.string().uuid({ message: 'Identifiant de bureau invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code du secteur doit contenir au moins 2 caractères.' })
    .max(50, { message: 'Le code du secteur ne peut excéder 50 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: SOL_FONCIER).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom du secteur doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean().default(true),
});

export const SecteurUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID de secteur invalide.' }),
  bureau_id: z.string().uuid({ message: 'Identifiant de bureau invalide.' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Le code du secteur doit contenir au moins 2 caractères.' })
    .max(50, { message: 'Le code du secteur ne peut excéder 50 caractères.' })
    .regex(/^[A-Z0-9_-]+$/, { message: 'Le code doit être en majuscules (ex: SOL_FONCIER).' }),
  nom: z
    .string()
    .trim()
    .min(3, { message: 'Le nom du secteur doit contenir au moins 3 caractères.' })
    .max(255, { message: 'Le nom ne peut excéder 255 caractères.' }),
  actif: z.boolean(),
});

export type SecteurCreateInput = z.infer<typeof SecteurCreateSchema>;
export type SecteurUpdateInput = z.infer<typeof SecteurUpdateSchema>;

// =============================================================================
// 5. Schémas Utilisateurs et Profils
// =============================================================================

export const UserCreateSchema = z.object({
  email: z.string().trim().email({ message: 'Veuillez saisir une adresse email professionnelle valide.' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
  nom: z.string().trim().min(2, { message: 'Le nom de famille est obligatoire (min 2 caractères).' }),
  prenom: z.string().trim().min(2, { message: 'Le prénom est obligatoire (min 2 caractères).' }),
  telephone: z.string().trim().optional().or(z.literal('')),
  bureau_id: z.string().uuid({ message: 'Identifiant de bureau invalide.' }).optional().nullable(),
  role: RoleEnum,
  actif: z.boolean().default(true),
});

export const UserUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID de profil invalide.' }),
  nom: z.string().trim().min(2, { message: 'Le nom de famille est obligatoire.' }),
  prenom: z.string().trim().min(2, { message: 'Le prénom est obligatoire.' }),
  telephone: z.string().trim().optional().nullable(),
  bureau_id: z.string().uuid({ message: 'Identifiant de bureau invalide.' }).optional().nullable(),
  role: RoleEnum,
  actif: z.boolean(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

// =============================================================================
// 6. Schémas Agents
// =============================================================================

export const AgentCreateSchema = z.object({
  profile_id: z.string().uuid({ message: 'Identifiant du profil utilisateur invalide.' }),
  matricule: z
    .string()
    .trim()
    .min(3, { message: 'Le matricule officiel doit contenir au moins 3 caractères.' })
    .max(50, { message: 'Le matricule ne peut excéder 50 caractères.' }),
  specialite: z.string().trim().optional().nullable(),
  domaine_competence: z.string().trim().optional().nullable(),
  actif: z.boolean().default(true),
});

export const AgentUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant UUID d\'agent invalide.' }),
  profile_id: z.string().uuid({ message: 'Identifiant de profil invalide.' }),
  matricule: z
    .string()
    .trim()
    .min(3, { message: 'Le matricule officiel doit contenir au moins 3 caractères.' })
    .max(50, { message: 'Le matricule ne peut excéder 50 caractères.' }),
  specialite: z.string().trim().optional().nullable(),
  domaine_competence: z.string().trim().optional().nullable(),
  actif: z.boolean(),
});

export type AgentCreateInput = z.infer<typeof AgentCreateSchema>;
export type AgentUpdateInput = z.infer<typeof AgentUpdateSchema>;

// =============================================================================
// 7. Schéma générique de bascule de statut (Activation / Désactivation)
// =============================================================================

export const ToggleStatusSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant invalide.' }),
  actif: z.boolean(),
});

export type ToggleStatusInput = z.infer<typeof ToggleStatusSchema>;

// =============================================================================
// 8. Type générique de retour des Server Actions
// =============================================================================

export type ActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
