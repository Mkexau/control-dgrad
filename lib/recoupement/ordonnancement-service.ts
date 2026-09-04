// =============================================================================
// DGRAD CONTROLE - SERVICE MÉTIER : INFORMATIONS REÇUES & FICHES D'ORDONNANCEMENT
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/validations/auth';
import {
  type InformationRecueFilterInput,
  type InformationRecueCreateInput,
  type InformationRecueCreerAssujettiInput,
  type FicheOrdonnancementCreateInput,
  type FicheOrdonnancementFilterInput,
  InformationRecueFilterSchema,
  InformationRecueCreateSchema,
  InformationRecueCreerAssujettiSchema,
  FicheOrdonnancementCreateSchema,
  FicheOrdonnancementFilterSchema,
} from '@/lib/validations/recoupement-ordonnancement';
import { logAuditEvent } from '@/lib/audit/audit-service';

export interface InformationRecueItem {
  id: string;
  numero_reference: string;
  source_externe: string;
  date_reception: string;
  secteur_code: string;
  secteur_id: string | null;
  nom_assujetti_declare: string;
  identifiant_assujetti_declare: string;
  forme_juridique: string | null;
  adresse_declaree: string | null;
  /** Champs supprimés du modèle d'arrivée, gardés optionnels durant la transition UI. */
  assujetti_id: string | null;
  statut: 'A_TRAITER' | 'EN_COURS' | 'TRAITE' | 'REJETE';
  observations: string | null;
  traite_par: string | null;
  date_traitement: string | null;
  created_at: string;
  updated_at: string;
  secteur?: {
    id: string;
    code: string;
    nom: string;
    bureau_id: string;
    bureau?: {
      id: string;
      code: string;
      nom: string;
    };
  } | null;
  assujetti?: {
    id: string;
    identifiant: string;
    nom_raison_sociale: string;
    type: string;
  } | null;
  agent_traitant?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  } | null;
}

export interface FicheOrdonnancementItem {
  id: string;
  numero_fiche: string;
  information_recue_id: string | null;
  assujetti_id: string;
  secteur_id: string;
  bureau_id: string;
  numero_serie: string;
  delai_traitement_jours: number;
  numero_note_perception: string;
  date_note_perception: string;
  acte_generateur: string;
  article_budgetaire: string | null;
  nombre_actes: number;
  montant_cdf: number;
  montant_usd: number;
  statut_transmission: 'CONSERVEE_BUREAU' | 'TRANSMIS_DIVISION_CONTROLE';
  date_transmission_division: string | null;
  transmis_par: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assujetti?: {
    id: string;
    identifiant: string;
    nom_raison_sociale: string;
    type: string;
  } | null;
  secteur?: {
    id: string;
    code: string;
    nom: string;
  } | null;
  bureau?: {
    id: string;
    code: string;
    nom: string;
  } | null;
  createur?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  } | null;
  agent_transmetteur?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  } | null;
}

export interface RecoupementDashboardMetrics {
  totalAssujettis: number;
  assujettisSansFiche: number;
  fichesEnregistrees: number;
  fichesTransmises: number;
  fichesConservees: number;
  activitesRecentes: {
    id: string;
    type: 'ASSUJETTI_ENREGISTRE' | 'FICHE_CREEE' | 'FICHE_TRANSMISE';
    titre: string;
    description: string;
    date: string;
    statut?: string;
  }[];
}

/**
 * Vérifie l'habilitation d'accès aux flux du Bureau Analyse et Recoupement
 */
function assertCanAccessRecoupementBureau(user: CurrentUser) {
  const isAuthorized =
    ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION'].includes(user.role) ||
    user.bureau_code === 'BUR_ANA_REC' ||
    (user.role === 'CHEF_DIVISION' && user.division_code === 'DIV_REC');

  if (!isAuthorized) {
    // Note: CHEF_DIVISION DIV_CTRL aura un accès filtré spécifique aux fiches transmises
    throw new Error('Accès réservé au Bureau d’Analyse et Recoupement ou à la Direction.');
  }
}

/**
 * Vérifie l'habilitation de traitement et modification des informations/fiches
 */
function assertCanManageRecoupementBureau(user: CurrentUser) {
  if (user.role === 'ADMIN') {
    throw new Error('L’administrateur technique ne possède aucun pouvoir de décision métier.');
  }
  const isAuthorized =
    ['CHEF_BUREAU', 'ANALYSTE'].includes(user.role) && user.bureau_code === 'BUR_ANA_REC';

  if (!isAuthorized) {
    throw new Error('Opération réservée aux agents habilités du Bureau Analyse et Recoupement.');
  }
}

