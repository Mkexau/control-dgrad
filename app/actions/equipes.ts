'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : GESTION DES ÉQUIPES (SUR_PLACE)
// =============================================================================

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  EquipeCreateSchema,
  EquipeUpdateSchema,
  EquipeAddAgentSchema,
  EquipeRemoveAgentSchema,
  EquipeAddAssujettiSchema,
  EquipeRemoveAssujettiSchema,
  EquipeDesignateChefSchema,
  type EquipeCreateInput,
  type EquipeUpdateInput,
  type EquipeAddAgentInput,
  type EquipeRemoveAgentInput,
  type EquipeAddAssujettiInput,
  type EquipeRemoveAssujettiInput,
  type EquipeDesignateChefInput,
} from '@/lib/validations/equipes';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * 1. Création d'une proposition d'équipe pour une mission SUR_PLACE en phase BROUILLON
 */
export async function createEquipe(
  input: EquipeCreateInput
): Promise<ActionResponse<{ id: string; nom: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données de l\'équipe invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Interdiction absolue pour ADMIN
  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas créer d\'équipe opérationnelle.' };
  }

  const { mission_id, nom, chef_equipe_id, agents_ids, assujettis_ids } = parsed.data;
  const adminSupabase = createAdminClient();

  try {
    // 1. Vérifier la mission
    const { data: mission, error: missionError } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut')
      .eq('id', mission_id)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission introuvable.' };
    }

    if (mission.type_controle !== 'SUR_PLACE') {
      return { success: false, error: 'Les équipes ne s\'appliquent qu\'aux missions de contrôle SUR_PLACE.' };
    }

    if (mission.statut !== 'BROUILLON') {
      return {
        success: false,
        error: `Impossible d'ajouter une équipe sur une mission au statut '${mission.statut}'. La mission doit être en BROUILLON.`,
      };
    }

    // Vérifier le périmètre organisationnel
    if (
      currentUser.role === 'CHEF_BUREAU' ||
      currentUser.role === 'ANALYSTE' ||
      currentUser.role === 'CONTROLEUR'
    ) {
      if (currentUser.bureau_id && currentUser.bureau_id !== mission.bureau_id) {
        return { success: false, error: 'Vous n\'êtes pas autorisé à créer une équipe hors de votre bureau.' };
      }
    }

    // 2. Vérifier le Chef d'équipe
    const { data: chefAgent, error: chefError } = await adminSupabase
      .from('agents')
      .select('id, matricule, actif, bureau_id, profiles(nom, prenom, bureau_id)')
      .eq('id', chef_equipe_id)
      .single();

    if (chefError || !chefAgent) {
      return { success: false, error: 'Agent désigné comme chef d\'équipe introuvable.' };
    }

    if (!chefAgent.actif) {
      return { success: false, error: 'Le chef d\'équipe désigné est inactif.' };
    }

    const chefBureau = chefAgent.bureau_id || (chefAgent.profiles as unknown as { bureau_id?: string })?.bureau_id;
    if (chefBureau && chefBureau !== mission.bureau_id) {
      return { success: false, error: 'Le chef d\'équipe doit appartenir au bureau compétent pour cette mission.' };
    }

    // 3. Vérifier les agents
    if (agents_ids.length > 0) {
      const uniqueAgentsIds = Array.from(new Set(agents_ids));
      const { data: activeAgents } = await adminSupabase
        .from('agents')
        .select('id, matricule, actif, bureau_id, profiles(bureau_id)')
        .in('id', uniqueAgentsIds);

      const foundMap = new Map((activeAgents || []).map((a) => [a.id, a]));
      for (const agId of uniqueAgentsIds) {
        const ag = foundMap.get(agId);
        if (!ag) {
          return { success: false, error: `Agent ID '${agId}' introuvable.` };
        }
        if (!ag.actif) {
          return { success: false, error: `L'agent matricule '${ag.matricule}' est inactif et ne peut pas être affecté.` };
        }
        const agBureau = ag.bureau_id || (ag.profiles as unknown as { bureau_id?: string })?.bureau_id;
        if (agBureau && agBureau !== mission.bureau_id) {
          return { success: false, error: `L'agent matricule '${ag.matricule}' n'appartient pas au bureau de la mission.` };
        }
      }
    }

    // 4. Vérifier les assujettis rattachés à la mission
    if (assujettis_ids.length > 0) {
      const uniqueAssIds = Array.from(new Set(assujettis_ids));
      const { data: missionAssujettis } = await adminSupabase
        .from('mission_assujettis')
        .select('assujetti_id')
        .eq('mission_id', mission.id)
        .in('assujetti_id', uniqueAssIds);

      const validAssIds = new Set((missionAssujettis || []).map((ma) => ma.assujetti_id));
      for (const aId of uniqueAssIds) {
        if (!validAssIds.has(aId)) {
          return {
            success: false,
            error: 'Tous les assujettis affectés à l\'équipe doivent d\'abord être rattachés au dossier de mission.',
          };
        }
      }
    }

    // 5. Insérer l'équipe
    const { data: equipe, error: equipeError } = await adminSupabase
      .from('equipes')
      .insert({
        mission_id: mission.id,
        nom,
        chef_equipe_id,
        statut: 'PROPOSEE',
      })
      .select('id, nom')
      .single();

    if (equipeError || !equipe) {
      console.error('Erreur insertion equipe:', equipeError);
      return { success: false, error: 'Échec de la création de l\'équipe.' };
    }

    // 6. Insérer les agents (en évitant les doublons)
    const uniqueAgents = Array.from(new Set(agents_ids));
    if (uniqueAgents.length > 0) {
      const agentInserts = uniqueAgents.map((agId) => ({
        equipe_id: equipe.id,
        agent_id: agId,
      }));
      await adminSupabase.from('equipe_agents').insert(agentInserts);
    }

    // 7. Insérer les assujettis (en évitant les doublons)
    const uniqueAssujettis = Array.from(new Set(assujettis_ids));
    if (uniqueAssujettis.length > 0) {
      const assInserts = uniqueAssujettis.map((assId) => ({
        equipe_id: equipe.id,
        assujetti_id: assId,
      }));
      await adminSupabase.from('equipe_assujettis').insert(assInserts);
    }

    // 8. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'CREATION',
      entityType: 'equipes',
      entityId: equipe.id,
      newData: {
        nom: equipe.nom,
        mission_id: mission.id,
        mission_ref: mission.reference,
        chef_equipe_id,
        agents_count: uniqueAgents.length,
        assujettis_count: uniqueAssujettis.length,
      },
    });

    revalidatePath('/equipes');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { id: equipe.id, nom: equipe.nom } };
  } catch (err) {
    console.error('Erreur inattendue createEquipe:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 2. Mise à jour d'une proposition d'équipe (nom, chef d'équipe)
 */
export async function updateEquipe(
  input: EquipeUpdateInput
): Promise<ActionResponse<{ id: string; nom: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Paramètres invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas modifier la composition d\'une équipe.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe, error } = await adminSupabase
      .from('equipes')
      .select('id, nom, statut, chef_equipe_id, mission_id, missions(bureau_id, statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (error || !equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    const missionBureauId = (equipe.missions as unknown as { bureau_id: string })?.bureau_id;

    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return {
        success: false,
        error: 'Une équipe confirmée ou rattachée à une mission en cours de validation ne peut plus être modifiée.',
      };
    }

    if (
      (currentUser.role === 'CHEF_BUREAU' || currentUser.role === 'ANALYSTE') &&
      currentUser.bureau_id &&
      currentUser.bureau_id !== missionBureauId
    ) {
      return { success: false, error: 'Périmètre non autorisé.' };
    }

    const updatePayload: { nom?: string; chef_equipe_id?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.nom) {
      updatePayload.nom = parsed.data.nom;
    }

    if (parsed.data.chef_equipe_id) {
      const { data: newChef } = await adminSupabase
        .from('agents')
        .select('id, actif')
        .eq('id', parsed.data.chef_equipe_id)
        .single();

      if (!newChef || !newChef.actif) {
        return { success: false, error: 'Le nouveau chef d\'équipe désigné est invalide ou inactif.' };
      }
      updatePayload.chef_equipe_id = parsed.data.chef_equipe_id;
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('equipes')
      .update(updatePayload)
      .eq('id', equipe.id)
      .select('id, nom')
      .single();

    if (updateError || !updated) {
      return { success: false, error: 'Échec de la mise à jour de l\'équipe.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'MODIFICATION',
      entityType: 'equipes',
      entityId: equipe.id,
      oldData: { nom: equipe.nom, chef_equipe_id: equipe.chef_equipe_id },
      newData: updatePayload,
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { id: updated.id, nom: updated.nom } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 3. Affecter un agent à une équipe (en phase brouillon)
 */
export async function addAgentToEquipe(
  input: EquipeAddAgentInput
): Promise<ActionResponse<{ agent_id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeAddAgentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas affecter d\'agent.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe } = await adminSupabase
      .from('equipes')
      .select('id, statut, mission_id, missions(bureau_id, statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (!equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return { success: false, error: 'Les agents ne peuvent être modifiés que sur une équipe proposée en brouillon.' };
    }

    // Vérifier l'agent
    const { data: agent } = await adminSupabase
      .from('agents')
      .select('id, matricule, actif, bureau_id, profiles(bureau_id)')
      .eq('id', parsed.data.agent_id)
      .single();

    if (!agent || !agent.actif) {
      return { success: false, error: 'Agent introuvable ou inactif.' };
    }

    const missionBureau = (equipe.missions as unknown as { bureau_id?: string })?.bureau_id;
    const agBureau = agent.bureau_id || (agent.profiles as unknown as { bureau_id?: string })?.bureau_id;
    if (agBureau && missionBureau && agBureau !== missionBureau) {
      return { success: false, error: 'L\'agent n\'appartient pas au bureau de la mission.' };
    }

    // Vérifier s'il est déjà dans l'équipe
    const { data: existing } = await adminSupabase
      .from('equipe_agents')
      .select('id')
      .eq('equipe_id', equipe.id)
      .eq('agent_id', agent.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Cet agent fait déjà partie de l\'équipe.' };
    }

    const { error: insertError } = await adminSupabase
      .from('equipe_agents')
      .insert({
        equipe_id: equipe.id,
        agent_id: agent.id,
      });

    if (insertError) {
      return { success: false, error: 'Échec du rattachement de l\'agent.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'AFFECTATION_AGENT',
      entityType: 'equipes',
      entityId: equipe.id,
      newData: { agent_id: agent.id, matricule: agent.matricule },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { agent_id: agent.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 4. Retirer un agent d'une équipe
 */
export async function removeAgentFromEquipe(
  input: EquipeRemoveAgentInput
): Promise<ActionResponse<{ agent_id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeRemoveAgentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Paramètres invalides.' };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'Opération interdite pour ADMIN.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe } = await adminSupabase
      .from('equipes')
      .select('id, statut, chef_equipe_id, mission_id, missions(statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (!equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return { success: false, error: 'Impossible de retirer un agent d\'une équipe confirmée ou soumise.' };
    }

    const { error: delError } = await adminSupabase
      .from('equipe_agents')
      .delete()
      .eq('equipe_id', equipe.id)
      .eq('agent_id', parsed.data.agent_id);

    if (delError) {
      return { success: false, error: 'Échec du retrait de l\'agent.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'RETRAIT_AGENT',
      entityType: 'equipes',
      entityId: equipe.id,
      newData: { agent_id: parsed.data.agent_id },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { agent_id: parsed.data.agent_id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 5. Affecter un assujetti à une équipe (doit faire partie de la mission)
 */
export async function addAssujettiToEquipe(
  input: EquipeAddAssujettiInput
): Promise<ActionResponse<{ assujetti_id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeAddAssujettiSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Paramètres invalides.' };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'Opération interdite pour ADMIN.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe } = await adminSupabase
      .from('equipes')
      .select('id, statut, mission_id, missions(bureau_id, statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (!equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return { success: false, error: 'Les assujettis ne peuvent être modifiés que sur une équipe proposée en brouillon.' };
    }

    // Vérifier que l'assujetti est bien dans la mission
    const { data: missionAss } = await adminSupabase
      .from('mission_assujettis')
      .select('id')
      .eq('mission_id', equipe.mission_id)
      .eq('assujetti_id', parsed.data.assujetti_id)
      .maybeSingle();

    if (!missionAss) {
      return { success: false, error: 'L\'assujetti doit d\'abord être rattaché à la mission.' };
    }

    // Vérifier s'il est déjà dans l'équipe
    const { data: existing } = await adminSupabase
      .from('equipe_assujettis')
      .select('id')
      .eq('equipe_id', equipe.id)
      .eq('assujetti_id', parsed.data.assujetti_id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Cet assujetti est déjà affecté à cette équipe.' };
    }

    const { error: insError } = await adminSupabase
      .from('equipe_assujettis')
      .insert({
        equipe_id: equipe.id,
        assujetti_id: parsed.data.assujetti_id,
      });

    if (insError) {
      return { success: false, error: 'Échec de l\'affectation de l\'assujetti.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'AFFECTATION_ASSUJETTI',
      entityType: 'equipes',
      entityId: equipe.id,
      newData: { assujetti_id: parsed.data.assujetti_id },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { assujetti_id: parsed.data.assujetti_id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 6. Retirer un assujetti d'une équipe
 */
export async function removeAssujettiFromEquipe(
  input: EquipeRemoveAssujettiInput
): Promise<ActionResponse<{ assujetti_id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeRemoveAssujettiSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Paramètres invalides.' };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'Opération interdite pour ADMIN.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe } = await adminSupabase
      .from('equipes')
      .select('id, statut, mission_id, missions(statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (!equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return { success: false, error: 'Impossible de modifier les assujettis d\'une équipe confirmée ou soumise.' };
    }

    const { error: delError } = await adminSupabase
      .from('equipe_assujettis')
      .delete()
      .eq('equipe_id', equipe.id)
      .eq('assujetti_id', parsed.data.assujetti_id);

    if (delError) {
      return { success: false, error: 'Échec du retrait de l\'assujetti.' };
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: 'RETRAIT_ASSUJETTI',
      entityType: 'equipes',
      entityId: equipe.id,
      newData: { assujetti_id: parsed.data.assujetti_id },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { assujetti_id: parsed.data.assujetti_id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 7. Désigner un nouveau chef d'équipe
 */
export async function designateChefEquipe(
  input: EquipeDesignateChefInput
): Promise<ActionResponse<{ chef_equipe_id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = EquipeDesignateChefSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Paramètres invalides.' };
  }

  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'Opération interdite pour ADMIN.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: equipe } = await adminSupabase
      .from('equipes')
      .select('id, nom, statut, chef_equipe_id, mission_id, missions(bureau_id, statut)')
      .eq('id', parsed.data.equipe_id)
      .single();

    if (!equipe) {
      return { success: false, error: 'Équipe introuvable.' };
    }

    const missionStatut = (equipe.missions as unknown as { statut: string })?.statut;
    if (equipe.statut !== 'PROPOSEE' || missionStatut !== 'BROUILLON') {
      return { success: false, error: 'Impossible de changer le chef d\'équipe d\'une équipe confirmée ou soumise.' };
    }

    const { data: chefAgent } = await adminSupabase
      .from('agents')
      .select('id, matricule, actif')
      .eq('id', parsed.data.chef_equipe_id)
      .single();

    if (!chefAgent || !chefAgent.actif) {
      return { success: false, error: 'L\'agent désigné est invalide ou inactif.' };
    }

    await adminSupabase
      .from('equipes')
      .update({ chef_equipe_id: chefAgent.id, updated_at: new Date().toISOString() })
      .eq('id', equipe.id);

    await logAuditEvent({
      userId: currentUser.id,
      action: 'DESIGNATION_CHEF_EQUIPE',
      entityType: 'equipes',
      entityId: equipe.id,
      oldData: { chef_equipe_id: equipe.chef_equipe_id },
      newData: { chef_equipe_id: chefAgent.id, matricule: chefAgent.matricule },
    });

    revalidatePath('/equipes');
    revalidatePath(`/equipes/${equipe.id}`);
    revalidatePath(`/missions/${equipe.mission_id}`);
    return { success: true, data: { chef_equipe_id: chefAgent.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}
