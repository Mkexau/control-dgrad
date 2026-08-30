// =============================================================================
// DGRAD CONTROLE - SERVICE DE GÉNÉRATION ET GESTION DES DOCUMENTS OFFICIELS
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import { formatOrdreMissionReference, formatAutorisationReference, formatRapportReference } from '@/lib/workflow/mission-workflow';

export interface RapportMissionDocData {
  missionId: string;
  missionReference: string;
  typeControle: 'SUR_PLACE' | 'SUR_PIECES';
  bureauNom: string;
  secteurNom: string;
  motif: string;
  auteurNom: string;
  auteurRole: string;
  dateRapport: Date;
  contenu: string;
  assujettis: { nom_raison_sociale: string; identifiant: string }[];
  controles: {
    assujettiNom: string;
    identifiant: string;
    statut: string;
    dateDebut?: string | null;
    dateFin?: string | null;
    observations?: string | null;
    resultat?: {
      type: string;
      devise: string;
      montantDu?: number | null;
      montantPenalites?: number | null;
      montantTotal?: number | null;
      justification?: string | null;
      redressements: { montant: number; devise: string; motif: string }[];
      penalites: { montant: number; devise: string; motif: string }[];
      avisRecouvrement: { reference: string; montant: number; devise: string }[];
    } | null;
    demandesRenseignements: {
      dateEnvoi: string;
      statut: string;
      contenu: string;
      reponseContenu?: string | null;
    }[];
  }[];
  totauxFinanciers: {
    totalDuCDF: number;
    totalPenalitesCDF: number;
    totalGlobalCDF: number;
    totalDuUSD: number;
    totalPenalitesUSD: number;
    totalGlobalUSD: number;
  };
  userId: string;
}


export interface OrdreMissionData {
  missionId: string;
  missionReference: string;
  bureauNom: string;
  secteurNom: string;
  motif: string;
  directeurGeneralNom: string;
  dateApprobation: Date;
  equipes: {
    nom: string;
    chefEquipe: { nom: string; prenom: string; matricule: string };
    agents: { nom: string; prenom: string; matricule: string }[];
    assujettis: { nom_raison_sociale: string; identifiant: string }[];
  }[];
  userId: string;
}

export interface AutorisationPiecesData {
  missionId: string;
  validationId: string;
  missionReference: string;
  bureauNom: string;
  secteurNom: string;
  motif: string;
  chefBureauNom: string;
  dateApprobation: Date;
  assujettis: { nom_raison_sociale: string; identifiant: string }[];
  userId: string;
}

/**
 * Génère le contenu textuel / binaire officiel d'un Ordre de Mission
 */
function buildOrdreMissionContent(data: OrdreMissionData, reference: string): string {
  const dateStr = data.dateApprobation.toLocaleDateString('fr-FR');
  let content = `================================================================================
RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
MINISTÈRE DES FINANCES
DIRECTION GÉNÉRALE DES RECETTES ADMINISTRATIVES, JUDICIAIRES,
DOMANIALES ET DE PARTICIPATIONS (DGRAD)
================================================================================

ORDRE DE MISSION OFFICIEL
Référence : ${reference}
Mission DGRAD : ${data.missionReference}
Date d'émission : ${dateStr}

1. CONTEXTE ET OBJET DE LA MISSION
--------------------------------------------------------------------------------
Bureau compétent : ${data.bureauNom}
Secteur de contrôle : ${data.secteurNom}
Motif / Objet : ${data.motif}

2. ÉQUIPES ET AFFECTATIONS SUR LE TERRAIN
--------------------------------------------------------------------------------\n`;

  data.equipes.forEach((eq, idx) => {
    content += `\nÉQUIPE N°${idx + 1} : ${eq.nom}\n`;
    content += `Chef d'équipe : ${eq.chefEquipe.nom} ${eq.chefEquipe.prenom} (Matricule: ${eq.chefEquipe.matricule})\n`;
    content += `Agents de contrôle affectés :\n`;
    eq.agents.forEach((ag) => {
      content += `  - ${ag.nom} ${ag.prenom} (Matricule: ${ag.matricule})\n`;
    });
    content += `Entreprises / Assujettis assignés :\n`;
    eq.assujettis.forEach((ass) => {
      content += `  - ${ass.nom_raison_sociale} (NIF/RCCM: ${ass.identifiant})\n`;
    });
  });

  content += `\n================================================================================
AUTORITÉ D'APPROBATION : DIRECTEUR GÉNÉRAL DE LA DGRAD
Approuvé par : ${data.directeurGeneralNom}
Date de validation : ${dateStr}
Document officiel certifié par le système de contrôle DGRAD.
================================================================================\n`;

  return content;
}

