// =============================================================================
// DGRAD CONTROLE — PAGE DE CONNEXION
// Server Component — aucune donnée sensible exposée au navigateur
// =============================================================================

import type { Metadata } from 'next';
import LoginForm from './_components/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion — DGRAD Contrôle',
  description: 'Connectez-vous à l'application DGRAD Contrôle.',
};

export default function PageConnexion() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Entête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 shadow-lg shadow-blue-900/30">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.75 10.5C.75 16.955 5.672 22.5 12 22.5c6.327 0 11.25-5.545 11.25-12 0-1.647-.343-3.21-.96-4.626L20.25 3.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            DGRAD Contrôle
          </h1>
          <p className="mt-1 text-sm text-blue-300/70">
            Gestion du contrôle non fiscal
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-medium text-white mb-6">Connexion</h2>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Accès réservé aux agents autorisés de la DGRAD.
        </p>
      </div>
    </main>
  );
}
