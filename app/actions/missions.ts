'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : MODULE MISSIONS & WORKFLOWS MÉTIER
// =============================================================================

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  MissionCreateSchema,
  MissionSubmitSchema,
  MissionValidationDecisionSchema,
  MissionDesignateControleurSchema,
  MissionResetToDraftSchema,
  type MissionCreateInput,
  type MissionStatus,
} from '@/lib/validations/missions';
import {
  validateTransitionPermissions,
  formatMissionReference,
} from '@/lib/workflow/mission-workflow';
import {
  generateAndStoreOrdreMission,
  generateAndStoreAutorisationPieces,
  getSignedDocumentUrl,
  type OrdreMissionData,
  type AutorisationPiecesData,
} from '@/lib/documents/document-generator';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * 1. Création d'une nouvelle mission (SUR_PLACE ou SUR_PIECES)
 */
export async function createMission(
  input: MissionCreateInput
): Promise<ActionResponse<{ id: string; reference: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données de la mission invalides.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Interdiction pour ADMIN de créer des missions métier
  if (currentUser.role === 'ADMIN') {
    return { success: false, error: 'L\'administrateur technique ne peut pas créer de mission métier.' };
  }

  const { type_controle, bureau_id, secteur_id, motif, assujettis_ids, equipes_propositions } = parsed.data;
  const adminSupabase = createAdminClient();

  try {
    // RM-001 : Vérifier la compétence du secteur rattaché au bureau
    if (secteur_id) {
      const { data: secteur } = await adminSupabase
        .from('secteurs')
        .select('id, bureau_id, actif')
        .eq('id', secteur_id)
        .single();

      if (!secteur || secteur.bureau_id !== bureau_id) {
        return {
          success: false,
          error: 'Le secteur sélectionné ne relève pas de la compétence du Bureau de contrôle désigné (RM-001).',
        };
      }
    }

    // Calculer le numéro de référence unique MIS-YYYY-NNNNNN
    const { count } = await adminSupabase
      .from('missions')
      .select('*', { count: 'exact', head: true });

    const sequence = (count ?? 0) + 1;
    const reference = formatMissionReference(sequence);

    // 1. Créer la mission
    const { data: mission, error: missionError } = await adminSupabase
      .from('missions')
      .insert({
        reference,
        type_controle,
        bureau_id,
        secteur_id: secteur_id || null,
        created_by: currentUser.id,
        statut: 'BROUILLON',
        motif,
      })
      .select('id, reference')
      .single();

    if (missionError || !mission) {
      console.error('Erreur création mission:', missionError);
      return { success: false, error: 'Échec de la création du dossier de mission.' };
    }

    // 2. Associer les assujettis à la mission
    const assujettisInserts = assujettis_ids.map((assujetti_id, idx) => ({
      mission_id: mission.id,
      assujetti_id,
      ordre: idx + 1,
      statut: 'A_CONTROLER',
    }));

    const { error: assError } = await adminSupabase
      .from('mission_assujettis')
      .insert(assujettisInserts);

    if (assError) {
      console.error('Erreur association assujettis:', assError);
    }

    // 3. Pour SUR_PLACE, créer les propositions d'équipes et affectations
    if (type_controle === 'SUR_PLACE' && equipes_propositions && equipes_propositions.length > 0) {
      for (const eq of equipes_propositions) {
        const { data: equipeRecord, error: eqError } = await adminSupabase
          .from('equipes')
          .insert({
            mission_id: mission.id,
            nom: eq.nom,
            chef_equipe_id: eq.chef_equipe_id,
            statut: 'PROPOSEE',
          })
          .select('id')
          .single();

        if (equipeRecord && !eqError) {
          // Rattacher les agents
          const agentsInserts = eq.agents_ids.map((agent_id) => ({
            equipe_id: equipeRecord.id,
            agent_id,
          }));
          await adminSupabase.from('equipe_agents').insert(agentsInserts);

          // Rattacher les assujettis
          const assEquipeInserts = eq.assujettis_ids.map((assujetti_id) => ({
            equipe_id: equipeRecord.id,
            assujetti_id,
          }));
          await adminSupabase.from('equipe_assujettis').insert(assEquipeInserts);
        }
      }
    }

    // 4. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'CREATION',
      entityType: 'missions',
      entityId: mission.id,
      newData: {
        reference: mission.reference,
        type_controle,
        bureau_id,
        secteur_id,
        assujettis_count: assujettis_ids.length,
      },
    });

    revalidatePath('/missions');
    return { success: true, data: { id: mission.id, reference: mission.reference } };
  } catch (err) {
    console.error('Erreur inattendue createMission:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 2. Soumission hiérarchique d'une mission
 */
export async function submitMission(
  input: { mission_id: string }
): Promise<ActionResponse<{ id: string; statut: MissionStatus }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionSubmitSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Identifiant de mission invalide.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission, error } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut')
      .eq('id', parsed.data.mission_id)
      .single();

    if (error || !mission) {
      return { success: false, error: 'Mission introuvable.' };
    }

    const nextStatus: MissionStatus =
      mission.type_controle === 'SUR_PLACE' ? 'SOUMISE' : 'DEMANDE_SOUMISE';

    // Vérifier les permissions de transition
    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      nextStatus,
      mission.type_controle,
      mission.bureau_id
    );

    // Mettre à jour le statut
    const { error: updateError } = await adminSupabase
      .from('missions')
      .update({
        statut: nextStatus,
        date_soumission: new Date().toISOString(),
      })
      .eq('id', mission.id);

    if (updateError) {
      return { success: false, error: 'Échec de la soumission de la mission.' };
    }

    // Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'SOUMISSION',
      entityType: 'missions',
      entityId: mission.id,
      oldData: { statut: mission.statut },
      newData: { statut: nextStatus },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { id: mission.id, statut: nextStatus } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 3. Examen et transmission par le Chef de Division Contrôle (SUR_PLACE)
 */
