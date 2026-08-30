'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTIONS : RAPPORTS DE MISSION & FINALISATION (ÉTAPE 11)
// =============================================================================

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit/audit-service';
import {
  RapportMissionSaveSchema,
  RapportMissionGenerateDocSchema,
  MissionClotureSchema,
  type RapportMissionSaveInput,
  type RapportMissionGenerateDocInput,
  type MissionClotureInput,
} from '@/lib/validations/rapports';
import {
  assertCanManageRapportMission,
  type MissionRapportScope,
} from '@/lib/auth/controle-access';
import {
  generateAndStoreRapportMission,
  type RapportMissionDocData,
} from '@/lib/documents/document-generator';


export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * 1. Enregistrement (Création ou Mise à jour) du Rapport de Mission
 */
export async function saveRapportMission(
  input: RapportMissionSaveInput
): Promise<ActionResponse<{ id: string; mission_id: string; statut: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Action non autorisée : un administrateur technique ne peut pas rédiger de rapport métier.',
      };
    }

    const parsed = RapportMissionSaveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Données du rapport invalides.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { mission_id, contenu, statut } = parsed.data;
    const supabase = createAdminClient();

    // 1. Récupérer la mission avec ses équipes et contrôleurs
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select(`
        id, reference, type_controle, bureau_id, statut,
        equipes(chef_equipe_id),
        controles(controleur_responsable_id)
      `)
      .eq('id', mission_id)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission introuvable.' };
    }

    // 2. Vérification des autorisations et périmètre (anti-IDOR)
    const { data: userAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    const equipesChefsIds = ((mission.equipes as unknown as { chef_equipe_id: string }[]) || []).map(
      (e) => e.chef_equipe_id
    );
    const controleursIds = ((mission.controles as unknown as { controleur_responsable_id: string }[]) || [])
      .map((c) => c.controleur_responsable_id)
      .filter(Boolean);

    const missionScope: MissionRapportScope = {
      id: mission.id,
      type_controle: mission.type_controle,
      statut: mission.statut,
      bureau_id: mission.bureau_id,
      equipes_chefs_ids: equipesChefsIds,
      controleurs_ids: controleursIds,
    };

    assertCanManageRapportMission(currentUser, missionScope, userAgent?.id || null);

    // 3. Vérifier le statut de la mission
    const invalidStatuses = ['BROUILLON', 'SOUMISE', 'EXAMEN_CHEF_DIVISION', 'EXAMEN_DIRECTEUR_CONTROLES', 'ATTENTE_DG', 'DEMANDE_SOUMISE', 'EXAMEN_CHEF_BUREAU', 'REJETEE', 'ANNULEE'];
    if (invalidStatuses.includes(mission.statut)) {
      return {
        success: false,
        error: `Impossible de rédiger un rapport pour une mission au statut '${mission.statut}'.`,
      };
    }

    // 4. Vérifier si un rapport existe déjà pour cette mission (Idempotence & Mise à jour)
    const { data: existingRapport } = await supabase
      .from('rapports_mission')
      .select('id, contenu, statut, storage_path')
      .eq('mission_id', mission_id)
      .maybeSingle();

    let rapportId: string;
    const now = new Date();
    const rapportStatut = statut || 'FINALISE';

    if (existingRapport) {
      rapportId = existingRapport.id;
      const { error: updateError } = await supabase
        .from('rapports_mission')
        .update({
          contenu,
          statut: rapportStatut,
          updated_at: now.toISOString(),
        })
        .eq('id', existingRapport.id);

      if (updateError) {
        console.error('Erreur mise à jour rapport:', updateError);
        return { success: false, error: 'Échec de la mise à jour du rapport de mission.' };
      }

      await logAuditEvent({
        userId: currentUser.id,
        action: 'MODIFICATION_RAPPORT_MISSION',
        entityType: 'rapports_mission',
        entityId: rapportId,
        oldData: { contenu: existingRapport.contenu, statut: existingRapport.statut },
        newData: { contenu, statut: rapportStatut },
      });
    } else {
      const { data: newRapport, error: insertError } = await supabase
        .from('rapports_mission')
        .insert({
          mission_id,
          auteur_id: currentUser.id,
          date: now.toISOString().split('T')[0],
          contenu,
          statut: rapportStatut,
        })
        .select('id')
        .single();

      if (insertError || !newRapport) {
        console.error('Erreur insertion rapport:', insertError);
        return { success: false, error: 'Échec de l\'enregistrement du rapport de mission.' };
      }

      rapportId = newRapport.id;

      await logAuditEvent({
        userId: currentUser.id,
        action: 'CREATION_RAPPORT_MISSION',
        entityType: 'rapports_mission',
        entityId: rapportId,
        newData: {
          mission_id,
          auteur_id: currentUser.id,
          statut: rapportStatut,
        },
      });
    }

    // 5. Mettre à jour le statut de la mission à RAPPORT si applicable
    const statusesToAdvance = ['CONTROLE_TERMINE', 'RESULTAT', 'PROCES_VERBAL', 'FEUILLE_OBSERVATIONS'];
    if (statusesToAdvance.includes(mission.statut)) {
      await supabase
        .from('missions')
        .update({ statut: 'RAPPORT', updated_at: now.toISOString() })
        .eq('id', mission_id);
    }

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission_id}`);

    return {
      success: true,
      data: {
        id: rapportId,
        mission_id,
        statut: rapportStatut,
      },
    };
  } catch (err) {
    console.error('Erreur saveRapportMission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue.',
    };
  }
}

/**
 * 2. Génération et stockage du document officiel du Rapport de Mission
 */
export async function genererDocumentRapportMission(
  input: RapportMissionGenerateDocInput
): Promise<ActionResponse<{ storage_path: string; reference: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Action non autorisée : un administrateur technique ne peut pas générer de document de rapport.',
      };
    }

    const parsed = RapportMissionGenerateDocSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Paramètres invalides.' };
    }

    const { mission_id } = parsed.data;
    const supabase = createAdminClient();

    // 1. Récupérer le rapport de mission
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports_mission')
      .select('id, contenu, date, statut, storage_path, auteur_id, profiles(nom, prenom, role)')
      .eq('mission_id', mission_id)
      .maybeSingle();

    if (rapportError || !rapport) {
      return {
        success: false,
        error: 'Le rapport de mission doit être préalablement rédigé avant de pouvoir générer le document officiel.',
      };
    }

    // 2. Récupérer la mission avec toutes ses composantes
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select(`
        id, reference, type_controle, bureau_id, motif, statut,
        bureaux(nom),
        secteurs(nom),
        equipes(chef_equipe_id),
        mission_assujettis(
          assujettis(id, nom_raison_sociale, identifiant)
        ),
        controles(
          id, statut, type_controle, date_debut, date_fin, observations, controleur_responsable_id,
          assujettis(id, nom_raison_sociale, identifiant),
          resultats_controle(
            id, type_resultat, montant_du, montant_penalites, montant_total, devise, justification,
            redressements(montant, devise, motif),
            penalites(montant, devise, motif),
            avis_recouvrement(reference, montant, devise)
          ),
          demandes_renseignements(date_envoi, statut, contenu, reponse_contenu)
        )
      `)
      .eq('id', mission_id)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Dossier de mission introuvable.' };
    }

    // 3. Vérification des autorisations (anti-IDOR)
    const { data: userAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    const equipesChefsIds = ((mission.equipes as unknown as { chef_equipe_id: string }[]) || []).map(
      (e) => e.chef_equipe_id
    );
    const controleursIds = ((mission.controles as unknown as { controleur_responsable_id: string }[]) || [])
      .map((c) => c.controleur_responsable_id)
      .filter(Boolean);

    const missionScope: MissionRapportScope = {
      id: mission.id,
      type_controle: mission.type_controle,
      statut: mission.statut,
      bureau_id: mission.bureau_id,
      equipes_chefs_ids: equipesChefsIds,
      controleurs_ids: controleursIds,
    };

    assertCanManageRapportMission(currentUser, missionScope, userAgent?.id || null);

    // 4. Formater les assujettis
    const assujettisList = ((mission.mission_assujettis as unknown as { assujettis: { nom_raison_sociale: string; identifiant: string } }[]) || []).map((ma) => ({
      nom_raison_sociale: ma.assujettis?.nom_raison_sociale || 'N/A',
      identifiant: ma.assujettis?.identifiant || 'N/A',
    }));

    // 5. Formater les contrôles et agréger les totaux financiers
    let totalDuCDF = 0;
    let totalPenalitesCDF = 0;
    let totalGlobalCDF = 0;
    let totalDuUSD = 0;
    let totalPenalitesUSD = 0;
    let totalGlobalUSD = 0;

    interface ControleRaw {
      id: string;
      statut: string;
      date_debut?: string | null;
      date_fin?: string | null;
      observations?: string | null;
      assujettis: { nom_raison_sociale: string; identifiant: string } | null;
      resultats_controle: {
        type_resultat: string;
        devise: string;
        montant_du?: number | null;
        montant_penalites?: number | null;
        montant_total?: number | null;
        justification?: string | null;
        redressements?: { montant: number; devise: string; motif: string }[];
        penalites?: { montant: number; devise: string; motif: string }[];
        avis_recouvrement?: { reference: string; montant: number; devise: string }[];
      }[] | {
        type_resultat: string;
        devise: string;
        montant_du?: number | null;
        montant_penalites?: number | null;
        montant_total?: number | null;
        justification?: string | null;
        redressements?: { montant: number; devise: string; motif: string }[];
        penalites?: { montant: number; devise: string; motif: string }[];
        avis_recouvrement?: { reference: string; montant: number; devise: string }[];
      } | null;
      demandes_renseignements: {
        date_envoi: string;
        statut: string;
        contenu: string;
        reponse_contenu?: string | null;
      }[];
    }

    const controlesRaw = (mission.controles as unknown as ControleRaw[]) || [];

    const formattedControles = controlesRaw.map((ctrl) => {
      const resObj = Array.isArray(ctrl.resultats_controle)
        ? ctrl.resultats_controle[0]
        : ctrl.resultats_controle;

      let formattedResultat = null;

      if (resObj) {
        const du = Number(resObj.montant_du ?? 0);
        const pen = Number(resObj.montant_penalites ?? 0);
        const tot = Number(resObj.montant_total ?? (du + pen));

        if (resObj.devise === 'CDF') {
          totalDuCDF += du;
          totalPenalitesCDF += pen;
          totalGlobalCDF += tot;
        } else if (resObj.devise === 'USD') {
          totalDuUSD += du;
          totalPenalitesUSD += pen;
          totalGlobalUSD += tot;
        }

        formattedResultat = {
          type: resObj.type_resultat,
          devise: resObj.devise,
          montantDu: du,
          montantPenalites: pen,
          montantTotal: tot,
          justification: resObj.justification,
          redressements: (resObj.redressements || []).map((r) => ({
            montant: Number(r.montant),
            devise: r.devise,
            motif: r.motif,
          })),
          penalites: (resObj.penalites || []).map((p) => ({
            montant: Number(p.montant),
            devise: p.devise,
            motif: p.motif,
          })),
          avisRecouvrement: (resObj.avis_recouvrement || []).map((a) => ({
            reference: a.reference,
            montant: Number(a.montant),
            devise: a.devise,
          })),
        };
      }

      const formattedDemandes = (ctrl.demandes_renseignements || []).map((d) => ({
        dateEnvoi: d.date_envoi,
        statut: d.statut,
        contenu: d.contenu,
        reponseContenu: d.reponse_contenu,
      }));

      return {
        assujettiNom: ctrl.assujettis?.nom_raison_sociale || 'Assujetti inconnu',
        identifiant: ctrl.assujettis?.identifiant || 'N/A',
        statut: ctrl.statut,
        dateDebut: ctrl.date_debut,
        dateFin: ctrl.date_fin,
        observations: ctrl.observations,
        resultat: formattedResultat,
        demandesRenseignements: formattedDemandes,
      };
    });

    const auteurProfile = Array.isArray(rapport.profiles) ? rapport.profiles[0] : rapport.profiles;
    const auteurNom = auteurProfile
      ? `${auteurProfile.nom} ${auteurProfile.prenom}`
      : `${currentUser.nom || 'Agent'} ${currentUser.prenom || 'DGRAD'}`;
    const auteurRole = auteurProfile?.role || currentUser.role;

    const rapportPayload: RapportMissionDocData = {
      missionId: mission.id,
      missionReference: mission.reference,
      typeControle: mission.type_controle,
      bureauNom: (mission.bureaux as unknown as { nom: string })?.nom || 'Bureau de contrôle DGRAD',
      secteurNom: (mission.secteurs as unknown as { nom: string })?.nom || 'Secteur de contrôle',
      motif: mission.motif || 'Contrôle non fiscal des assujettis',
      auteurNom,
      auteurRole,
      dateRapport: new Date(rapport.date || new Date()),
      contenu: rapport.contenu,
      assujettis: assujettisList,
      controles: formattedControles,
      totauxFinanciers: {
        totalDuCDF,
        totalPenalitesCDF,
        totalGlobalCDF,
        totalDuUSD,
        totalPenalitesUSD,
        totalGlobalUSD,
      },
      userId: currentUser.id,
    };

    // 6. Générer et téléverser le document
    const docResult = await generateAndStoreRapportMission(rapportPayload);

    if (!docResult.success || !docResult.storagePath || !docResult.reference) {
      return {
        success: false,
        error: docResult.error || 'Échec lors de la génération du document officiel de rapport.',
      };
    }

    // 7. Audit
    await logAuditEvent({
      userId: currentUser.id,
      action: 'GENERATION_DOCUMENT_RAPPORT_MISSION',
      entityType: 'rapports_mission',
      entityId: rapport.id,
      newData: {
        mission_id,
        reference: docResult.reference,
        storage_path: docResult.storagePath,
      },
    });

    revalidatePath('/missions');
    revalidatePath(`/missions/${mission_id}`);

    return {
      success: true,
      data: {
        storage_path: docResult.storagePath,
        reference: docResult.reference,
      },
    };
  } catch (err) {
    console.error('Erreur genererDocumentRapportMission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue.',
    };
  }
}

/**
 * 3. Tentative de clôture définitive de la mission (QM-026)
 *
 * NOTE DE CONFORMITÉ MÉTIER (QM-026) :
 * La question de savoir quelle autorité officielle est habilitée à prononcer la clôture définitive
 * (Directeur Général, Chef de Division ou Chef de Bureau) est explicitement À VALIDER.
 * Conformément aux règles absolues du projet, aucune décision arbitraire n'est inventée :
 * les prérequis techniques sont vérifiés et l'opération de transition définitive reste bloquée
 * avec un motif clair tant que la validation administrative officielle n'a pas été formellement arrêtée.
 */
export async function tenterClotureMission(
  input: MissionClotureInput
): Promise<ActionResponse<{ message: string; prerequisRemplis: boolean }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Session invalide ou utilisateur non connecté.' };
    }

    if (currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Action non autorisée : un administrateur technique ne peut pas clôturer de mission métier.',
      };
    }

    const parsed = MissionClotureSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Paramètres invalides.' };
    }

    const { mission_id } = parsed.data;
    const supabase = createAdminClient();

    // 1. Récupérer la mission avec contrôles et rapport
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select(`
        id, reference, type_controle, bureau_id, statut,
        equipes(chef_equipe_id),
        controles(id, statut, controleur_responsable_id),
        rapports_mission(id, statut)
      `)
      .eq('id', mission_id)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission introuvable.' };
    }

    // 2. Vérification des prérequis techniques de fin de parcours
    const controles = (mission.controles as unknown as { id: string; statut: string }[]) || [];
    const rapports = (mission.rapports_mission as unknown as { id: string; statut: string }[]) || [];

    if (controles.length === 0) {
      return {
        success: false,
        error: 'Prérequis non remplis : la mission ne comporte aucun contrôle opérationnel.',
      };
    }

    const allControlesTermines = controles.every(
      (c) => c.statut === 'TERMINE' || c.statut === 'ANNULE'
    );

    if (!allControlesTermines) {
      return {
        success: false,
        error: 'Prérequis non remplis : tous les contrôles opérationnels de la mission doivent être au statut TERMINE.',
      };
    }

    if (rapports.length === 0) {
      return {
        success: false,
        error: 'Prérequis non remplis : le rapport de mission doit être préalablement rédigé.',
      };
    }

    // 3. Application stricte de QM-026 : blocage propre documenté
    return {
      success: false,
      error: 'Action bloquée (QM-026) : La question métier concernant l\'autorité habilitée à prononcer la clôture définitive est toujours en attente de validation officielle. Les prérequis techniques du dossier sont validés mais aucune transition arbitraire ne peut être exécutée.',
    };
  } catch (err) {
    console.error('Erreur tenterClotureMission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue.',
    };
  }
}
