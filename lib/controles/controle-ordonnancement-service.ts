import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser, Role } from '@/lib/validations/auth';
import {
  VerificationOrdonnancementInputSchema,
  VerificationFilterSchema,
  calculerResteDu,
  calculerPenalite,
  calculerTotalDu,
  calculerDateEcheance,
  calculerRetard,
  determinerSituationAssujetti,
  type VerificationOrdonnancementInput,
  type VerificationFilter,
  type StatutNoteVerification,
  type StatutPaiementAssujetti,
  type SyntheseBureauConsolidation,
  type SyntheseDivisionConsolidation,
} from '@/lib/validations/controle-ordonnancement';
import {
  assertCanReadControleOrdonnancement,
  assertCanManageControleOrdonnancement,
} from '@/lib/auth/controle-ordonnancement-access';

const GLOBAL_VIEW_ROLES: Role[] = [
  'DIRECTEUR_GENERAL',
  'DIRECTEUR_CONTROLES',
  'CHEF_DIVISION',
  'CONSULTATION',
];

export interface VerificationItem {
  id: string;
  fiche_ordonnancement_id: string;
  assujetti_id: string;
  bureau_id: string;
  secteur_id: string;
  statut_note: StatutNoteVerification;
  numero_note_verifie: string | null;
  montant_paye_cdf: number;
  montant_paye_usd: number;
  date_paiement: string | null;
  date_echeance: string;
  jours_retard: number;
  statut_paiement: StatutPaiementAssujetti;
  reste_du_cdf: number;
  reste_du_usd: number;
  /** Pénalité calculée uniquement si penalite_applicable = true. Toujours >= 0. */
  penalite_cdf: number;
  penalite_usd: number;
  total_du_cdf: number;
  total_du_usd: number;
  /** Flag indiquant si la pénalité a été explicitement validée par l'agent. */
  penalite_applicable: boolean;
  observations: string | null;
  verifie_par: string;
  date_verification: string;
  created_at: string;
  updated_at: string;
  agent_verificateur?: { id: string; nom: string; prenom: string } | null;
}

export interface FicheAControlerItem {
  id: string;
  numero_fiche: string;
  numero_serie: string;
  delai_traitement_jours: number;
  numero_note_perception: string;
  date_note_perception: string;
  acte_generateur: string;
  article_budgetaire: string | null;
  nombre_actes: number;
  montant_cdf: number;
  montant_usd: number;
  statut_transmission: string;
  date_transmission_division: string | null;
  created_at: string;
  assujetti: {
    id: string;
    identifiant: string;
    nom_raison_sociale: string;
    type: string;
    adresse?: string | null;
    email?: string | null;
    telephone?: string | null;
  };
  secteur: {
    id: string;
    code: string;
    nom: string;
  };
  bureau: {
    id: string;
    code: string;
    nom: string;
  };
  verification?: VerificationItem | null;
}

export interface SyntheseSecteurItem {
  secteur_id: string;
  secteur_code: string;
  secteur_nom: string;
  bureau_id: string;
  bureau_nom: string;
  nombre_assujettis: number;
  nombre_fiches: number;
  nombre_debiteurs: number;
  nombre_non_declarants: number;
  nombre_notes_absentes: number;
  nombre_retards: number;
  total_du_cdf: number;
  total_paye_cdf: number;
  manque_a_gagner_cdf: number;
  penalites_cdf: number;
  total_exigible_cdf: number;
  total_du_usd: number;
  total_paye_usd: number;
  manque_a_gagner_usd: number;
  penalites_usd: number;
  total_exigible_usd: number;
  is_prioritaire: boolean;
}

/**
 * Récupère les fiches d'ordonnancement à contrôler selon le périmètre de l'utilisateur.
 */
