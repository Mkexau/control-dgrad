// =============================================================================
// DGRAD CONTROLE - SERVICE MÉTIER RECOUPEMENT, ASSUJETTIS ET ANALYSES
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/validations/auth';
import {
  assertCanReadAssujetti,
  assertCanManageAssujetti,
  assertCanManageRecoupement,
  assertCanCreateAnalyse,
  assertCanReadAnalyse,
  assertCanManageAnalyse,
  assertCanTransitionAnalyse,
} from '@/lib/auth/recoupement-access';
import {
  type AssujettiCreateInput,
  type AssujettiUpdateInput,
  type AssujettiFilterInput,
  AssujettiCreateSchema,
  AssujettiUpdateSchema,
  AssujettiFilterSchema,
} from '@/lib/validations/assujettis';
import {
  type NotePerceptionCreateInput,
  type OrdonnancementCreateInput,
  type NotePerceptionFilterInput,
  NotePerceptionCreateSchema,
  OrdonnancementCreateSchema,
  NotePerceptionFilterSchema,
} from '@/lib/validations/recoupement';
import {
  type AnalyseCreateInput,
  type AnalyseAssujettiAddInput,
  type AnalyseTransitionInput,
  type AnalyseFilterInput,
  AnalyseCreateSchema,
  AnalyseAssujettiAddSchema,
  AnalyseTransitionSchema,
  AnalyseFilterSchema,
} from '@/lib/validations/analyses';
import { logAuditEvent } from '@/lib/audit/audit-service';

// -----------------------------------------------------------------------------
// 1. GESTION DES ASSUJETTIS
// -----------------------------------------------------------------------------

export interface AssujettiItem {
  id: string;
  type: 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE';
  identifiant: string;
  nom_raison_sociale: string;
  adresse: string | null;
  email: string | null;
  telephone: string | null;
  secteur_principal_id: string | null;
  actif: boolean;
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
}

