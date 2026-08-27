// =============================================================================
// DGRAD CONTROLE - SERVICE DE GÉNÉRATION ET GESTION DES DOCUMENTS OFFICIELS
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import { formatOrdreMissionReference, formatAutorisationReference } from '@/lib/workflow/mission-workflow';

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
  chefSectionNom: string;
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
AUTORITÉ COMPÉTENTE : CHEF DE SECTION CONTRÔLE
Validé par : ${data.chefSectionNom}
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