export async function getOrdonnancementsAControler(
  user: CurrentUser,
  filters: Partial<VerificationFilter> = {}
): Promise<{ fiches: FicheAControlerItem[]; total: number }> {
  assertCanReadControleOrdonnancement(user, filters.bureau_id);

  const parsedFilters = VerificationFilterSchema.parse(filters);
  const supabase = createAdminClient();

  const isGlobal = GLOBAL_VIEW_ROLES.includes(user.role);

  let query = supabase
    .from('fiches_ordonnancement')
    .select(
      `
      id, numero_fiche, numero_serie, delai_traitement_jours,
      numero_note_perception, date_note_perception, acte_generateur,
      article_budgetaire, nombre_actes, montant_cdf, montant_usd,
      statut_transmission, date_transmission_division, created_at,
      assujettis ( id, identifiant, nom_raison_sociale, type, adresse, email, telephone ),
      secteurs ( id, code, nom ),
      bureaux ( id, code, nom ),
      verifications_ordonnancement (
        id, fiche_ordonnancement_id, assujetti_id, bureau_id, secteur_id,
        statut_note, numero_note_verifie, montant_paye_cdf, montant_paye_usd,
        date_paiement, date_echeance, jours_retard, statut_paiement,
        reste_du_cdf, reste_du_usd, penalite_cdf, penalite_usd,
        total_du_cdf, total_du_usd, observations, verifie_par,
        date_verification, created_at, updated_at,
        profiles:verifie_par ( id, nom, prenom )
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  // Périmètre Bureau de Contrôle
  if (!isGlobal && ['CHEF_BUREAU', 'ANALYSTE'].includes(user.role)) {
    if (user.bureau_id) {
      query = query.eq('bureau_id', user.bureau_id);
    } else {
      return { fiches: [], total: 0 };
    }
  } else if (parsedFilters.bureau_id) {
    query = query.eq('bureau_id', parsedFilters.bureau_id);
  }

  if (parsedFilters.secteur_id) {
    query = query.eq('secteur_id', parsedFilters.secteur_id);
  }

  if (parsedFilters.search) {
    const term = `%${parsedFilters.search}%`;
    query = query.or(`numero_fiche.ilike.${term},numero_note_perception.ilike.${term},numero_serie.ilike.${term}`);
  }

  const offset = (parsedFilters.page - 1) * parsedFilters.limit;
  query = query.range(offset, offset + parsedFilters.limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la récupération des ordonnancements à contrôler : ${error.message}`);
  }

  const fiches: FicheAControlerItem[] = (data || []).map((row: Record<string, unknown>) => {
    const verifRaw = Array.isArray(row.verifications_ordonnancement)
      ? row.verifications_ordonnancement[0]
      : row.verifications_ordonnancement;

    const agentRaw = verifRaw?.profiles
      ? Array.isArray(verifRaw.profiles)
        ? verifRaw.profiles[0]
        : verifRaw.profiles
      : null;

    const verification: VerificationItem | null = verifRaw
      ? {
          id: verifRaw.id,
          fiche_ordonnancement_id: verifRaw.fiche_ordonnancement_id,
          assujetti_id: verifRaw.assujetti_id,
          bureau_id: verifRaw.bureau_id,
          secteur_id: verifRaw.secteur_id,
          statut_note: verifRaw.statut_note,
          numero_note_verifie: verifRaw.numero_note_verifie,
          montant_paye_cdf: Number(verifRaw.montant_paye_cdf) || 0,
          montant_paye_usd: Number(verifRaw.montant_paye_usd) || 0,
          date_paiement: verifRaw.date_paiement,
          date_echeance: verifRaw.date_echeance,
          jours_retard: Number(verifRaw.jours_retard) || 0,
          statut_paiement: verifRaw.statut_paiement,
          reste_du_cdf: Number(verifRaw.reste_du_cdf) || 0,
          reste_du_usd: Number(verifRaw.reste_du_usd) || 0,
          penalite_cdf: Number(verifRaw.penalite_cdf) || 0,
          penalite_usd: Number(verifRaw.penalite_usd) || 0,
          total_du_cdf: Number(verifRaw.total_du_cdf) || 0,
          total_du_usd: Number(verifRaw.total_du_usd) || 0,
          penalite_applicable: Boolean(verifRaw.penalite_applicable),
          observations: verifRaw.observations,
          verifie_par: verifRaw.verifie_par,
          date_verification: verifRaw.date_verification,
          created_at: verifRaw.created_at,
          updated_at: verifRaw.updated_at,
          agent_verificateur: agentRaw,
        }
      : null;

    const assujettiRaw = Array.isArray(row.assujettis) ? row.assujettis[0] : row.assujettis;
    const secteurRaw = Array.isArray(row.secteurs) ? row.secteurs[0] : row.secteurs;
    const bureauRaw = Array.isArray(row.bureaux) ? row.bureaux[0] : row.bureaux;

    return {
      id: row.id as string,
      numero_fiche: row.numero_fiche as string,
      numero_serie: row.numero_serie as string,
      delai_traitement_jours: Number(row.delai_traitement_jours) || 1,
      numero_note_perception: row.numero_note_perception as string,
      date_note_perception: row.date_note_perception as string,
      acte_generateur: row.acte_generateur as string,
      article_budgetaire: row.article_budgetaire as string | null,
      nombre_actes: Number(row.nombre_actes) || 1,
      montant_cdf: Number(row.montant_cdf) || 0,
      montant_usd: Number(row.montant_usd) || 0,
      statut_transmission: row.statut_transmission as string,
      date_transmission_division: row.date_transmission_division as string | null,
      created_at: row.created_at as string,
      assujetti: (assujettiRaw || {}) as FicheAControlerItem['assujetti'],
      secteur: (secteurRaw || {}) as FicheAControlerItem['secteur'],
      bureau: (bureauRaw || {}) as FicheAControlerItem['bureau'],
      verification,
    };
  });

  return { fiches, total: count || 0 };
}