export async function getAssujettis(
  user: CurrentUser,
  filters: Partial<AssujettiFilterInput> = {}
): Promise<{ assujettis: AssujettiItem[]; total: number }> {
  const parsedFilters = AssujettiFilterSchema.parse(filters);
  const supabase = createAdminClient();

  let query = supabase
    .from('assujettis')
    .select(`
      id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
      secteur_principal_id, actif, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      )
    `, { count: 'exact' });

  // Périmètre organisationnel selon le rôle
  const isRecoupement = user.bureau_code === 'BUR_ANA_REC' || user.division_code === 'DIV_REC';
  const isGlobal = [
    'DIRECTEUR_GENERAL',
    'DIRECTEUR_CONTROLES',
    'CHEF_DIVISION',
    'CONSULTATION',
    'CHEF_EQUIPE',
    'CONTROLEUR',
  ].includes(user.role) || isRecoupement;

  if (!isGlobal && ['CHEF_BUREAU', 'ANALYSTE'].includes(user.role)) {
    if (user.bureau_id) {
      // Filtrer par les secteurs du bureau
      const { data: secteurs } = await supabase
        .from('secteurs')
        .select('id')
        .eq('bureau_id', user.bureau_id);
      const secteurIds = (secteurs || []).map((s) => s.id);
      if (secteurIds.length > 0) {
        query = query.in('secteur_principal_id', secteurIds);
      } else {
        return { assujettis: [], total: 0 };
      }
    }
  }

  // Filtres optionnels
  if (parsedFilters.search) {
    const term = `%${parsedFilters.search}%`;
    query = query.or(`identifiant.ilike.${term},nom_raison_sociale.ilike.${term},email.ilike.${term}`);
  }

  if (parsedFilters.secteur_id) {
    if (!isGlobal && parsedFilters.secteur_id !== undefined && parsedFilters.secteur_id !== null) {
      const { data: requestedSecteur } = await supabase
        .from('secteurs')
        .select('bureau_id')
        .eq('id', parsedFilters.secteur_id)
        .maybeSingle();
      if (!requestedSecteur || requestedSecteur.bureau_id !== user.bureau_id) {
        throw new Error('Le secteur demandé ne relève pas de votre bureau de contrôle.');
      }
    }
    query = query.eq('secteur_principal_id', parsedFilters.secteur_id);
  }

  if (parsedFilters.type) {
    query = query.eq('type', parsedFilters.type);
  }

  if (typeof parsedFilters.actif === 'boolean') {
    query = query.eq('actif', parsedFilters.actif);
  }

  const page = parsedFilters.page || 1;
  const limit = parsedFilters.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('nom_raison_sociale', { ascending: true }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Erreur lors de la récupération des assujettis : ${error.message}`);
  }

  const items = (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    type: item.type as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE',
    identifiant: item.identifiant as string,
    nom_raison_sociale: item.nom_raison_sociale as string,
    adresse: (item.adresse as string) || null,
    email: (item.email as string) || null,
    telephone: (item.telephone as string) || null,
    secteur_principal_id: (item.secteur_principal_id as string) || null,
    actif: Boolean(item.actif),
    created_at: item.created_at as string,
    updated_at: item.updated_at as string,
    secteur: item.secteurs as unknown as AssujettiItem['secteur'],
  }));

  return { assujettis: items, total: count || 0 };
}

export async function getAssujettiById(
  user: CurrentUser,
  id: string
): Promise<AssujettiItem | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('assujettis')
    .select(`
      id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
      secteur_principal_id, actif, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const bureauId = (data.secteurs as { bureau_id?: string } | null)?.bureau_id ?? null;
  assertCanReadAssujetti(user, bureauId);

  return {
    id: data.id,
    type: data.type,
    identifiant: data.identifiant,
    nom_raison_sociale: data.nom_raison_sociale,
    adresse: data.adresse,
    email: data.email,
    telephone: data.telephone,
    secteur_principal_id: data.secteur_principal_id,
    actif: data.actif,
    created_at: data.created_at,
    updated_at: data.updated_at,
    secteur: data.secteurs as unknown as AssujettiItem['secteur'],
  };
}

export async function createAssujetti(
  user: CurrentUser,
  input: AssujettiCreateInput
): Promise<AssujettiItem> {
  const validated = AssujettiCreateSchema.parse(input);
  const supabase = createAdminClient();

  let bureauId: string | null = null;
  if (validated.secteur_principal_id) {
    const { data: secteur } = await supabase
      .from('secteurs')
      .select('bureau_id')
      .eq('id', validated.secteur_principal_id)
      .single();
    bureauId = secteur?.bureau_id ?? null;
  }

  assertCanManageAssujetti(user, bureauId);

  // Vérification de l'unicité de l'identifiant
  const { data: existing } = await supabase
    .from('assujettis')
    .select('id')
    .eq('identifiant', validated.identifiant)
    .maybeSingle();

  if (existing) {
    throw new Error(`Un assujetti avec l'identifiant ${validated.identifiant} existe déjà.`);
  }

  const { data, error } = await supabase
    .from('assujettis')
    .insert({
      type: validated.type,
      identifiant: validated.identifiant,
      nom_raison_sociale: validated.nom_raison_sociale,
      adresse: validated.adresse || null,
      email: validated.email || null,
      telephone: validated.telephone || null,
      secteur_principal_id: validated.secteur_principal_id || null,
      actif: true,
    })
    .select(`
      id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
      secteur_principal_id, actif, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de la création de l'assujetti : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'assujetti',
    entityId: data.id,
    newData: {
      identifiant: data.identifiant,
      nom_raison_sociale: data.nom_raison_sociale,
      type: data.type,
      secteur_principal_id: data.secteur_principal_id,
    },
  });

  return {
    id: data.id,
    type: data.type,
    identifiant: data.identifiant,
    nom_raison_sociale: data.nom_raison_sociale,
    adresse: data.adresse,
    email: data.email,
    telephone: data.telephone,
    secteur_principal_id: data.secteur_principal_id,
    actif: data.actif,
    created_at: data.created_at,
    updated_at: data.updated_at,
    secteur: data.secteurs as unknown as AssujettiItem['secteur'],
  };
}

export async function updateAssujetti(
  user: CurrentUser,
  input: AssujettiUpdateInput
): Promise<AssujettiItem> {
  const validated = AssujettiUpdateSchema.parse(input);
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('assujettis')
    .select(`
      id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
      secteur_principal_id, actif,
      secteurs ( bureau_id )
    `)
    .eq('id', validated.id)
    .single();

  if (fetchErr || !existing) {
    throw new Error("L'assujetti à modifier n'existe pas.");
  }

  const existingBureauId = (existing.secteurs as { bureau_id?: string } | null)?.bureau_id ?? null;
  assertCanManageAssujetti(user, existingBureauId);

  // Si le secteur change, vérifier les droits sur le nouveau secteur
  if (validated.secteur_principal_id && validated.secteur_principal_id !== existing.secteur_principal_id) {
    const { data: newSecteur } = await supabase
      .from('secteurs')
      .select('bureau_id')
      .eq('id', validated.secteur_principal_id)
      .single();
    assertCanManageAssujetti(user, newSecteur?.bureau_id ?? null);
  }

  // Unicité identifiant si modifié
  if (validated.identifiant && validated.identifiant !== existing.identifiant) {
    const { data: conflict } = await supabase
      .from('assujettis')
      .select('id')
      .eq('identifiant', validated.identifiant)
      .neq('id', validated.id)
      .maybeSingle();

    if (conflict) {
      throw new Error(`Un assujetti avec l'identifiant ${validated.identifiant} existe déjà.`);
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.type !== undefined) updatePayload.type = validated.type;
  if (validated.identifiant !== undefined) updatePayload.identifiant = validated.identifiant;
  if (validated.nom_raison_sociale !== undefined) updatePayload.nom_raison_sociale = validated.nom_raison_sociale;
  if (validated.adresse !== undefined) updatePayload.adresse = validated.adresse;
  if (validated.email !== undefined) updatePayload.email = validated.email;
  if (validated.telephone !== undefined) updatePayload.telephone = validated.telephone;
  if (validated.secteur_principal_id !== undefined) updatePayload.secteur_principal_id = validated.secteur_principal_id;
  if (validated.actif !== undefined) updatePayload.actif = validated.actif;

  const { data, error } = await supabase
    .from('assujettis')
    .update(updatePayload)
    .eq('id', validated.id)
    .select(`
      id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
      secteur_principal_id, actif, created_at, updated_at,
      secteurs (
        id, code, nom, bureau_id,
        bureaux ( id, code, nom )
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de la mise à jour de l'assujetti : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'MODIFICATION',
    entityType: 'assujetti',
    entityId: data.id,
    oldData: existing as unknown as Record<string, unknown>,
    newData: updatePayload,
  });

  return {
    id: data.id,
    type: data.type,
    identifiant: data.identifiant,
    nom_raison_sociale: data.nom_raison_sociale,
    adresse: data.adresse,
    email: data.email,
    telephone: data.telephone,
    secteur_principal_id: data.secteur_principal_id,
    actif: data.actif,
    created_at: data.created_at,
    updated_at: data.updated_at,
    secteur: data.secteurs as unknown as AssujettiItem['secteur'],
  };
}

// -----------------------------------------------------------------------------
// 2. NOTES DE PERCEPTION & ORDONNANCEMENTS (RECOUPEMENT)
// -----------------------------------------------------------------------------

export interface NotePerceptionItem {
  id: string;
  assujetti_id: string;
  numero: string;
  date: string;
  acte_generateur: string;
  article_budgetaire: string | null;
  nombre_actes: number;
  montant: number;
  devise: 'CDF' | 'USD';
  created_at: string;
}

export interface OrdonnancementItem {
  id: string;
  assujetti_id: string;
  numero: string;
  date: string;
  montant: number;
  devise: 'CDF' | 'USD';
  statut: string;
  created_at: string;
}

export interface RecoupementSynthese {
  assujetti: AssujettiItem;
  cdf: {
    totalNotes: number;
    totalOrdonnancements: number;
    solde: number; // Reste = Ordonnancé - Perçu (ou écart)
    nbNotes: number;
    nbOrdonnancements: number;
  };
  usd: {
    totalNotes: number;
    totalOrdonnancements: number;
    solde: number;
    nbNotes: number;
    nbOrdonnancements: number;
  };
}

export async function getNotesPerception(
  user: CurrentUser,
  assujettiId: string,
  filters: Partial<NotePerceptionFilterInput> = {}
): Promise<NotePerceptionItem[]> {
  const assujetti = await getAssujettiById(user, assujettiId);
  if (!assujetti) {
    throw new Error('Assujetti non trouvé ou accès non autorisé.');
  }

  const parsedFilters = NotePerceptionFilterSchema.parse({ ...filters, assujetti_id: assujettiId });
  const supabase = createAdminClient();

  let query = supabase
    .from('notes_perception')
    .select('id, assujetti_id, numero, date, acte_generateur, article_budgetaire, nombre_actes, montant, devise, created_at')
    .eq('assujetti_id', assujettiId)
    .order('date', { ascending: false });

  if (parsedFilters.devise) {
    query = query.eq('devise', parsedFilters.devise);
  }
  if (parsedFilters.date_debut) {
    query = query.gte('date', parsedFilters.date_debut);
  }
  if (parsedFilters.date_fin) {
    query = query.lte('date', parsedFilters.date_fin);
  }
  if (parsedFilters.search) {
    const term = `%${parsedFilters.search}%`;
    query = query.or(`numero.ilike.${term},acte_generateur.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Erreur lors de la récupération des notes de perception : ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    assujetti_id: row.assujetti_id,
    numero: row.numero,
    date: row.date,
    acte_generateur: row.acte_generateur,
    article_budgetaire: row.article_budgetaire,
    nombre_actes: row.nombre_actes,
    montant: Number(row.montant),
    devise: row.devise,
    created_at: row.created_at,
  }));
}

