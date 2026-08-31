import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getOrdonnancementAControlerById } from '@/lib/controles/controle-ordonnancement-service';
import { ControleFicheClient } from './controle-fiche-client';

export const dynamic = 'force-dynamic';

export default async function ControleFichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/controles/ordonnancements/${id}`);
  }

  let fiche;
  try {
    fiche = await getOrdonnancementAControlerById(currentUser, id);
  } catch {
    notFound();
  }

  return (
    <ControleFicheClient
      fiche={fiche!}
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