async function generateNumeroReference(supabase: ReturnType<typeof createAdminClient>) {
  const prefix = `REC-${new Date().getFullYear()}-`;
  const { data } = await supabase
    .from('informations_recues')
    .select('numero_reference')
    .ilike('numero_reference', `${prefix}%`)
    .order('numero_reference', { ascending: false })
    .limit(1);
  const previous = data?.[0]?.numero_reference?.replace(prefix, '') ?? '0000';
  const next = Number.parseInt(previous, 10) + 1;
  return `${prefix}${String(Number.isFinite(next) ? next : 1).padStart(4, '0')}`;
}

/** Enregistre une arrivée simulée sans créer ni modifier d'assujetti officiel. */
export async function creerInformationRecue(
  user: CurrentUser,
  input: InformationRecueCreateInput
): Promise<InformationRecueItem> {
  assertCanManageRecoupementBureau(user);
  const validated = InformationRecueCreateSchema.parse(input);
  const supabase = createAdminClient();

  let secteurCode = validated.secteur_code || null;
  if (validated.secteur_id) {
    const { data: secteur, error } = await supabase
      .from('secteurs')
      .select('code')
      .eq('id', validated.secteur_id)
      .single();
    if (error || !secteur) throw new Error('Le secteur déclaré est introuvable.');
    secteurCode = secteur.code;
  }

  const numeroReference = await generateNumeroReference(supabase);
  const { data, error } = await supabase
    .from('informations_recues')
    .insert({
      numero_reference: numeroReference,
      source_externe: 'SERVICE_ASSIETTE',
      secteur_code: secteurCode,
      secteur_id: validated.secteur_id || null,
      nom_assujetti_declare: validated.nom_assujetti_declare,
      identifiant_assujetti_declare: validated.identifiant_assujetti_declare,
      forme_juridique: validated.forme_juridique || null,
      adresse_declaree: validated.adresse_declaree || null,
      statut: 'A_TRAITER',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Erreur lors de l'enregistrement de l'arrivée : ${error?.message}`);

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'information_recue',
    entityId: data.id,
    newData: { numero_reference: numeroReference, source_externe: 'SERVICE_ASSIETTE' },
  });
  return (await getInformationRecueById(user, data.id))!;
}

// -----------------------------------------------------------------------------
// 1. INFORMATIONS REÇUES (SOURCE EXTERNE SERVICE D'ASSIETTE)
// -----------------------------------------------------------------------------

export async function getInformationsRecues(
  user: CurrentUser,
  filters: Partial<InformationRecueFilterInput> = {}
): Promise<{ informations: InformationRecueItem[]; total: number }> {
  assertCanAccessRecoupementBureau(user);
  const parsed = InformationRecueFilterSchema.parse(filters);
  const supabase = createAdminClient();

  let query = supabase
    .from('informations_recues')
    .select(`
      id, numero_reference, source_externe, date_reception, secteur_code, secteur_id,
      nom_assujetti_declare, identifiant_assujetti_declare, forme_juridique, adresse_declaree,
      assujetti_id, statut, observations,
      traite_par, date_traitement, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      ),
      assujettis ( id, identifiant, nom_raison_sociale, type ),
      profiles:traite_par ( id, nom, prenom, email )
    `, { count: 'exact' });

  if (parsed.statut) {
    query = query.eq('statut', parsed.statut);
  }
  if (parsed.secteur_id) {
    query = query.eq('secteur_id', parsed.secteur_id);
  }
  if (parsed.search) {
    const term = `%${parsed.search}%`;
    query = query.or(`numero_reference.ilike.${term},nom_assujetti_declare.ilike.${term},identifiant_assujetti_declare.ilike.${term}`);
  }

  const offset = (parsed.page - 1) * parsed.limit;
  query = query.order('date_reception', { ascending: false }).range(offset, offset + parsed.limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Erreur lors de la récupération des informations reçues : ${error.message}`);
  }

  const informations: InformationRecueItem[] = (data || []).map((row) => ({
    id: row.id,
    numero_reference: row.numero_reference,
    source_externe: row.source_externe,
    date_reception: row.date_reception,
    secteur_code: row.secteur_code,
    secteur_id: row.secteur_id,
    nom_assujetti_declare: row.nom_assujetti_declare,
    identifiant_assujetti_declare: row.identifiant_assujetti_declare,
    forme_juridique: row.forme_juridique,
    adresse_declaree: row.adresse_declaree,
    assujetti_id: row.assujetti_id,
    statut: row.statut,
    observations: row.observations,
    traite_par: row.traite_par,
    date_traitement: row.date_traitement,
    created_at: row.created_at,
    updated_at: row.updated_at,
    secteur: row.secteurs as unknown as InformationRecueItem['secteur'],
    assujetti: row.assujettis as unknown as InformationRecueItem['assujetti'],
    agent_traitant: row.profiles as unknown as InformationRecueItem['agent_traitant'],
  }));

  return { informations, total: count || 0 };
}

