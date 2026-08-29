// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : NOTIFICATIONS INTERNES
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  type NotificationFilterInput,
  NotificationFilterSchema,
  NotificationMarkReadSchema,
} from '@/lib/validations/notifications';
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from '@/lib/notifications/notification-service';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Récupère les notifications pour l'utilisateur actuel
 */
export async function fetchNotificationsAction(
  filter: Partial<NotificationFilterInput> = {}
): Promise<ActionResponse<NotificationItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    const parsed = NotificationFilterSchema.safeParse(filter);
    if (!parsed.success) {
      return { success: false, error: 'Filtres de notification invalides.' };
    }

    const items = await getUserNotifications(user, parsed.data);
    return { success: true, data: items };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors de la récupération des notifications.';
    return { success: false, error: msg };
  }
}

/**
 * Récupère le nombre de notifications non lues
 */
export async function fetchUnreadCountAction(): Promise<ActionResponse<number>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    const count = await getUnreadNotificationsCount(user);
    return { success: true, data: count };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du calcul du nombre de notifications.';
    return { success: false, error: msg };
  }
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsReadAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    const parsed = NotificationMarkReadSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: 'Identifiant de notification invalide.' };
    }

    const ok = await markNotificationAsRead(user, parsed.data.id);
    revalidatePath('/notifications');
    return { success: true, data: ok };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du marquage de la notification.';
    return { success: false, error: msg };
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    const ok = await markAllNotificationsAsRead(user);
    revalidatePath('/notifications');
    return { success: true, data: ok };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur lors du marquage général.';
    return { success: false, error: msg };
  }
}
