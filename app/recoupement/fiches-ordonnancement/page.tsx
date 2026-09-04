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
  searchParams: Promise<{ statut_transmission?: string; search?: string; bureau_id?: string; secteur_id?: string; page?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/recoupement/fiches-ordonnancement');
  }

  const { statut_transmission, search, bureau_id, secteur_id, page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;
  const statutParDefaut = 'CONSERVEE_BUREAU';
  const statutInitial = statut_transmission === 'TRANSMIS_DIVISION_CONTROLE'
    ? 'TRANSMIS_DIVISION_CONTROLE'
    : statut_transmission === 'CONSERVEE_BUREAU'
      ? 'CONSERVEE_BUREAU'
      : statutParDefaut;

  const [initialDataRes, nonTransmisesRes, transmisesRes, bureauxRes, secteursRes] = await Promise.all([
    fetchFichesOrdonnancementAction({
      statut_transmission: statutInitial,
      bureau_id: bureau_id || undefined,
      secteur_id: secteur_id || undefined,
      search: search || undefined,
      page: currentPage,
      limit: 20,
    }),
    fetchFichesOrdonnancementAction({ statut_transmission: 'CONSERVEE_BUREAU', page: 1, limit: 1 }),
    fetchFichesOrdonnancementAction({ statut_transmission: 'TRANSMIS_DIVISION_CONTROLE', page: 1, limit: 1 }),
    createAdminClient().from('bureaux').select('id, code, nom').eq('actif', true).order('nom'),
    createAdminClient().from('secteurs').select('id, code, nom, bureau_id').eq('actif', true).order('nom'),
  ]);

  return (
    <FichesClient
      initialData={initialDataRes.data || { fiches: [], total: 0 }}
      availableBureaux={bureauxRes.data || []}
      availableSecteurs={secteursRes.data || []}
      counts={{ nonTransmises: nonTransmisesRes.data?.total || 0, transmises: transmisesRes.data?.total || 0 }}
      initialStatutTransmission={statutInitial}
      initialSearch={search || ''}
      initialBureauId={bureau_id || ''}
      initialSecteurId={secteur_id || ''}
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