export async function getInformationRecueById(
  user: CurrentUser,
  id: string
): Promise<InformationRecueItem | null> {
  assertCanAccessRecoupementBureau(user);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('informations_recues')
    .select(`
      id, numero_reference, source_externe, date_reception, secteur_code, secteur_id,
      nom_assujetti_declare, identifiant_assujetti_declare, forme_juridique, adresse_declaree,
      assujetti_id, statut, observations,
      traite_par, date_traitement, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      ),
      assujettis ( id, identifiant, nom_raison_sociale, type ),
      profiles:traite_par ( id, nom, prenom, email )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    numero_reference: data.numero_reference,
    source_externe: data.source_externe,
    date_reception: data.date_reception,
    secteur_code: data.secteur_code,
    secteur_id: data.secteur_id,
    nom_assujetti_declare: data.nom_assujetti_declare,
    identifiant_assujetti_declare: data.identifiant_assujetti_declare,
    forme_juridique: data.forme_juridique,
    adresse_declaree: data.adresse_declaree,
    assujetti_id: data.assujetti_id,
    statut: data.statut,
    observations: data.observations,
    traite_par: data.traite_par,
    date_traitement: data.date_traitement,
    created_at: data.created_at,
    updated_at: data.updated_at,
    secteur: data.secteurs as unknown as InformationRecueItem['secteur'],
    assujetti: data.assujettis as unknown as InformationRecueItem['assujetti'],
    agent_traitant: data.profiles as unknown as InformationRecueItem['agent_traitant'],
  };
}

export async function prendreEnChargeInformation(
  user: CurrentUser,
  id: string
): Promise<InformationRecueItem> {
  assertCanManageRecoupementBureau(user);
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('informations_recues')
    .select('id, statut, numero_reference')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    throw new Error('L’information reçue spécifiée est introuvable.');
  }

  if (existing.statut !== 'A_TRAITER') {
    throw new Error(`Cette information est déjà au statut ${existing.statut}.`);
  }

  const { data, error } = await supabase
    .from('informations_recues')
    .update({
      statut: 'EN_COURS',
      traite_par: user.id,
      date_traitement: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de la prise en charge : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'MODIFICATION',
    entityType: 'information_recue',
    entityId: data.id,
    oldData: { statut: 'A_TRAITER' },
    newData: { statut: 'EN_COURS', traite_par: user.id },
  });

  const updated = await getInformationRecueById(user, id);
  return updated!;
}

export async function associerAssujettiInformation(
  user: CurrentUser,
  informationId: string,
  assujettiId: string
): Promise<InformationRecueItem> {
  assertCanManageRecoupementBureau(user);
  const supabase = createAdminClient();

  // Vérifier existence assujetti
  const { data: assujetti, error: assErr } = await supabase
    .from('assujettis')
    .select('id, identifiant, nom_raison_sociale')
    .eq('id', assujettiId)
    .single();

  if (assErr || !assujetti) {
    throw new Error('L’assujetti sélectionné est introuvable.');
  }

  const { data: info, error: infoErr } = await supabase
    .from('informations_recues')
    .select('id, assujetti_id, statut')
    .eq('id', informationId)
    .single();

  if (infoErr || !info) {
    throw new Error('L’information reçue spécifiée est introuvable.');
  }

  const { error } = await supabase
    .from('informations_recues')
    .update({
      assujetti_id: assujettiId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', informationId);

  if (error) {
    throw new Error(`Erreur lors de l’association de l’assujetti : ${error.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'MODIFICATION',
    entityType: 'information_recue',
    entityId: informationId,
    oldData: { assujetti_id: info.assujetti_id },
    newData: { assujetti_id: assujettiId },
  });

  const updated = await getInformationRecueById(user, informationId);
  return updated!;
}