export async function createNotePerception(
  user: CurrentUser,
  input: NotePerceptionCreateInput
): Promise<NotePerceptionItem> {
  const validated = NotePerceptionCreateSchema.parse(input);
  const assujetti = await getAssujettiById(user, validated.assujetti_id);
  if (!assujetti) {
    throw new Error('Assujetti non trouvé ou accès non autorisé.');
  }

  assertCanManageRecoupement(user, assujetti.secteur?.bureau_id ?? null);
  const supabase = createAdminClient();

  // Unicité numéro de note
  const { data: existing } = await supabase
    .from('notes_perception')
    .select('id')
    .eq('numero', validated.numero)
    .maybeSingle();

  if (existing) {
    throw new Error(`Une note de perception avec le numéro ${validated.numero} existe déjà.`);
  }

  const { data, error } = await supabase
    .from('notes_perception')
    .insert({
      assujetti_id: validated.assujetti_id,
      numero: validated.numero,
      date: validated.date,
      acte_generateur: validated.acte_generateur,
      article_budgetaire: validated.article_budgetaire || null,
      nombre_actes: validated.nombre_actes,
      montant: validated.montant,
      devise: validated.devise,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de l'enregistrement de la note de perception : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'note_perception',
    entityId: data.id,
    newData: {
      assujetti_id: data.assujetti_id,
      numero: data.numero,
      montant: data.montant,
      devise: data.devise,
    },
  });

  return {
    id: data.id,
    assujetti_id: data.assujetti_id,
    numero: data.numero,
    date: data.date,
    acte_generateur: data.acte_generateur,
    article_budgetaire: data.article_budgetaire,
    nombre_actes: data.nombre_actes,
    montant: Number(data.montant),
    devise: data.devise,
    created_at: data.created_at,
  };
}

