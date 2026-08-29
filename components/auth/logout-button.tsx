'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAndRedirect } from '@/lib/auth/logout-client';
import { createClient } from '@/lib/supabase/client';

/** Bouton de déconnexion commun aux espaces authentifiés. */
export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const result = await signOutAndRedirect(
        () => supabase.auth.signOut(),
        router
      );

      if (!result.success) {
        setErrorMessage(result.message);
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('La déconnexion a échoué. Vérifiez votre connexion puis réessayez.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        {isLoading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-zinc-500 dark:border-t-zinc-100" />
            Déconnexion...
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3-3h9m0 0l-3-3m3 3l-3 3" />
            </svg>
            Déconnexion
          </>
        )}
      </button>
      {errorMessage && (
        <p role="alert" className="max-w-56 text-right text-[11px] text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