export async function examineDivision(
  input: { mission_id: string; decision: 'APPROUVE' | 'REJETE'; motif?: string; commentaire?: string }
): Promise<ActionResponse<{ statut: MissionStatus }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionValidationDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Données de validation invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut')
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.type_controle !== 'SUR_PLACE') {
      return { success: false, error: 'Mission introuvable ou non compatible avec le parcours SUR_PLACE.' };
    }

    const nextStatus: MissionStatus =
      parsed.data.decision === 'APPROUVE' ? 'EXAMEN_DIRECTEUR_CONTROLES' : 'REJETEE';

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      nextStatus,
      'SUR_PLACE',
      mission.bureau_id
    );

    // 1. Enregistrer la validation
    await adminSupabase.from('mission_validations').insert({
      mission_id: mission.id,
      type_validation: 'CHEF_DIVISION',
      validateur_id: currentUser.id,
      statut: parsed.data.decision,
      motif: parsed.data.motif || null,
      commentaire: parsed.data.commentaire || null,
    });

    // 2. Mettre à jour la mission
    await adminSupabase
      .from('missions')
      .update({ statut: nextStatus })
      .eq('id', mission.id);

    // 3. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: parsed.data.decision === 'APPROUVE' ? 'EXAMEN_CHEF_DIVISION' : 'REJET_CHEF_DIVISION',
      entityType: 'missions',
      entityId: mission.id,
      oldData: { statut: mission.statut },
      newData: { statut: nextStatus, motif: parsed.data.motif },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { statut: nextStatus } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 4. Examen et transmission par le Directeur des Contrôles (SUR_PLACE)
 */