/**
 * Génère le contenu officiel de l'Autorisation de Contrôle sur Pièces
 */
function buildAutorisationPiecesContent(data: AutorisationPiecesData, reference: string): string {
  const dateStr = data.dateApprobation.toLocaleDateString('fr-FR');
  let content = `================================================================================
RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
MINISTÈRE DES FINANCES
DIRECTION GÉNÉRALE DES RECETTES ADMINISTRATIVES, JUDICIAIRES,
DOMANIALES ET DE PARTICIPATIONS (DGRAD)
================================================================================

AUTORISATION DE CONTRÔLE SUR PIÈCES
Référence : ${reference}
Mission DGRAD : ${data.missionReference}
Date d'approbation : ${dateStr}

1. CADRE DU CONTRÔLE
--------------------------------------------------------------------------------
Bureau de contrôle : ${data.bureauNom}
Secteur d'activité : ${data.secteurNom}
Fondement / Motif : ${data.motif}

2. ASSUJETTIS CONCERNÉS
--------------------------------------------------------------------------------\n`;

  data.assujettis.forEach((ass) => {
    content += `  - ${ass.nom_raison_sociale} (Identifiant / NIF: ${ass.identifiant})\n`;
  });

  content += `\n3. DISPOSITIONS SPÉCIFIQUES
--------------------------------------------------------------------------------
Le présent contrôle sur pièces est exécuté au sein des locaux de l'administration.
Il ne comporte aucun déplacement de terrain ni ordre de mission.

================================================================================
AUTORITÉ COMPÉTENTE : CHEF DU BUREAU COMPÉTENT
Validé par : ${data.chefBureauNom}
Date de décision : ${dateStr}
Document officiel généré par le système DGRAD Contrôle.
================================================================================\n`;

  return content;
}

/**
 * Génère et enregistre l'Ordre de Mission dans Supabase Storage privé et PostgreSQL
 */
export async function generateAndStoreOrdreMission(data: OrdreMissionData): Promise<{
  success: boolean;
  ordreMissionId?: string;
  reference?: string;
  storagePath?: string;
  error?: string;
}> {
  const supabase = createAdminClient();

  try {
    // 1. Vérifier si un ordre de mission existe déjà (idempotence)
    const { data: existing } = await supabase
      .from('ordres_mission')
      .select('id, reference, storage_path')
      .eq('mission_id', data.missionId)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        ordreMissionId: existing.id,
        reference: existing.reference,
        storagePath: existing.storage_path,
      };
    }

    // 2. Calculer le numéro de séquence
    const { count } = await supabase
      .from('ordres_mission')
      .select('*', { count: 'exact', head: true });

    const sequence = (count ?? 0) + 1;
    const reference = formatOrdreMissionReference(sequence);
    const storagePath = `missions/${data.missionId}/ordre-mission-${reference}.txt`;

    // 3. Générer le contenu textuel / documentaire
    const content = buildOrdreMissionContent(data, reference);
    const fileBuffer = Buffer.from(content, 'utf-8');

    // 4. Téléverser dans Supabase Storage (bucket privé dgrad-documents)
    const { error: uploadError } = await supabase.storage
      .from('dgrad-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erreur téléversement Storage ordre de mission:', uploadError);
      return { success: false, error: 'Échec de téléversement du document dans le stockage sécurisé.' };
    }

    // 5. Créer l'enregistrement dans public.ordres_mission
    const { data: ordreRecord, error: ordreError } = await supabase
      .from('ordres_mission')
      .insert({
        mission_id: data.missionId,
        reference,
        generated_by: data.userId,
        storage_path: storagePath,
        version: 1,
      })
      .select('id')
      .single();

    if (ordreError) {
      console.error('Erreur insertion ordres_mission:', ordreError);
      return { success: false, error: 'Échec de création des métadonnées de l\'ordre de mission.' };
    }

    // 6. Enregistrer dans le référentiel documentaire central public.documents
    await supabase.from('documents').insert({
      document_type: 'ORDRE_MISSION',
      entity_type: 'missions',
      entity_id: data.missionId,
      nom: `Ordre_de_mission_${reference}.txt`,
      mime_type: 'text/plain',
      taille: fileBuffer.length,
      storage_path: storagePath,
      version: 1,
      uploaded_by: data.userId,
    });

    return {
      success: true,
      ordreMissionId: ordreRecord.id,
      reference,
      storagePath,
    };
  } catch (err) {
    console.error('Erreur génération ordre de mission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.',
    };
  }
}

