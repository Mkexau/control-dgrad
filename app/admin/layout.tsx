import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { InstitutionalShell } from '@/components/layout/institutional-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/admin');
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a5db5]">Espace sécurisé</p>
            <h2 className="mt-2 text-xl font-bold">Accès Administrateur Restreint</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Votre profil actuel ({currentUser.role}) ne dispose pas des privilèges techniques requis pour accéder à l&apos;espace d&apos;administration des référentiels.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#0a5db5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#093b78]">
              Retourner à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <InstitutionalShell user={currentUser}>{children}</InstitutionalShell>;
}