export async function getOrdonnancements(
  user: CurrentUser,
  assujettiId: string
): Promise<OrdonnancementItem[]> {
  const assujetti = await getAssujettiById(user, assujettiId);
  if (!assujetti) {
    throw new Error('Assujetti non trouvé ou accès non autorisé.');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ordonnancements')
    .select('id, assujetti_id, numero, date, montant, devise, statut, created_at')
    .eq('assujetti_id', assujettiId)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des ordonnancements : ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    assujetti_id: row.assujetti_id,
    numero: row.numero,
    date: row.date,
    montant: Number(row.montant),
    devise: row.devise,
    statut: row.statut,
    created_at: row.created_at,
  }));
}

export async function createOrdonnancement(
  user: CurrentUser,
  input: OrdonnancementCreateInput
): Promise<OrdonnancementItem> {
  const validated = OrdonnancementCreateSchema.parse(input);
  const assujetti = await getAssujettiById(user, validated.assujetti_id);
  if (!assujetti) {
    throw new Error('Assujetti non trouvé ou accès non autorisé.');
  }

  assertCanManageRecoupement(user, assujetti.secteur?.bureau_id ?? null);
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('ordonnancements')
    .select('id')
    .eq('numero', validated.numero)
    .maybeSingle();

  if (existing) {
    throw new Error(`Un ordonnancement avec le numéro ${validated.numero} existe déjà.`);
  }

  // Un ordonnancement est rattaché à une note de la même devise : aucune
  // compensation CDF/USD n'est admise (RM-015).
  const { data: matchingNote, error: noteError } = await supabase
    .from('notes_perception')
    .select('id')
    .eq('assujetti_id', validated.assujetti_id)
    .eq('devise', validated.devise)
    .limit(1)
    .maybeSingle();

  if (noteError || !matchingNote) {
    throw new Error("L'ordonnancement doit utiliser la devise d'une note de perception existante pour cet assujetti.");
  }

  const { data, error } = await supabase
    .from('ordonnancements')
    .insert({
      assujetti_id: validated.assujetti_id,
      numero: validated.numero,
      date: validated.date,
      montant: validated.montant,
      devise: validated.devise,
      statut: validated.statut || 'ORDONNANCE',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de l'enregistrement de l'ordonnancement : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'ordonnancement',
    entityId: data.id,
    newData: {
      assujetti_id: data.assujetti_id,
      numero: data.numero,
      montant: data.montant,
      devise: data.devise,
    },
  });

  return {
    id: data.id,
    assujetti_id: data.assujetti_id,
    numero: data.numero,
    date: data.date,
    montant: Number(data.montant),
    devise: data.devise,
    statut: data.statut,
    created_at: data.created_at,
  };
}

