import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { assertCanReadMissionDossier, type MissionRapportScope } from '@/lib/auth/controle-access';
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

  // 1. Récupérer la mission avec toutes ses relations approfondies
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
        id, nom, statut, chef_equipe_id,
        chef_equipe:agents!equipes_chef_equipe_id_fkey(
          id, matricule,
          profiles(nom, prenom)
        ),
        equipe_agents(
          agents(
            id, matricule,
            profiles(nom, prenom)
          )
        ),
        equipe_assujettis(
          assujettis(id, nom_raison_sociale, identifiant)
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
      ),
      rapports_mission(
        id, date, contenu, statut, storage_path, auteur_id, created_at, updated_at,
        profiles(nom, prenom, role)
      ),
      controles(
        id, assujetti_id, statut, type_controle, controleur_responsable_id, equipe_id, date_debut, date_fin, observations,
        assujettis(id, nom_raison_sociale, identifiant),
        profiles!controles_controleur_responsable_id_fkey(id, nom, prenom),
        resultats_controle(
          id, type_resultat, montant_du, montant_penalites, montant_total, devise, justification, created_at,
          redressements(id, montant, devise, motif, statut),
          penalites(id, montant, devise, motif),
          avis_recouvrement(id, reference, date, montant, devise, storage_path)
        ),
        demandes_renseignements(
          id, statut, date_envoi, date_limite, date_reponse, contenu, reponse_contenu,
          auteur:profiles!demandes_renseignements_auteur_id_fkey(nom, prenom)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !mission) {
    notFound();
  }

  // 2. Récupérer le profil agent de l'utilisateur actuel
  const { data: userAgent } = await supabase
    .from('agents')
    .select('id, matricule')
    .eq('profile_id', currentUser.id)
    .maybeSingle();

  // 3. Vérification des droits d'accès à la mission (anti-IDOR)
  const equipesChefsIds = ((mission.equipes as unknown as { chef_equipe_id: string }[]) || []).map(
    (e) => e.chef_equipe_id
  );
  const controleursIds = ((mission.controles as unknown as { controleur_responsable_id: string }[]) || [])
    .map((c) => c.controleur_responsable_id)
    .filter(Boolean);

  const missionScope: MissionRapportScope = {
    id: mission.id,
    type_controle: mission.type_controle,
    statut: mission.statut,
    bureau_id: mission.bureau_id,
    equipes_chefs_ids: equipesChefsIds,
    controleurs_ids: controleursIds,
  };

  try {
    assertCanReadMissionDossier(currentUser, missionScope, userAgent?.id || null);
  } catch {
    notFound();
  }

  // 4. Récupérer les documents et logs d'audit associés à la mission
  const [{ data: documents }, { data: missionAuditLogs }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, document_type, nom, mime_type, taille, storage_path, version, created_at')
      .eq('entity_type', 'missions')
      .eq('entity_id', mission.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('id, action, created_at, old_data, new_data, profiles(nom, prenom, role)')
      .eq('entity_type', 'missions')
      .eq('entity_id', mission.id)
      .order('created_at', { ascending: false }),
  ]);

  // 5. Récupérer les contrôleurs disponibles (pour SUR_PIECES)
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
      userAgentId={userAgent?.id || null}
      documents={(documents as unknown as never[]) || []}
      auditLogs={(missionAuditLogs as unknown as never[]) || []}
      availableControleurs={controleurs || []}
    />
  );
}
