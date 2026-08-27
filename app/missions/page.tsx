import React from 'react';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { MissionsClient, type MissionListItem } from './missions-client';

export const dynamic = 'force-dynamic';

export default async function MissionsPage() {
  const currentUser = await getCurrentUser();
  const supabase = createAdminClient();

  // 1. Récupérer les missions avec assujettis, bureaux et secteurs
  const { data: missions, error } = await supabase
    .from('missions')
    .select(`
      id, reference, type_controle, bureau_id, secteur_id, statut, motif,
      date_creation, date_soumission, date_approbation,
      bureaux(code, nom),
      secteurs(code, nom),
      mission_assujettis(
        assujettis(id, nom_raison_sociale, identifiant)
      )
    `)
    .order('date_creation', { ascending: false });

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
