// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : RÉSULTATS, REDRESSEMENTS, PÉNALITÉS & AVIS
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import {
  ResultatSaveSchema,
  RedressementAddSchema,
  RedressementDeleteSchema,
  PenaliteAddSchema,
  PenaliteDeleteSchema,
  AvisRecouvrementGenerateSchema,
  type ResultatSaveInput,
  type RedressementAddInput,
  type RedressementDeleteInput,
  type PenaliteAddInput,
  type PenaliteDeleteInput,
  type AvisRecouvrementGenerateInput,
} from '@/lib/validations/results';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Enregistrement (Création ou Mise à jour) du résultat d'un contrôle
 */
export async function saveResultatControle(
  input: ResultatSaveInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    // Séparation des pouvoirs (RM-025) : ADMIN n'effectue pas de décision métier
    if (currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Action non autorisée : un administrateur technique ne peut pas saisir de résultat métier.',
      };
    }

    const parsed = ResultatSaveSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Données financières invalides.';
      return { success: false, error: msg };
    }

    const {
      controle_id,
      type_resultat,
      devise,
      montant_du,
      montant_penalites,
      montant_total,
      justification,
      redressements,
      penalites,
    } = parsed.data;

    const supabase = createAdminClient();

    // 1. Récupérer le contrôle avec la mission et l'équipe
    const { data: controle, error: ctrlErr } = await supabase
      .from('controles')
      .select(`
        id, statut, type_controle, equipe_id, assujetti_id, controleur_responsable_id,
        missions(id, reference, bureau_id, statut),
        equipes(id, chef_equipe_id, statut)
      `)
      .eq('id', controle_id)
      .single();

    if (ctrlErr || !controle) {
      return { success: false, error: 'Contrôle introuvable.' };
    }

    const mission = Array.isArray(controle.missions) ? controle.missions[0] : controle.missions;
    const equipe = Array.isArray(controle.equipes) ? controle.equipes[0] : controle.equipes;

    // 2. Vérifier l'état du contrôle
    if (controle.statut === 'EN_ATTENTE') {
      return {
        success: false,
        error: 'Le contrôle doit être démarré (EN_COURS ou TERMINE) pour enregistrer un résultat.',
      };
    }
    if (controle.statut === 'ANNULE') {
      return { success: false, error: 'Impossible de saisir un résultat pour un contrôle annulé.' };
    }

    // 3. Vérification des autorisations et périmètre (anti-IDOR)
    const { data: userAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    const isChefEquipe =
      controle.type_controle === 'SUR_PLACE' &&
      userAgent?.id &&
      equipe &&
      equipe.chef_equipe_id === userAgent.id;

    const isControleurPieces =
      controle.type_controle === 'SUR_PIECES' &&
      controle.controleur_responsable_id === currentUser.id;

    const isHierarchyInPerimeter =
      ['CHEF_BUREAU', 'CHEF_DIVISION', 'DIRECTEUR_CONTROLES', 'DIRECTEUR_GENERAL'].includes(
        currentUser.role
      ) &&
      (currentUser.role === 'DIRECTEUR_GENERAL' ||
        currentUser.role === 'DIRECTEUR_CONTROLES' ||
        !currentUser.bureau_id ||
        currentUser.bureau_id === mission?.bureau_id);

    if (!isChefEquipe && !isControleurPieces && !isHierarchyInPerimeter) {
      return {
        success: false,
        error: 'Action non autorisée : vous n’êtes pas le responsable désigné pour ce contrôle.',
      };
    }

    // 4. Calculer les montants selon le type de résultat
    const finalMontantDu = type_resultat === 'DECHARGEE' ? 0 : Number(montant_du ?? 0);
    const finalMontantPenalites = type_resultat === 'DECHARGEE' ? 0 : Number(montant_penalites ?? 0);
    const finalMontantTotal = type_resultat === 'DECHARGEE' ? 0 : Number(montant_total ?? (finalMontantDu + finalMontantPenalites));
    const finalJustification = type_resultat === 'DECHARGEE' ? justification?.trim() || null : justification?.trim() || null;

    // 5. Vérifier s'il existe déjà un résultat pour ce contrôle (Idempotence)
    const { data: existingResultat } = await supabase
      .from('resultats_controle')
      .select('id, type_resultat, montant_total, devise')
      .eq('controle_id', controle_id)
      .maybeSingle();

    let resultatId: string;

    if (existingResultat) {
      resultatId = existingResultat.id;
      const { error: updateErr } = await supabase
        .from('resultats_controle')
        .update({
          type_resultat,
          devise,
          montant_du: finalMontantDu,
          montant_penalites: finalMontantPenalites,
          montant_total: finalMontantTotal,
          justification: finalJustification,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resultatId);

      if (updateErr) {
        return { success: false, error: `Erreur mise à jour résultat : ${updateErr.message}` };
      }
    } else {
      const { data: newRes, error: insertErr } = await supabase
        .from('resultats_controle')
        .insert({
          controle_id,
          type_resultat,
          devise,
          montant_du: finalMontantDu,
          montant_penalites: finalMontantPenalites,
          montant_total: finalMontantTotal,
          justification: finalJustification,
        })
        .select('id')
        .single();

      if (insertErr || !newRes) {
        return { success: false, error: `Erreur enregistrement résultat : ${insertErr?.message}` };
      }
      resultatId = newRes.id;
    }

    // 6. Si des redressements sont fournis, les insérer
    if (type_resultat === 'CHARGEE' && redressements && redressements.length > 0) {
      for (const red of redressements) {
        if (!red.id) {
          await supabase.from('redressements').insert({
            resultat_id: resultatId,
            montant: red.montant,
            devise,
            motif: red.motif,
            statut: red.statut || 'CONSTATE',
          });
        }
      }
    }

    // 7. Si des pénalités sont fournies, les insérer
    if (type_resultat === 'CHARGEE' && penalites && penalites.length > 0) {
      for (const pen of penalites) {
        if (!pen.id) {
          await supabase.from('penalites').insert({
            resultat_id: resultatId,
            montant: pen.montant,
            devise,
            motif: pen.motif,
          });
        }
      }
    }

    // 8. Audit log
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: existingResultat ? 'MODIFICATION_RESULTAT' : 'CREATION_RESULTAT',
      entity_type: 'resultats_controle',
      entity_id: resultatId,
      old_data: existingResultat ? { ...existingResultat } : null,
      new_data: {
        controle_id,
        type_resultat,
        devise,
        montant_du: finalMontantDu,
        montant_penalites: finalMontantPenalites,
        montant_total: finalMontantTotal,
      },
    });

    revalidatePath(`/controles/${controle_id}`);
    if (mission?.id) {
      revalidatePath(`/missions/${mission.id}`);
    }

    return { success: true, data: { id: resultatId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Ajout individuel d'un poste de redressement
 */
export async function addRedressement(
  input: RedressementAddInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Action non autorisée pour un administrateur technique.' };
    }

    const parsed = RedressementAddSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const { resultat_id, montant, devise, motif, statut } = parsed.data;
    const supabase = createAdminClient();

    // Vérifier que le résultat existe et a la même devise
    const { data: res, error: resErr } = await supabase
      .from('resultats_controle')
      .select('id, devise, controle_id')
      .eq('id', resultat_id)
      .single();

    if (resErr || !res) {
      return { success: false, error: 'Résultat de contrôle introuvable.' };
    }

    if (res.devise !== devise) {
      return {
        success: false,
        error: `La devise du redressement (${devise}) doit correspondre à celle du résultat (${res.devise}).`,
      };
    }

    const { data: red, error: insErr } = await supabase
      .from('redressements')
      .insert({
        resultat_id,
        montant,
        devise,
        motif,
        statut: statut || 'CONSTATE',
      })
      .select('id')
      .single();

    if (insErr || !red) {
      return { success: false, error: `Erreur ajout redressement : ${insErr?.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'AJOUT_REDRESSEMENT',
      entity_type: 'redressements',
      entity_id: red.id,
      new_data: { resultat_id, montant, devise, motif },
    });

    revalidatePath(`/controles/${res.controle_id}`);
    return { success: true, data: { id: red.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Suppression d'un poste de redressement
 */
export async function deleteRedressement(
  input: RedressementDeleteInput
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Action non autorisée pour un administrateur technique.' };
    }

    const parsed = RedressementDeleteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Identifiant invalide.' };
    }

    const supabase = createAdminClient();
    const { data: red, error: redErr } = await supabase
      .from('redressements')
      .select('id, resultat_id, resultats_controle(controle_id)')
      .eq('id', parsed.data.redressement_id)
      .single();

    if (redErr || !red) {
      return { success: false, error: 'Redressement introuvable.' };
    }

    const { error: delErr } = await supabase
      .from('redressements')
      .delete()
      .eq('id', parsed.data.redressement_id);

    if (delErr) {
      return { success: false, error: `Erreur suppression : ${delErr.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'SUPPRESSION_REDRESSEMENT',
      entity_type: 'redressements',
      entity_id: parsed.data.redressement_id,
      old_data: { ...red },
    });

    const ctrlId = (red.resultats_controle as unknown as { controle_id?: string })?.controle_id;
    if (ctrlId) {
      revalidatePath(`/controles/${ctrlId}`);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Ajout individuel d'une pénalité (sans formule inventée, conforme QM-023)
 */
export async function addPenalite(
  input: PenaliteAddInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Action non autorisée pour un administrateur technique.' };
    }

    const parsed = PenaliteAddSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Données invalides.' };
    }

    const { resultat_id, montant, devise, motif } = parsed.data;
    const supabase = createAdminClient();

    const { data: res, error: resErr } = await supabase
      .from('resultats_controle')
      .select('id, devise, controle_id')
      .eq('id', resultat_id)
      .single();

    if (resErr || !res) {
      return { success: false, error: 'Résultat de contrôle introuvable.' };
    }

    if (res.devise !== devise) {
      return {
        success: false,
        error: `La devise de la pénalité (${devise}) doit correspondre à celle du résultat (${res.devise}).`,
      };
    }

    const { data: pen, error: insErr } = await supabase
      .from('penalites')
      .insert({
        resultat_id,
        montant,
        devise,
        motif,
      })
      .select('id')
      .single();

    if (insErr || !pen) {
      return { success: false, error: `Erreur ajout pénalité : ${insErr?.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'AJOUT_PENALITE',
      entity_type: 'penalites',
      entity_id: pen.id,
      new_data: { resultat_id, montant, devise, motif },
    });

    revalidatePath(`/controles/${res.controle_id}`);
    return { success: true, data: { id: pen.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Suppression d'une pénalité
 */
export async function deletePenalite(
  input: PenaliteDeleteInput
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Action non autorisée pour un administrateur technique.' };
    }

    const parsed = PenaliteDeleteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Identifiant invalide.' };
    }

    const supabase = createAdminClient();
    const { data: pen, error: penErr } = await supabase
      .from('penalites')
      .select('id, resultat_id, resultats_controle(controle_id)')
      .eq('id', parsed.data.penalite_id)
      .single();

    if (penErr || !pen) {
      return { success: false, error: 'Pénalité introuvable.' };
    }

    const { error: delErr } = await supabase
      .from('penalites')
      .delete()
      .eq('id', parsed.data.penalite_id);

    if (delErr) {
      return { success: false, error: `Erreur suppression : ${delErr.message}` };
    }

    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'SUPPRESSION_PENALITE',
      entity_type: 'penalites',
      entity_id: parsed.data.penalite_id,
      old_data: { ...pen },
    });

    const ctrlId = (pen.resultats_controle as unknown as { controle_id?: string })?.controle_id;
    if (ctrlId) {
      revalidatePath(`/controles/${ctrlId}`);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Génération de l'avis de recouvrement pour un résultat CHARGEE
 */
export async function genererAvisRecouvrement(
  input: AvisRecouvrementGenerateInput
): Promise<ActionResponse<{ id: string; reference: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Action non autorisée pour un administrateur technique.' };
    }

    const parsed = AvisRecouvrementGenerateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Identifiant invalide.' };
    }

    const supabase = createAdminClient();

    // 1. Récupérer le résultat
    const { data: res, error: resErr } = await supabase
      .from('resultats_controle')
      .select('id, type_resultat, montant_total, devise, controle_id')
      .eq('id', parsed.data.resultat_id)
      .single();

    if (resErr || !res) {
      return { success: false, error: 'Résultat de contrôle introuvable.' };
    }

    if (res.type_resultat !== 'CHARGEE') {
      return {
        success: false,
        error: 'Un avis de recouvrement ne peut être émis que pour un résultat CHARGÉE avec montant dû.',
      };
    }

    if (!res.montant_total || Number(res.montant_total) <= 0) {
      return {
        success: false,
        error: 'Le montant total du résultat doit être strictement supérieur à 0 pour générer un avis de recouvrement.',
      };
    }

    // 2. Vérifier si un avis existe déjà (Idempotence)
    const { data: existingAvis } = await supabase
      .from('avis_recouvrement')
      .select('id, reference')
      .eq('resultat_id', res.id)
      .maybeSingle();

    if (existingAvis) {
      return {
        success: true,
        data: { id: existingAvis.id, reference: existingAvis.reference },
      };
    }

    // 3. Générer une référence unique
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('avis_recouvrement')
      .select('*', { count: 'exact', head: true });

    const seq = (count ?? 0) + 1;
    const reference = `AVR-${year}-${String(seq).padStart(6, '0')}`;

    // 4. Insérer l'avis de recouvrement
    const { data: newAvis, error: insErr } = await supabase
      .from('avis_recouvrement')
      .insert({
        resultat_id: res.id,
        reference,
        date: new Date().toISOString().split('T')[0],
        montant: res.montant_total,
        devise: res.devise,
      })
      .select('id, reference')
      .single();

    if (insErr || !newAvis) {
      return { success: false, error: `Erreur création avis : ${insErr?.message}` };
    }

    // 5. Audit
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'GENERATION_AVIS_RECOUVREMENT',
      entity_type: 'avis_recouvrement',
      entity_id: newAvis.id,
      new_data: {
        resultat_id: res.id,
        reference: newAvis.reference,
        montant: res.montant_total,
        devise: res.devise,
      },
    });

    revalidatePath(`/controles/${res.controle_id}`);
    return { success: true, data: { id: newAvis.id, reference: newAvis.reference } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
