import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { MissionDetailClient, type MissionDetailData } from './mission-detail-client';

export const dynamic = 'force-dynamic';

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser) {
    redirect(`/connexion?redirect=/missions/${id}`);
  }

  const supabase = createAdminClient();

  // 1. Récupérer la mission avec toutes ses relations
  const { data: mission, error } = await supabase
    .from('missions')
    .select(`
      id, reference, type_controle, bureau_id, secteur_id, statut, motif,
      date_creation, date_soumission, date_approbation,
      bureaux(code, nom),
      secteurs(code, nom),
      profiles!missions_created_by_fkey(nom, prenom, email),
      mission_assujettis(
        ordre, statut,
        assujettis(id, nom_raison_sociale, identifiant, adresse)
      ),
      equipes(
        id, nom, statut,
        chef_equipe:agents!equipes_chef_equipe_id_fkey(
          matricule,
          profiles(nom, prenom)
        ),
        equipe_agents(
          agents(
            matricule,
            profiles(nom, prenom)
          )
        ),
        equipe_assujettis(
          assujettis(nom_raison_sociale, identifiant)
        )
      ),
      mission_validations(
        id, type_validation, statut, motif, commentaire, date_validation,
        profiles(nom, prenom, role)
      ),
      ordres_mission(
        id, reference, storage_path, date_generation
      ),
      autorisations_controle_pieces(
        id, reference, storage_path, date_generation
      )
    `)
    .eq('id', id)
    .single();

  if (error || !mission) {
    notFound();
  }

  // 2. Récupérer les contrôleurs disponibles (pour SUR_PIECES)
  const { data: controleurs } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .in('role', ['CONTROLEUR', 'CHEF_EQUIPE', 'ANALYSTE'])
    .eq('actif', true)
    .order('nom', { ascending: true });

  return (
    <MissionDetailClient
      mission={mission as unknown as MissionDetailData}
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
      availableControleurs={controleurs || []}
    />
  );
}