/** Création volontaire d'un assujetti officiel depuis les seules données source. */
export async function creerAssujettiDepuisInformation(
  user: CurrentUser,
  input: InformationRecueCreerAssujettiInput
): Promise<InformationRecueItem> {
  assertCanManageRecoupementBureau(user);
  const validated = InformationRecueCreerAssujettiSchema.parse(input);
  const supabase = createAdminClient();
  const { data: info, error: infoError } = await supabase
    .from('informations_recues')
    .select('id, assujetti_id, identifiant_assujetti_declare, nom_assujetti_declare, adresse_declaree')
    .eq('id', validated.information_id)
    .single();
  if (infoError || !info) throw new Error('L’information reçue spécifiée est introuvable.');
  if (info.assujetti_id) throw new Error('Cette arrivée est déjà associée à un assujetti officiel.');

  const { data: duplicate } = await supabase
    .from('assujettis')
    .select('id')
    .eq('identifiant', info.identifiant_assujetti_declare)
    .maybeSingle();
  if (duplicate) throw new Error(`Un assujetti avec le NIF ${info.identifiant_assujetti_declare} existe déjà. Utilisez l’association.`);

  const { data: assujetti, error: createError } = await supabase
    .from('assujettis')
    .insert({
      type: validated.type,
      identifiant: info.identifiant_assujetti_declare,
      nom_raison_sociale: info.nom_assujetti_declare,
      adresse: info.adresse_declaree,
      secteur_principal_id: validated.secteur_principal_id,
      actif: true,
    })
    .select('id')
    .single();
  if (createError || !assujetti) throw new Error(`Erreur lors de la création de l’assujetti : ${createError?.message}`);

  const { error: linkError } = await supabase
    .from('informations_recues')
    .update({ assujetti_id: assujetti.id, updated_at: new Date().toISOString() })
    .eq('id', info.id);
  if (linkError) throw new Error(`L’assujetti a été créé mais l’association a échoué : ${linkError.message}`);

  await logAuditEvent({ userId: user.id, action: 'CREATION', entityType: 'assujetti', entityId: assujetti.id, newData: { origine: 'information_recue', information_id: info.id } });
  await logAuditEvent({ userId: user.id, action: 'MODIFICATION', entityType: 'information_recue', entityId: info.id, oldData: { assujetti_id: null }, newData: { assujetti_id: assujetti.id } });
  return (await getInformationRecueById(user, info.id))!;
}

// -----------------------------------------------------------------------------
// 2. FICHES D'ENREGISTREMENT DES DONNÉES D'ORDONNANCEMENT
// -----------------------------------------------------------------------------