/**
 * Génère et enregistre l'Autorisation de Contrôle sur Pièces
 */
export async function generateAndStoreAutorisationPieces(data: AutorisationPiecesData): Promise<{
  success: boolean;
  autorisationId?: string;
  reference?: string;
  storagePath?: string;
  error?: string;
}> {
  const supabase = createAdminClient();

  try {
    // 1. Vérifier si une autorisation existe déjà (idempotence)
    const { data: existing } = await supabase
      .from('autorisations_controle_pieces')
      .select('id, reference, storage_path')
      .eq('mission_id', data.missionId)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        autorisationId: existing.id,
        reference: existing.reference,
        storagePath: existing.storage_path,
      };
    }

    // 2. Calculer le numéro de séquence
    const { count } = await supabase
      .from('autorisations_controle_pieces')
      .select('*', { count: 'exact', head: true });

    const sequence = (count ?? 0) + 1;
    const reference = formatAutorisationReference(sequence);
    const storagePath = `missions/${data.missionId}/autorisation-${reference}.txt`;

    // 3. Générer le document
    const content = buildAutorisationPiecesContent(data, reference);
    const fileBuffer = Buffer.from(content, 'utf-8');

    // 4. Téléverser dans Supabase Storage privé
    const { error: uploadError } = await supabase.storage
      .from('dgrad-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erreur téléversement Storage autorisation pièces:', uploadError);
      return { success: false, error: 'Échec de stockage de l\'autorisation de contrôle.' };
    }

    // 5. Insérer dans public.autorisations_controle_pieces
    const { data: autRecord, error: autError } = await supabase
      .from('autorisations_controle_pieces')
      .insert({
        mission_id: data.missionId,
        validation_id: data.validationId,
        reference,
        generated_by: data.userId,
        storage_path: storagePath,
        version: 1,
      })
      .select('id')
      .single();

    if (autError) {
      console.error('Erreur insertion autorisations_controle_pieces:', autError);
      return { success: false, error: 'Échec de création des métadonnées de l\'autorisation.' };
    }

    // 6. Enregistrer dans public.documents
    await supabase.from('documents').insert({
      document_type: 'AUTORISATION_PIECES',
      entity_type: 'missions',
      entity_id: data.missionId,
      nom: `Autorisation_controle_pieces_${reference}.txt`,
      mime_type: 'text/plain',
      taille: fileBuffer.length,
      storage_path: storagePath,
      version: 1,
      uploaded_by: data.userId,
    });

    return {
      success: true,
      autorisationId: autRecord.id,
      reference,
      storagePath,
    };
  } catch (err) {
    console.error('Erreur génération autorisation pièces:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue.',
    };
  }
}

/**
 * Génère le contenu textuel / documentaire officiel du Rapport de Mission
 */
