export interface PreparationAgent {
  id: string;
  secteur_id: string | null;
}

export interface EquipePreparation {
  nom: string;
  chef_equipe_id: string;
  agents_ids: string[];
  assujettis_ids: string[];
}

export function repartirAssujettis(assujettisIds: string[], nbEquipes: number): string[][] {
  if (nbEquipes <= 0 || assujettisIds.length === 0) return [];

  const groupes: string[][] = Array.from({ length: nbEquipes }, () => []);
  assujettisIds.forEach((id, index) => {
    groupes[index % nbEquipes].push(id);
  });
  return groupes;
}

export function prioriserAgentsParSecteur<T extends PreparationAgent>(agents: T[], secteurId: string): T[] {
  return [...agents].sort((a, b) => Number(b.secteur_id === secteurId) - Number(a.secteur_id === secteurId));
}

export function genererEquipesProposees(
  nbEquipes: number,
  assujettisIds: string[],
  agentsDuBureau: PreparationAgent[],
  secteurId: string
): EquipePreparation[] {
  const groupes = repartirAssujettis(assujettisIds, nbEquipes);
  const agentsTries = prioriserAgentsParSecteur(agentsDuBureau, secteurId);
  const noms = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hôtel', 'India', 'Juliet'];

  return groupes.map((assujettis, index) => {
    const agents = agentsTries.slice(index * 3, index * 3 + 3).map((agent) => agent.id);
    return {
      nom: `Équipe ${noms[index] ?? index + 1}`,
      chef_equipe_id: agents[0] ?? '',
      agents_ids: agents,
      assujettis_ids: assujettis,
    };
  });
}
