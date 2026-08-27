// =============================================================================
// DGRAD CONTROLE - SERVICE CENTRALISÉ D'AUDIT
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';

export type AuditAction =
  | 'CREATION'
  | 'MODIFICATION'
  | 'ACTIVATION'
  | 'DESACTIVATION'
  | 'CHANGEMENT_ROLE'
  | 'SUPPRESSION_LOGIQUE'
  | 'APPROBATION'
  | 'REJET'
  | 'AFFECTATION'
  | 'CLOTURE';

export interface LogAuditParams {
  userId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Enregistre une opération administrative ou métier dans la table immuable public.audit_logs.
 * Utilise le client d'administration Supabase pour garantir l'écriture même si l'utilisateur a des droits restreints.
 */
export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  oldData = null,
  newData = null,
  ipAddress = null,
  userAgent = null,
}: LogAuditParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[AUDIT_ERROR] Échec d\'écriture dans audit_logs:', error);
    }
  } catch (err) {
    console.error('[AUDIT_UNEXPECTED_ERROR] Erreur inattendue lors de l\'audit:', err);
  }
}
