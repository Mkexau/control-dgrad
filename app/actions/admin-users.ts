'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : GESTION DES UTILISATEURS ET AGENTS (ADMIN)
// =============================================================================

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  UserCreateSchema,
  UserUpdateSchema,
  AgentCreateSchema,
  AgentUpdateSchema,
  ToggleStatusSchema,
  type ActionResponse,
} from '@/lib/validations/admin';

// =============================================================================
// UTILISATEURS & PROFILS
// =============================================================================

export async function createUserAccount(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = UserCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { email, password, nom, prenom, telephone, bureau_id, role, actif } = parseResult.data;
    const adminSupabase = createAdminClient();

    // 1. Vérifier si l'adresse email existe déjà dans profiles
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return { success: false, error: 'Un compte avec cette adresse email existe déjà.' };
    }

    // 2. Si un bureau_id est renseigné, vérifier son existence
    if (bureau_id) {
      const { data: bureauExists } = await adminSupabase
        .from('bureaux')
        .select('id')
        .eq('id', bureau_id)
        .maybeSingle();

      if (!bureauExists) {
        return { success: false, error: 'Le bureau d\'affectation spécifié n\'existe pas.' };
      }
    }

    // 3. Créer l'utilisateur dans Supabase Auth via l'API Admin
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom,
        prenom,
        role,
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Échec de création du compte utilisateur dans Supabase Auth.',
      };
    }

    const newUserId = authData.user.id;

    // 4. Insérer le profil correspondant dans public.profiles
    const { error: profileError } = await adminSupabase.from('profiles').insert({
      id: newUserId,
      auth_user_id: newUserId,
      email,
      nom,
      prenom,
      telephone: telephone || null,
      bureau_id: bureau_id || null,
      role,
      actif,
    });

    if (profileError) {
      // En cas d'erreur sur le profil, supprimer le compte Auth pour préserver la cohérence
      await adminSupabase.auth.admin.deleteUser(newUserId);
      return {
        success: false,
        error: `Erreur lors de la création du profil : ${profileError.message}`,
      };
    }

    // 5. Enregistrer l'événement d'audit
    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'profiles',
      entityId: newUserId,
      newData: { email, nom, prenom, bureau_id, role, actif },
    });

    revalidatePath('/admin/utilisateurs');
    revalidatePath('/admin');

    return {
      success: true,
      message: 'Compte utilisateur créé avec succès.',
      data: { id: newUserId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateUserProfile(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = UserUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, nom, prenom, telephone, bureau_id, role, actif } = parseResult.data;
    const adminSupabase = createAdminClient();

    // Vérifier l'existence de l'utilisateur
    const { data: oldProfile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldProfile) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    // Vérifier le bureau si spécifié
    if (bureau_id) {
      const { data: bureauExists } = await adminSupabase
        .from('bureaux')
        .select('id')
        .eq('id', bureau_id)
        .maybeSingle();

      if (!bureauExists) {
        return { success: false, error: 'Le bureau d\'affectation spécifié n\'existe pas.' };
      }
    }

    const roleChanged = oldProfile.role !== role;

    // Mettre à jour public.profiles
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        nom,
        prenom,
        telephone: telephone || null,
        bureau_id: bureau_id || null,
        role,
        actif,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Mettre à jour les métadonnées auth
    await adminSupabase.auth.admin.updateUserById(id, {
      user_metadata: { nom, prenom, role },
    });

    // Enregistrer l'audit (CHANGEMENT_ROLE si le rôle a changé, sinon MODIFICATION)
    await logAuditEvent({
      userId: adminUser.id,
      action: roleChanged ? 'CHANGEMENT_ROLE' : 'MODIFICATION',
      entityType: 'profiles',
      entityId: id,
      oldData: oldProfile,
      newData: { nom, prenom, telephone, bureau_id, role, actif },
    });

    revalidatePath('/admin/utilisateurs');
    revalidatePath('/admin');

    return { success: true, message: 'Profil utilisateur mis à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleUserStatus(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = ToggleStatusSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return { success: false, error: 'Données invalides.' };
    }

    const { id, actif } = parseResult.data;

    // Empêcher l'administrateur de se désactiver lui-même
    if (id === adminUser.id && !actif) {
      return { success: false, error: 'Vous ne pouvez pas désactiver votre propre compte administrateur.' };
    }

    const adminSupabase = createAdminClient();

    const { data: oldProfile } = await adminSupabase
      .from('profiles')
      .select('id, email, actif')
      .eq('id', id)
      .single();

    if (!oldProfile) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'profiles',
      entityId: id,
      oldData: { actif: oldProfile.actif },
      newData: { actif },
    });

    revalidatePath('/admin/utilisateurs');
    revalidatePath('/admin');

    return { success: true, message: `Compte utilisateur ${actif ? 'activé' : 'désactivé'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

// =============================================================================
// AGENTS
// =============================================================================

export async function createAgent(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = AgentCreateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { profile_id, matricule, specialite, domaine_competence, actif } = parseResult.data;
    const supabase = await createClient();

    // 1. Vérifier que le profil existe et n'a pas déjà un agent rattaché
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', profile_id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Le profil utilisateur spécifié n\'existe pas.' };
    }

    const { data: existingAgentByProfile } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', profile_id)
      .maybeSingle();

    if (existingAgentByProfile) {
      return { success: false, error: 'Un agent est déjà rattaché à ce profil utilisateur.' };
    }

    // 2. Vérifier l'unicité du matricule
    const { data: existingByMatricule } = await supabase
      .from('agents')
      .select('id')
      .eq('matricule', matricule)
      .maybeSingle();

    if (existingByMatricule) {
      return { success: false, error: `Le matricule ${matricule} est déjà attribué à un autre agent.` };
    }

    // 3. Insérer l'agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        profile_id,
        matricule,
        specialite: specialite || null,
        domaine_competence: domaine_competence || null,
        actif,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Erreur lors de l\'enregistrement de l\'agent.' };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'CREATION',
      entityType: 'agents',
      entityId: data.id,
      newData: { profile_id, matricule, specialite, domaine_competence, actif },
    });

    revalidatePath('/admin/agents');
    revalidatePath('/admin');

    return { success: true, message: 'Agent enregistré avec succès.', data: { id: data.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function updateAgent(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    const adminUser = await requireAdmin();
    const parseResult = AgentUpdateSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Données invalides',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, profile_id, matricule, specialite, domaine_competence, actif } = parseResult.data;
    const supabase = await createClient();

    const { data: oldData } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Agent introuvable.' };
    }

    // Vérifier l'unicité du matricule si modifié
    if (oldData.matricule !== matricule) {
      const { data: duplicate } = await supabase
        .from('agents')
        .select('id')
        .eq('matricule', matricule)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: `Le matricule ${matricule} est déjà attribué.` };
      }
    }

    const { error } = await supabase
      .from('agents')
      .update({
        profile_id,
        matricule,
        specialite: specialite || null,
        domaine_competence: domaine_competence || null,
        actif,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'MODIFICATION',
      entityType: 'agents',
      entityId: id,
      oldData,
      newData: { profile_id, matricule, specialite, domaine_competence, actif },
    });

    revalidatePath('/admin/agents');
    revalidatePath('/admin');

    return { success: true, message: 'Agent mis à jour avec succès.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleAgentStatus(
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
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return { success: false, error: 'Agent introuvable.' };
    }

    const { error } = await supabase
      .from('agents')
      .update({ actif, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: actif ? 'ACTIVATION' : 'DESACTIVATION',
      entityType: 'agents',
      entityId: id,
      oldData: { actif: oldData.actif },
      newData: { actif },
    });

    revalidatePath('/admin/agents');
    revalidatePath('/admin');

    return { success: true, message: `Disponibilité de l'agent ${actif ? 'activée' : 'désactivée'} avec succès.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}
