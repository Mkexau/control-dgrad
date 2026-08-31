'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  getOrdonnancementsAControler,
  getOrdonnancementAControlerById,
  enregistrerVerificationOrdonnancement,
  getSyntheseSectorielleControle,
  type FicheAControlerItem,
  type VerificationItem,
  type SyntheseSecteurItem,
} from '@/lib/controles/controle-ordonnancement-service';
import {
  VerificationOrdonnancementInputSchema,
  VerificationFilterSchema,
  type VerificationOrdonnancementInput,
  type VerificationFilter,
} from '@/lib/validations/controle-ordonnancement';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Action pour récupérer la liste des ordonnancements à contrôler dans le périmètre du bureau.
 */
export async function fetchOrdonnancementsAControlerAction(
  filters: Partial<VerificationFilter> = {}
): Promise<ActionResponse<{ fiches: FicheAControlerItem[]; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentification requise.' };
    }

    const parsed = VerificationFilterSchema.parse(filters);
    const result = await getOrdonnancementsAControler(user, parsed);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des ordonnancements.',
    };
  }
}

/**
 * Action pour récupérer les détails d'une fiche d'ordonnancement avec ses vérifications.
 */
export async function fetchOrdonnancementAControlerByIdAction(
  ficheId: string
): Promise<ActionResponse<FicheAControlerItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentification requise.' };
    }

    const result = await getOrdonnancementAControlerById(user, ficheId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la fiche.',
    };
  }
}

/**
 * Action pour enregistrer ou mettre à jour la vérification constatée par le Chef de Bureau.
 */
export async function enregistrerVerificationAction(
  input: VerificationOrdonnancementInput
): Promise<ActionResponse<VerificationItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentification requise.' };
    }

    const validated = VerificationOrdonnancementInputSchema.parse(input);
    const result = await enregistrerVerificationOrdonnancement(user, validated);

    revalidatePath('/controles/ordonnancements');
    revalidatePath(`/controles/ordonnancements/${validated.fiche_ordonnancement_id}`);
    revalidatePath('/dashboard');

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l’enregistrement de la vérification.',
    };
  }
}

/**
 * Action pour obtenir la synthèse sectorielle avec priorisation par manque à gagner.
 */
export async function fetchSyntheseSectorielleAction(
  bureauId?: string
): Promise<ActionResponse<SyntheseSecteurItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentification requise.' };
    }

    const result = await getSyntheseSectorielleControle(user, bureauId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la synthèse sectorielle.',
    };
  }
}
