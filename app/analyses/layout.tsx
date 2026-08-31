import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { InstitutionalShell } from '@/components/layout/institutional-shell';

export const dynamic = 'force-dynamic';

export default async function AnalysesLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/connexion?redirect=/analyses');
  return <InstitutionalShell user={currentUser}>{children}</InstitutionalShell>;
}
