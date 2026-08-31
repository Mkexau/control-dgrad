import React from 'react';
import Image from 'next/image';
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
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
      <section className="relative hidden overflow-hidden bg-[#073b78] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div aria-hidden="true" className="absolute -left-20 -top-16 h-80 w-80 rounded-full border-[40px] border-blue-400/15" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm"><Image src="/images/branding/dgrad-logo.png" alt="DGRAD" width={48} height={48} className="h-full w-full object-contain" preload /></div>
          <div><p className="font-bold tracking-[0.16em]">DGRAD</p><p className="text-xs text-blue-200">Contrôle non fiscal</p></div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Portail institutionnel sécurisé</p>
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">Piloter le contrôle avec rigueur et traçabilité.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-blue-100">Accédez à votre espace de travail DGRAD et suivez les opérations de contrôle non fiscal dans votre périmètre habilité.</p>
        </div>
        <p className="relative text-xs text-blue-200">République Démocratique du Congo · Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0 lg:px-10 xl:px-16">
        <LoginForm redirectTarget={rawRedirect} />
      </section>
    </div>
  );
}