function buildRapportMissionContent(data: RapportMissionDocData, reference: string): string {
  const dateStr = data.dateRapport.toLocaleDateString('fr-FR');
  let content = `================================================================================
RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
MINISTÈRE DES FINANCES
DIRECTION GÉNÉRALE DES RECETTES ADMINISTRATIVES, JUDICIAIRES,
DOMANIALES ET DE PARTICIPATIONS (DGRAD)
================================================================================

RAPPORT OFFICIEL DE MISSION DE CONTRÔLE NON FISCAL
Référence Rapport : ${reference}
Référence Mission : ${data.missionReference}
Type de Contrôle : ${data.typeControle}
Date d'établissement : ${dateStr}

1. CADRE ADMINISTRATIF ET JURIDIQUE
--------------------------------------------------------------------------------
Bureau de contrôle compétent : ${data.bureauNom}
Secteur d'activité : ${data.secteurNom}
Objet / Motif de la mission : ${data.motif}
Rédacteur / Auteur : ${data.auteurNom} (${data.auteurRole})

2. ASSUJETTIS CONCERNÉS PAR LA MISSION (${data.assujettis.length})
--------------------------------------------------------------------------------\n`;

  data.assujettis.forEach((ass, idx) => {
    content += `${idx + 1}. ${ass.nom_raison_sociale} (Identifiant / NIF / RCCM : ${ass.identifiant})\n`;
  });

  content += `\n3. SYNTHÈSE DES OPÉRATIONS DE CONTRÔLE SUR LE TERRAIN / SUR PIÈCES
--------------------------------------------------------------------------------\n`;

  data.controles.forEach((ctrl, idx) => {
    content += `\n--- CONTRÔLE N°${idx + 1} : ${ctrl.assujettiNom} (${ctrl.identifiant}) ---
Statut : ${ctrl.statut}
Période : Du ${ctrl.dateDebut || 'Non renseignée'} au ${ctrl.dateFin || 'Non renseignée'}
Constatations / Observations : ${ctrl.observations || 'Aucune observation particulière enregistrée.'}\n`;

    if (ctrl.resultat) {
      content += `Résultat : ${ctrl.resultat.type}\n`;
      content += `Devise : ${ctrl.resultat.devise}\n`;
      if (ctrl.resultat.type === 'CHARGEE') {
        content += `Montant des droits éludés / principal : ${ctrl.resultat.montantDu?.toLocaleString('fr-FR') ?? 0} ${ctrl.resultat.devise}\n`;
        content += `Montant des pénalités : ${ctrl.resultat.montantPenalites?.toLocaleString('fr-FR') ?? 0} ${ctrl.resultat.devise}\n`;
        content += `Montant total réclamé : ${ctrl.resultat.montantTotal?.toLocaleString('fr-FR') ?? 0} ${ctrl.resultat.devise}\n`;
        if (ctrl.resultat.redressements.length > 0) {
          content += `Redressements constatés (${ctrl.resultat.redressements.length}) :\n`;
          ctrl.resultat.redressements.forEach((r) => {
            content += `  - ${r.motif} : ${r.montant.toLocaleString('fr-FR')} ${r.devise}\n`;
          });
        }
        if (ctrl.resultat.penalites.length > 0) {
          content += `Pénalités appliquées (${ctrl.resultat.penalites.length}) :\n`;
          ctrl.resultat.penalites.forEach((p) => {
            content += `  - ${p.motif} : ${p.montant.toLocaleString('fr-FR')} ${p.devise}\n`;
          });
        }
        if (ctrl.resultat.avisRecouvrement.length > 0) {
          content += `Avis de recouvrement émis (${ctrl.resultat.avisRecouvrement.length}) :\n`;
          ctrl.resultat.avisRecouvrement.forEach((a) => {
            content += `  - Avis Réf ${a.reference} : ${a.montant.toLocaleString('fr-FR')} ${a.devise}\n`;
          });
        }
      } else {
        content += `Justification décharge : ${ctrl.resultat.justification || 'Conformité constatée.'}\n`;
      }
    } else {
      content += `Résultat : Non encore arrêté.\n`;
    }

    if (ctrl.demandesRenseignements.length > 0) {
      content += `Demandes de renseignements (${ctrl.demandesRenseignements.length}) :\n`;
      ctrl.demandesRenseignements.forEach((d, dIdx) => {
        content += `  [${dIdx + 1}] Date: ${d.dateEnvoi} | Statut: ${d.statut} | Objet: ${d.contenu}\n`;
        if (d.reponseContenu) {
          content += `      Réponse reçue : ${d.reponseContenu}\n`;
        }
      });
    }
  });

  content += `\n4. CONSOLIDATION FINANCIÈRE DE LA MISSION
--------------------------------------------------------------------------------
Totaux en Francs Congolais (CDF) :
- Droits éludés / principal : ${data.totauxFinanciers.totalDuCDF.toLocaleString('fr-FR')} CDF
- Pénalités et majorations  : ${data.totauxFinanciers.totalPenalitesCDF.toLocaleString('fr-FR')} CDF
- TOTAL GLOBAL CDF           : ${data.totauxFinanciers.totalGlobalCDF.toLocaleString('fr-FR')} CDF

Totaux en Dollars Américains (USD) :
- Droits éludés / principal : ${data.totauxFinanciers.totalDuUSD.toLocaleString('fr-FR')} USD
- Pénalités et majorations  : ${data.totauxFinanciers.totalPenalitesUSD.toLocaleString('fr-FR')} USD
- TOTAL GLOBAL USD           : ${data.totauxFinanciers.totalGlobalUSD.toLocaleString('fr-FR')} USD

5. OBSERVATIONS GÉNÉRALES, ANALYSES ET CONCLUSIONS DU RÉDACTEUR
--------------------------------------------------------------------------------
${data.contenu}

================================================================================
CERTIFICATION DU DOSSIER DE MISSION
Rédigé et soumis par : ${data.auteurNom}
Qualité / Rôle : ${data.auteurRole}
Date de certification : ${dateStr}
Document officiel archivé dans le système central DGRAD Contrôle.
================================================================================\n`;

  return content;
}

