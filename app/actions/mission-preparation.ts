'use server';

// =============================================================================
// DGRAD CONTROLE - SERVER ACTION : DONNÉES DE PRÉPARATION INTELLIGENTE DE MISSION
// =============================================================================
// Fournit au Chef de Bureau :
// - La synthèse sectorielle classée (secteur prioritaire en tête)
// - Les assujettis présélectionnés pour le secteur
// - Les agents actifs du bureau filtrés et priorisés

import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import type { SyntheseSecteurItem } from '@/lib/controles/controle-ordonnancement-service';
import { getSyntheseSectorielleControle } from '@/lib/controles/controle-ordonnancement-service';

export interface AssujettiBrief {
  id: string;
  nom_raison_sociale: string;
  identifiant: string;
  secteur_principal_id: string | null;
  deja_controle: boolean; // true si mission terminée sur ce sujet
}

export interface AgentBrief {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  bureau_id: string | null;
  secteur_id: string | null;
  specialite: string | null;
  match_secteur: boolean; // true si secteur_id === secteur sélectionné
}

export interface MissionPreparationData {
  synthese: SyntheseSecteurItem[];
  secteurPrioritaireId: string | null;
  assujettisParSecteur: Record<string, AssujettiBrief[]>;
  agents: AgentBrief[];
}

export async function getMissionPreparationData(): Promise<{
  success: boolean;
  data?: MissionPreparationData;
  error?: string;
}> {
  try {
    const currentUser = await requireAuthenticatedUser();

    if (currentUser.role === 'ADMIN') {
      return { success: false, error: 'Accès non autorisé.' };
    }

    const supabase = createAdminClient();

    // 1. Synthèse sectorielle classée (secteur prioritaire identifié)
    const synthese = await getSyntheseSectorielleControle(currentUser);

    const secteurPrioritaire = synthese.find((s) => s.is_prioritaire) ?? null;

    // 2. Identifier les assujettis déjà contrôlés (missions terminées)
    const { data: missionsTerminees } = await supabase
      .from('missions')
      .select('id, mission_assujettis(assujetti_id)')
      .in('statut', ['CONTROLE_TERMINE', 'RAPPORT', 'CLOTUREE'])
      .eq('bureau_id', currentUser.bureau_id ?? '');

    const assujettisDejaCtr = new Set<string>();
    for (const m of missionsTerminees ?? []) {
      const mas = Array.isArray(m.mission_assujettis) ? m.mission_assujettis : [];
      for (const ma of mas) {
        const rec = ma as { assujetti_id?: string };
        if (rec.assujetti_id) assujettisDejaCtr.add(rec.assujetti_id);
      }
    }

    // 3. Récupérer tous les assujettis actifs, regroupés par secteur
    const { data: assujettisRaw } = await supabase
      .from('assujettis')
      .select('id, nom_raison_sociale, identifiant, secteur_principal_id')
      .eq('actif', true)
      .order('nom_raison_sociale');

    const assujettisParSecteur: Record<string, AssujettiBrief[]> = {};
    for (const a of assujettisRaw ?? []) {
      const sId = a.secteur_principal_id || '__sans_secteur__';
      if (!assujettisParSecteur[sId]) {
        assujettisParSecteur[sId] = [];
      }
      assujettisParSecteur[sId].push({
        id: a.id,
        nom_raison_sociale: a.nom_raison_sociale,
        identifiant: a.identifiant,
        secteur_principal_id: a.secteur_principal_id,
        deja_controle: assujettisDejaCtr.has(a.id),
      });
    }

    // 4. Récupérer les agents actifs du bureau (avec profils liés)
    const bureauId = currentUser.bureau_id;
    let agentsQuery = supabase
      .from('agents')
      .select('id, matricule, nom, prenom, bureau_id, secteur_id, specialite, profiles(nom, prenom, bureau_id)')
      .eq('actif', true)
      .order('matricule');

    if (bureauId) {
      agentsQuery = agentsQuery.eq('bureau_id', bureauId);
    }

    const { data: agentsRaw } = await agentsQuery;

    const agents: AgentBrief[] = (agentsRaw ?? []).map((ag) => {
      const prof = ag.profiles as { nom?: string; prenom?: string; bureau_id?: string } | null;
      return {
        id: ag.id,
        matricule: ag.matricule,
        nom: ag.nom || prof?.nom || '',
        prenom: ag.prenom || prof?.prenom || '',
        bureau_id: ag.bureau_id || prof?.bureau_id || null,
        secteur_id: ag.secteur_id ?? null,
        specialite: ag.specialite ?? null,
        match_secteur: false, // sera mis à jour côté client lors de la sélection du secteur
      };
    });

    return {
      success: true,
      data: {
        synthese,
        secteurPrioritaireId: secteurPrioritaire?.secteur_id ?? null,
        assujettisParSecteur,
        agents,
      },
    };
  } catch (err) {
    console.error('getMissionPreparationData error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors du chargement des données de préparation.',
    };
  }
}
