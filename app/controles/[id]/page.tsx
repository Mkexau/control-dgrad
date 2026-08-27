import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createClient } from '@/lib/supabase/server';
import { assertCanReadControle } from '@/lib/auth/controle-access';
import { ControleDetailClient } from './controle-detail-client';

export const dynamic = 'force-dynamic';

interface ControleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ControleDetailPage({ params }: ControleDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/connexion?redirect=/controles/${id}`);
  }

  // Client lié à la session : aucune lecture utilisateur ne contourne RLS.
  const supabase = await createClient();

  // 1. Récupérer le contrôle avec relations
  const { data: controle, error } = await supabase
    .from('controles')
    .select(`
      id,
      mission_id,
      equipe_id,
      assujetti_id,
      type_controle,
      controleur_responsable_id,
      date_debut,
      date_fin,
      statut,
      observations,
      created_at,
      updated_at,
      missions(
        id, reference, type_controle, statut, motif, date_approbation, bureau_id,
        bureaux(code, nom),
        secteurs(code, nom),
        ordres_mission(id, reference, storage_path),
        autorisations_controle_pieces(id, reference, storage_path)
      ),
      equipes(
        id, nom, statut, chef_equipe_id,
        agents!equipes_chef_equipe_id_fkey(
          id, matricule,
          profiles(nom, prenom, email)
        )
      ),
      assujettis(
        id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
        secteurs(nom)
      ),
      profiles!controles_controleur_responsable_id_fkey(
        id, nom, prenom, email
      ),
      resultats_controle(
        id, type_resultat, montant_du, montant_penalites, montant_total, devise, justification, created_at, updated_at,
        redressements(id, montant, devise, motif, statut, created_at),
        penalites(id, montant, devise, motif, created_at),
        avis_recouvrement(id, reference, date, montant, devise, storage_path, created_at)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !controle) {
    notFound();
  }

  // 2. Récupérer le profil agent de l'utilisateur actuel
  const { data: userAgent } = await supabase
    .from('agents')
    .select('id, matricule')
    .eq('profile_id', currentUser.id)
    .maybeSingle();

  const mission = Array.isArray(controle.missions) ? controle.missions[0] : controle.missions;
  const equipe = Array.isArray(controle.equipes) ? controle.equipes[0] : controle.equipes;
  if (!mission) notFound();

  try {
    assertCanReadControle(currentUser, {
      type_controle: controle.type_controle,
      controleur_responsable_id: controle.controleur_responsable_id,
      mission_bureau_id: mission.bureau_id,
      equipe_chef_id: equipe?.chef_equipe_id ?? null,
      user_agent_id: userAgent?.id ?? null,
    });
  } catch {
    // Ne jamais révéler l'existence d'un contrôle hors périmètre.
    notFound();
  }

  // 3. Charger les demandes de renseignements du contrôle
  const { data: demandesRenseignements } = await supabase
    .from('demandes_renseignements')
    .select(`
      id, statut, date_envoi, date_limite, date_reponse, contenu, created_at,
      auteur:profiles!demandes_renseignements_auteur_id_fkey(nom, prenom)
    `)
    .eq('controle_id', controle.id)
    .order('created_at', { ascending: false });

  // 4. L'historique regroupe les événements du contrôle et de ses demandes.
  const auditSelect = `
    id, action, created_at, old_data, new_data,
    profiles(nom, prenom, email, role)
  `;
  const [{ data: controleAuditLogs }, { data: demandesAuditLogs }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select(auditSelect)
      .eq('entity_type', 'controles')
      .eq('entity_id', controle.id),
    demandesRenseignements && demandesRenseignements.length > 0
      ? supabase
        .from('audit_logs')
        .select(auditSelect)
        .eq('entity_type', 'demandes_renseignements')
        .in('entity_id', demandesRenseignements.map((demande) => demande.id))
      : Promise.resolve({ data: [] }),
  ]);
  const auditLogs = [...(controleAuditLogs || []), ...(demandesAuditLogs || [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <ControleDetailClient
      controle={controle as unknown as never}
      currentUser={currentUser}
      userAgentId={userAgent?.id || null}
      auditLogs={(auditLogs as unknown as never[]) || []}
      demandesRenseignements={(demandesRenseignements as unknown as never[]) || []}
    />
  );
}
