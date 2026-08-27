'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : GESTION DES RÉFÉRENTIELS (ADMIN)
// =============================================================================

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  DirectionCreateSchema,
  DirectionUpdateSchema,
  DivisionCreateSchema,
  DivisionUpdateSchema,
  BureauCreateSchema,
  BureauUpdateSchema,
  SecteurCreateSchema,
  SecteurUpdateSchema,
  ToggleStatusSchema,
  type ActionResponse,
} from '@/lib/validations/admin';

// =============================================================================
// DIRECTIONS
// =============================================================================

export async function createDirection(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = DirectionCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    // Vérifier l'unicité du code
    const { data: existing } = await supabase
      .from('directions')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `Une direction avec le code ${code} existe déjà.`,
      };
    }

    const { data, error } = await supabase
      .from('directions')
      .insert({ code, nom, actif })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de la création de la direction.' };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'directions',
      entityId: data.id,
      newData: { code, nom, actif },
    });

    revalidatePath('/admin/directions');
    revalidatePath('/admin');

    return { success: true, message: 'Direction créée avec succès.', data: { id: data.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateDirection(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = DirectionUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    // Récupérer l'ancien état pour l'audit
    const { data: oldData } = await supabase
      .from('directions')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Direction introuvable.' };
    }

    // Vérifier l'unicité du code si modifié
    if (oldData.code !== code) {
      const { data: duplicate } = await supabase
        .from('directions')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: `Le code ${code} est déjà utilisé par une autre direction.` };
      }
    }

    const { error } = await supabase
      .from('directions')
      .update({ code, nom, actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'MODIFICATION',
      entityType: 'directions',
      entityId: id,
      oldData,
      newData: { code, nom, actif },
    });

    revalidatePath('/admin/directions');
    revalidatePath('/admin');

    return { success: true, message: 'Direction mise à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleDirectionStatus(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = ToggleStatusSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return { success: false, error: 'Identifiant ou statut invalide.' };
    }

    const { id, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('directions')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Direction introuvable.' };
    }

    const { error } = await supabase
      .from('directions')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'directions',
      entityId: id,
      oldData: { actif: oldData.actif },
      newData: { actif },
    });

    revalidatePath('/admin/directions');
    revalidatePath('/admin');

    return { success: true, message: `Direction ${actif ? 'activée' : 'désactivée'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

// =============================================================================
// DIVISIONS
// =============================================================================

export async function createDivision(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = DivisionCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { direction_id, code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    // Vérifier l'existence de la direction parente
    const { data: parentDir } = await supabase
      .from('directions')
      .select('id')
      .eq('id', direction_id)
      .maybeSingle();

    if (!parentDir) {
      return { success: false, error: 'La direction de rattachement spécifiée n\'existe pas.' };
    }

    // Vérifier l'unicité du code
    const { data: existing } = await supabase
      .from('divisions')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Une division avec le code ${code} existe déjà.` };
    }

    const { data, error } = await supabase
      .from('divisions')
      .insert({ direction_id, code, nom, actif })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de la création de la division.' };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'divisions',
      entityId: data.id,
      newData: { direction_id, code, nom, actif },
    });

    revalidatePath('/admin/divisions');
    revalidatePath('/admin');

    return { success: true, message: 'Division créée avec succès.', data: { id: data.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateDivision(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = DivisionUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, direction_id, code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('divisions')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Division introuvable.' };
    }

    if (oldData.code !== code) {
      const { data: duplicate } = await supabase
        .from('divisions')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: `Le code ${code} est déjà utilisé par une autre division.` };
      }
    }

    const { error } = await supabase
      .from('divisions')
      .update({ direction_id, code, nom, actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'MODIFICATION',
      entityType: 'divisions',
      entityId: id,
      oldData,
      newData: { direction_id, code, nom, actif },
    });

    revalidatePath('/admin/divisions');
    revalidatePath('/admin');

    return { success: true, message: 'Division mise à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleDivisionStatus(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = ToggleStatusSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return { success: false, error: 'Données invalides.' };
    }

    const { id, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('divisions')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Division introuvable.' };
    }

    const { error } = await supabase
      .from('divisions')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'divisions',
      entityId: id,
      oldData: { actif: oldData.actif },
      newData: { actif },
    });

    revalidatePath('/admin/divisions');
    revalidatePath('/admin');

    return { success: true, message: `Division ${actif ? 'activée' : 'désactivée'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

// =============================================================================
// BUREAUX
// =============================================================================

export async function createBureau(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = BureauCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { division_id, code, nom, type, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: parentDiv } = await supabase
      .from('divisions')
      .select('id')
      .eq('id', division_id)
      .maybeSingle();

    if (!parentDiv) {
      return { success: false, error: 'La division de rattachement spécifiée n\'existe pas.' };
    }

    const { data: existing } = await supabase
      .from('bureaux')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Un bureau avec le code ${code} existe déjà.` };
    }

    const { data, error } = await supabase
      .from('bureaux')
      .insert({ division_id, code, nom, type, actif })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de la création du bureau.' };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'bureaux',
      entityId: data.id,
      newData: { division_id, code, nom, type, actif },
    });

    revalidatePath('/admin/bureaux');
    revalidatePath('/admin');

    return { success: true, message: 'Bureau créé avec succès.', data: { id: data.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateBureau(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = BureauUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, division_id, code, nom, type, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('bureaux')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Bureau introuvable.' };
    }

    if (oldData.code !== code) {
      const { data: duplicate } = await supabase
        .from('bureaux')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: `Le code ${code} est déjà utilisé par un autre bureau.` };
      }
    }

    const { error } = await supabase
      .from('bureaux')
      .update({ division_id, code, nom, type, actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'MODIFICATION',
      entityType: 'bureaux',
      entityId: id,
      oldData,
      newData: { division_id, code, nom, type, actif },
    });

    revalidatePath('/admin/bureaux');
    revalidatePath('/admin');

    return { success: true, message: 'Bureau mis à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleBureauStatus(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = ToggleStatusSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return { success: false, error: 'Données invalides.' };
    }

    const { id, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('bureaux')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Bureau introuvable.' };
    }

    const { error } = await supabase
      .from('bureaux')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'bureaux',
      entityId: id,
      oldData: { actif: oldData.actif },
      newData: { actif },
    });

    revalidatePath('/admin/bureaux');
    revalidatePath('/admin');

    return { success: true, message: `Bureau ${actif ? 'activé' : 'désactivé'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

// =============================================================================
// SECTEURS
// =============================================================================

export async function createSecteur(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = SecteurCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { bureau_id, code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: parentBureau } = await supabase
      .from('bureaux')
      .select('id')
      .eq('id', bureau_id)
      .maybeSingle();

    if (!parentBureau) {
      return { success: false, error: 'Le bureau de rattachement spécifié n\'existe pas.' };
    }

    const { data: existing } = await supabase
      .from('secteurs')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Un secteur avec le code ${code} existe déjà.` };
    }

    const { data, error } = await supabase
      .from('secteurs')
      .insert({ bureau_id, code, nom, actif })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de la création du secteur.' };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'secteurs',
      entityId: data.id,
      newData: { bureau_id, code, nom, actif },
    });

    revalidatePath('/admin/secteurs');
    revalidatePath('/admin');

    return { success: true, message: 'Secteur créé avec succès.', data: { id: data.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateSecteur(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = SecteurUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, bureau_id, code, nom, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('secteurs')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Secteur introuvable.' };
    }

    if (oldData.code !== code) {
      const { data: duplicate } = await supabase
        .from('secteurs')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: `Le code ${code} est déjà utilisé par un autre secteur.` };
      }
    }

    const { error } = await supabase
      .from('secteurs')
      .update({ bureau_id, code, nom, actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'MODIFICATION',
      entityType: 'secteurs',
      entityId: id,
      oldData,
      newData: { bureau_id, code, nom, actif },
    });

    revalidatePath('/admin/secteurs');
    revalidatePath('/admin');

    return { success: true, message: 'Secteur mis à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleSecteurStatus(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = ToggleStatusSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return { success: false, error: 'Données invalides.' };
    }

    const { id, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('secteurs')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Secteur introuvable.' };
    }

    const { error } = await supabase
      .from('secteurs')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'secteurs',
      entityId: id,
      oldData: { actif: oldData.actif },
      newData: { actif },
    });

    revalidatePath('/admin/secteurs');
    revalidatePath('/admin');

    return { success: true, message: `Secteur ${actif ? 'activé' : 'désactivé'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}
