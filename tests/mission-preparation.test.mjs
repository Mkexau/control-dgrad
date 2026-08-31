import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  genererEquipesProposees,
  prioriserAgentsParSecteur,
  repartirAssujettis,
} from '../lib/missions/mission-preparation.ts';

describe('Préparation intelligente des missions', () => {
  it('répartit 10 entreprises entre 3 équipes selon 4 / 3 / 3', () => {
    const groupes = repartirAssujettis(
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'],
      3
    );

    assert.deepEqual(groupes.map((groupe) => groupe.length), [4, 3, 3]);
    assert.deepEqual(groupes.flat(), ['a1', 'a4', 'a7', 'a10', 'a2', 'a5', 'a8', 'a3', 'a6', 'a9']);
  });

  it('priorise les agents spécialisés dans le secteur sélectionné', () => {
    const agents = [
      { id: 'autre-1', secteur_id: 'secteur-autre' },
      { id: 'prioritaire-1', secteur_id: 'secteur-cible' },
      { id: 'prioritaire-2', secteur_id: 'secteur-cible' },
      { id: 'autre-2', secteur_id: null },
    ];

    assert.deepEqual(
      prioriserAgentsParSecteur(agents, 'secteur-cible').map((agent) => agent.id),
      ['prioritaire-1', 'prioritaire-2', 'autre-1', 'autre-2']
    );
  });

  it('propose chaque entreprise une seule fois et affecte les agents par bureau fourni', () => {
    const equipes = genererEquipesProposees(
      2,
      ['a1', 'a2', 'a3', 'a4'],
      [
        { id: 'agent-s1', secteur_id: 'secteur-1' },
        { id: 'agent-s2', secteur_id: 'secteur-1' },
        { id: 'agent-s3', secteur_id: 'secteur-1' },
        { id: 'agent-autre', secteur_id: 'secteur-2' },
      ],
      'secteur-1'
    );

    assert.deepEqual(equipes.map((equipe) => equipe.assujettis_ids.length), [2, 2]);
    assert.deepEqual(equipes.flatMap((equipe) => equipe.assujettis_ids).sort(), ['a1', 'a2', 'a3', 'a4']);
    assert.equal(equipes[0].chef_equipe_id, 'agent-s1');
    assert.equal(equipes[1].chef_equipe_id, 'agent-autre');
  });
});
