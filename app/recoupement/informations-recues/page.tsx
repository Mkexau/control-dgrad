import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchInformationsRecuesAction } from '@/app/actions/recoupement-ordonnancement';
import { createAdminClient } from '@/lib/supabase/server';
import { InformationsRecuesClient } from './informations-recues-client';

export const dynamic = 'force-dynamic';

export default async function InformationsRecuesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; search?: string; page?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/recoupement/informations-recues');
  }

  const { statut, search, page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  const [initialDataRes, secteursRes] = await Promise.all([
    fetchInformationsRecuesAction({
      statut: (statut as 'A_TRAITER' | 'EN_COURS' | 'TRAITE' | 'REJETE') || undefined,
      search: search || undefined,
      page: currentPage,
      limit: 20,
    }),
    createAdminClient().from('secteurs').select('id, code, nom').eq('actif', true).order('nom'),
  ]);

  return (
    <InformationsRecuesClient
      initialData={initialDataRes.data || { informations: [], total: 0 }}
      availableSecteurs={secteursRes.data || []}
      initialStatut={statut || ''}
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
