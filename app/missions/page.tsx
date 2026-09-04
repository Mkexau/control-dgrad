import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { MissionsClient, type MissionListItem } from './missions-client';

export const dynamic = 'force-dynamic';

export default async function MissionsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/connexion?redirect=/missions');
  const supabase = createAdminClient();

  let accessibleMissionIds: string[] | null = null;

  if (['CHEF_BUREAU', 'ANALYSTE', 'CONSULTATION'].includes(currentUser.role)) {
    accessibleMissionIds = currentUser.bureau_id ? null : [];
  } else if (currentUser.role === 'CHEF_DIVISION') {
    accessibleMissionIds = currentUser.division_code === 'DIV_CTRL' ? null : [];
  } else if (currentUser.role === 'CHEF_EQUIPE' || currentUser.role === 'CONTROLEUR') {
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    if (!agent) {
      accessibleMissionIds = [];
    } else {
      const [{ data: equipes }, { data: controles }] = await Promise.all([
        currentUser.role === 'CHEF_EQUIPE'
          ? supabase.from('equipes').select('mission_id').eq('chef_equipe_id', agent.id)
          : supabase.from('equipe_agents').select('equipes(mission_id)').eq('agent_id', agent.id),
        currentUser.role === 'CONTROLEUR'
          ? supabase.from('controles').select('mission_id').eq('controleur_responsable_id', currentUser.id)
          : Promise.resolve({ data: [] as { mission_id: string }[] }),
      ]);
      accessibleMissionIds = Array.from(new Set([
        ...(equipes || []).map((equipe) => {
          const linkedEquipe = (equipe as unknown as { equipes?: { mission_id: string } | { mission_id: string }[] | null }).equipes;
          return Array.isArray(linkedEquipe) ? linkedEquipe[0]?.mission_id : linkedEquipe?.mission_id || (equipe as unknown as { mission_id?: string }).mission_id;
        }).filter((missionId): missionId is string => Boolean(missionId)),
        ...(controles || []).map((controle) => controle.mission_id),
      ]));
    }
  } else if (!['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'].includes(currentUser.role)) {
    accessibleMissionIds = [];
  }

  // 1. Récupérer les missions avec assujettis, bureaux et secteurs
  let missionsQuery = supabase
    .from('missions')
    .select(`
      id, reference, type_controle, bureau_id, secteur_id, statut, motif,
      date_creation, date_soumission, date_approbation,
      bureaux(code, nom),
      secteurs(code, nom),
      mission_assujettis(
        assujettis(id, nom_raison_sociale, identifiant)
      )
    `);

  if (['CHEF_BUREAU', 'ANALYSTE', 'CONSULTATION'].includes(currentUser.role) && currentUser.bureau_id) {
    missionsQuery = missionsQuery.eq('bureau_id', currentUser.bureau_id);
  }
  if (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_CTRL') {
    missionsQuery = missionsQuery.eq('type_controle', 'SUR_PLACE');
  }
  if (accessibleMissionIds) {
    if (accessibleMissionIds.length === 0) {
      return <MissionsClient initialMissions={[]} userRole={currentUser.role} userBureauId={currentUser.bureau_id} bureauxList={[]} />;
    }
    missionsQuery = missionsQuery.in('id', accessibleMissionIds);
  }

  const { data: missions, error } = await missionsQuery.order('date_creation', { ascending: false });

  if (error) {
    console.error('Erreur chargement missions:', error);
  }

  // 2. Récupérer la liste des bureaux actifs pour les filtres
  const { data: bureaux } = await supabase
    .from('bureaux')
    .select('id, code, nom')
    .eq('actif', true)
    .order('code', { ascending: true });

  return (
    <MissionsClient
      initialMissions={(missions as unknown as MissionListItem[]) || []}
      userRole={currentUser?.role || 'CONSULTATION'}
      userBureauId={currentUser?.bureau_id}
      bureauxList={bureaux || []}
    />
  );
}
