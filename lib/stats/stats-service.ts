// =============================================================================
// DGRAD CONTROLE - SERVICE DE STATISTIQUES & TABLEAU DE BORD (ÉTAPE 12)
// =============================================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/validations/auth';
import type { StatsFilterInput } from '@/lib/validations/stats';

export interface DashboardFinancesCurrency {
  total_du: number;
  total_penalites: number;
  total_global: number;
  total_avis: number;
  nombre_avis: number;
}

export interface DashboardFinances {
  cdf: DashboardFinancesCurrency;
  usd: DashboardFinancesCurrency;
  resultats: {
    total_charges: number;
    total_decharges: number;
    total_resultats: number;
    taux_charges: number; // en %
    taux_decharges: number; // en %
  };
  redressements_count: number;
  penalites_count: number;
}

export interface DashboardBureauStat {
  id: string;
  code: string;
  nom: string;
  missions_count: number;
  controles_count: number;
  total_cdf: number;
  total_usd: number;
}

export interface DashboardSecteurStat {
  id: string;
  code: string;
  nom: string;
  bureau_code: string;
  missions_count: number;
  total_cdf: number;
  total_usd: number;
}

export interface DashboardActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  auteur_nom: string;
  auteur_role: string;
}

export interface DashboardMetrics {
  missions: {
    total: number;
    sur_place: number;
    sur_pieces: number;
    par_statut: Record<string, number>;
    en_cours: number;
    cloturees: number;
    rejetees: number;
    annulees: number;
  };
  controles: {
    total: number;
    en_attente: number;
    en_cours: number;
    termines: number;
    annules: number;
    taux_achevement: number; // en %
  };
  finances: DashboardFinances;
  bureaux: DashboardBureauStat[];
  secteurs: DashboardSecteurStat[];
  activite_recente: DashboardActivity[];
  perimetre_applique: {
    role: string;
    est_global: boolean;
    bureau_id?: string | null;
    bureau_nom?: string | null;
  };
}

/**
 * Calcule et agrège toutes les statistiques métier du tableau de bord
 * en appliquant strictement le périmètre organisationnel de l'utilisateur.
 */