/**
 * Récupère une fiche d'ordonnancement par son ID avec ses données de contrôle.
 */
export async function getOrdonnancementAControlerById(
  user: CurrentUser,
  ficheId: string
): Promise<FicheAControlerItem> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from('fiches_ordonnancement')
    .select(
      `
      id, numero_fiche, numero_serie, delai_traitement_jours,
      numero_note_perception, date_note_perception, acte_generateur,
      article_budgetaire, nombre_actes, montant_cdf, montant_usd,
      statut_transmission, date_transmission_division, created_at,
      assujettis ( id, identifiant, nom_raison_sociale, type, adresse, email, telephone ),
      secteurs ( id, code, nom ),
      bureaux ( id, code, nom ),
      verifications_ordonnancement (
        id, fiche_ordonnancement_id, assujetti_id, bureau_id, secteur_id,
        statut_note, numero_note_verifie, montant_paye_cdf, montant_paye_usd,
        date_paiement, date_echeance, jours_retard, statut_paiement,
        reste_du_cdf, reste_du_usd, penalite_cdf, penalite_usd,
        total_du_cdf, total_du_usd, observations, verifie_par,
        date_verification, created_at, updated_at,
        profiles:verifie_par ( id, nom, prenom )
      )
    `
    )
    .eq('id', ficheId)
    .single();

  if (error || !row) {
    throw new Error('La fiche d’ordonnancement demandée est introuvable.');
  }

  const bureauRaw = (Array.isArray(row.bureaux) ? row.bureaux[0] : row.bureaux) as { id: string; code: string; nom: string } | null;
  assertCanReadControleOrdonnancement(user, bureauRaw?.id);

  const verifRaw = Array.isArray(row.verifications_ordonnancement)
    ? row.verifications_ordonnancement[0]
    : row.verifications_ordonnancement;

  const agentRaw = verifRaw?.profiles
    ? Array.isArray(verifRaw.profiles)
      ? verifRaw.profiles[0]
      : verifRaw.profiles
    : null;

  const verification: VerificationItem | null = verifRaw
    ? {
        id: verifRaw.id,
        fiche_ordonnancement_id: verifRaw.fiche_ordonnancement_id,
        assujetti_id: verifRaw.assujetti_id,
        bureau_id: verifRaw.bureau_id,
        secteur_id: verifRaw.secteur_id,
        statut_note: verifRaw.statut_note,
        numero_note_verifie: verifRaw.numero_note_verifie,
        montant_paye_cdf: Number(verifRaw.montant_paye_cdf) || 0,
        montant_paye_usd: Number(verifRaw.montant_paye_usd) || 0,
        date_paiement: verifRaw.date_paiement,
        date_echeance: verifRaw.date_echeance,
        jours_retard: Number(verifRaw.jours_retard) || 0,
        statut_paiement: verifRaw.statut_paiement,
        reste_du_cdf: Number(verifRaw.reste_du_cdf) || 0,
        reste_du_usd: Number(verifRaw.reste_du_usd) || 0,
        penalite_cdf: Number(verifRaw.penalite_cdf) || 0,
        penalite_usd: Number(verifRaw.penalite_usd) || 0,
        total_du_cdf: Number(verifRaw.total_du_cdf) || 0,
        total_du_usd: Number(verifRaw.total_du_usd) || 0,
        penalite_applicable: Number(verifRaw.penalite_cdf) > 0 || Number(verifRaw.penalite_usd) > 0,
        observations: verifRaw.observations,
        verifie_par: verifRaw.verifie_par,
        date_verification: verifRaw.date_verification,
        created_at: verifRaw.created_at,
        updated_at: verifRaw.updated_at,
        agent_verificateur: agentRaw,
      }
    : null;

  const assujettiRaw = (Array.isArray(row.assujettis) ? row.assujettis[0] : row.assujettis) as FicheAControlerItem['assujetti'];
  const secteurRaw = (Array.isArray(row.secteurs) ? row.secteurs[0] : row.secteurs) as FicheAControlerItem['secteur'];

  return {
    id: row.id,
    numero_fiche: row.numero_fiche,
    numero_serie: row.numero_serie,
    delai_traitement_jours: Number(row.delai_traitement_jours) || 1,
    numero_note_perception: row.numero_note_perception,
    date_note_perception: row.date_note_perception,
    acte_generateur: row.acte_generateur,
    article_budgetaire: row.article_budgetaire,
    nombre_actes: Number(row.nombre_actes) || 1,
    montant_cdf: Number(row.montant_cdf) || 0,
    montant_usd: Number(row.montant_usd) || 0,
    statut_transmission: row.statut_transmission,
    date_transmission_division: row.date_transmission_division,
    created_at: row.created_at,
    assujetti: (assujettiRaw || {}) as FicheAControlerItem['assujetti'],
    secteur: (secteurRaw || {}) as FicheAControlerItem['secteur'],
    bureau: (bureauRaw || {}) as FicheAControlerItem['bureau'],
    verification,
  };
}

