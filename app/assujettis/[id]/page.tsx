import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAssujettiByIdAction } from '@/app/actions/assujettis';
import { getRecoupementSynthesisAction } from '@/app/actions/recoupement';
import { AssujettiDetailClient } from './assujetti-detail-client';

export const dynamic = 'force-dynamic';

export default async function AssujettiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/assujettis/${id}`);
  }

  const supabase = createAdminClient();

  const [assujettiRes, syntheseRes, fichesRes, bureauxRes, secteursRes] = await Promise.all([
    fetchAssujettiByIdAction(id),
    getRecoupementSynthesisAction(id),
    supabase
      .from('fiches_ordonnancement')
      .select(`
        id, numero_fiche, numero_serie, delai_traitement_jours,
        numero_note_perception, date_note_perception, acte_generateur,
        article_budgetaire, nombre_actes, montant_cdf, montant_usd,
        statut_transmission, date_transmission_division, created_at,
        secteurs ( id, code, nom ),
        bureaux ( id, code, nom )
      `)
      .eq('assujetti_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('bureaux').select('id, code, nom, type').eq('actif', true).order('nom'),
    supabase.from('secteurs').select('id, code, nom, bureau_id').eq('actif', true).order('nom'),
  ]);

  if (!assujettiRes.success || !assujettiRes.data) {
    notFound();
  }

  return (
    <AssujettiDetailClient
      assujetti={assujettiRes.data}
      fiches={(fichesRes.data || []) as unknown as React.ComponentProps<typeof AssujettiDetailClient>['fiches']}
      availableBureaux={bureauxRes.data || []}
      availableSecteurs={secteursRes.data || []}
      synthese={syntheseRes.data || null}
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
