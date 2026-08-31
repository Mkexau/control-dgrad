'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE CLIENT DE CONNEXION SUPABASE AUTH
// =============================================================================

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoginSchema } from '@/lib/validations/auth';
import { getSafeRedirectUrl } from '@/lib/auth/safe-redirect';

interface LoginFormProps {
  redirectTarget?: string;
}

export function LoginForm({ redirectTarget }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation des champs côté client
    const validationResult = LoginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Veuillez vérifier vos identifiants.';
      setErrorMessage(firstError);
      return;
    }

    setIsLoading(true);

    try {
      // 2. Authentification via le client Supabase navigateur officiel (sans Service Role)
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      if (error) {
        // Message d'erreur utilisateur clair sans fuite d'informations sensibles
        if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('invalid_credentials')) {
          setErrorMessage('Adresse e-mail ou mot de passe incorrect.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Adresse e-mail non confirmée.');
        } else {
          setErrorMessage('Échec de la connexion. Veuillez vérifier vos identifiants ou contacter un administrateur.');
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // 3. Invalider le cache SSR pour que les cookies de session soient disponibles
        //    côté serveur AVANT la navigation, puis rediriger.
        //    router.refresh() doit précéder router.push() pour éviter que getCurrentUser()
        //    reçoive une requête sans cookie valide au premier rendu serveur.
        router.refresh();
        const safeDestination = getSafeRedirectUrl(redirectTarget, '/dashboard');
        router.push(safeDestination);
      } else {
        setErrorMessage('Session non initialisée. Veuillez réessayer.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Une erreur réseau est survenue lors de la connexion.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-6 sm:p-9">
      {/* En-tête de l'application */}
      <div className="text-center space-y-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 p-1.5">
          <Image src="/images/branding/dgrad-logo.png" alt="DGRAD" width={48} height={48} className="h-full w-full object-contain" preload />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a5db5]">Espace sécurisé</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          DGRAD Contrôle
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
          Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations
        </p>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 text-center mb-1">
          Authentification des Agents
        </h2>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
          Accès réservé au personnel habilité de la DGRAD
        </p>
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5"
        >
          <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
          >
            Adresse e-mail professionnelle *
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@dgrad.cd"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
          >
            Mot de passe *
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Connexion en cours...</span>
            </>
          ) : (
            <span>Se connecter</span>
          )}
        </button>
      </form>

      {/* Mention légale & Sécurité */}
      <div className="pt-2 text-center text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800">
        Système de gestion du contrôle non fiscal de la RDC. Toute tentative d&apos;accès non autorisée est passible de sanctions disciplinaires et pénales.
      </div>
    </div>
  );
}