async function generateNextNumeroFiche(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FO-${currentYear}-`;

  const { data } = await supabase
    .from('fiches_ordonnancement')
    .select('numero_fiche')
    .ilike('numero_fiche', `${prefix}%`)
    .order('numero_fiche', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return `${prefix}00001`;
  }

  const lastNum = data[0].numero_fiche.replace(prefix, '');
  const seq = parseInt(lastNum, 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}

export async function creerFicheOrdonnancement(
  user: CurrentUser,
  input: FicheOrdonnancementCreateInput
): Promise<FicheOrdonnancementItem> {
  assertCanManageRecoupementBureau(user);
  const validated = FicheOrdonnancementCreateSchema.parse(input);
  const supabase = createAdminClient();

  // 1. Vérifier information reçue si fournie
  if (validated.information_recue_id) {
    const { data: info, error: infoErr } = await supabase
      .from('informations_recues')
      .select('id, statut, numero_reference')
      .eq('id', validated.information_recue_id)
      .single();

    if (infoErr || !info) {
      throw new Error('L’information reçue source est introuvable.');
    }

    if (info.statut === 'TRAITE') {
      throw new Error('Une fiche d’ordonnancement a déjà été créée pour cette information reçue.');
    }
  }

  // 2. Vérifier assujetti, secteur et bureau
  const { data: assujetti, error: assErr } = await supabase
    .from('assujettis')
    .select('id')
    .eq('id', validated.assujetti_id)
    .single();

  if (assErr || !assujetti) {
    throw new Error('L’assujetti associé est introuvable.');
  }

  const numeroFiche = await generateNextNumeroFiche(supabase);

  // 3. Créer la fiche d'ordonnancement
  const { data: fiche, error: ficheErr } = await supabase
    .from('fiches_ordonnancement')
    .insert({
      numero_fiche: numeroFiche,
      information_recue_id: validated.information_recue_id || null,
      assujetti_id: validated.assujetti_id,
      secteur_id: validated.secteur_id,
      bureau_id: validated.bureau_id,
      numero_serie: validated.numero_serie,
      delai_traitement_jours: validated.delai_traitement_jours,
      numero_note_perception: validated.numero_note_perception,
      date_note_perception: validated.date_note_perception,
      acte_generateur: validated.acte_generateur,
      article_budgetaire: validated.article_budgetaire || null,
      nombre_actes: validated.nombre_actes,
      montant_cdf: validated.montant_cdf,
      montant_usd: validated.montant_usd,
      statut_transmission: 'CONSERVEE_BUREAU',
      created_by: user.id,
    })
    .select()
    .single();

  if (ficheErr || !fiche) {
    throw new Error(`Erreur lors de la création de la fiche d’ordonnancement : ${ficheErr?.message}`);
  }

  // 4. Mettre à jour l'information reçue si présente
  if (validated.information_recue_id) {
    await supabase
      .from('informations_recues')
      .update({
        statut: 'TRAITE',
        assujetti_id: validated.assujetti_id,
        traite_par: user.id,
        date_traitement: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.information_recue_id);
  }

  // 5. Enregistrer ou mettre à jour la note de perception unitaire dans la table historique
  if (validated.montant_cdf > 0) {
    const { data: existingNpCdf } = await supabase
      .from('notes_perception')
      .select('id')
      .eq('numero', validated.numero_note_perception)
      .eq('devise', 'CDF')
      .maybeSingle();

    if (!existingNpCdf) {
      await supabase.from('notes_perception').insert({
        assujetti_id: validated.assujetti_id,
        numero: validated.numero_note_perception,
        date: validated.date_note_perception,
        acte_generateur: validated.acte_generateur,
        article_budgetaire: validated.article_budgetaire || null,
        nombre_actes: validated.nombre_actes,
        montant: validated.montant_cdf,
        devise: 'CDF',
      });
    }
  }

  if (validated.montant_usd > 0) {
    const npUsdNumero = validated.montant_cdf > 0 ? `${validated.numero_note_perception}-USD` : validated.numero_note_perception;
    const { data: existingNpUsd } = await supabase
      .from('notes_perception')
      .select('id')
      .eq('numero', npUsdNumero)
      .eq('devise', 'USD')
      .maybeSingle();

    if (!existingNpUsd) {
      await supabase.from('notes_perception').insert({
        assujetti_id: validated.assujetti_id,
        numero: npUsdNumero,
        date: validated.date_note_perception,
        acte_generateur: validated.acte_generateur,
        article_budgetaire: validated.article_budgetaire || null,
        nombre_actes: validated.nombre_actes,
        montant: validated.montant_usd,
        devise: 'USD',
      });
    }
  }

  // 6. Audit log
  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'fiche_ordonnancement',
    entityId: fiche.id,
    newData: {
      numero_fiche: fiche.numero_fiche,
      information_recue_id: fiche.information_recue_id,
      assujetti_id: fiche.assujetti_id,
      montant_cdf: fiche.montant_cdf,
      montant_usd: fiche.montant_usd,
      statut_transmission: 'CONSERVEE_BUREAU',
    },
  });

  const fullFiche = await getFicheOrdonnancementById(user, fiche.id);
  return fullFiche!;
}

export async function getFichesOrdonnancement(
  user: CurrentUser,
  filters: Partial<FicheOrdonnancementFilterInput> = {}
): Promise<{ fiches: FicheOrdonnancementItem[]; total: number }> {
  const parsed = FicheOrdonnancementFilterSchema.parse(filters);
  const supabase = createAdminClient();

  let query = supabase
    .from('fiches_ordonnancement')
    .select(`
      id, numero_fiche, information_recue_id, assujetti_id, secteur_id, bureau_id,
      numero_serie, delai_traitement_jours, numero_note_perception, date_note_perception,
      acte_generateur, article_budgetaire, nombre_actes, montant_cdf, montant_usd,
      statut_transmission, date_transmission_division, transmis_par, created_by,
      created_at, updated_at,
      assujettis ( id, identifiant, nom_raison_sociale, type ),
      secteurs ( id, code, nom ),
      bureaux ( id, code, nom ),
      createur:created_by ( id, nom, prenom, email ),
      agent_transmetteur:transmis_par ( id, nom, prenom, email )
    `, { count: 'exact' });

  // Contrôle de périmètre organisationnel
  const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION', 'ADMIN'].includes(user.role);
  const isRecoupement = user.division_code === 'DIV_REC' || user.bureau_code === 'BUR_ANA_REC' || user.bureau_code === 'BUR_DOC';
  const isChefDivisionControle = user.role === 'CHEF_DIVISION' && user.division_code === 'DIV_CTRL';

  if (!isGlobal && !isRecoupement) {
    if (isChefDivisionControle) {
      // Le Chef de Division Contrôle ne voit que les fiches transmises à sa division
      query = query.eq('statut_transmission', 'TRANSMIS_DIVISION_CONTROLE');
    } else if (user.bureau_id) {
      // Bureau de contrôle individuel
      query = query.eq('bureau_id', user.bureau_id).eq('statut_transmission', 'TRANSMIS_DIVISION_CONTROLE');
    } else {
      return { fiches: [], total: 0 };
    }
  }

  if (parsed.statut_transmission) {
    query = query.eq('statut_transmission', parsed.statut_transmission);
  }
  if (parsed.bureau_id) {
    query = query.eq('bureau_id', parsed.bureau_id);
  }
  if (parsed.secteur_id) {
    query = query.eq('secteur_id', parsed.secteur_id);
  }
  if (parsed.assujetti_id) {
    query = query.eq('assujetti_id', parsed.assujetti_id);
  }
  if (parsed.search) {
    const term = `%${parsed.search}%`;
    const { data: matchingAssujettis, error: assujettisError } = await supabase
      .from('assujettis')
      .select('id')
      .or(`identifiant.ilike.${term},nom_raison_sociale.ilike.${term}`);

    if (assujettisError) {
      throw new Error(`Erreur lors de la recherche des assujettis : ${assujettisError.message}`);
    }

    const matchingIds = (matchingAssujettis || []).map((assujetti) => assujetti.id);
    const ficheSearch = `numero_fiche.ilike.${term},numero_note_perception.ilike.${term},numero_serie.ilike.${term}`;
    query = matchingIds.length
      ? query.or(`${ficheSearch},assujetti_id.in.(${matchingIds.join(',')})`)
      : query.or(ficheSearch);
  }

  const offset = (parsed.page - 1) * parsed.limit;
  query = query.order('created_at', { ascending: false }).range(offset, offset + parsed.limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Erreur lors de la récupération des fiches d’ordonnancement : ${error.message}`);
  }

  const fiches: FicheOrdonnancementItem[] = (data || []).map((row) => ({
    id: row.id,
    numero_fiche: row.numero_fiche,
    information_recue_id: row.information_recue_id,
    assujetti_id: row.assujetti_id,
    secteur_id: row.secteur_id,
    bureau_id: row.bureau_id,
    numero_serie: row.numero_serie,
    delai_traitement_jours: row.delai_traitement_jours,
    numero_note_perception: row.numero_note_perception,
    date_note_perception: row.date_note_perception,
    acte_generateur: row.acte_generateur,
    article_budgetaire: row.article_budgetaire,
    nombre_actes: row.nombre_actes,
    montant_cdf: Number(row.montant_cdf || 0),
    montant_usd: Number(row.montant_usd || 0),
    statut_transmission: row.statut_transmission,
    date_transmission_division: row.date_transmission_division,
    transmis_par: row.transmis_par,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assujetti: row.assujettis as unknown as FicheOrdonnancementItem['assujetti'],
    secteur: row.secteurs as unknown as FicheOrdonnancementItem['secteur'],
    bureau: row.bureaux as unknown as FicheOrdonnancementItem['bureau'],
    createur: row.createur as unknown as FicheOrdonnancementItem['createur'],
    agent_transmetteur: row.agent_transmetteur as unknown as FicheOrdonnancementItem['agent_transmetteur'],
  }));

  return { fiches, total: count || 0 };
}