export async function examineDirecteur(
  input: { mission_id: string; decision: 'APPROUVE' | 'REJETE'; motif?: string; commentaire?: string }
): Promise<ActionResponse<{ statut: MissionStatus }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionValidationDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Données de validation invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut')
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.type_controle !== 'SUR_PLACE') {
      return { success: false, error: 'Mission introuvable ou non compatible avec le parcours SUR_PLACE.' };
    }

    const nextStatus: MissionStatus =
      parsed.data.decision === 'APPROUVE' ? 'ATTENTE_DG' : 'REJETEE';

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      nextStatus,
      'SUR_PLACE',
      mission.bureau_id
    );

    // 1. Enregistrer la validation
    await adminSupabase.from('mission_validations').insert({
      mission_id: mission.id,
      type_validation: 'DIRECTEUR_CONTROLES',
      validateur_id: currentUser.id,
      statut: parsed.data.decision,
      motif: parsed.data.motif || null,
      commentaire: parsed.data.commentaire || null,
    });

    // 2. Mettre à jour la mission
    await adminSupabase
      .from('missions')
      .update({ statut: nextStatus })
      .eq('id', mission.id);

    // 3. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: parsed.data.decision === 'APPROUVE' ? 'EXAMEN_DIRECTEUR_CONTROLES' : 'REJET_DIRECTEUR_CONTROLES',
      entityType: 'missions',
      entityId: mission.id,
      oldData: { statut: mission.statut },
      newData: { statut: nextStatus, motif: parsed.data.motif },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { statut: nextStatus } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 5. Décision du Directeur Général (SUR_PLACE : Approbation ou Rejet)
 */
