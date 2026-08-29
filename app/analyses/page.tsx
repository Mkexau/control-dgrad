import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAnalysesAction } from '@/app/actions/analyses';
import { AnalysesClient } from './analyses-client';

export const dynamic = 'force-dynamic';

export default async function AnalysesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/analyses');
  }

  const supabase = createAdminClient();

  const isGlobal = ['ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CONSULTATION'].includes(
    currentUser.role
  );

  let bureauxQuery = supabase.from('bureaux').select('id, code, nom').eq('actif', true).order('code');
  if (!isGlobal && currentUser.bureau_id) {
    bureauxQuery = bureauxQuery.eq('id', currentUser.bureau_id);
  }

  const [{ data: bureaux }, initialRes] = await Promise.all([
    bureauxQuery,
    fetchAnalysesAction({ page: 1, limit: 20 }),
  ]);

  return (
    <AnalysesClient
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
      availableBureaux={bureaux || []}
      initialData={initialRes.data || { analyses: [], total: 0 }}
    />
  );
}