/**
 * Enregistre ou met à jour la vérification d'une fiche d'ordonnancement.
 */
export async function enregistrerVerificationOrdonnancement(
  user: CurrentUser,
  input: VerificationOrdonnancementInput
): Promise<VerificationItem> {
  const validated = VerificationOrdonnancementInputSchema.parse(input);
  const supabase = createAdminClient();

  // 1. Récupérer la fiche d'ordonnancement de référence
  const { data: fiche, error: ficheErr } = await supabase
    .from('fiches_ordonnancement')
    .select('id, assujetti_id, bureau_id, secteur_id, date_note_perception, delai_traitement_jours, montant_cdf, montant_usd')
    .eq('id', validated.fiche_ordonnancement_id)
    .single();

  if (ficheErr || !fiche) {
    throw new Error('La fiche d’ordonnancement source est introuvable.');
  }

  // 2. Contrôle des autorisations strictes par bureau
  assertCanManageControleOrdonnancement(user, fiche.bureau_id);

  // 3. Calculs financiers et métier stricts (sans conversion de devises)
  // Note : le montant de la fiche d'ordonnancement (BUR_ANA_REC) constitue le montant dû.
  // Il n'est jamais écrasé par le montant payé.
  const montantOrdCDF = Number(fiche.montant_cdf) || 0;
  const montantOrdUSD = Number(fiche.montant_usd) || 0;
  const montantPayeCDF = Number(validated.montant_paye_cdf) || 0;
  const montantPayeUSD = Number(validated.montant_paye_usd) || 0;

  // Source unique : date d'émission saisie par BUR_ANA_REC dans la fiche.
  const dateEcheance = calculerDateEcheance(fiche.date_note_perception);
  const { joursRetard } = calculerRetard(dateEcheance, validated.date_paiement);

  let resteDuCDF = 0;
  let resteDuUSD = 0;

  if (validated.statut_note === 'ABSENTE') {
    // Si la note est absente, la totalité de l'ordonnancement reste exigible
    resteDuCDF = montantOrdCDF;
    resteDuUSD = montantOrdUSD;
  } else {
    resteDuCDF = calculerResteDu(montantOrdCDF, montantPayeCDF);
    resteDuUSD = calculerResteDu(montantOrdUSD, montantPayeUSD);
  }

  // La pénalité de retard (5 %) s'applique UNIQUEMENT en cas de retard effectif (joursRetard > 0)
  // et si l'agent l'a explicitement validée.
  const estEnRetard = joursRetard > 0;
  const penaliteCDF = validated.penalite_applicable && estEnRetard ? calculerPenalite(resteDuCDF) : 0;
  const penaliteUSD = validated.penalite_applicable && estEnRetard ? calculerPenalite(resteDuUSD) : 0;

  const totalDuCDF = calculerTotalDu(resteDuCDF, penaliteCDF);
  const totalDuUSD = calculerTotalDu(resteDuUSD, penaliteUSD);

  const statutPaiement = determinerSituationAssujetti({
    statutNote: validated.statut_note,
    montantOrdonnanceCDF: montantOrdCDF,
    montantOrdonnanceUSD: montantOrdUSD,
    montantPayeCDF: montantPayeCDF,
    montantPayeUSD: montantPayeUSD,
    joursRetard,
    situationExplicite: validated.situation_explicite,
  });

  // 4. Insérer ou mettre à jour la vérification (Upsert par fiche_ordonnancement_id)
  const { data: verif, error: verifErr } = await supabase
    .from('verifications_ordonnancement')
    .upsert(
      {
        fiche_ordonnancement_id: validated.fiche_ordonnancement_id,
        assujetti_id: fiche.assujetti_id,
        bureau_id: fiche.bureau_id,
        secteur_id: fiche.secteur_id,
        statut_note: validated.statut_note,
        numero_note_verifie: validated.numero_note_verifie || null,
        montant_paye_cdf: montantPayeCDF,
        montant_paye_usd: montantPayeUSD,
        date_paiement: validated.date_paiement || null,
        date_echeance: dateEcheance,
        jours_retard: joursRetard,
        statut_paiement: statutPaiement,
        reste_du_cdf: resteDuCDF,
        reste_du_usd: resteDuUSD,
        penalite_cdf: penaliteCDF,
        penalite_usd: penaliteUSD,
        total_du_cdf: totalDuCDF,
        total_du_usd: totalDuUSD,
        observations: validated.observations || null,
        verifie_par: user.id,
        date_verification: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'fiche_ordonnancement_id' }
    )
    .select(
      `
      id, fiche_ordonnancement_id, assujetti_id, bureau_id, secteur_id,
      statut_note, numero_note_verifie, montant_paye_cdf, montant_paye_usd,
      date_paiement, date_echeance, jours_retard, statut_paiement,
      reste_du_cdf, reste_du_usd, penalite_cdf, penalite_usd,
      total_du_cdf, total_du_usd, observations, verifie_par,
      date_verification, created_at, updated_at
    `
    )
    .single();

  if (verifErr || !verif) {
    throw new Error(`Erreur lors de l’enregistrement de la vérification : ${verifErr?.message}`);
  }

  // 5. Journalisation d'audit
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'VERIFICATION_ORDONNANCEMENT',
    entity_type: 'verifications_ordonnancement',
    entity_id: verif.id,
    new_data: {
      fiche_ordonnancement_id: validated.fiche_ordonnancement_id,
      statut_note: validated.statut_note,
      statut_paiement: statutPaiement,
      reste_du_cdf: resteDuCDF,
      reste_du_usd: resteDuUSD,
      penalite_applicable: validated.penalite_applicable,
      penalite_cdf: penaliteCDF,
      penalite_usd: penaliteUSD,
    },
  });

  return {
    ...verif,
    montant_paye_cdf: Number(verif.montant_paye_cdf) || 0,
    montant_paye_usd: Number(verif.montant_paye_usd) || 0,
    jours_retard: Number(verif.jours_retard) || 0,
    reste_du_cdf: Number(verif.reste_du_cdf) || 0,
    reste_du_usd: Number(verif.reste_du_usd) || 0,
    penalite_cdf: Number(verif.penalite_cdf) || 0,
    penalite_usd: Number(verif.penalite_usd) || 0,
    total_du_cdf: Number(verif.total_du_cdf) || 0,
    total_du_usd: Number(verif.total_du_usd) || 0,
    penalite_applicable: Boolean(validated.penalite_applicable),
  };
}

