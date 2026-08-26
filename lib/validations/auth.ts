import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userProfileSchema = z.object({
  nom: z.string().min(2, 'Le nom doit comporter au moins 2 caractères.'),
  prenom: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères.'),
  email: z.string().email('Adresse email invalide.'),
  telephone: z.string().optional().nullable(),
  bureau_id: z.string().uuid('Identifiant de bureau invalide.').optional().nullable(),
  role: z.enum([
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
  ]),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
