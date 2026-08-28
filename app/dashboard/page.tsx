import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { getDashboardMetrics } from '@/lib/stats/stats-service';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/dashboard');
  }

  const supabase = createAdminClient();

  // 1. Récupération des filtres de référence selon le rôle
  const isGlobalRole = [
    'DIRECTEUR_GENERAL',
    'DIRECTEUR_CONTROLES',
    'CHEF_DIVISION',
    'ADMIN',
  ].includes(currentUser.role);

  let bureauxQuery = supabase.from('bureaux').select('id, code, nom').eq('actif', true).order('code');
  if (!isGlobalRole && currentUser.bureau_id) {
    bureauxQuery = bureauxQuery.eq('id', currentUser.bureau_id);
  }

  let secteursQuery = supabase.from('secteurs').select('id, code, nom, bureau_id').eq('actif', true).order('code');
  if (!isGlobalRole && currentUser.bureau_id) {
    secteursQuery = secteursQuery.eq('bureau_id', currentUser.bureau_id);
  }

  const [{ data: bureaux }, { data: secteurs }] = await Promise.all([
    bureauxQuery,
    secteursQuery,
  ]);

  // 2. Récupération initiale des métriques
  const initialMetrics = await getDashboardMetrics(currentUser, {});

  return (
    <DashboardClient
      initialMetrics={initialMetrics}
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
      availableBureaux={bureaux || []}
      availableSecteurs={secteurs || []}
    />
  );
}
