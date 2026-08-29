/**
 * Termine une session Supabase navigateur puis invalide l'état rendu par Next.js.
 *
 * Cette fonction ne manipule aucun cookie ni secret : Supabase Auth supprime la
 * session du navigateur via le client public, avant toute navigation.
 */
export interface LogoutRouter {
  refresh(): void;
  replace(href: string): void;
}

export type SignOut = () => Promise<{
  error: { message?: string } | null;
}>;

export type LogoutResult =
  | { success: true }
  | { success: false; message: string };

export async function signOutAndRedirect(
  signOut: SignOut,
  router: LogoutRouter
): Promise<LogoutResult> {
  const { error } = await signOut();

  if (error) {
    return {
      success: false,
      message: "La déconnexion a échoué. Veuillez réessayer.",
    };
  }

  // Le rafraichissement invalide le cache de route courant apres suppression
  // des cookies de session, avant de remplacer l'historique par la connexion.
  router.refresh();
  router.replace("/connexion");

  return { success: true };
}
