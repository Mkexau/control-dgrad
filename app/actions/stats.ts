'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : STATISTIQUES DU TABLEAU DE BORD (ÉTAPE 12)
// =============================================================================

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { StatsFilterSchema, type StatsFilterInput } from '@/lib/validations/stats';
import {
  getDashboardMetrics,
  type DashboardMetrics,
} from '@/lib/stats/stats-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Récupère l'ensemble des métriques et indicateurs du tableau de bord exécutif
 * en validant les filtres d'entrée et en appliquant le périmètre organisationnel de l'utilisateur.
 */
export async function fetchDashboardMetrics(
  filters: StatsFilterInput = {}
): Promise<ActionResponse<DashboardMetrics>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    const parsed = StatsFilterSchema.safeParse(filters);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Filtres statistiques invalides.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Protection anti-IDOR : si l'utilisateur n'a pas un rôle global, empêcher le filtrage sur un autre bureau
    const isGlobalRole = [
      'DIRECTEUR_GENERAL',
      'DIRECTEUR_CONTROLES',
      'CHEF_DIVISION',
      'ADMIN',
    ].includes(currentUser.role);

    if (!isGlobalRole && parsed.data.bureau_id && parsed.data.bureau_id !== currentUser.bureau_id) {
      return {
        success: false,
        error: 'Accès refusé : vous ne pouvez pas consulter les statistiques d\'un autre bureau de contrôle.',
      };
    }

    const metrics = await getDashboardMetrics(currentUser, parsed.data);

    return {
      success: true,
      data: metrics,
    };
  } catch (err) {
    console.error('Erreur fetchDashboardMetrics:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors du calcul des statistiques.',
    };
  }
}