/**
 * Produit la synthèse sectorielle et classe les secteurs par manque à gagner décroissant.
 */
export async function getSyntheseSectorielleControle(
  user: CurrentUser,
  targetBureauId?: string
): Promise<SyntheseSecteurItem[]> {
  assertCanReadControleOrdonnancement(user, targetBureauId);

  const supabase = createAdminClient();
  const isGlobal = GLOBAL_VIEW_ROLES.includes(user.role);

  // 1. Récupérer les secteurs du bureau
  let secteursQuery = supabase
    .from('secteurs')
    .select('id, code, nom, bureau_id, bureaux(id, code, nom)')
    .eq('actif', true)
    .order('nom');

  if (!isGlobal && ['CHEF_BUREAU', 'ANALYSTE'].includes(user.role)) {
    if (user.bureau_id) {
      secteursQuery = secteursQuery.eq('bureau_id', user.bureau_id);
    } else {
      return [];
    }
  } else if (targetBureauId) {
    secteursQuery = secteursQuery.eq('bureau_id', targetBureauId);
  }

  const { data: secteurs, error: sectErr } = await secteursQuery;
  if (sectErr || !secteurs) {
    throw new Error('Erreur lors du chargement des secteurs.');
  }

  // 2. Récupérer toutes les fiches d'ordonnancement du périmètre avec leurs vérifications
  const secteurIds = secteurs.map((s) => s.id);
  if (secteurIds.length === 0) {
    return [];
  }

  const { data: fiches, error: fichesErr } = await supabase
    .from('fiches_ordonnancement')
    .select(
      `
      id, assujetti_id, secteur_id, montant_cdf, montant_usd,
      verifications_ordonnancement (
        id, statut_note, statut_paiement, montant_paye_cdf, montant_paye_usd,
        reste_du_cdf, reste_du_usd, penalite_cdf, penalite_usd,
        total_du_cdf, total_du_usd, jours_retard
      )
    `
    )
    .in('secteur_id', secteurIds);

  if (fichesErr) {
    throw new Error(`Erreur lors du calcul de la synthèse sectorielle : ${fichesErr.message}`);
  }

  // 3. Agréger les données par secteur
  const mapSecteurs: Record<string, SyntheseSecteurItem> = {};

  for (const s of secteurs) {
    const bureauNom = (s.bureaux as unknown as { nom?: string })?.nom || 'Bureau';
    mapSecteurs[s.id] = {
      secteur_id: s.id,
      secteur_code: s.code,
      secteur_nom: s.nom,
      bureau_id: s.bureau_id,
      bureau_nom: bureauNom,
      nombre_assujettis: 0,
      nombre_fiches: 0,
      nombre_debiteurs: 0,
      nombre_non_declarants: 0,
      nombre_notes_absentes: 0,
      nombre_retards: 0,
      total_du_cdf: 0,
      total_paye_cdf: 0,
      manque_a_gagner_cdf: 0,
      penalites_cdf: 0,
      total_exigible_cdf: 0,
      total_du_usd: 0,
      total_paye_usd: 0,
      manque_a_gagner_usd: 0,
      penalites_usd: 0,
      total_exigible_usd: 0,
      is_prioritaire: false,
    };
  }

  const assujettisParSecteur: Record<string, Set<string>> = {};

  for (const f of fiches || []) {
    const sId = f.secteur_id;
    if (!mapSecteurs[sId]) continue;

    if (!assujettisParSecteur[sId]) {
      assujettisParSecteur[sId] = new Set();
    }
    assujettisParSecteur[sId].add(f.assujetti_id);

    const mOrdCDF = Number(f.montant_cdf) || 0;
    const mOrdUSD = Number(f.montant_usd) || 0;

    mapSecteurs[sId].nombre_fiches += 1;
    mapSecteurs[sId].total_du_cdf += mOrdCDF;
    mapSecteurs[sId].total_du_usd += mOrdUSD;

    const verifRaw = Array.isArray(f.verifications_ordonnancement)
      ? f.verifications_ordonnancement[0]
      : f.verifications_ordonnancement;

    if (verifRaw) {
      const payeCDF = Number(verifRaw.montant_paye_cdf) || 0;
      const payeUSD = Number(verifRaw.montant_paye_usd) || 0;
      const resteCDF = Number(verifRaw.reste_du_cdf) || 0;
      const resteUSD = Number(verifRaw.reste_du_usd) || 0;
      const penCDF = Number(verifRaw.penalite_cdf) || 0;
      const penUSD = Number(verifRaw.penalite_usd) || 0;
      const totCDF = Number(verifRaw.total_du_cdf) || 0;
      const totUSD = Number(verifRaw.total_du_usd) || 0;

      mapSecteurs[sId].total_paye_cdf += payeCDF;
      mapSecteurs[sId].total_paye_usd += payeUSD;
      mapSecteurs[sId].manque_a_gagner_cdf += resteCDF;
      mapSecteurs[sId].manque_a_gagner_usd += resteUSD;
      mapSecteurs[sId].penalites_cdf += penCDF;
      mapSecteurs[sId].penalites_usd += penUSD;
      mapSecteurs[sId].total_exigible_cdf += totCDF;
      mapSecteurs[sId].total_exigible_usd += totUSD;

      if (verifRaw.statut_paiement === 'DEBITEUR') mapSecteurs[sId].nombre_debiteurs += 1;
      if (verifRaw.statut_paiement === 'NON_DECLARE') mapSecteurs[sId].nombre_non_declarants += 1;
      if (verifRaw.statut_note === 'ABSENTE') mapSecteurs[sId].nombre_notes_absentes += 1;
      if (Number(verifRaw.jours_retard) > 0) mapSecteurs[sId].nombre_retards += 1;
    } else {
      // Non encore vérifiée -> par défaut le montant ordonnancé constitue le manque à gagner potentiel
      mapSecteurs[sId].manque_a_gagner_cdf += mOrdCDF;
      mapSecteurs[sId].manque_a_gagner_usd += mOrdUSD;
      mapSecteurs[sId].total_exigible_cdf += mOrdCDF;
      mapSecteurs[sId].total_exigible_usd += mOrdUSD;
    }
  }

  // Mettre à jour le nombre d'assujettis distincts
  for (const sId in assujettisParSecteur) {
    if (mapSecteurs[sId]) {
      mapSecteurs[sId].nombre_assujettis = assujettisParSecteur[sId].size;
    }
  }

  // 4. Classer les secteurs selon le manque à gagner décroissant (priorisation)
  const resultats = Object.values(mapSecteurs).sort((a, b) => {
    // Tri principal sur le manque à gagner CDF
    if (b.manque_a_gagner_cdf !== a.manque_a_gagner_cdf) {
      return b.manque_a_gagner_cdf - a.manque_a_gagner_cdf;
    }
    // Tri secondaire sur le manque à gagner USD
    return b.manque_a_gagner_usd - a.manque_a_gagner_usd;
  });

  // Définir le secteur prioritaire (le premier avec un manque à gagner > 0)
  if (resultats.length > 0 && (resultats[0].manque_a_gagner_cdf > 0 || resultats[0].manque_a_gagner_usd > 0)) {
    resultats[0].is_prioritaire = true;
  }

  return resultats;
}

