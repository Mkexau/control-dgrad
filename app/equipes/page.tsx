import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { EquipesClient, type EquipeListItem } from './equipes-client';

export const dynamic = 'force-dynamic';

export default async function EquipesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/equipes');
  }

  const supabase = createAdminClient();

  // 1. Récupérer l'agent associé au profil si applicable
  const { data: userAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('profile_id', currentUser.id)
    .maybeSingle();

  // 2. Charger les équipes avec leurs relations
  const { data: equipes, error } = await supabase
    .from('equipes')
    .select(`
      id,
      mission_id,
      nom,
      statut,
      created_at,
      updated_at,
      missions(id, reference, statut, bureau_id, bureaux(code, nom)),
      agents!equipes_chef_equipe_id_fkey(
        id, matricule,
        profiles(nom, prenom, email)
      ),
      equipe_agents(
        agent_id,
        agents(
          id, matricule,
          profiles(nom, prenom)
        )
      ),
      equipe_assujettis(
        assujetti_id,
        assujettis(id, nom_raison_sociale, identifiant)
      ),
      controles(id, statut)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement equipes:', error);
  }

  return (
    <EquipesClient
      initialEquipes={(equipes as unknown as EquipeListItem[]) || []}
      userRole={currentUser.role}
      userBureauId={currentUser.bureau_id}
      userAgentId={userAgent?.id || null}
    />
  );
}
