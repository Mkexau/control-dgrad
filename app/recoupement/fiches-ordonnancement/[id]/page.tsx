import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchFicheOrdonnancementByIdAction } from '@/app/actions/recoupement-ordonnancement';
import { FicheDetailClient } from './fiche-detail-client';

export const dynamic = 'force-dynamic';

export default async function FicheOrdonnancementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/recoupement/fiches-ordonnancement/${id}`);
  }

  const ficheRes = await fetchFicheOrdonnancementByIdAction(id);

  if (!ficheRes.success || !ficheRes.data) {
    notFound();
  }

  return (
    <FicheDetailClient
      fiche={ficheRes.data}
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
