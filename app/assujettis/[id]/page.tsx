import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchAssujettiByIdAction } from '@/app/actions/assujettis';
import { fetchNotesPerceptionAction, fetchOrdonnancementsAction, getRecoupementSynthesisAction } from '@/app/actions/recoupement';
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

  const [assujettiRes, notesRes, ordRes, syntheseRes] = await Promise.all([
    fetchAssujettiByIdAction(id),
    fetchNotesPerceptionAction(id),
    fetchOrdonnancementsAction(id),
    getRecoupementSynthesisAction(id),
  ]);

  if (!assujettiRes.success || !assujettiRes.data) {
    notFound();
  }

  return (
    <AssujettiDetailClient
      assujetti={assujettiRes.data}
      notes={notesRes.data || []}
      ordonnancements={ordRes.data || []}
      synthese={syntheseRes.data || null}
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
    />
  );
}