/**
 * Calcul rigoureux de la synthèse de recoupement pour un assujetti.
 * RÈGLE ABSOLUE (RM-015, RM-040) : Séparation stricte CDF et USD, zéro conversion ni taux de change.
 */
export async function getRecoupementSynthesis(
  user: CurrentUser,
  assujettiId: string
): Promise<RecoupementSynthese> {
  const assujetti = await getAssujettiById(user, assujettiId);
  if (!assujetti) {
    throw new Error('Assujetti non trouvé ou accès non autorisé.');
  }

  const [notes, ordonnancements] = await Promise.all([
    getNotesPerception(user, assujettiId),
    getOrdonnancements(user, assujettiId),
  ]);

  let totalNotesCDF = 0;
  let totalNotesUSD = 0;
  let nbNotesCDF = 0;
  let nbNotesUSD = 0;

  for (const n of notes) {
    if (n.devise === 'CDF') {
      totalNotesCDF = Math.round((totalNotesCDF + n.montant) * 100) / 100;
      nbNotesCDF++;
    } else if (n.devise === 'USD') {
      totalNotesUSD = Math.round((totalNotesUSD + n.montant) * 100) / 100;
      nbNotesUSD++;
    }
  }

  let totalOrdCDF = 0;
  let totalOrdUSD = 0;
  let nbOrdCDF = 0;
  let nbOrdUSD = 0;

  for (const o of ordonnancements) {
    if (o.devise === 'CDF') {
      totalOrdCDF = Math.round((totalOrdCDF + o.montant) * 100) / 100;
      nbOrdCDF++;
    } else if (o.devise === 'USD') {
      totalOrdUSD = Math.round((totalOrdUSD + o.montant) * 100) / 100;
      nbOrdUSD++;
    }
  }

  // Solde = montant notifié - montant ordonnancé, par devise.
  const soldeCDF = Math.round((totalNotesCDF - totalOrdCDF) * 100) / 100;
  const soldeUSD = Math.round((totalNotesUSD - totalOrdUSD) * 100) / 100;

  return {
    assujetti,
    cdf: {
      totalNotes: totalNotesCDF,
      totalOrdonnancements: totalOrdCDF,
      solde: soldeCDF,
      nbNotes: nbNotesCDF,
      nbOrdonnancements: nbOrdCDF,
    },
    usd: {
      totalNotes: totalNotesUSD,
      totalOrdonnancements: totalOrdUSD,
      solde: soldeUSD,
      nbNotes: nbNotesUSD,
      nbOrdonnancements: nbOrdUSD,
    },
  };
}

// -----------------------------------------------------------------------------
// 3. ANALYSES & CIBLAGE MULTI-ASSUJETTIS
// -----------------------------------------------------------------------------

