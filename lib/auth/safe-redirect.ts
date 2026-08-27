// =============================================================================
// DGRAD CONTROLE - UTILITAIRE DE VALIDATION DE REDIRECTION INTERNE
// Protection contre les vulnérabilités de type "Open Redirect" (CWE-601)
// =============================================================================

/**
 * Valide et normalise une URL de redirection pour s'assurer qu'elle pointe
 * exclusivement vers un chemin interne de l'application.
 * 
 * Règles :
 * - Doit commencer par '/'
 * - Ne doit pas commencer par '//' ou '/\\' (schéma relatif / bypass navigateur)
 * - Ne doit pas contenir de protocole (http:, https:, javascript:, data:, etc.)
 * - Ne doit pas contenir de caractères de contrôle
 * 
 * @param target Le chemin de redirection cible demandé (ex: issu de ?redirect=...)
 * @param defaultFallback Le chemin de repli par défaut si target est invalide (défaut: '/missions')
 * @returns Le chemin interne validé et sécurisé
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  defaultFallback: string = '/missions'
): string {
  if (!target || typeof target !== 'string') {
    return defaultFallback;
  }

  const trimmed = target.trim();

  // 1. Doit commencer par un slash simple
  if (!trimmed.startsWith('/')) {
    return defaultFallback;
  }

  // 2. Ne doit pas commencer par double slash ou slash-backslash (ex: //evil.com, /\evil.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return defaultFallback;
  }

  // 3. Ne doit pas contenir de protocole ou caractère d'échappement suspect
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return defaultFallback;
  }

  // 4. Vérification d'URL relative valide
  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);

    // L'origine doit rester strictement localhost (pas de contournement de domaine)
    if (parsed.origin !== dummyOrigin) {
      return defaultFallback;
    }

    // Le protocole résultant doit être http (provenant du dummy origin)
    if (parsed.protocol !== 'http:') {
      return defaultFallback;
    }

    // Retourner le pathname + search + hash internes
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultFallback;
  }
}