export async function getFicheOrdonnancementById(
  user: CurrentUser,
  id: string
): Promise<FicheOrdonnancementItem | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('fiches_ordonnancement')
    .select(`
      id, numero_fiche, information_recue_id, assujetti_id, secteur_id, bureau_id,
      numero_serie, delai_traitement_jours, numero_note_perception, date_note_perception,
      acte_generateur, article_budgetaire, nombre_actes, montant_cdf, montant_usd,
      statut_transmission, date_transmission_division, transmis_par, created_by,
      created_at, updated_at,
      assujettis ( id, identifiant, nom_raison_sociale, type ),
      secteurs ( id, code, nom ),
      bureaux ( id, code, nom ),
      createur:created_by ( id, nom, prenom, email ),
      agent_transmetteur:transmis_par ( id, nom, prenom, email )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Vérification de sécurité du périmètre
  const isGlobal = ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CONSULTATION', 'ADMIN'].includes(user.role);
  const isRecoupement = user.division_code === 'DIV_REC' || user.bureau_code === 'BUR_ANA_REC' || user.bureau_code === 'BUR_DOC';
  const isChefDivisionControle = user.role === 'CHEF_DIVISION' && user.division_code === 'DIV_CTRL';

  if (!isGlobal && !isRecoupement) {
    if (isChefDivisionControle && data.statut_transmission !== 'TRANSMIS_DIVISION_CONTROLE') {
      return null;
    }
    if (!isChefDivisionControle && (data.bureau_id !== user.bureau_id || data.statut_transmission !== 'TRANSMIS_DIVISION_CONTROLE')) {
      return null;
    }
  }

  return {
    id: data.id,
    numero_fiche: data.numero_fiche,
    information_recue_id: data.information_recue_id,
    assujetti_id: data.assujetti_id,
    secteur_id: data.secteur_id,
    bureau_id: data.bureau_id,
    numero_serie: data.numero_serie,
    delai_traitement_jours: data.delai_traitement_jours,
    numero_note_perception: data.numero_note_perception,
    date_note_perception: data.date_note_perception,
    acte_generateur: data.acte_generateur,
    article_budgetaire: data.article_budgetaire,
    nombre_actes: data.nombre_actes,
    montant_cdf: Number(data.montant_cdf || 0),
    montant_usd: Number(data.montant_usd || 0),
    statut_transmission: data.statut_transmission,
    date_transmission_division: data.date_transmission_division,
    transmis_par: data.transmis_par,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    assujetti: data.assujettis as unknown as FicheOrdonnancementItem['assujetti'],
    secteur: data.secteurs as unknown as FicheOrdonnancementItem['secteur'],
    bureau: data.bureaux as unknown as FicheOrdonnancementItem['bureau'],
    createur: data.createur as unknown as FicheOrdonnancementItem['createur'],
    agent_transmetteur: data.agent_transmetteur as unknown as FicheOrdonnancementItem['agent_transmetteur'],
  };
}

export async function transmettreFicheDivisionControle(
  user: CurrentUser,
  ficheId: string
): Promise<FicheOrdonnancementItem> {
  assertCanManageRecoupementBureau(user);
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('fiches_ordonnancement')
    .select('id, numero_fiche, statut_transmission')
    .eq('id', ficheId)
    .single();

  if (fetchErr || !existing) {
    throw new Error('La fiche d’ordonnancement spécifiée est introuvable.');
  }

  if (existing.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE') {
    throw new Error('Cette fiche a déjà été transmise au Chef de Division Contrôle.');
  }

  const dateTransmission = new Date().toISOString();

  const { data, error } = await supabase
    .from('fiches_ordonnancement')
    .update({
      statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
      date_transmission_division: dateTransmission,
      transmis_par: user.id,
      updated_at: dateTransmission,
    })
    .eq('id', ficheId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de la transmission : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'TRANSMISSION',
    entityType: 'fiche_ordonnancement',
    entityId: data.id,
    oldData: { statut_transmission: 'CONSERVEE_BUREAU' },
    newData: {
      statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
      date_transmission_division: dateTransmission,
      transmis_par: user.id,
    },
  });

  const updated = await getFicheOrdonnancementById(user, ficheId);
  return updated!;
}

export async function transmettreFichesDivisionControle(user: CurrentUser, ficheIds: string[]) {
  assertCanManageRecoupementBureau(user);
  const ids = [...new Set(ficheIds)];
  const supabase = createAdminClient();
  const { data: fiches, error } = await supabase
    .from('fiches_ordonnancement')
    .select('id, numero_fiche, statut_transmission')
    .in('id', ids);
  if (error || !fiches || fiches.length !== ids.length) {
    throw new Error('Une ou plusieurs fiches sont introuvables ou hors de votre périmètre.');
  }
  const invalides = fiches.filter((fiche) => fiche.statut_transmission !== 'CONSERVEE_BUREAU');
  if (invalides.length) {
    throw new Error(`Transmission annulée : ${invalides.map((f) => f.numero_fiche).join(', ')} est déjà transmise ou non transmissible.`);
  }

  const dateTransmission = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('fiches_ordonnancement')
    .update({ statut_transmission: 'TRANSMIS_DIVISION_CONTROLE', date_transmission_division: dateTransmission, transmis_par: user.id, updated_at: dateTransmission })
    .in('id', ids)
    .eq('statut_transmission', 'CONSERVEE_BUREAU')
    .select('id, numero_fiche');
  if (updateError || !updated || updated.length !== ids.length) {
    throw new Error('Transmission annulée : une fiche a changé de statut avant la validation.');
  }
  await Promise.all(updated.map((fiche) => logAuditEvent({
    userId: user.id, action: 'TRANSMISSION', entityType: 'fiche_ordonnancement', entityId: fiche.id,
    oldData: { statut_transmission: 'CONSERVEE_BUREAU' },
    newData: { statut_transmission: 'TRANSMIS_DIVISION_CONTROLE', date_transmission_division: dateTransmission, transmis_par: user.id },
  })));
  return { transmittedIds: updated.map((fiche) => fiche.id), count: updated.length };
}

/**
 * Transmet toutes les fiches encore conservées par BUR_ANA_REC.
 * Les fiches à traiter sont recherchées côté serveur afin que cette opération
 * couvre le périmètre complet, indépendamment de la pagination affichée.
 */
export async function transmettreToutesFichesDivisionControle(user: CurrentUser) {
  assertCanManageRecoupementBureau(user);
  const supabase = createAdminClient();
  const dateTransmission = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('fiches_ordonnancement')
    .update({
      statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
      date_transmission_division: dateTransmission,
      transmis_par: user.id,
      updated_at: dateTransmission,
    })
    .eq('statut_transmission', 'CONSERVEE_BUREAU')
    .select('id');

  if (error) {
    throw new Error(`Erreur lors de la transmission globale : ${error.message}`);
  }

  await Promise.all((updated || []).map((fiche) => logAuditEvent({
    userId: user.id,
    action: 'TRANSMISSION',
    entityType: 'fiche_ordonnancement',
    entityId: fiche.id,
    oldData: { statut_transmission: 'CONSERVEE_BUREAU' },
    newData: {
      statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
      date_transmission_division: dateTransmission,
      transmis_par: user.id,
      mode: 'TOUTES_LES_FICHES_NON_TRANSMISES',
    },
  })));

  return { transmittedIds: (updated || []).map((fiche) => fiche.id), count: updated?.length || 0 };
}

// -----------------------------------------------------------------------------
// 3. MÉTRIQUES DU TABLEAU DE BORD (BUREAU ANALYSE & RECOUPEMENT)
// -----------------------------------------------------------------------------

export async function getRecoupementDashboardMetrics(
  user: CurrentUser
): Promise<RecoupementDashboardMetrics> {
  assertCanAccessRecoupementBureau(user);
  const supabase = createAdminClient();

  const [
    { count: countAssujettis },
    { count: countFichesTotales },
    { count: countFichesTransmises },
    { data: lastInformations },
    { data: lastFiches },
  ] = await Promise.all([
    supabase.from('assujettis').select('*', { count: 'exact', head: true }),
    supabase.from('fiches_ordonnancement').select('*', { count: 'exact', head: true }),
    supabase.from('fiches_ordonnancement').select('*', { count: 'exact', head: true }).eq('statut_transmission', 'TRANSMIS_DIVISION_CONTROLE'),
    supabase.from('assujettis').select('id, numero_reference:identifiant, nom_assujetti_declare:nom_raison_sociale, date_reception:created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('fiches_ordonnancement').select('id, numero_fiche, date_note_perception, statut_transmission, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const activitesRecentes: RecoupementDashboardMetrics['activitesRecentes'] = [];

  for (const info of lastInformations || []) {
    activitesRecentes.push({
      id: `info-${info.id}`,
      type: 'ASSUJETTI_ENREGISTRE',
      titre: `Arrivée ${info.numero_reference}`,
      description: `Assujetti déclaré : ${info.nom_assujetti_declare}`,
      date: info.date_reception,
    });
  }

  for (const fiche of lastFiches || []) {
    activitesRecentes.push({
      id: `fiche-${fiche.id}`,
      type: fiche.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE' ? 'FICHE_TRANSMISE' : 'FICHE_CREEE',
      titre: `Fiche ${fiche.numero_fiche}`,
      description: fiche.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE' ? 'Transmise à la Division Contrôle' : 'Conservée au Bureau',
      date: fiche.created_at,
      statut: fiche.statut_transmission,
    });
  }

  // Tri décroissant par date
  activitesRecentes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const { data: fichesAssujettis, error: fichesAssujettisError } = await supabase
    .from('fiches_ordonnancement')
    .select('assujetti_id');
  if (fichesAssujettisError) {
    throw new Error(`Impossible de calculer les assujettis sans fiche : ${fichesAssujettisError.message}`);
  }

  const totalFiches = countFichesTotales || 0;
  const transmises = countFichesTransmises || 0;
  const assujettisAvecFiche = new Set((fichesAssujettis ?? []).map((fiche) => fiche.assujetti_id)).size;

  return {
    totalAssujettis: countAssujettis || 0,
    assujettisSansFiche: Math.max(0, (countAssujettis || 0) - assujettisAvecFiche),
    fichesEnregistrees: totalFiches,
    fichesTransmises: transmises,
    fichesConservees: Math.max(0, totalFiches - transmises),
    activitesRecentes: activitesRecentes.slice(0, 8),
  };
}
