// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : RECOUPEMENT, NOTES & ORDONNANCEMENTS
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  type NotePerceptionCreateInput,
  type OrdonnancementCreateInput,
  type NotePerceptionFilterInput,
  NotePerceptionCreateSchema,
  OrdonnancementCreateSchema,
  NotePerceptionFilterSchema,
} from '@/lib/validations/recoupement';
import {
  getNotesPerception,
  createNotePerception,
  getOrdonnancements,
  createOrdonnancement,
  getRecoupementSynthesis,
  type NotePerceptionItem,
  type OrdonnancementItem,
  type RecoupementSynthese,
} from '@/lib/recoupement/recoupement-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Récupère les notes de perception d'un assujetti
 */
export async function fetchNotesPerceptionAction(
  assujettiId: string,
  filters: Partial<NotePerceptionFilterInput> = {}
): Promise<ActionResponse<NotePerceptionItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const notes = await getNotesPerception(user, assujettiId, filters);
    return { success: true, data: notes };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des notes de perception.';
    return { success: false, error: msg };
  }
}

/**
 * Enregistrement d'une nouvelle note de perception
 */
export async function createNotePerceptionAction(
  input: NotePerceptionCreateInput
): Promise<ActionResponse<NotePerceptionItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = NotePerceptionCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const created = await createNotePerception(user, parsed.data);
    revalidatePath(`/assujettis/${parsed.data.assujetti_id}`);
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la création de la note de perception.';
    return { success: false, error: msg };
  }
}

/**
 * Récupère les ordonnancements d'un assujetti
 */
export async function fetchOrdonnancementsAction(
  assujettiId: string
): Promise<ActionResponse<OrdonnancementItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const ords = await getOrdonnancements(user, assujettiId);
    return { success: true, data: ords };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des ordonnancements.';
    return { success: false, error: msg };
  }
}

/**
 * Enregistrement d'un nouvel ordonnancement
 */
export async function createOrdonnancementAction(
  input: OrdonnancementCreateInput
): Promise<ActionResponse<OrdonnancementItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = OrdonnancementCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const created = await createOrdonnancement(user, parsed.data);
    revalidatePath(`/assujettis/${parsed.data.assujetti_id}`);
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la création de l’ordonnancement.';
    return { success: false, error: msg };
  }
}

/**
 * Récupération de la synthèse de recoupement (Séparation stricte CDF/USD)
 */
export async function getRecoupementSynthesisAction(
  assujettiId: string
): Promise<ActionResponse<RecoupementSynthese>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const synthese = await getRecoupementSynthesis(user, assujettiId);
    return { success: true, data: synthese };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du calcul de synthèse de recoupement.';
    return { success: false, error: msg };
  }
}