/**
 * Consolidation Niveau 3 : Agrégation par Bureau de Contrôle (RM-040, RM-041).
 * Dissocie strictement les totaux CDF et USD.
 */
export async function getConsolidationBureauxControle(
  user: CurrentUser,
  targetBureauId?: string
): Promise<SyntheseBureauConsolidation[]> {
  const synthesesSecteurs = await getSyntheseSectorielleControle(user, targetBureauId);

  const mapBureaux: Record<string, SyntheseBureauConsolidation> = {};

  for (const s of synthesesSecteurs) {
    if (!mapBureaux[s.bureau_id]) {
      mapBureaux[s.bureau_id] = {
        bureau_id: s.bureau_id,
        bureau_code: s.bureau_nom, // default fallback
        bureau_nom: s.bureau_nom,
        nombre_secteurs: 0,
        nombre_assujettis: 0,
        nombre_fiches: 0,
        nombre_debiteurs: 0,
        nombre_retards: 0,
        nombre_notes_absentes: 0,
        nombre_non_declarants: 0,
        cdf: {
          total_du: 0,
          total_paye: 0,
          manque_a_gagner: 0,
          penalites: 0,
          total_exigible: 0,
        },
        usd: {
          total_du: 0,
          total_paye: 0,
          manque_a_gagner: 0,
          penalites: 0,
          total_exigible: 0,
        },
      };
    }

    const b = mapBureaux[s.bureau_id];
    b.nombre_secteurs += 1;
    b.nombre_assujettis += s.nombre_assujettis;
    b.nombre_fiches += s.nombre_fiches;
    b.nombre_debiteurs += s.nombre_debiteurs;
    b.nombre_retards += s.nombre_retards;
    b.nombre_notes_absentes += s.nombre_notes_absentes;
    b.nombre_non_declarants += s.nombre_non_declarants;

    b.cdf.total_du += s.total_du_cdf;
    b.cdf.total_paye += s.total_paye_cdf;
    b.cdf.manque_a_gagner += s.manque_a_gagner_cdf;
    b.cdf.penalites += s.penalites_cdf;
    b.cdf.total_exigible += s.total_exigible_cdf;

    b.usd.total_du += s.total_du_usd;
    b.usd.total_paye += s.total_paye_usd;
    b.usd.manque_a_gagner += s.manque_a_gagner_usd;
    b.usd.penalites += s.penalites_usd;
    b.usd.total_exigible += s.total_exigible_usd;
  }

  return Object.values(mapBureaux).sort((a, b) => b.cdf.manque_a_gagner - a.cdf.manque_a_gagner);
}

