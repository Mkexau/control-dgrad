import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { InstitutionalShell } from '@/components/layout/institutional-shell';

export const dynamic = 'force-dynamic';

export default async function AssietteLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/connexion?redirect=/assiette/assujettis');
  if (currentUser.role !== 'SERVICE_ASSIETTE') redirect('/dashboard');
  return <InstitutionalShell user={currentUser}>{children}</InstitutionalShell>;
}
