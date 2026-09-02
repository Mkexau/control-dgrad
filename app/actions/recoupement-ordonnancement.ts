// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : INFORMATIONS REÇUES & FICHES D'ORDONNANCEMENT
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  type InformationRecueFilterInput,
  type InformationRecueCreateInput,
  type FicheOrdonnancementCreateInput,
  type FicheOrdonnancementFilterInput,
  InformationRecueFilterSchema,
  InformationRecueCreateSchema,
  InformationRecuePriseEnChargeSchema,
  InformationRecueAssocierAssujettiSchema,
  InformationRecueCreerAssujettiSchema,
  FicheOrdonnancementCreateSchema,
  FicheOrdonnancementFilterSchema,
  FicheOrdonnancementTransmissionSchema,
  FichesOrdonnancementTransmissionMasseSchema,
} from '@/lib/validations/recoupement-ordonnancement';
import {
  getInformationsRecues,
  creerInformationRecue,
  getInformationRecueById,
  prendreEnChargeInformation,
  associerAssujettiInformation,
  creerAssujettiDepuisInformation,
  creerFicheOrdonnancement,
  getFichesOrdonnancement,
  getFicheOrdonnancementById,
  transmettreFicheDivisionControle,
  transmettreFichesDivisionControle,
  getRecoupementDashboardMetrics,
  type InformationRecueItem,
  type FicheOrdonnancementItem,
  type RecoupementDashboardMetrics,
} from '@/lib/recoupement/ordonnancement-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Simulation de recette : l'arrivée reste une donnée source, sans fiche ni assujetti créés automatiquement. */
export async function creerInformationRecueAction(
  input: InformationRecueCreateInput
): Promise<ActionResponse<InformationRecueItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    const parsed = InformationRecueCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Données d’arrivée invalides.' };
    const result = await creerInformationRecue(user, parsed.data);
    revalidatePath('/recoupement/informations-recues');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création de l’arrivée.' };
  }
}

/**
 * Récupère les informations reçues du Service d'assiette (filtrage et pagination)
 */
export async function fetchInformationsRecuesAction(
  filters: Partial<InformationRecueFilterInput> = {}
): Promise<ActionResponse<{ informations: InformationRecueItem[]; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = InformationRecueFilterSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Filtres invalides.' };
    }

    const result = await getInformationsRecues(user, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des informations reçues.';
    return { success: false, error: msg };
  }
}

/**
 * Récupère une information reçue par son identifiant
 */
export async function fetchInformationRecueByIdAction(
  id: string
): Promise<ActionResponse<InformationRecueItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const item = await getInformationRecueById(user, id);
    if (!item) {
      return { success: false, error: 'Information reçue introuvable ou accès non autorisé.' };
    }

    return { success: true, data: item };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la consultation de l’information reçue.';
    return { success: false, error: msg };
  }
}

/**
 * Prise en charge d'une information reçue (passage à EN_COURS)
 */
export async function prendreEnChargeInformationAction(
  id: string
): Promise<ActionResponse<InformationRecueItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = InformationRecuePriseEnChargeSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Identifiant invalide.' };
    }

    const result = await prendreEnChargeInformation(user, parsed.data.id);
    revalidatePath('/recoupement/informations-recues');
    revalidatePath(`/recoupement/informations-recues/${id}`);
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la prise en charge de l’information.';
    return { success: false, error: msg };
  }
}

/**
 * Associe un assujetti officiel à une information reçue
 */
export async function associerAssujettiInformationAction(
  informationId: string,
  assujettiId: string
): Promise<ActionResponse<InformationRecueItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = InformationRecueAssocierAssujettiSchema.safeParse({
      information_id: informationId,
      assujetti_id: assujettiId,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Paramètres invalides.' };
    }

    const result = await associerAssujettiInformation(user, parsed.data.information_id, parsed.data.assujetti_id);
    revalidatePath(`/recoupement/informations-recues/${informationId}`);
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de l’association de l’assujetti.';
    return { success: false, error: msg };
  }
}

