// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : DEMANDES DE RENSEIGNEMENTS (SUR_PIECES)
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createClient } from '@/lib/supabase/server';
import { assertCanManageDemandeRenseignements, type ControleDemandeScope } from '@/lib/auth/controle-access';
import {
  DemandeRenseignementsCreateSchema,
  DemandeRenseignementsReponseSchema,
  DemandeRenseignementsRelanceSchema,
  type DemandeRenseignementsCreateInput,
  type DemandeRenseignementsReponseInput,
  type DemandeRenseignementsRelanceInput,
} from '@/lib/validations/demandes-renseignements';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 1. Créer et émettre une demande de pièces ou renseignements
 */
export async function creerDemandeRenseignements(
  input: DemandeRenseignementsCreateInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = DemandeRenseignementsCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Données de la demande invalides.',
      };
    }

    const { controle_id, assujetti_id, date_envoi, date_limite, contenu } = parsed.data;
    const supabase = await createClient();

    // 1. Récupérer le contrôle avec sa mission
    const { data: controle, error: ctrlErr } = await supabase
      .from('controles')
      .select('id, assujetti_id, statut, type_controle, controleur_responsable_id, missions(id, bureau_id)')
      .eq('id', controle_id)
      .single();

    if (ctrlErr || !controle) {
      return { success: false, error: 'Contrôle introuvable.' };
    }

    if (controle.assujetti_id !== assujetti_id) {
      return {
        success: false,
        error: 'Incohérence : l’assujetti sélectionné ne correspond pas à ce contrôle.',
      };
    }

    const mission = Array.isArray(controle.missions) ? controle.missions[0] : controle.missions;
    assertCanManageDemandeRenseignements(currentUser, {
      ...controle,
      mission,
    } as ControleDemandeScope, 'CREATION');

    const effectiveDateEnvoi = date_envoi || new Date().toISOString().split('T')[0];

    // 3. Insérer la demande
    const { data: newDemande, error: insErr } = await supabase
      .from('demandes_renseignements')
      .insert({
        controle_id,
        assujetti_id,
        auteur_id: currentUser.id,
        date_envoi: effectiveDateEnvoi,
        date_limite: date_limite || null,
        statut: 'EN_ATTENTE',
        contenu,
      })
      .select('id')
      .single();

    if (insErr || !newDemande) {
      return { success: false, error: `Erreur enregistrement demande : ${insErr?.message}` };
    }

    // 4. Audit
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'CREATION_DEMANDE_RENSEIGNEMENTS',
      entity_type: 'demandes_renseignements',
      entity_id: newDemande.id,
      new_data: {
        controle_id,
        assujetti_id,
        date_envoi: effectiveDateEnvoi,
        date_limite: date_limite || null,
        contenu,
      },
    });

    revalidatePath(`/controles/${controle_id}`);
    if (mission?.id) {
      revalidatePath(`/missions/${mission.id}`);
    }

    return { success: true, data: { id: newDemande.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * 2. Enregistrer la réception d'une réponse de l'assujetti
 */
export async function enregistrerReponseDemandeRenseignements(
  input: DemandeRenseignementsReponseInput
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = DemandeRenseignementsReponseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const { demande_id, date_reponse, commentaire } = parsed.data;
    const supabase = await createClient();

    const { data: demande, error: getErr } = await supabase
      .from('demandes_renseignements')
      .select('id, controle_id, statut, controles(id, assujetti_id, statut, type_controle, controleur_responsable_id, missions(id, bureau_id))')
      .eq('id', demande_id)
      .single();

    if (getErr || !demande) {
      return { success: false, error: 'Demande de renseignements introuvable.' };
    }

    const controle = Array.isArray(demande.controles) ? demande.controles[0] : demande.controles;
    const mission = controle && (Array.isArray(controle.missions) ? controle.missions[0] : controle.missions);
    if (!controle) return { success: false, error: 'Contrôle associé introuvable.' };
    assertCanManageDemandeRenseignements(currentUser, { ...controle, mission } as ControleDemandeScope, 'REPONSE', demande.statut);

    const { error: updErr } = await supabase
      .from('demandes_renseignements')
      .update({
        date_reponse,
        statut: 'REPONDU',
        updated_at: new Date().toISOString(),
      })
      .eq('id', demande_id);

    if (updErr) {
      return { success: false, error: `Erreur mise à jour réponse : ${updErr.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'REPONSE_DEMANDE_RENSEIGNEMENTS',
      entity_type: 'demandes_renseignements',
      entity_id: demande_id,
      old_data: { statut: demande.statut },
      new_data: { controle_id: demande.controle_id, statut: 'REPONDU', date_reponse, commentaire },
    });

    revalidatePath(`/controles/${demande.controle_id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * 3. Relancer une demande en attente
 */
export async function relancerDemandeRenseignements(
  input: DemandeRenseignementsRelanceInput
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = DemandeRenseignementsRelanceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const { demande_id, nouvelle_date_limite, motif_relance } = parsed.data;
    const supabase = await createClient();

    const { data: demande, error: getErr } = await supabase
      .from('demandes_renseignements')
      .select('id, controle_id, statut, date_limite, controles(id, assujetti_id, statut, type_controle, controleur_responsable_id, missions(id, bureau_id))')
      .eq('id', demande_id)
      .single();

    if (getErr || !demande) {
      return { success: false, error: 'Demande de renseignements introuvable.' };
    }

    const controle = Array.isArray(demande.controles) ? demande.controles[0] : demande.controles;
    const mission = controle && (Array.isArray(controle.missions) ? controle.missions[0] : controle.missions);
    if (!controle) return { success: false, error: 'Contrôle associé introuvable.' };
    assertCanManageDemandeRenseignements(currentUser, { ...controle, mission } as ControleDemandeScope, 'RELANCE', demande.statut);

    const updatePayload: Record<string, unknown> = {
      statut: 'RELANCE',
      updated_at: new Date().toISOString(),
    };
    if (nouvelle_date_limite) {
      updatePayload.date_limite = nouvelle_date_limite;
    }

    const { error: updErr } = await supabase
      .from('demandes_renseignements')
      .update(updatePayload)
      .eq('id', demande_id);

    if (updErr) {
      return { success: false, error: `Erreur relance : ${updErr.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'RELANCE_DEMANDE_RENSEIGNEMENTS',
      entity_type: 'demandes_renseignements',
      entity_id: demande_id,
      old_data: { statut: demande.statut, date_limite: demande.date_limite },
      new_data: { controle_id: demande.controle_id, statut: 'RELANCE', nouvelle_date_limite, motif_relance },
    });

    revalidatePath(`/controles/${demande.controle_id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