export async function decideDG(
  input: { mission_id: string; decision: 'APPROUVE' | 'REJETE'; motif?: string; commentaire?: string }
): Promise<ActionResponse<{ statut: MissionStatus; ordreMissionRef?: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionValidationDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Données de validation invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, secteur_id, statut, motif, bureaux(nom), secteurs(nom)')
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.type_controle !== 'SUR_PLACE') {
      return { success: false, error: 'Mission introuvable ou non compatible avec le parcours SUR_PLACE.' };
    }

    const nextStatus: MissionStatus =
      parsed.data.decision === 'APPROUVE' ? 'APPROUVEE' : 'REJETEE';

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      nextStatus,
      'SUR_PLACE',
      mission.bureau_id
    );

    const now = new Date();

    // 1. Enregistrer la validation DG
    await adminSupabase.from('mission_validations').insert({
      mission_id: mission.id,
      type_validation: 'DG',
      validateur_id: currentUser.id,
      statut: parsed.data.decision,
      motif: parsed.data.motif || null,
      commentaire: parsed.data.commentaire || null,
    });

    if (parsed.data.decision === 'APPROUVE') {
      // 2. Confirmer les équipes proposées
      await adminSupabase
        .from('equipes')
        .update({ statut: 'CONFIRMEE', updated_at: now.toISOString() })
        .eq('mission_id', mission.id);

      // 3. Mettre à jour le statut de la mission
      await adminSupabase
        .from('missions')
        .update({
          statut: 'ORDRE_MISSION_GENERE',
          date_approbation: now.toISOString(),
        })
        .eq('id', mission.id);

      // 4. Charger les équipes complètes pour l'ordre de mission
      const { data: equipes } = await adminSupabase
        .from('equipes')
        .select(`
          id, nom,
          agents!equipes_chef_equipe_id_fkey(
            matricule,
            profiles(nom, prenom)
          ),
          equipe_agents(
            agents(
              matricule,
              profiles(nom, prenom)
            )
          ),
          equipe_assujettis(
            assujettis(nom_raison_sociale, identifiant)
          )
        `)
        .eq('mission_id', mission.id);

      const formattedEquipes = (equipes || []).map((eq) => {
        const chefProfile = (eq.agents as unknown as { matricule: string; profiles: { nom: string; prenom: string } })?.profiles;
        const chefMatricule = (eq.agents as unknown as { matricule: string })?.matricule || 'N/A';

        const agentsList = ((eq.equipe_agents as unknown as { agents: { matricule: string; profiles: { nom: string; prenom: string } } }[]) || []).map((ea) => ({
          nom: ea.agents?.profiles?.nom || 'N/A',
          prenom: ea.agents?.profiles?.prenom || '',
          matricule: ea.agents?.matricule || 'N/A',
        }));

        const assujettisList = ((eq.equipe_assujettis as unknown as { assujettis: { nom_raison_sociale: string; identifiant: string } }[]) || []).map((eas) => ({
          nom_raison_sociale: eas.assujettis?.nom_raison_sociale || 'N/A',
          identifiant: eas.assujettis?.identifiant || 'N/A',
        }));

        return {
          nom: eq.nom,
          chefEquipe: {
            nom: chefProfile?.nom || 'N/A',
            prenom: chefProfile?.prenom || '',
            matricule: chefMatricule,
          },
          agents: agentsList,
          assujettis: assujettisList,
        };
      });

      const ordreMissionPayload: OrdreMissionData = {
        missionId: mission.id,
        missionReference: mission.reference,
        bureauNom: (mission.bureaux as unknown as { nom: string })?.nom || 'Bureau de contrôle DGRAD',
        secteurNom: (mission.secteurs as unknown as { nom: string })?.nom || 'Secteur de contrôle',
        motif: mission.motif || 'Contrôle non fiscal des assujettis',
        directeurGeneralNom: `${currentUser.nom || 'Directeur'} ${currentUser.prenom || 'Général'}`,
        dateApprobation: now,
        equipes: formattedEquipes,
        userId: currentUser.id,
      };

      // 5. Générer l'ordre de mission
      const docResult = await generateAndStoreOrdreMission(ordreMissionPayload);

      // 6. Initialiser les contrôles opérationnels pour chaque assujetti rattaché à chaque équipe confirmée
      for (const eq of equipes || []) {
        const assujettisForEquipe = (eq.equipe_assujettis as unknown as { assujetti_id: string }[]) || [];
        for (const ass of assujettisForEquipe) {
          // Vérifier s'il existe déjà pour éviter doublon
          const { data: existingCtrl } = await adminSupabase
            .from('controles')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('equipe_id', eq.id)
            .eq('assujetti_id', ass.assujetti_id)
            .maybeSingle();

          if (!existingCtrl) {
            await adminSupabase.from('controles').insert({
              mission_id: mission.id,
              equipe_id: eq.id,
              assujetti_id: ass.assujetti_id,
              type_controle: 'SUR_PLACE',
              statut: 'EN_ATTENTE',
            });
          }
        }
      }

      // 7. Passer à EQUIPES_AFFECTEES
      await adminSupabase
        .from('missions')
        .update({ statut: 'EQUIPES_AFFECTEES' })
        .eq('id', mission.id);

      // 8. Audit
      await logAuditEvent({
        userId: currentUser.id,
        action: 'APPROBATION_DG',
        entityType: 'missions',
        entityId: mission.id,
        oldData: { statut: mission.statut },
        newData: {
          statut: 'EQUIPES_AFFECTEES',
          ordre_mission_ref: docResult.reference,
        },
      });

      revalidatePath('/missions');
      revalidatePath(`/missions/${mission.id}`);
      return { success: true, data: { statut: 'EQUIPES_AFFECTEES', ordreMissionRef: docResult.reference } };
    } else {
      // Rejet DG
      await adminSupabase
        .from('missions')
        .update({ statut: 'REJETEE' })
        .eq('id', mission.id);

      await logAuditEvent({
        userId: currentUser.id,
        action: 'REJET_DG',
        entityType: 'missions',
        entityId: mission.id,
        oldData: { statut: mission.statut },
        newData: { statut: 'REJETEE', motif: parsed.data.motif },
      });

      revalidatePath('/missions');
      revalidatePath(`/missions/${mission.id}`);
      return { success: true, data: { statut: 'REJETEE' } };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 6. Décision du Chef de Bureau (SUR_PIECES : Approbation ou Rejet)
 */
export async function decideChefBureau(
  input: { mission_id: string; decision: 'APPROUVE' | 'REJETE'; motif?: string; commentaire?: string }
): Promise<ActionResponse<{ statut: MissionStatus; autorisationRef?: string }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionValidationDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Données de validation invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select(`
        id, reference, type_controle, bureau_id, secteur_id, statut, motif,
        bureaux(nom), secteurs(nom),
        mission_assujettis(
          assujettis(nom_raison_sociale, identifiant)
        )
      `)
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.type_controle !== 'SUR_PIECES') {
      return { success: false, error: 'Mission introuvable ou non compatible avec le parcours SUR_PIECES.' };
    }

    const nextStatus: MissionStatus =
      parsed.data.decision === 'APPROUVE' ? 'APPROUVEE' : 'REJETEE';

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      nextStatus,
      'SUR_PIECES',
      mission.bureau_id
    );

    const now = new Date();

    // 1. Enregistrer la validation
    const { data: validationRecord } = await adminSupabase
      .from('mission_validations')
      .insert({
        mission_id: mission.id,
        type_validation: 'CHEF_BUREAU',
        validateur_id: currentUser.id,
        statut: parsed.data.decision,
        motif: parsed.data.motif || null,
        commentaire: parsed.data.commentaire || null,
      })
      .select('id')
      .single();

    if (parsed.data.decision === 'APPROUVE') {
      // 2. Mettre à jour le statut
      await adminSupabase
        .from('missions')
        .update({
          statut: 'AUTORISATION_GENEREE',
          date_approbation: now.toISOString(),
        })
        .eq('id', mission.id);

      const assujettisList = ((mission.mission_assujettis as unknown as { assujettis: { nom_raison_sociale: string; identifiant: string } }[]) || []).map((ma) => ({
        nom_raison_sociale: ma.assujettis?.nom_raison_sociale || 'N/A',
        identifiant: ma.assujettis?.identifiant || 'N/A',
      }));

      const autorisationPayload: AutorisationPiecesData = {
        missionId: mission.id,
        validationId: validationRecord?.id || mission.id,
        missionReference: mission.reference,
        bureauNom: (mission.bureaux as unknown as { nom: string })?.nom || 'Bureau de contrôle DGRAD',
        secteurNom: (mission.secteurs as unknown as { nom: string })?.nom || 'Secteur de contrôle',
        motif: mission.motif || 'Contrôle sur pièces',
        chefBureauNom: `${currentUser.nom || 'Chef'} ${currentUser.prenom || 'de bureau'}`,
        dateApprobation: now,
        assujettis: assujettisList,
        userId: currentUser.id,
      };

      // 3. Générer l'autorisation
      const docResult = await generateAndStoreAutorisationPieces(autorisationPayload);

      // 4. Audit
      await logAuditEvent({
        userId: currentUser.id,
        action: 'APPROBATION_CHEF_BUREAU',
        entityType: 'missions',
        entityId: mission.id,
        oldData: { statut: mission.statut },
        newData: {
          statut: 'AUTORISATION_GENEREE',
          autorisation_ref: docResult.reference,
        },
      });

      revalidatePath('/missions');
      revalidatePath(`/missions/${mission.id}`);
      return { success: true, data: { statut: 'AUTORISATION_GENEREE', autorisationRef: docResult.reference } };
    } else {
      // Rejet
      await adminSupabase
        .from('missions')
        .update({ statut: 'REJETEE' })
        .eq('id', mission.id);

      await logAuditEvent({
        userId: currentUser.id,
        action: 'REJET_CHEF_BUREAU',
        entityType: 'missions',
        entityId: mission.id,
        oldData: { statut: mission.statut },
        newData: { statut: 'REJETEE', motif: parsed.data.motif },
      });

      revalidatePath('/missions');
      revalidatePath(`/missions/${mission.id}`);
      return { success: true, data: { statut: 'REJETEE' } };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 7. Désignation du contrôleur responsable unique (SUR_PIECES)
 */
export async function designateControleur(
  input: { mission_id: string; controleur_id: string }
): Promise<ActionResponse<{ statut: MissionStatus }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionDesignateControleurSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Paramètres invalides.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut, mission_assujettis(assujetti_id)')
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.type_controle !== 'SUR_PIECES') {
      return { success: false, error: 'Mission introuvable ou non compatible avec le parcours SUR_PIECES.' };
    }

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      'CONTROLEUR_DESIGNE',
      'SUR_PIECES',
      mission.bureau_id
    );

    // 1. Créer ou mettre à jour les lignes de contrôles opérationnels pour chaque assujetti avec le contrôleur désigné
    const assujettis = (mission.mission_assujettis as unknown as { assujetti_id: string }[]) || [];
    for (const ass of assujettis) {
      const { data: existingCtrl } = await adminSupabase
        .from('controles')
        .select('id')
        .eq('mission_id', mission.id)
        .eq('assujetti_id', ass.assujetti_id)
        .maybeSingle();

      if (existingCtrl) {
        await adminSupabase
          .from('controles')
          .update({
            controleur_responsable_id: parsed.data.controleur_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCtrl.id);
      } else {
        await adminSupabase.from('controles').insert({
          mission_id: mission.id,
          assujetti_id: ass.assujetti_id,
          type_controle: 'SUR_PIECES',
          controleur_responsable_id: parsed.data.controleur_id,
          statut: 'EN_ATTENTE',
        });
      }
    }

    // 2. Mettre à jour la mission
    await adminSupabase
      .from('missions')
      .update({ statut: 'CONTROLEUR_DESIGNE' })
      .eq('id', mission.id);

    // 3. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'DESIGNATION_CONTROLEUR',
      entityType: 'missions',
      entityId: mission.id,
      oldData: { statut: mission.statut },
      newData: {
        statut: 'CONTROLEUR_DESIGNE',
        controleur_id: parsed.data.controleur_id,
      },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { statut: 'CONTROLEUR_DESIGNE' } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 8. Reprise d'une mission rejetée en brouillon pour correction (QM-007, ADR-025)
 */
export async function resetRejectedMission(
  input: { mission_id: string }
): Promise<ActionResponse<{ statut: MissionStatus }>> {
  const currentUser = await requireAuthenticatedUser();
  const parsed = MissionResetToDraftSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Identifiant de mission invalide.' };
  }

  const adminSupabase = createAdminClient();

  try {
    const { data: mission } = await adminSupabase
      .from('missions')
      .select('id, reference, type_controle, bureau_id, statut')
      .eq('id', parsed.data.mission_id)
      .single();

    if (!mission || mission.statut !== 'REJETEE') {
      return { success: false, error: 'Seule une mission à l\'état REJETEE peut être reprise en brouillon.' };
    }

    validateTransitionPermissions(
      currentUser,
      mission.statut as MissionStatus,
      'BROUILLON',
      mission.type_controle,
      mission.bureau_id
    );

    await adminSupabase
      .from('missions')
      .update({ statut: 'BROUILLON' })
      .eq('id', mission.id);

    await logAuditEvent({
      userId: currentUser.id,
      action: 'REPRISE_BROUILLON',
      entityType: 'missions',
      entityId: mission.id,
      oldData: { statut: 'REJETEE' },
      newData: { statut: 'BROUILLON' },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission.id}`);
    return { success: true, data: { statut: 'BROUILLON' } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue.' };
  }
}

/**
 * 9. Téléchargement sécurisé d'un document officiel de mission
 */
export async function getMissionDocumentDownloadUrl(
  input: { storage_path: string; mission_id: string }
): Promise<ActionResponse<{ url: string }>> {
  await requireAuthenticatedUser();

  const res = await getSignedDocumentUrl(input.storage_path, 300);
  if (res.error || !res.url) {
    return { success: false, error: res.error || 'Erreur lors de la génération du lien sécurisé.' };
  }

  return { success: true, data: { url: res.url } };
}
