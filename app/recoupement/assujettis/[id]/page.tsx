import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getAssujettiById,
  getRecoupementSynthesis,
} from '@/lib/recoupement/recoupement-service';
import { getFichesOrdonnancement } from '@/lib/recoupement/ordonnancement-service';
import { AssujettiRecoupementClient } from './assujetti-recoupement-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssujettiRecoupementDetailPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/recoupement/assujettis/${id}`);
  }

  const supabase = createAdminClient();

  const [assujetti, fichesRes, synthese, { data: fullAssujetti }] = await Promise.all([
    getAssujettiById(currentUser, id),
    getFichesOrdonnancement(currentUser, { assujetti_id: id }),
    getRecoupementSynthesis(currentUser, id).catch(() => null),
    supabase
      .from('assujettis')
      .select('*, profiles:cree_par_id(nom, prenom, role, email)')
      .eq('id', id)
      .single(),
  ]);

  if (!assujetti) {
    notFound();
  }

  // Find competent bureau through sector
  const { data: secteurDetails } = await supabase
    .from('secteurs')
    .select('id, code, nom, bureaux(id, code, nom, type)')
    .eq('id', assujetti.secteur_principal_id || '')
    .maybeSingle();

  return (
    <AssujettiRecoupementClient
      assujetti={assujetti}
      extendedInfo={fullAssujetti}
      secteurDetails={secteurDetails}
      fiches={fichesRes.fiches}
      synthese={synthese}
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        bureau_code: currentUser.bureau_code ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
    />
  );
}