/**
 * Génère et enregistre le document du Rapport de Mission dans Supabase Storage privé et PostgreSQL
 */
export async function generateAndStoreRapportMission(data: RapportMissionDocData): Promise<{
  success: boolean;
  rapportId?: string;
  reference?: string;
  storagePath?: string;
  error?: string;
}> {
  const supabase = createAdminClient();

  try {
    // 1. Calculer le numéro de séquence pour la référence
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', 'RAPPORT_MISSION');

    const sequence = (count ?? 0) + 1;
    const reference = formatRapportReference(sequence);
    const storagePath = `missions/${data.missionId}/rapport-mission-${reference}.txt`;

    // 2. Générer le contenu textuel / documentaire
    const content = buildRapportMissionContent(data, reference);
    const fileBuffer = Buffer.from(content, 'utf-8');

    // 3. Téléverser dans Supabase Storage privé
    const { error: uploadError } = await supabase.storage
      .from('dgrad-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erreur téléversement Storage rapport mission:', uploadError);
      return { success: false, error: 'Échec de stockage du document du rapport dans l\'espace sécurisé.' };
    }

    // 4. Mettre à jour la table rapports_mission avec le storage_path
    const { data: updatedRapport, error: rapportUpdateError } = await supabase
      .from('rapports_mission')
      .update({
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('mission_id', data.missionId)
      .select('id')
      .maybeSingle();

    if (rapportUpdateError) {
      console.error('Erreur mise à jour storage_path rapports_mission:', rapportUpdateError);
    }

    // 5. Enregistrer dans la table centrale public.documents
    await supabase.from('documents').insert({
      document_type: 'RAPPORT_MISSION',
      entity_type: 'missions',
      entity_id: data.missionId,
      nom: `Rapport_de_mission_${reference}.txt`,
      mime_type: 'text/plain',
      taille: fileBuffer.length,
      storage_path: storagePath,
      version: 1,
      uploaded_by: data.userId,
    });

    return {
      success: true,
      rapportId: updatedRapport?.id,
      reference,
      storagePath,
    };
  } catch (err) {
    console.error('Erreur génération rapport de mission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue.',
    };
  }
}

/**
 * Obtient une URL signée pour le téléchargement sécurisé d'un document
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<{ url?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from('dgrad-documents')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error('Erreur génération URL signée Storage:', error);
    return { error: 'Impossible de générer le lien de téléchargement sécurisé.' };
  }

  return { url: data.signedUrl };
}
