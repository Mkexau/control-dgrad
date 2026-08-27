import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { EquipeDetailClient } from './equipe-detail-client';

export const dynamic = 'force-dynamic';

interface EquipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipeDetailPage({ params }: EquipeDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/equipes/${id}`);
  }

  const supabase = createAdminClient();

  // 1. Charger l'équipe et ses relations
  const { data: equipe, error } = await supabase
    .from('equipes')
    .select(`
      id,
      mission_id,
      nom,
      statut,
      created_at,
      updated_at,
      missions(
        id, reference, type_controle, statut, motif, date_approbation, bureau_id,
        bureaux(code, nom),
        secteurs(code, nom),
        ordres_mission(id, reference, storage_path)
      ),
      agents!equipes_chef_equipe_id_fkey(
        id, matricule, specialite, domaine_competence, actif,
        profiles(id, nom, prenom, email, telephone)
      ),
      equipe_agents(
        id,
        agent_id,
        agents(
          id, matricule, specialite, domaine_competence, actif,
          profiles(id, nom, prenom, email)
        )
      ),
      equipe_assujettis(
        id,
        assujetti_id,
        assujettis(
          id, type, identifiant, nom_raison_sociale, adresse, email, telephone
        )
      ),
      controles(
        id,
        mission_id,
        equipe_id,
        assujetti_id,
        type_controle,
        statut,
        date_debut,
        date_fin,
        observations,
        assujettis(id, nom_raison_sociale, identifiant, adresse)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !equipe) {
    notFound();
  }

  // 2. Charger le profil agent de l'utilisateur actuel
  const { data: userAgent } = await supabase
    .from('agents')
    .select('id, matricule')
    .eq('profile_id', currentUser.id)
    .maybeSingle();

  // 3. Charger l'historique d'audit de l'équipe
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select(`
      id, action, created_at, old_data, new_data,
      profiles(nom, prenom, email, role)
    `)
    .eq('entity_type', 'equipes')
    .eq('entity_id', equipe.id)
    .order('created_at', { ascending: false });

  // 4. Si l'équipe est encore en phase BROUILLON, charger les agents disponibles et les assujettis de la mission
  let availableAgents: { id: string; matricule: string; nom: string; prenom: string }[] = [];
  let availableAssujettis: { id: string; nom_raison_sociale: string; identifiant: string }[] = [];

  const missionObj = equipe.missions as unknown as { statut: string; bureau_id: string } | null;
  if (equipe.statut === 'PROPOSEE' && missionObj?.statut === 'BROUILLON') {
    // Agents actifs du bureau ou globaux
    const { data: agentsList } = await supabase
      .from('agents')
      .select('id, matricule, profiles(nom, prenom, bureau_id)')
      .eq('actif', true);

    availableAgents = (agentsList || []).map((ag) => {
      const p = ag.profiles as unknown as { nom: string; prenom: string } | null;
      return {
        id: ag.id,
        matricule: ag.matricule,
        nom: p?.nom || '',
        prenom: p?.prenom || '',
      };
    });

    // Assujettis rattachés à la mission
    const { data: missionAssujettis } = await supabase
      .from('mission_assujettis')
      .select('assujetti_id, assujettis(id, nom_raison_sociale, identifiant)')
      .eq('mission_id', equipe.mission_id);

    availableAssujettis = (missionAssujettis || []).map((ma) => {
      const a = ma.assujettis as unknown as { id: string; nom_raison_sociale: string; identifiant: string } | null;
      return {
        id: a?.id || '',
        nom_raison_sociale: a?.nom_raison_sociale || '',
        identifiant: a?.identifiant || '',
      };
    }).filter((a) => a.id);
  }

  return (
    <EquipeDetailClient
      equipe={equipe as unknown as never}
      currentUser={currentUser}
      userAgentId={userAgent?.id || null}
      auditLogs={(auditLogs as unknown as never[]) || []}
      availableAgents={availableAgents}
      availableAssujettis={availableAssujettis}
    />
  );
}
