// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : ANALYSES & CIBLAGE MULTI-ASSUJETTIS
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  type AnalyseCreateInput,
  type AnalyseAssujettiAddInput,
  type AnalyseTransitionInput,
  type AnalyseFilterInput,
  AnalyseCreateSchema,
  AnalyseAssujettiAddSchema,
  AnalyseAssujettiRemoveSchema,
  AnalyseTransitionSchema,
  AnalyseFilterSchema,
} from '@/lib/validations/analyses';
import {
  getAnalyses,
  getAnalyseById,
  createAnalyse,
  addAssujettiToAnalyse,
  removeAssujettiFromAnalyse,
  transitionAnalyse,
  type AnalyseItem,
} from '@/lib/recoupement/recoupement-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Récupération paginée et filtrée des dossiers d'analyse
 */
export async function fetchAnalysesAction(
  filters: Partial<AnalyseFilterInput> = {}
): Promise<ActionResponse<{ analyses: AnalyseItem[]; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AnalyseFilterSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Filtres invalides.' };
    }

    const result = await getAnalyses(user, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des analyses.';
    return { success: false, error: msg };
  }
}

/**
 * Récupération détaillée d'un dossier d'analyse
 */
export async function fetchAnalyseByIdAction(
  id: string
): Promise<ActionResponse<AnalyseItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const analyse = await getAnalyseById(user, id);
    if (!analyse) {
      return { success: false, error: 'Dossier d’analyse introuvable ou accès non autorisé.' };
    }

    return { success: true, data: analyse };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la consultation de l’analyse.';
    return { success: false, error: msg };
  }
}

/**
 * Création d'un nouveau dossier d'analyse
 */
export async function createAnalyseAction(
  input: AnalyseCreateInput
): Promise<ActionResponse<AnalyseItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AnalyseCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const created = await createAnalyse(user, parsed.data);
    revalidatePath('/analyses');
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la création du dossier d’analyse.';
    return { success: false, error: msg };
  }
}

/**
 * Association / mise à jour d'un assujetti dans une analyse
 */
export async function addAssujettiToAnalyseAction(
  input: AnalyseAssujettiAddInput
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AnalyseAssujettiAddSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    await addAssujettiToAnalyse(user, parsed.data);
    revalidatePath(`/analyses/${parsed.data.analyse_id}`);
    return { success: true, data: { success: true } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de l’ajout de l’assujetti.';
    return { success: false, error: msg };
  }
}

/**
 * Retrait d'un assujetti d'un dossier d'analyse
 */
export async function removeAssujettiFromAnalyseAction(
  analyseId: string,
  assujettiId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AnalyseAssujettiRemoveSchema.safeParse({ analyse_id: analyseId, assujetti_id: assujettiId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    await removeAssujettiFromAnalyse(user, parsed.data.analyse_id, parsed.data.assujetti_id);
    revalidatePath(`/analyses/${analyseId}`);
    return { success: true, data: { success: true } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du retrait de l’assujetti.';
    return { success: false, error: msg };
  }
}

/**
 * Transition de statut d'un dossier d'analyse (Workflow: BROUILLON -> EN_COURS -> VALIDEE -> CLOTUREE)
 */
export async function transitionAnalyseAction(
  input: AnalyseTransitionInput
): Promise<ActionResponse<AnalyseItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AnalyseTransitionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const updated = await transitionAnalyse(user, parsed.data);
    revalidatePath('/analyses');
    revalidatePath(`/analyses/${updated.id}`);
    return { success: true, data: updated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du changement de statut.';
    return { success: false, error: msg };
  }
}
