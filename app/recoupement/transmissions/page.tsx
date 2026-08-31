import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchFichesOrdonnancementAction } from '@/app/actions/recoupement-ordonnancement';
import { TransmissionsClient } from './transmissions-client';

export const dynamic = 'force-dynamic';

export default async function TransmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/recoupement/transmissions');
  }

  const { search, page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  const initialDataRes = await fetchFichesOrdonnancementAction({
    statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
    search: search || undefined,
    page: currentPage,
    limit: 20,
  });

  return (
    <TransmissionsClient
      initialData={initialDataRes.data || { fiches: [], total: 0 }}
      initialSearch={search || ''}
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        bureau_code: currentUser.bureau_code ?? null,
        division_code: currentUser.division_code ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
    />
  );
}
