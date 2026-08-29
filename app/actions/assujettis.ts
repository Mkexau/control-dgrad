// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : ASSUJETTIS
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  type AssujettiCreateInput,
  type AssujettiUpdateInput,
  type AssujettiFilterInput,
  AssujettiCreateSchema,
  AssujettiUpdateSchema,
  AssujettiFilterSchema,
} from '@/lib/validations/assujettis';
import {
  getAssujettis,
  getAssujettiById,
  createAssujetti,
  updateAssujetti,
  type AssujettiItem,
} from '@/lib/recoupement/recoupement-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Récupération paginée et filtrée des assujettis
 */
export async function fetchAssujettisAction(
  filters: Partial<AssujettiFilterInput> = {}
): Promise<ActionResponse<{ assujettis: AssujettiItem[]; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AssujettiFilterSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Filtres invalides.' };
    }

    const result = await getAssujettis(user, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des assujettis.';
    return { success: false, error: msg };
  }
}

/**
 * Récupération détaillée d'un assujetti par identifiant
 */
export async function fetchAssujettiByIdAction(
  id: string
): Promise<ActionResponse<AssujettiItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const assujetti = await getAssujettiById(user, id);
    if (!assujetti) {
      return { success: false, error: 'Assujetti non trouvé ou accès non autorisé.' };
    }

    return { success: true, data: assujetti };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la consultation de l’assujetti.';
    return { success: false, error: msg };
  }
}

/**
 * Création d'un nouvel assujetti
 */
export async function createAssujettiAction(
  input: AssujettiCreateInput
): Promise<ActionResponse<AssujettiItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AssujettiCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const created = await createAssujetti(user, parsed.data);
    revalidatePath('/assujettis');
    return { success: true, data: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la création de l’assujetti.';
    return { success: false, error: msg };
  }
}

/**
 * Mise à jour d'un assujetti existant
 */
export async function updateAssujettiAction(
  input: AssujettiUpdateInput
): Promise<ActionResponse<AssujettiItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = AssujettiUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const updated = await updateAssujetti(user, parsed.data);
    revalidatePath('/assujettis');
    revalidatePath(`/assujettis/${updated.id}`);
    return { success: true, data: updated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la modification de l’assujetti.';
    return { success: false, error: msg };
  }
}
