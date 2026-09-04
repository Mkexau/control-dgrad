import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { getDashboardMetrics } from '@/lib/stats/stats-service';
import { InstitutionalShell } from '@/components/layout/institutional-shell';
import { DashboardClient } from './dashboard-client';
import { ServiceAssietteDashboardClient } from './service-assiette-dashboard';
import { getServiceAssietteDashboard } from '@/lib/assiette/assiette-service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/dashboard');
  }

  if (currentUser.role === 'SERVICE_ASSIETTE') {
    const dashboard = await getServiceAssietteDashboard(currentUser);
    return (
      <InstitutionalShell user={currentUser}>
        <ServiceAssietteDashboardClient prenom={currentUser.prenom} dashboard={dashboard} />
      </InstitutionalShell>
    );
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

  const isRecoupement =
    currentUser.bureau_code === 'BUR_ANA_REC' ||
    (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_REC');

  // 2. Missions en attente de décision pour les rôles de validation hiérarchique
  const isHierarchicalReviewer =
    (currentUser.role === 'CHEF_DIVISION' && !isRecoupement) ||
    currentUser.role === 'DIRECTEUR_CONTROLES';

  let missionsEnAttenteQuery = null;
  if (isHierarchicalReviewer) {
    const statusFilter =
      currentUser.role === 'CHEF_DIVISION'
        ? ['SOUMISE', 'EXAMEN_CHEF_DIVISION']
        : ['EXAMEN_DIRECTEUR_CONTROLES'];

    missionsEnAttenteQuery = supabase
      .from('missions')
      .select(`
        id,
        reference,
        statut,
        type_controle,
        motif,
        date_creation,
        bureaux:bureau_id(id, code, nom),
        secteurs:secteur_id(id, code, nom),
        mission_assujettis(
          assujettis(id, nom_raison_sociale)
        )
      `)
      .eq('type_controle', 'SUR_PLACE')
      .in('statut', statusFilter)
      .order('date_creation', { ascending: true })
      .limit(20);
  }

  const [{ data: bureaux }, { data: secteurs }] = await Promise.all([
    bureauxQuery,
    secteursQuery,
  ]);

  // 3. Récupération initiale des métriques + missions en attente
  const [initialMetrics, recoupementMetrics, missionsEnAttenteResult] = await Promise.all([
    getDashboardMetrics(currentUser, {}),
    isRecoupement ? import('@/lib/recoupement/ordonnancement-service').then(m => m.getRecoupementDashboardMetrics(currentUser)) : Promise.resolve(null),
    missionsEnAttenteQuery ? missionsEnAttenteQuery : Promise.resolve({ data: null }),
  ]);

  return (
    <InstitutionalShell user={currentUser}>
      <DashboardClient
        initialMetrics={initialMetrics}
        recoupementMetrics={recoupementMetrics}
        missionsEnAttente={missionsEnAttenteResult.data || []}
        currentUser={{
          id: currentUser.id,
          role: currentUser.role,
          bureau_id: currentUser.bureau_id,
          bureau_code: currentUser.bureau_code,
          division_code: currentUser.division_code,
          nom: currentUser.nom || '',
          prenom: currentUser.prenom || '',
        }}
        availableBureaux={bureaux || []}
        availableSecteurs={secteurs || []}
      />
    </InstitutionalShell>
  );
}