/**
 * Consolidation Niveau 4 : Synthèse globale Division Contrôle & Direction Générale.
 * Dissocie strictement les totaux CDF et USD.
 */
export async function getConsolidationDivisionControle(
  user: CurrentUser
): Promise<SyntheseDivisionConsolidation> {
  const synthesesBureaux = await getConsolidationBureauxControle(user);

  const division: SyntheseDivisionConsolidation = {
    nombre_bureaux: synthesesBureaux.length,
    nombre_secteurs: 0,
    nombre_assujettis: 0,
    nombre_fiches: 0,
    nombre_debiteurs: 0,
    nombre_retards: 0,
    nombre_notes_absentes: 0,
    nombre_non_declarants: 0,
    cdf: {
      total_du: 0,
      total_paye: 0,
      manque_a_gagner: 0,
      penalites: 0,
      total_exigible: 0,
    },
    usd: {
      total_du: 0,
      total_paye: 0,
      manque_a_gagner: 0,
      penalites: 0,
      total_exigible: 0,
    },
  };

  for (const b of synthesesBureaux) {
    division.nombre_secteurs += b.nombre_secteurs;
    division.nombre_assujettis += b.nombre_assujettis;
    division.nombre_fiches += b.nombre_fiches;
    division.nombre_debiteurs += b.nombre_debiteurs;
    division.nombre_retards += b.nombre_retards;
    division.nombre_notes_absentes += b.nombre_notes_absentes;
    division.nombre_non_declarants += b.nombre_non_declarants;

    division.cdf.total_du += b.cdf.total_du;
    division.cdf.total_paye += b.cdf.total_paye;
    division.cdf.manque_a_gagner += b.cdf.manque_a_gagner;
    division.cdf.penalites += b.cdf.penalites;
    division.cdf.total_exigible += b.cdf.total_exigible;

    division.usd.total_du += b.usd.total_du;
    division.usd.total_paye += b.usd.total_paye;
    division.usd.manque_a_gagner += b.usd.manque_a_gagner;
    division.usd.penalites += b.usd.penalites;
    division.usd.total_exigible += b.usd.total_exigible;
  }

  return division;
}
