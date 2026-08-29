// =============================================================================
// DGRAD CONTROLE - SERVICE CENTRALISÉ DES NOTIFICATIONS INTERNES
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/validations/auth';
import {
  type NotificationFilterInput,
  NotificationFilterSchema,
  NotificationMarkReadSchema,
} from '@/lib/validations/notifications';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  titre: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  lu: boolean;
  created_at: string;
}

export interface CreateNotificationParams {
  userId: string; // Profile ID du destinataire
  type: string;
  titre: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Récupère les notifications pour l'utilisateur actuellement connecté
 */
export async function getUserNotifications(
  user: CurrentUser,
  filter: Partial<NotificationFilterInput> = {}
): Promise<NotificationItem[]> {
  const parsed = NotificationFilterSchema.parse(filter);
  const supabase = createAdminClient();

  let query = supabase
    .from('notifications')
    .select('id, user_id, type, titre, message, entity_type, entity_id, lu, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(parsed.limit || 20);

  if (typeof parsed.lu === 'boolean') {
    query = query.eq('lu', parsed.lu);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[NOTIFICATIONS_ERROR] Échec de récupération des notifications:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    titre: row.titre,
    message: row.message,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    lu: row.lu,
    created_at: row.created_at,
  }));
}

/**
 * Compte le nombre de notifications non lues pour l'utilisateur
 */
export async function getUnreadNotificationsCount(user: CurrentUser): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lu', false);

  if (error) {
    console.error('[NOTIFICATIONS_COUNT_ERROR]:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Marque une notification spécifique comme lue (vérification de propriété anti-IDOR)
 */
export async function markNotificationAsRead(
  user: CurrentUser,
  notificationId: string
): Promise<boolean> {
  NotificationMarkReadSchema.parse({ id: notificationId });
  const supabase = createAdminClient();

  const { data: notification, error: readError } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError || !notification) {
    return false;
  }

  const { error } = await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('id', notificationId)
    .eq('user_id', user.id); // Strict anti-IDOR

  if (error) {
    console.error('[NOTIFICATION_MARK_READ_ERROR]:', error);
    return false;
  }

  return !error;
}

/**
 * Marque toutes les notifications de l'utilisateur comme lues
 */
export async function markAllNotificationsAsRead(user: CurrentUser): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('user_id', user.id)
    .eq('lu', false);

  if (error) {
    console.error('[NOTIFICATIONS_MARK_ALL_READ_ERROR]:', error);
    return false;
  }

  return true;
}

/**
 * Création d'une notification système
 */
export async function createNotification({
  userId,
  type,
  titre,
  message,
  entityType = null,
  entityId = null,
}: CreateNotificationParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      titre,
      message,
      entity_type: entityType,
      entity_id: entityId,
      lu: false,
    });

    if (error) {
      console.error('[CREATE_NOTIFICATION_ERROR]:', error);
    }
  } catch (err) {
    console.error('[UNEXPECTED_NOTIFICATION_ERROR]:', err);
  }
}
