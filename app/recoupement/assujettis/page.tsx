import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { getAssujettis } from '@/lib/recoupement/recoupement-service';
import { RepertoireNationalClient } from './repertoire-national-client';

export const dynamic = 'force-dynamic';

export default async function RepertoireNationalPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/recoupement/assujettis');
  }

  const { filtre } = await searchParams;
  const supabase = createAdminClient();

  const [
    { assujettis, total },
    { data: secteurs },
    { data: bureauxControle },
    { data: fiches },
  ] = await Promise.all([
    getAssujettis(currentUser, { page: 1, limit: 20 }),
    supabase.from('secteurs').select('id, code, nom, bureau_id').order('nom'),
    supabase.from('bureaux').select('id, code, nom').eq('type', 'CONTROLE').eq('actif', true).order('nom'),
    supabase.from('fiches_ordonnancement').select('assujetti_id, statut_transmission'),
  ]);

  // Set of assujetti IDs with prepared / transmitted fiches
  const assujettisAvecFiche = new Set((fiches || []).map((f) => f.assujetti_id));
  const assujettisTransmis = new Set(
    (fiches || []).filter((f) => f.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE').map((f) => f.assujetti_id)
  );

  return (
    <RepertoireNationalClient
      initialAssujettis={assujettis}
      initialTotal={total}
      secteurs={secteurs || []}
      bureauxControle={bureauxControle || []}
      assujettisAvecFiche={Array.from(assujettisAvecFiche)}
      assujettisTransmis={Array.from(assujettisTransmis)}
      initialOrdonnancementFilter={filtre === 'SANS_FICHE' ? 'SANS_FICHE' : ''}
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