export interface AnalyseItem {
  id: string;
  bureau_id: string;
  secteur_id: string | null;
  auteur_id: string;
  date: string;
  statut: 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'CLOTUREE';
  observations: string | null;
  created_at: string;
  updated_at: string;
  bureau?: { id: string; code: string; nom: string } | null;
  secteur?: { id: string; code: string; nom: string } | null;
  auteur?: { id: string; nom: string; prenom: string; role: string } | null;
  assujettis_count?: number;
  assujettis?: Array<{
    id: string;
    analyse_id: string;
    assujetti_id: string;
    montant_du: number | null;
    montant_paye: number | null;
    montant_restant: number | null;
    devise: 'CDF' | 'USD';
    manque_a_gagner: number | null;
    priorite: 'HAUTE' | 'MOYENNE' | 'BASSE' | null;
    created_at: string;
    assujetti: AssujettiItem;
  }>;
}

export async function getAnalyses(
  user: CurrentUser,
  filters: Partial<AnalyseFilterInput> = {}
): Promise<{ analyses: AnalyseItem[]; total: number }> {
  const parsed = AnalyseFilterSchema.parse(filters);
  const supabase = createAdminClient();

  let query = supabase
    .from('analyses')
    .select(`
      id, bureau_id, secteur_id, auteur_id, date, statut, observations, created_at, updated_at,
      bureaux ( id, code, nom ),
      secteurs ( id, code, nom ),
      profiles!analyses_auteur_id_fkey ( id, nom, prenom, role ),
      analyse_assujettis ( id )
    `, { count: 'exact' });

  // Périmètre
  const isGlobal = [
    'DIRECTEUR_GENERAL',
    'DIRECTEUR_CONTROLES',
    'CHEF_DIVISION',
    'CONSULTATION',
  ].includes(user.role);

  if (!isGlobal && ['CHEF_BUREAU', 'ANALYSTE'].includes(user.role)) {
    if (user.bureau_id) {
      query = query.eq('bureau_id', user.bureau_id);
    } else {
      return { analyses: [], total: 0 };
    }
  }

  if (parsed.bureau_id) {
    if (!isGlobal && parsed.bureau_id !== user.bureau_id) {
      throw new Error("Le bureau demandé ne relève pas de votre périmètre.");
    }
    query = query.eq('bureau_id', parsed.bureau_id);
  }
  if (parsed.secteur_id) {
    query = query.eq('secteur_id', parsed.secteur_id);
  }
  if (parsed.statut) {
    query = query.eq('statut', parsed.statut);
  }

  const page = parsed.page || 1;
  const limit = parsed.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Erreur lors de la récupération des analyses : ${error.message}`);
  }

  const items: AnalyseItem[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    bureau_id: row.bureau_id as string,
    secteur_id: (row.secteur_id as string) || null,
    auteur_id: row.auteur_id as string,
    date: row.date as string,
    statut: row.statut as AnalyseItem['statut'],
    observations: (row.observations as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    bureau: row.bureaux as unknown as AnalyseItem['bureau'],
    secteur: row.secteurs as unknown as AnalyseItem['secteur'],
    auteur: row.profiles as unknown as AnalyseItem['auteur'],
    assujettis_count: Array.isArray(row.analyse_assujettis) ? row.analyse_assujettis.length : 0,
  }));

  return { analyses: items, total: count || 0 };
}

export async function getAnalyseById(
  user: CurrentUser,
  id: string
): Promise<AnalyseItem | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('analyses')
    .select(`
      id, bureau_id, secteur_id, auteur_id, date, statut, observations, created_at, updated_at,
      bureaux ( id, code, nom ),
      secteurs ( id, code, nom ),
      profiles!analyses_auteur_id_fkey ( id, nom, prenom, role ),
      analyse_assujettis (
        id, analyse_id, assujetti_id, montant_du, montant_paye, montant_restant, devise,
        manque_a_gagner, priorite, created_at,
        assujettis (
          id, type, identifiant, nom_raison_sociale, adresse, email, telephone,
          secteur_principal_id, actif, created_at, updated_at
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  assertCanReadAnalyse(user, data.bureau_id);

  const assujettis = Array.isArray(data.analyse_assujettis)
    ? data.analyse_assujettis.map((aa: Record<string, unknown>) => ({
        id: aa.id as string,
        analyse_id: aa.analyse_id as string,
        assujetti_id: aa.assujetti_id as string,
        montant_du: aa.montant_du !== null ? Number(aa.montant_du) : null,
        montant_paye: aa.montant_paye !== null ? Number(aa.montant_paye) : null,
        montant_restant: aa.montant_restant !== null ? Number(aa.montant_restant) : null,
        devise: aa.devise as 'CDF' | 'USD',
        manque_a_gagner: aa.manque_a_gagner !== null ? Number(aa.manque_a_gagner) : null,
        priorite: (aa.priorite as 'HAUTE' | 'MOYENNE' | 'BASSE') || null,
        created_at: aa.created_at as string,
        assujetti: aa.assujettis as AssujettiItem,
      }))
    : [];

  return {
    id: data.id,
    bureau_id: data.bureau_id,
    secteur_id: data.secteur_id,
    auteur_id: data.auteur_id,
    date: data.date,
    statut: data.statut as AnalyseItem['statut'],
    observations: data.observations,
    created_at: data.created_at,
    updated_at: data.updated_at,
    bureau: data.bureaux as unknown as AnalyseItem['bureau'],
    secteur: data.secteurs as unknown as AnalyseItem['secteur'],
    auteur: data.profiles as unknown as AnalyseItem['auteur'],
    assujettis_count: assujettis.length,
    assujettis,
  };
}

export async function createAnalyse(
  user: CurrentUser,
  input: AnalyseCreateInput
): Promise<AnalyseItem> {
  const validated = AnalyseCreateSchema.parse(input);
  assertCanCreateAnalyse(user, validated.bureau_id);

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      bureau_id: validated.bureau_id,
      secteur_id: validated.secteur_id || null,
      auteur_id: user.id,
      date: validated.date || new Date().toISOString().split('T')[0],
      statut: 'BROUILLON',
      observations: validated.observations || null,
    })
    .select(`
      id, bureau_id, secteur_id, auteur_id, date, statut, observations, created_at, updated_at,
      bureaux ( id, code, nom ),
      secteurs ( id, code, nom ),
      profiles!analyses_auteur_id_fkey ( id, nom, prenom, role )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors de la création de l'analyse : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION',
    entityType: 'analyse',
    entityId: data.id,
    newData: {
      bureau_id: data.bureau_id,
      secteur_id: data.secteur_id,
      statut: data.statut,
    },
  });

  return {
    id: data.id,
    bureau_id: data.bureau_id,
    secteur_id: data.secteur_id,
    auteur_id: data.auteur_id,
    date: data.date,
    statut: data.statut as AnalyseItem['statut'],
    observations: data.observations,
    created_at: data.created_at,
    updated_at: data.updated_at,
    bureau: data.bureaux as unknown as AnalyseItem['bureau'],
    secteur: data.secteurs as unknown as AnalyseItem['secteur'],
    auteur: data.profiles as unknown as AnalyseItem['auteur'],
    assujettis_count: 0,
    assujettis: [],
  };
}

export async function addAssujettiToAnalyse(
  user: CurrentUser,
  input: AnalyseAssujettiAddInput
): Promise<void> {
  const validated = AnalyseAssujettiAddSchema.parse(input);
  const analyse = await getAnalyseById(user, validated.analyse_id);
  if (!analyse) {
    throw new Error('Dossier d’analyse introuvable.');
  }

  assertCanManageAnalyse(user, {
    id: analyse.id,
    bureau_id: analyse.bureau_id,
    secteur_id: analyse.secteur_id,
    auteur_id: analyse.auteur_id,
    statut: analyse.statut,
  });

  // Vérifier l'assujetti
  const assujetti = await getAssujettiById(user, validated.assujetti_id);
  if (!assujetti) {
    throw new Error('Assujetti introuvable ou non autorisé.');
  }

  if (!analyse.secteur_id || assujetti.secteur_principal_id !== analyse.secteur_id) {
    throw new Error("Un assujetti associé doit relever du même secteur que l'analyse.");
  }

  // Calcul cohérent du montant restant si non fourni
  let montantRestant = validated.montant_restant;
  if (montantRestant === undefined && validated.montant_du !== undefined && validated.montant_du !== null) {
    const paye = validated.montant_paye ?? 0;
    montantRestant = Math.max(0, validated.montant_du - paye);
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('analyse_assujettis')
    .upsert({
      analyse_id: validated.analyse_id,
      assujetti_id: validated.assujetti_id,
      montant_du: validated.montant_du ?? null,
      montant_paye: validated.montant_paye ?? null,
      montant_restant: montantRestant ?? null,
      devise: validated.devise,
      manque_a_gagner: validated.manque_a_gagner ?? null,
      priorite: validated.priorite ?? null,
    }, { onConflict: 'analyse_id,assujetti_id' });

  if (error) {
    throw new Error(`Erreur lors de l'association de l'assujetti à l'analyse : ${error.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'MODIFICATION',
    entityType: 'analyse_assujetti',
    entityId: `${validated.analyse_id}_${validated.assujetti_id}`,
    newData: {
      analyse_id: validated.analyse_id,
      assujetti_id: validated.assujetti_id,
      devise: validated.devise,
      montant_restant: montantRestant,
    },
  });
}

