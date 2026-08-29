import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchAnalyseByIdAction } from '@/app/actions/analyses';
import { fetchAssujettisAction } from '@/app/actions/assujettis';
import { AnalyseDetailClient } from './analyse-detail-client';

export const dynamic = 'force-dynamic';

export default async function AnalyseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/analyses/${id}`);
  }

  const [analyseRes, assujettisRes] = await Promise.all([
    fetchAnalyseByIdAction(id),
    fetchAssujettisAction({ limit: 100 }), // pour sélection dans le modal
  ]);

  if (!analyseRes.success || !analyseRes.data) {
    notFound();
  }

  return (
    <AnalyseDetailClient
      analyse={analyseRes.data}
      availableAssujettis={assujettisRes.data?.assujettis || []}
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
