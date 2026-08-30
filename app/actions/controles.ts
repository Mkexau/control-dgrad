'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : CONTRÔLES OPÉRATIONNELS DE TERRAIN
// =============================================================================

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  ControleStartSchema,
  ControleSaveConstatationsSchema,
  ControleFinishSchema,
  type ControleStartInput,
  type ControleSaveConstatationsInput,
  type ControleFinishInput,
  type ControleStatus,
} from '@/lib/validations/controles';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * 1. Démarrage officiel d'un contrôle de terrain (SUR_PLACE)
 */
export async function demarrerControle(
  input: ControleStartInput
): Promise<ActionResponse<{ id: string; statut: ControleStatus; date_debut: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = ControleStartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Paramètres invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Interdiction pour ADMIN
  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas démarrer de contrôle opérationnel.' };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Récupérer le contrôle avec la mission et l'équipe
    const { data: controle, error: ctrlError } = await adminSupabase
      .from('controles')
      .select(`
        id,
        mission_id,
        equipe_id,
        assujetti_id,
        type_controle,
        statut,
        controleur_responsable_id,
        missions(id, reference, type_controle, statut, bureau_id),
        equipes(id, nom, statut, chef_equipe_id)
      `)
      .eq('id', parsed.data.controle_id)
      .single();

    if (ctrlError || !controle) {
      return { success: false, error: 'Contrôle opérationnel introuvable.' };
    }

    if (controle.statut !== 'EN_ATTENTE') {
      return {
        success: false,
        error: `Ce contrôle ne peut pas être démarré car son statut actuel est '${controle.statut}'.`,
      };
    }

    const mission = controle.missions as unknown as { id: string; reference: string; type_controle: string; statut: string; bureau_id: string } | null;
    const equipe = controle.equipes as unknown as { id: string; nom: string; statut: string; chef_equipe_id: string } | null;

    if (!mission) {
      return { success: false, error: 'Dossier de mission introuvable.' };
    }

    // Vérifier les conditions pour SUR_PLACE
    if (controle.type_controle === 'SUR_PLACE') {
      if (!equipe) {
        return { success: false, error: 'Aucune équipe de terrain n\'est associée à ce contrôle.' };
      }

      if (equipe.statut !== 'CONFIRMEE') {
        return {
          success: false,
          error: 'Le contrôle ne peut démarrer que si l\'équipe est formellement CONFIRMÉE après approbation DG.',
        };
      }

      // Vérifier que l'ordre de mission existe bien
      const { data: ordreMission } = await adminSupabase
        .from('ordres_mission')
        .select('id, reference')
        .eq('mission_id', mission.id)
        .maybeSingle();

      if (!ordreMission) {
        return {
          success: false,
          error: 'L\'ordre de mission officiel doit être généré avant le démarrage des opérations de terrain.',
        };
      }

      // Vérifier l'habilitation de l'utilisateur
      const { data: userAgent } = await adminSupabase
        .from('agents')
        .select('id, actif')
        .eq('profile_id', currentUser.id)
        .maybeSingle();

      const isChefEquipe = userAgent && userAgent.id === equipe.chef_equipe_id;

      // Vérifier si l'utilisateur est agent membre de l'équipe
      let isMember = false;
      if (userAgent) {
        const { data: memberRecord } = await adminSupabase
          .from('equipe_agents')
          .select('id')
          .eq('equipe_id', equipe.id)
          .eq('agent_id', userAgent.id)
          .maybeSingle();
        if (memberRecord) isMember = true;
      }

      const isAuthorizedHierarchy =
        currentUser.role === 'CHEF_BUREAU' && currentUser.bureau_id === mission.bureau_id;

      if (!isChefEquipe && !isMember && !isAuthorizedHierarchy && currentUser.role !== 'CHEF_DIVISION') {
        return {
          success: false,
          error: 'Vous n\'êtes pas habilité à démarrer ce contrôle (réservé au Chef d\'équipe ou aux contrôleurs affectés).',
        };
      }
    } else if (controle.type_controle === 'SUR_PIECES') {
      if (
        controle.controleur_responsable_id !== currentUser.id &&
        currentUser.role !== 'CHEF_BUREAU'
      ) {
        return {
          success: false,
          error: 'Vous n\'êtes pas le contrôleur désigné pour ce contrôle sur pièces.',
        };
      }
    }

    const todayDate = parsed.data.date_debut || new Date().toISOString().split('T')[0];

    // 2. Mettre à jour le statut du contrôle
    const { error: updateCtrlError } = await adminSupabase
      .from('controles')
      .update({
        statut: 'EN_COURS',
        date_debut: todayDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', controle.id);

    if (updateCtrlError) {
      return { success: false, error: 'Échec de la mise à jour du statut du contrôle.' };
    }

    // 3. Mettre à jour la mission si elle était en EQUIPES_AFFECTEES ou CONTROLEUR_DESIGNE
    if (mission.statut === 'EQUIPES_AFFECTEES' || mission.statut === 'CONTROLEUR_DESIGNE') {
      await adminSupabase
        .from('missions')
        .update({ statut: 'CONTROLE_EN_COURS', updated_at: new Date().toISOString() })
        .eq('id', mission.id);
    }

    // 4. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'DEMARRAGE_CONTROLE',
      entityType: 'controles',
      entityId: controle.id,
      oldData: { statut: 'EN_ATTENTE' },
      newData: {
        statut: 'EN_COURS',
        date_debut: todayDate,
        mission_id: mission.id,
        type_controle: controle.type_controle,
      },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${controle.equipe_id}`);
    revalidatePath(`/controles/${controle.id}`);
    revalidatePath(`/missions/${mission.id}`);

    return {
      success: true,
      data: { id: controle.id, statut: 'EN_COURS', date_debut: todayDate },
    };
  } catch (err) {
    console.error('Erreur inattendue demarrerControle:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 2. Enregistrement des constatations et observations de terrain
 */
export async function enregistrerConstatations(
  input: ControleSaveConstatationsInput
): Promise<ActionResponse<{ id: string; observations: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = ControleSaveConstatationsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données de constatations invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas saisir de constatations terrain.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: controle, error } = await adminSupabase
      .from('controles')
      .select(`
        id,
        mission_id,
        equipe_id,
        assujetti_id,
        statut,
        observations,
        type_controle,
        controleur_responsable_id,
        equipes(chef_equipe_id)
      `)
      .eq('id', parsed.data.controle_id)
      .single();

    if (error || !controle) {
      return { success: false, error: 'Contrôle opérationnel introuvable.' };
    }

    if (controle.statut === 'TERMINE' || controle.statut === 'ANNULE') {
      return { success: false, error: `Impossible de modifier les constatations d'un contrôle au statut '${controle.statut}'.` };
    }

    // Vérifier l'habilitation
    const { data: userAgent } = await adminSupabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    const chefId = (controle.equipes as unknown as { chef_equipe_id: string })?.chef_equipe_id;
    const isChef = userAgent && userAgent.id === chefId;
    const isControleurPieces = controle.controleur_responsable_id === currentUser.id;

    if (
      !isChef &&
      !isControleurPieces &&
      currentUser.role !== 'CHEF_BUREAU'
    ) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à saisir les constatations pour ce contrôle.' };
    }

    const { error: updateError } = await adminSupabase
      .from('controles')
      .update({
        observations: parsed.data.observations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', controle.id);

    if (updateError) {
      return { success: false, error: 'Échec de l\'enregistrement des constatations.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'SAISIE_CONSTATATIONS',
      entityType: 'controles',
      entityId: controle.id,
      oldData: { observations: controle.observations },
      newData: { observations: parsed.data.observations },
    });

    revalidatePath(`/controles/${controle.id}`);
    revalidatePath(`/equipes/${controle.equipe_id}`);
    revalidatePath(`/missions/${controle.mission_id}`);
    return { success: true, data: { id: controle.id, observations: parsed.data.observations } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 3. Clôture des opérations de terrain pour un contrôle
 */
export async function terminerControle(
  input: ControleFinishInput
): Promise<ActionResponse<{ id: string; statut: ControleStatus; date_fin: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = ControleFinishSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Paramètres invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas terminer de contrôle opérationnel.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: controle, error } = await adminSupabase
      .from('controles')
      .select(`
        id,
        mission_id,
        equipe_id,
        assujetti_id,
        statut,
        date_debut,
        observations,
        type_controle,
        controleur_responsable_id,
        missions(id, reference, statut),
        equipes(chef_equipe_id)
      `)
      .eq('id', parsed.data.controle_id)
      .single();

    if (error || !controle) {
      return { success: false, error: 'Contrôle opérationnel introuvable.' };
    }

    if (controle.statut !== 'EN_COURS') {
      return {
        success: false,
        error: `Seul un contrôle 'EN_COURS' peut être terminé (statut actuel : '${controle.statut}').`,
      };
    }

    // Vérifier l'habilitation
    const { data: userAgent } = await adminSupabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    const chefId = (controle.equipes as unknown as { chef_equipe_id: string })?.chef_equipe_id;
    const isChef = userAgent && userAgent.id === chefId;
    const isControleurPieces = controle.controleur_responsable_id === currentUser.id;

    if (
      !isChef &&
      !isControleurPieces &&
      currentUser.role !== 'CHEF_BUREAU'
    ) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à clôturer ce contrôle.' };
    }

    const todayDate = parsed.data.date_fin || new Date().toISOString().split('T')[0];

    const updatePayload: {
      statut: ControleStatus;
      date_fin: string;
      observations?: string;
      updated_at: string;
    } = {
      statut: 'TERMINE',
      date_fin: todayDate,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.observations !== undefined) {
      updatePayload.observations = parsed.data.observations;
    }

    const { error: updateError } = await adminSupabase
      .from('controles')
      .update(updatePayload)
      .eq('id', controle.id);

    if (updateError) {
      return { success: false, error: 'Échec de la clôture du contrôle.' };
    }

    // Vérifier si tous les contrôles de la mission sont maintenant terminés
    const { data: allMissionControles } = await adminSupabase
      .from('controles')
      .select('id, statut')
      .eq('mission_id', controle.mission_id);

    const areAllFinished = (allMissionControles || []).length > 0 &&
      (allMissionControles || []).every((c) => c.id === controle.id || c.statut === 'TERMINE' || c.statut === 'ANNULE');

    const missionObj = controle.missions as unknown as { id: string; statut: string } | null;
    if (areAllFinished && missionObj && missionObj.statut === 'CONTROLE_EN_COURS') {
      await adminSupabase
        .from('missions')
        .update({ statut: 'CONTROLE_TERMINE', updated_at: new Date().toISOString() })
        .eq('id', controle.mission_id);
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'CLOTURE_CONTROLE',
      entityType: 'controles',
      entityId: controle.id,
      oldData: { statut: 'EN_COURS' },
      newData: {
        statut: 'TERMINE',
        date_fin: todayDate,
        are_all_mission_controles_finished: areAllFinished,
      },
    });

    revalidatePath(`/controles/${controle.id}`);
    revalidatePath(`/equipes/${controle.equipe_id}`);
    revalidatePath(`/missions/${controle.mission_id}`);

    return {
      success: true,
      data: { id: controle.id, statut: 'TERMINE', date_fin: todayDate },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}
