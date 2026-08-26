// =============================================================================
// DGRAD CONTROLE — ACTIONS SERVEUR D'AUTHENTIFICATION
// Server Actions uniquement — signées 'use server'
// Chaque action vérifie l'authentification et valide les données côté serveur
// =============================================================================
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LoginSchema } from '@/lib/validations/auth';

// -----------------------------------------------------------------------------
// CONNEXION
// -----------------------------------------------------------------------------

export type LoginActionState = {
  errors?: { email?: string[]; password?: string[]; general?: string[] };
  success?: boolean;
};

/**
 * Action serveur de connexion.
 * Valide les données Zod côté serveur avant tout appel Supabase.
 * Redirige vers /tableau-de-bord si la connexion réussit.
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  // 1. Validation Zod côté serveur (jamais faire confiance au front)
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as LoginActionState['errors'],
    };
  }

  const { email, password } = parsed.data;

  // 2. Tentative de connexion via Supabase Auth
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Ne pas exposer le détail de l'erreur Supabase pour éviter l'énumération
    return {
      errors: {
        general: ['Identifiants incorrects. Vérifiez votre email et mot de passe.'],
      },
    };
  }

  // 3. Redirection post-login (déclenche un fetch du profil dans le layout)
  redirect('/tableau-de-bord');
}

// -----------------------------------------------------------------------------
// DÉCONNEXION
// -----------------------------------------------------------------------------

/**
 * Action serveur de déconnexion.
 * Invalide la session Supabase Auth et redirige vers /connexion.
 * Aucune donnée de formData requise.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/connexion');
}
