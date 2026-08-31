import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchInformationRecueByIdAction } from '@/app/actions/recoupement-ordonnancement';
import { fetchAssujettisAction } from '@/app/actions/assujettis';
import { createAdminClient } from '@/lib/supabase/server';
import { InformationDetailClient } from './information-detail-client';

export const dynamic = 'force-dynamic';

export default async function InformationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/recoupement/informations-recues/${id}`);
  }

  const supabase = createAdminClient();

  const [infoRes, assujettisRes, bureauxRes, secteursRes] = await Promise.all([
    fetchInformationRecueByIdAction(id),
    fetchAssujettisAction({ limit: 100 }),
    supabase.from('bureaux').select('id, code, nom, type').eq('actif', true).order('nom'),
    supabase.from('secteurs').select('id, code, nom, bureau_id').eq('actif', true).order('nom'),
  ]);

  if (!infoRes.success || !infoRes.data) {
    notFound();
  }

  return (
    <InformationDetailClient
      information={infoRes.data}
      availableAssujettis={assujettisRes.data?.assujettis || []}
      availableBureaux={bureauxRes.data || []}
      availableSecteurs={secteursRes.data || []}
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