/** Crée volontairement l'assujetti officiel depuis l'arrivée lorsque la recherche n'a rien trouvé. */
export async function creerAssujettiDepuisInformationAction(
  informationId: string,
  type: 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE',
  secteurPrincipalId: string
): Promise<ActionResponse<InformationRecueItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    const parsed = InformationRecueCreerAssujettiSchema.safeParse({ information_id: informationId, type, secteur_principal_id: secteurPrincipalId });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Paramètres invalides.' };
    const result = await creerAssujettiDepuisInformation(user, parsed.data);
    revalidatePath('/assujettis');
    revalidatePath(`/recoupement/informations-recues/${informationId}`);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création de l’assujetti.' };
  }
}

/**
 * Création d'une Fiche d'enregistrement des données d'ordonnancement
 */
export async function creerFicheOrdonnancementAction(
  input: FicheOrdonnancementCreateInput
): Promise<ActionResponse<FicheOrdonnancementItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = FicheOrdonnancementCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données de la fiche invalides.' };
    }

    const result = await creerFicheOrdonnancement(user, parsed.data);
    revalidatePath('/recoupement/informations-recues');
    revalidatePath(`/recoupement/informations-recues/${parsed.data.information_recue_id}`);
    revalidatePath('/recoupement/fiches-ordonnancement');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement de la fiche d’ordonnancement.';
    return { success: false, error: msg };
  }
}

/**
 * Récupère les fiches d'ordonnancement enregistrées (filtrage et pagination)
 */
export async function fetchFichesOrdonnancementAction(
  filters: Partial<FicheOrdonnancementFilterInput> = {}
): Promise<ActionResponse<{ fiches: FicheOrdonnancementItem[]; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = FicheOrdonnancementFilterSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Filtres invalides.' };
    }

    const result = await getFichesOrdonnancement(user, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des fiches d’ordonnancement.';
    return { success: false, error: msg };
  }
}

/**
 * Récupère une fiche d'ordonnancement par son identifiant
 */
export async function fetchFicheOrdonnancementByIdAction(
  id: string
): Promise<ActionResponse<FicheOrdonnancementItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const result = await getFicheOrdonnancementById(user, id);
    if (!result) {
      return { success: false, error: 'Fiche d’ordonnancement introuvable ou accès non autorisé.' };
    }

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la consultation de la fiche d’ordonnancement.';
    return { success: false, error: msg };
  }
}

/**
 * Transmission de la fiche d'ordonnancement au Chef de Division Contrôle
 */
export async function transmettreFicheDivisionControleAction(
  ficheId: string
): Promise<ActionResponse<FicheOrdonnancementItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const parsed = FicheOrdonnancementTransmissionSchema.safeParse({ fiche_id: ficheId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Identifiant invalide.' };
    }

    const result = await transmettreFicheDivisionControle(user, parsed.data.fiche_id);
    revalidatePath('/recoupement/fiches-ordonnancement');
    revalidatePath(`/recoupement/fiches-ordonnancement/${ficheId}`);
    revalidatePath('/recoupement/transmissions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la transmission de la fiche.';
    return { success: false, error: msg };
  }
}

export async function transmettreFichesDivisionControleAction(ficheIds: string[]): Promise<ActionResponse<{ transmittedIds: string[]; count: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    const parsed = FichesOrdonnancementTransmissionMasseSchema.safeParse({ fiche_ids: ficheIds });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Sélection invalide.' };
    const result = await transmettreFichesDivisionControle(user, parsed.data.fiche_ids);
    revalidatePath('/recoupement/assujettis');
    revalidatePath('/recoupement/fiches-ordonnancement');
    revalidatePath('/recoupement/transmissions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la transmission des fiches.' };
  }
}

/**
 * Récupère les métriques pour le tableau de bord du Bureau Analyse et Recoupement
 */
export async function fetchRecoupementDashboardMetricsAction(): Promise<ActionResponse<RecoupementDashboardMetrics>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Session expirée ou utilisateur non connecté.' };
    }

    const metrics = await getRecoupementDashboardMetrics(user);
    return { success: true, data: metrics };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des métriques de recoupement.';
    return { success: false, error: msg };
  }
}
