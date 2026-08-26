// =============================================================================
// DGRAD CONTROLE - SCHÉMAS DE VALIDATION ZOD POUR L'AUTHENTIFICATION
// =============================================================================

import { z } from 'zod';

export const RoleEnum = z.enum([
  'ADMIN',
  'ANALYSTE',
  'CHEF_BUREAU',
  'CHEF_SECTION',
  'CHEF_DIVISION',
  'DIRECTEUR_CONTROLES',
  'DIRECTEUR_GENERAL',
  'CHEF_EQUIPE',
  'CONTROLEUR',
  'CONSULTATION',
]);

export type Role = z.infer<typeof RoleEnum>;

export const LoginSchema = z.object({
  email: z.string().trim().email({ message: 'Veuillez saisir une adresse email valide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserAccountSchema = z.object({
  email: z.string().trim().email({ message: 'Adresse email invalide.' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
  nom: z.string().trim().min(2, { message: 'Le nom est obligatoire.' }),
  prenom: z.string().trim().min(2, { message: 'Le prénom est obligatoire.' }),
  telephone: z.string().trim().optional(),
  bureau_id: z.string().uuid({ message: 'Identifiant de bureau invalide.' }).optional(),
  role: RoleEnum,
  matricule: z.string().trim().min(2, { message: 'Le matricule est obligatoire pour un agent.' }).optional(),
  specialite: z.string().trim().optional(),
  domaine_competence: z.string().trim().optional(),
});

export type CreateUserAccountInput = z.infer<typeof CreateUserAccountSchema>;

// Modèle consolidé de l'utilisateur courant, combinant auth.users et public.profiles
export const CurrentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: RoleEnum,
  bureau_id: z.string().uuid().nullable().optional(),
  division_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