export async function removeAssujettiFromAnalyse(
  user: CurrentUser,
  analyseId: string,
  assujettiId: string
): Promise<void> {
  const analyse = await getAnalyseById(user, analyseId);
  if (!analyse) {
    throw new Error('Dossier d’analyse introuvable.');
  }

  assertCanManageAnalyse(user, {
    id: analyse.id,
    bureau_id: analyse.bureau_id,
    secteur_id: analyse.secteur_id,
    auteur_id: analyse.auteur_id,
    statut: analyse.statut,
  });

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('analyse_assujettis')
    .delete()
    .eq('analyse_id', analyseId)
    .eq('assujetti_id', assujettiId);

  if (error) {
    throw new Error(`Erreur lors du retrait de l'assujetti : ${error.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: 'SUPPRESSION_LOGIQUE',
    entityType: 'analyse_assujetti',
    entityId: `${analyseId}_${assujettiId}`,
    oldData: { analyse_id: analyseId, assujetti_id: assujettiId },
  });
}

export async function transitionAnalyse(
  user: CurrentUser,
  input: AnalyseTransitionInput
): Promise<AnalyseItem> {
  const validated = AnalyseTransitionSchema.parse(input);
  const analyse = await getAnalyseById(user, validated.analyse_id);
  if (!analyse) {
    throw new Error('Dossier d’analyse introuvable.');
  }

  assertCanTransitionAnalyse(
    user,
    {
      id: analyse.id,
      bureau_id: analyse.bureau_id,
      secteur_id: analyse.secteur_id,
      auteur_id: analyse.auteur_id,
      statut: analyse.statut,
    },
    validated.nouveau_statut
  );

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    statut: validated.nouveau_statut,
  };
  if (validated.observations) {
    updateData.observations = validated.observations;
  }

  const { data, error } = await supabase
    .from('analyses')
    .update(updateData)
    .eq('id', validated.analyse_id)
    .select(`
      id, bureau_id, secteur_id, auteur_id, date, statut, observations, created_at, updated_at,
      bureaux ( id, code, nom ),
      secteurs ( id, code, nom ),
      profiles!analyses_auteur_id_fkey ( id, nom, prenom, role )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Erreur lors du changement de statut de l'analyse : ${error?.message}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: validated.nouveau_statut === 'VALIDEE' ? 'APPROBATION' : validated.nouveau_statut === 'CLOTUREE' ? 'CLOTURE' : 'MODIFICATION',
    entityType: 'analyse',
    entityId: data.id,
    oldData: { statut: analyse.statut },
    newData: { statut: validated.nouveau_statut, observations: validated.observations },
  });

  return {
    id: data.id,
    bureau_id: data.bureau_id,
    secteur_id: data.secteur_id,
    auteur_id: data.auteur_id,
    date: data.date,
    statut: data.statut as AnalyseItem['statut'],
    observations: data.observations,
    created_at: data.created_at,
    updated_at: data.updated_at,
    bureau: data.bureaux as unknown as AnalyseItem['bureau'],
    secteur: data.secteurs as unknown as AnalyseItem['secteur'],
    auteur: data.profiles as unknown as AnalyseItem['auteur'],
  };
}
