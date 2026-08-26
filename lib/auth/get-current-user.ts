import { createClient } from "@/lib/supabase/server";
import { CurrentUser, CurrentUserSchema } from "@/lib/validations/auth";
import { cache } from "react";

/**
 * Récupère l'utilisateur actuellement authentifié ainsi que son profil métier.
 * Utilise React cache() pour dédupliquer les appels durant le cycle de vie d'une requête Server Component.
 * Utilise supabase.auth.getUser() pour vérifier l'authenticité du JWT côté serveur.
 * Les informations sensibles (mot de passe, etc.) ne sont jamais retournées.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  // 1. Récupération sécurisée de l'utilisateur authentifié (vérification serveur du JWT)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // 2. Récupération du profil associé dans public.profiles via auth_user_id
  // La RLS sur profiles garantit que l'utilisateur peut lire son propre profil
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      actif,
      bureau_id,
      bureaux (
        division_id
      )
    `)
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  if (!profile.actif) {
    // Si le compte est désactivé, on refuse l'accès
    return null;
  }

  const divisionId = (profile.bureaux as { division_id?: string } | null)?.division_id ?? null;

  // 3. Consolidation et validation Zod
  const rawUser = {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    bureau_id: profile.bureau_id,
    division_id: divisionId,
    is_active: profile.actif,
  };

  const parsedUser = CurrentUserSchema.safeParse(rawUser);

  if (!parsedUser.success) {
    console.error("Format des données utilisateur invalide:", parsedUser.error);
    return null;
  }

  return parsedUser.data;
});
