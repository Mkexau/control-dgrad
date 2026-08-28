import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getSafeRedirectUrl } from '@/lib/auth/safe-redirect';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connexion | DGRAD Contrôle',
  description: 'Portail d\'authentification pour les agents de la Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations.',
};

interface ConnexionPageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  // 1. Vérifier si l'utilisateur est déjà connecté côté serveur
  const currentUser = await getCurrentUser();
  const params = await searchParams;
  const rawRedirect = params.redirect;

  if (currentUser) {
    // Si l'utilisateur est déjà authentifié, ne pas afficher le formulaire
    const safeDestination = getSafeRedirectUrl(rawRedirect, '/dashboard');
    redirect(safeDestination);
  }

  // 2. Rendre la page d'authentification
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 sm:px-6 lg:px-8">
      <LoginForm redirectTarget={rawRedirect} />
    </div>
  );
}
