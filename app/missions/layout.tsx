import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { RoleBadge } from '@/components/admin/status-badge';
import { LogoutButton } from '@/components/auth/logout-button';

export const dynamic = 'force-dynamic';

export default async function MissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/missions');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* En-tête de navigation du module Missions */}
      <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600 dark:text-blue-400">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                DG
              </span>
              <span>DGRAD Contrôle</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/missions"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-md"
              >
                Missions
              </Link>
              {currentUser.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
                >
                  Administration
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <LogoutButton />
            <div className="flex items-center gap-2.5">
              <RoleBadge role={currentUser.role} />
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  {currentUser.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