export async function getDashboardMetrics(
  currentUser: CurrentUser,
  filters: StatsFilterInput = {}
): Promise<DashboardMetrics> {
  const supabase = createAdminClient();

  // 1. Détermination du périmètre organisationnel de l'utilisateur (RM-039 & RM-025)
  const isGlobalRole = [
    'DIRECTEUR_GENERAL',
    'DIRECTEUR_CONTROLES',
    'CHEF_DIVISION',
    'ADMIN',
  ].includes(currentUser.role);

  let enforcedBureauId: string | null = null;
  if (!isGlobalRole) {
    enforcedBureauId = currentUser.bureau_id || null;
  } else if (filters.bureau_id && filters.bureau_id !== '') {
    enforcedBureauId = filters.bureau_id;
  }

  // 2. Récupérer le nom du bureau pour information contextuelle
  let bureauNom: string | null = null;
  if (enforcedBureauId) {
    const { data: bData } = await supabase
      .from('bureaux')
      .select('nom')
      .eq('id', enforcedBureauId)
      .maybeSingle();
    bureauNom = bData?.nom || null;
  }

  // 3. Récupérer l'identifiant agent pour les chefs d'équipe si nécessaire
  let agentId: string | null = null;
  if (currentUser.role === 'CHEF_EQUIPE') {
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();
    agentId = agentData?.id || null;
  }

  // 4. Charger les missions dans le périmètre autorisé
  let missionsQuery = supabase
    .from('missions')
    .select(`
      id, reference, type_controle, bureau_id, secteur_id, statut,
      date_creation, date_soumission, date_approbation, date_cloture,
      bureaux(id, code, nom),
      secteurs(id, code, nom),
      equipes(id, chef_equipe_id)
    `);

  if (enforcedBureauId) {
    missionsQuery = missionsQuery.eq('bureau_id', enforcedBureauId);
  }

  if (filters.secteur_id && filters.secteur_id !== '') {
    missionsQuery = missionsQuery.eq('secteur_id', filters.secteur_id);
  }

  if (filters.type_controle) {
    missionsQuery = missionsQuery.eq('type_controle', filters.type_controle);
  }


  if (filters.date_debut && filters.date_debut !== '') {
    missionsQuery = missionsQuery.gte('date_creation', `${filters.date_debut}T00:00:00.000Z`);
  }

  if (filters.date_fin && filters.date_fin !== '') {
    missionsQuery = missionsQuery.lte('date_creation', `${filters.date_fin}T23:59:59.999Z`);
  }

  const { data: rawMissions, error: missionsError } = await missionsQuery;

  if (missionsError) {
    console.error('Erreur récupération missions pour statistiques:', missionsError);
    throw new Error('Impossible de charger les statistiques de missions.');
  }

  interface EquipeRaw {
    id: string;
    chef_equipe_id: string;
  }

  interface MissionRow {
    id: string;
    reference: string;
    type_controle: 'SUR_PLACE' | 'SUR_PIECES';
    bureau_id: string;
    secteur_id?: string | null;
    statut: string;
    date_creation: string;
    bureaux?: { id: string; code: string; nom: string } | null;
    secteurs?: { id: string; code: string; nom: string } | null;
    equipes?: EquipeRaw[] | null;
  }

  let missions = (rawMissions as unknown as MissionRow[]) || [];

  // Filtrage fin pour Chef d'équipe si applicable
  if (currentUser.role === 'CHEF_EQUIPE' && agentId) {
    missions = missions.filter((m) => {
      if (m.type_controle === 'SUR_PLACE') {
        return m.equipes?.some((eq) => eq.chef_equipe_id === agentId);
      }
      return m.bureau_id === currentUser.bureau_id;
    });
  }

  const missionIds = missions.map((m) => m.id);

  // 5. Charger les contrôles et résultats financiers associés
  let rawControles: {
    id: string;
    mission_id: string;
    statut: string;
    type_controle: string;
    controleur_responsable_id?: string | null;
    resultats_controle?: {
      id: string;
      type_resultat: 'CHARGEE' | 'DECHARGEE';
      montant_du?: number | null;
      montant_penalites?: number | null;
      montant_total?: number | null;
      devise: 'CDF' | 'USD';
      redressements?: { id: string; montant: number; devise: string }[];
      penalites?: { id: string; montant: number; devise: string }[];
      avis_recouvrement?: { id: string; montant: number; devise: string }[];
    }[] | {
      id: string;
      type_resultat: 'CHARGEE' | 'DECHARGEE';
      montant_du?: number | null;
      montant_penalites?: number | null;
      montant_total?: number | null;
      devise: 'CDF' | 'USD';
      redressements?: { id: string; montant: number; devise: string }[];
      penalites?: { id: string; montant: number; devise: string }[];
      avis_recouvrement?: { id: string; montant: number; devise: string }[];
    } | null;
  }[] = [];

  if (missionIds.length > 0) {
    const { data: controlesData, error: controlesError } = await supabase
      .from('controles')
      .select(`
        id, mission_id, statut, type_controle, controleur_responsable_id,
        resultats_controle(
          id, type_resultat, montant_du, montant_penalites, montant_total, devise,
          redressements(id, montant, devise),
          penalites(id, montant, devise),
          avis_recouvrement(id, montant, devise)
        )
      `)
      .in('mission_id', missionIds);

    if (!controlesError && controlesData) {
      rawControles = controlesData as unknown as typeof rawControles;
    }
  }

  // Filtrage pour rôle CONTROLEUR si applicable
  if (currentUser.role === 'CONTROLEUR') {
    rawControles = rawControles.filter((c) => c.controleur_responsable_id === currentUser.id);
  }

  // 6. Agréger les métriques des missions
  let countSurPlace = 0;
  let countSurPieces = 0;
  const parStatut: Record<string, number> = {};
  let countEnCours = 0;
  let countCloturees = 0;
  let countRejetees = 0;
  let countAnnulees = 0;

  const enCoursStatuses = [
    'APPROUVEE',
    'ORDRE_MISSION_GENERE',
    'AUTORISATION_GENEREE',
    'CONTROLEUR_DESIGNE',
    'EQUIPES_AFFECTEES',
    'CONTROLE_EN_COURS',
    'CONTROLE_TERMINE',
    'RESULTAT',
    'PROCES_VERBAL',
    'FEUILLE_OBSERVATIONS',
    'RAPPORT',
  ];

  missions.forEach((m) => {
    if (m.type_controle === 'SUR_PLACE') countSurPlace++;
    if (m.type_controle === 'SUR_PIECES') countSurPieces++;

    parStatut[m.statut] = (parStatut[m.statut] || 0) + 1;

    if (m.statut === 'CLOTUREE') {
      countCloturees++;
    } else if (m.statut === 'REJETEE') {
      countRejetees++;
    } else if (m.statut === 'ANNULEE') {
      countAnnulees++;
    } else if (enCoursStatuses.includes(m.statut)) {
      countEnCours++;
    }
  });

  // 7. Agréger les métriques des contrôles
  let ctrlEnAttente = 0;
  let ctrlEnCours = 0;
  let ctrlTermines = 0;
  let ctrlAnnules = 0;

  rawControles.forEach((c) => {
    if (c.statut === 'EN_ATTENTE') ctrlEnAttente++;
    else if (c.statut === 'EN_COURS') ctrlEnCours++;
    else if (c.statut === 'TERMINE') ctrlTermines++;
    else if (c.statut === 'ANNULE') ctrlAnnules++;
  });

  const totalControlesActifs = rawControles.length - ctrlAnnules;
  const tauxAchevement = totalControlesActifs > 0
    ? Math.round((ctrlTermines / totalControlesActifs) * 100)
    : 0;

  // 8. Agréger les finances strictement par devise (RM-040, RM-041, RM-053)
  let totalDuCDF = 0;
  let totalPenalitesCDF = 0;
  let totalGlobalCDF = 0;
  let totalAvisCDF = 0;
  let nombreAvisCDF = 0;

  let totalDuUSD = 0;
  let totalPenalitesUSD = 0;
  let totalGlobalUSD = 0;
  let totalAvisUSD = 0;
  let nombreAvisUSD = 0;

  let countCharges = 0;
  let countDecharges = 0;
  let countRedressements = 0;
  let countPenalites = 0;

  // Dictionnaires pour agrégation par bureau et par secteur
  const bureauFinances: Record<string, { total_cdf: number; total_usd: number; controles: number }> = {};
  const secteurFinances: Record<string, { total_cdf: number; total_usd: number; missions: number }> = {};

  rawControles.forEach((c) => {
    const res = Array.isArray(c.resultats_controle) ? c.resultats_controle[0] : c.resultats_controle;
    if (res) {
      if (res.type_resultat === 'CHARGEE') {
        countCharges++;
      } else if (res.type_resultat === 'DECHARGEE') {
        countDecharges++;
      }

      const du = Number(res.montant_du ?? 0);
      const pen = Number(res.montant_penalites ?? 0);
      const tot = Number(res.montant_total ?? (du + pen));

      const redressements = res.redressements || [];
      const penalites = res.penalites || [];
      const avis = res.avis_recouvrement || [];

      countRedressements += redressements.length;
      countPenalites += penalites.length;

      const parentMission = missions.find((m) => m.id === c.mission_id);
      const bureauId = parentMission?.bureau_id;
      const secteurId = parentMission?.secteur_id;

      if (res.devise === 'CDF') {
        totalDuCDF += du;
        totalPenalitesCDF += pen;
        totalGlobalCDF += tot;

        avis.forEach((a) => {
          totalAvisCDF += Number(a.montant ?? 0);
          nombreAvisCDF++;
        });

        if (bureauId) {
          if (!bureauFinances[bureauId]) bureauFinances[bureauId] = { total_cdf: 0, total_usd: 0, controles: 0 };
          bureauFinances[bureauId].total_cdf += tot;
        }

        if (secteurId) {
          if (!secteurFinances[secteurId]) secteurFinances[secteurId] = { total_cdf: 0, total_usd: 0, missions: 0 };
          secteurFinances[secteurId].total_cdf += tot;
        }
      } else if (res.devise === 'USD') {
        totalDuUSD += du;
        totalPenalitesUSD += pen;
        totalGlobalUSD += tot;

        avis.forEach((a) => {
          totalAvisUSD += Number(a.montant ?? 0);
          nombreAvisUSD++;
        });

        if (bureauId) {
          if (!bureauFinances[bureauId]) bureauFinances[bureauId] = { total_cdf: 0, total_usd: 0, controles: 0 };
          bureauFinances[bureauId].total_usd += tot;
        }

        if (secteurId) {
          if (!secteurFinances[secteurId]) secteurFinances[secteurId] = { total_cdf: 0, total_usd: 0, missions: 0 };
          secteurFinances[secteurId].total_usd += tot;
        }
      }
    }

    const parentMission = missions.find((m) => m.id === c.mission_id);
    const bureauId = parentMission?.bureau_id;
    if (bureauId) {
      if (!bureauFinances[bureauId]) bureauFinances[bureauId] = { total_cdf: 0, total_usd: 0, controles: 0 };
      bureauFinances[bureauId].controles++;
    }
  });

  const totalResultats = countCharges + countDecharges;
  const tauxCharges = totalResultats > 0 ? Math.round((countCharges / totalResultats) * 100) : 0;
  const tauxDecharges = totalResultats > 0 ? Math.round((countDecharges / totalResultats) * 100) : 0;

  // 9. Répartition par Bureau (RM-055)
  const { data: allBureaux } = await supabase
    .from('bureaux')
    .select('id, code, nom')
    .eq('actif', true)
    .order('code', { ascending: true });

  const bureauxStats: DashboardBureauStat[] = (allBureaux || [])
    .filter((b) => !enforcedBureauId || b.id === enforcedBureauId)
    .map((b) => {
      const bMissions = missions.filter((m) => m.bureau_id === b.id);
      const fin = bureauFinances[b.id] || { total_cdf: 0, total_usd: 0, controles: 0 };
      return {
        id: b.id,
        code: b.code,
        nom: b.nom,
        missions_count: bMissions.length,
        controles_count: fin.controles,
        total_cdf: fin.total_cdf,
        total_usd: fin.total_usd,
      };
    });

  // 10. Répartition par Secteur (RM-055)
  let secteursQuery = supabase
    .from('secteurs')
    .select('id, code, nom, bureau_id, bureaux(code)')
    .eq('actif', true)
    .order('code', { ascending: true });

  if (enforcedBureauId) {
    secteursQuery = secteursQuery.eq('bureau_id', enforcedBureauId);
  }

  const { data: allSecteurs } = await secteursQuery;

  const secteursStats: DashboardSecteurStat[] = (allSecteurs || []).map((s) => {
    const sMissions = missions.filter((m) => m.secteur_id === s.id);
    const fin = secteurFinances[s.id] || { total_cdf: 0, total_usd: 0, missions: 0 };
    return {
      id: s.id,
      code: s.code,
      nom: s.nom,
      bureau_code: (s.bureaux as unknown as { code: string })?.code || 'BUR',
      missions_count: sMissions.length,
      total_cdf: fin.total_cdf,
      total_usd: fin.total_usd,
    };
  });

  // 11. Récupération de l'activité récente issue de audit_logs (RM-025, traçabilité)
  let auditQuery = supabase
    .from('audit_logs')
    .select(`
      id, action, entity_type, entity_id, created_at,
      profiles(nom, prenom, role)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Si périmètre restreint, limiter les logs d'audit aux entités de ce périmètre
  if (enforcedBureauId && missionIds.length > 0) {
    auditQuery = auditQuery.in('entity_id', missionIds);
  }

  const { data: rawAuditLogs } = await auditQuery;

  interface AuditRow {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    profiles?: { nom: string; prenom: string; role: string } | null;
  }

  const activiteRecente: DashboardActivity[] = ((rawAuditLogs as unknown as AuditRow[]) || []).map(
    (log) => {
      const p = log.profiles;
      const nom = p ? `${p.nom} ${p.prenom}` : 'Système';
      const role = p?.role || 'SYSTEM';
      return {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        created_at: log.created_at,
        auteur_nom: nom,
        auteur_role: role,
      };
    }
  );

  return {
    missions: {
      total: missions.length,
      sur_place: countSurPlace,
      sur_pieces: countSurPieces,
      par_statut: parStatut,
      en_cours: countEnCours,
      cloturees: countCloturees,
      rejetees: countRejetees,
      annulees: countAnnulees,
    },
    controles: {
      total: rawControles.length,
      en_attente: ctrlEnAttente,
      en_cours: ctrlEnCours,
      termines: ctrlTermines,
      annules: ctrlAnnules,
      taux_achevement: tauxAchevement,
    },
    finances: {
      cdf: {
        total_du: totalDuCDF,
        total_penalites: totalPenalitesCDF,
        total_global: totalGlobalCDF,
        total_avis: totalAvisCDF,
        nombre_avis: nombreAvisCDF,
      },
      usd: {
        total_du: totalDuUSD,
        total_penalites: totalPenalitesUSD,
        total_global: totalGlobalUSD,
        total_avis: totalAvisUSD,
        nombre_avis: nombreAvisUSD,
      },
      resultats: {
        total_charges: countCharges,
        total_decharges: countDecharges,
        total_resultats: totalResultats,
        taux_charges: tauxCharges,
        taux_decharges: tauxDecharges,
      },
      redressements_count: countRedressements,
      penalites_count: countPenalites,
    },
    bureaux: bureauxStats,
    secteurs: secteursStats,
    activite_recente: activiteRecente,
    perimetre_applique: {
      role: currentUser.role,
      est_global: isGlobalRole,
      bureau_id: enforcedBureauId,
      bureau_nom: bureauNom,
    },
  };
}
