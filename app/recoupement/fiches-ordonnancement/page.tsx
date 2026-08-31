import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchFichesOrdonnancementAction } from '@/app/actions/recoupement-ordonnancement';
import { createAdminClient } from '@/lib/supabase/server';
import { FichesClient } from './fiches-client';

export const dynamic = 'force-dynamic';

export default async function FichesOrdonnancementPage({
  searchParams,
}: {
  searchParams: Promise<{ statut_transmission?: string; search?: string; bureau_id?: string; page?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/recoupement/fiches-ordonnancement');
  }

  const { statut_transmission, search, bureau_id, page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  const [initialDataRes, bureauxRes] = await Promise.all([
    fetchFichesOrdonnancementAction({
      statut_transmission: (statut_transmission as 'CONSERVEE_BUREAU' | 'TRANSMIS_DIVISION_CONTROLE') || undefined,
      bureau_id: bureau_id || undefined,
      search: search || undefined,
      page: currentPage,
      limit: 20,
    }),
    createAdminClient().from('bureaux').select('id, code, nom').eq('actif', true).order('nom'),
  ]);

  return (
    <FichesClient
      initialData={initialDataRes.data || { fiches: [], total: 0 }}
      availableBureaux={bureauxRes.data || []}
      initialStatutTransmission={statut_transmission || ''}
      initialSearch={search || ''}
      initialBureauId={bureau_id || ''}
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
