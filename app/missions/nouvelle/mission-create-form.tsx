'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE DE CRÉATION DE MISSION (SUR_PLACE & SUR_PIECES)
// =============================================================================

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MissionType } from '@/lib/validations/missions';
import { createMission } from '@/app/actions/missions';

interface BureauItem {
  id: string;
  code: string;
  nom: string;
}

interface SecteurItem {
  id: string;
  bureau_id: string;
  code: string;
  nom: string;
}

interface AssujettiItem {
  id: string;
  nom_raison_sociale: string;
  identifiant: string;
  secteur_principal_id?: string | null;
}

interface AgentItem {
  id: string;
  matricule: string;
  profiles?: {
    nom: string;
    prenom: string;
  } | null;
}

interface MissionCreateFormProps {
  userBureauId?: string | null;
  bureaux: BureauItem[];
  secteurs: SecteurItem[];
  assujettis: AssujettiItem[];
  agents: AgentItem[];
}

export function MissionCreateForm({
  userBureauId,
  bureaux,
  secteurs,
  assujettis,
  agents,
}: MissionCreateFormProps) {
  const router = useRouter();

  const [typeControle, setTypeControle] = useState<MissionType>('SUR_PLACE');
  const [bureauId, setBureauId] = useState<string>(userBureauId || bureaux[0]?.id || '');
  const [secteurId, setSecteurId] = useState<string>('');
  const [motif, setMotif] = useState('');
  const [selectedAssujettis, setSelectedAssujettis] = useState<string[]>([]);

  // Équipes proposées pour SUR_PLACE
  const [equipes, setEquipes] = useState<
    {
      nom: string;
      chef_equipe_id: string;
      agents_ids: string[];
      assujettis_ids: string[];
    }[]
  >([
    {
      nom: 'Équipe Alpha',
      chef_equipe_id: agents[0]?.id || '',
      agents_ids: agents[0] ? [agents[0].id] : [],
      assujettis_ids: [],
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtrer les secteurs selon le bureau sélectionné (RM-001)
  const availableSecteurs = secteurs.filter((s) => s.bureau_id === bureauId);

  const handleBureauChange = (newBureauId: string) => {
    setBureauId(newBureauId);
    setSecteurId(''); // Réinitialiser le secteur car non valide pour le nouveau bureau
  };

  const handleToggleAssujetti = (id: string) => {
    setSelectedAssujettis((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddEquipe = () => {
    setEquipes((prev) => [
      ...prev,
      {
        nom: `Équipe ${prev.length + 1}`,
        chef_equipe_id: agents[0]?.id || '',
        agents_ids: agents[0] ? [agents[0].id] : [],
        assujettis_ids: [],
      },
    ]);
  };

  const handleRemoveEquipe = (index: number) => {
    setEquipes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (selectedAssujettis.length === 0) {
      setErrorMessage('Veuillez sélectionner au moins une entreprise / assujetti pour cette mission.');
      setIsLoading(false);
      return;
    }

    if (typeControle === 'SUR_PLACE') {
      if (equipes.length === 0) {
        setErrorMessage('Une mission sur place nécessite la proposition d\'au moins une équipe.');
        setIsLoading(false);
        return;
      }

      for (let i = 0; i < equipes.length; i++) {
        const eq = equipes[i];
        if (!eq.chef_equipe_id) {
          setErrorMessage(`Veuillez désigner un chef d'équipe pour l'${eq.nom}.`);
          setIsLoading(false);
          return;
        }
        if (eq.agents_ids.length === 0) {
          setErrorMessage(`Veuillez affecter au moins un agent pour l'${eq.nom}.`);
          setIsLoading(false);
          return;
        }
        if (eq.assujettis_ids.length === 0) {
          setErrorMessage(`Veuillez affecter au moins une entreprise à l'${eq.nom}.`);
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const payload = {
        type_controle: typeControle,
        bureau_id: bureauId,
        secteur_id: secteurId || null,
        motif: motif.trim(),
        assujettis_ids: selectedAssujettis,
        equipes_propositions: typeControle === 'SUR_PLACE' ? equipes : null,
      };

      const res = await createMission(payload);

      if (res.success && res.data) {
        router.push(`/missions/${res.data.id}`);
      } else {
        setErrorMessage(res.error || 'Erreur lors de la création de la mission.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* En-tête de création */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Préparer une Demande de Mission
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Initialisation d&apos;un dossier de contrôle non fiscal à l&apos;état Brouillon.
          </p>
        </div>
        <Link
          href="/missions"
          className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          Retour aux missions
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* 1. Choix du Type de Contrôle */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          1. Type de mission & Parcours fonctionnel
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              typeControle === 'SUR_PLACE'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-600'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="type_controle"
                value="SUR_PLACE"
                checked={typeControle === 'SUR_PLACE'}
                onChange={() => setTypeControle('SUR_PLACE')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Contrôle sur place (SUR_PLACE)
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Déplacement physique d&apos;équipes de contrôle. Requiert l&apos;approbation du Directeur Général et génère un ordre de mission officiel.
                </p>
              </div>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              typeControle === 'SUR_PIECES'
                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="type_controle"
                value="SUR_PIECES"
                checked={typeControle === 'SUR_PIECES'}
                onChange={() => setTypeControle('SUR_PIECES')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Contrôle sur pièces (SUR_PIECES)
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Instruction sur dossier dans les locaux de l&apos;administration. Requiert l&apos;approbation du Chef de section et génère une autorisation de contrôle.
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 2. Cadre Institutionnel & Compétence (RM-001) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          2. Compétence & Contexte de la demande
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Bureau de contrôle compétent *
            </label>
            <select
              value={bureauId}
              onChange={(e) => handleBureauChange(e.target.value)}
              required
              disabled={isLoading || Boolean(userBureauId)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {bureaux.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Secteur d&apos;activité (RM-001)
            </label>
            <select
              value={secteurId}
              onChange={(e) => setSecteurId(e.target.value)}
              disabled={isLoading || availableSecteurs.length === 0}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionnez un secteur (optionnel)</option>
              {availableSecteurs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
            Motif / Fondement de la mission *
          </label>
          <textarea
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Justifiez les raisons du contrôle (recoupement, défaillance déclarative, analyse statistique...)"
            required
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 3. Sélection des Assujettis / Entreprises */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            3. Entreprises & Assujettis ciblés ({selectedAssujettis.length} sélectionné(s)) *
          </h2>
          <span className="text-xs text-zinc-400">
            {assujettis.length} assujetti(s) disponible(s)
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
          {assujettis.length > 0 ? (
            assujettis.map((ass) => {
              const isChecked = selectedAssujettis.includes(ass.id);
              return (
                <label
                  key={ass.id}
                  className={`p-2.5 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50/60 dark:bg-blue-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleAssujetti(ass.id)}
                      className="w-4 h-4 text-blue-600 rounded-sm border-zinc-300 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {ass.nom_raison_sociale}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        Identifiant: {ass.identifiant}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })
          ) : (
            <p className="p-4 text-xs text-zinc-500 text-center italic">
              Aucun assujetti enregistré dans la base.
            </p>
          )}
        </div>
      </div>

      {/* 4. Pour SUR_PLACE : Proposition des Équipes & Affectations */}
      {typeControle === 'SUR_PLACE' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                4. Proposition des Équipes de Terrain & Affectations
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Définissez les équipes, chefs d&apos;équipe et affectez les entreprises ciblées.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddEquipe}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + Ajouter une équipe
            </button>
          </div>

          <div className="space-y-6">
            {equipes.map((eq, eqIdx) => (
              <div
                key={eqIdx}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                  <input
                    type="text"
                    value={eq.nom}
                    onChange={(e) => {
                      const newEqs = [...equipes];
                      newEqs[eqIdx].nom = e.target.value;
                      setEquipes(newEqs);
                    }}
                    placeholder="Nom de l'équipe (Ex: Équipe 1)"
                    required
                    className="font-bold text-sm bg-transparent border-b border-dashed border-zinc-400 focus:outline-hidden text-zinc-900 dark:text-zinc-100"
                  />
                  {equipes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipe(eqIdx)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Supprimer l&apos;équipe
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chef d'équipe */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                      Chef d&apos;équipe désigné *
                    </label>
                    <select
                      value={eq.chef_equipe_id}
                      onChange={(e) => {
                        const newEqs = [...equipes];
                        newEqs[eqIdx].chef_equipe_id = e.target.value;
                        setEquipes(newEqs);
                      }}
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden"
                    >
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.profiles?.nom} {ag.profiles?.prenom} ({ag.matricule})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Agents membres */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                      Agents de terrain affectés *
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-2 space-y-1">
                      {agents.map((ag) => {
                        const isAgentSelected = eq.agents_ids.includes(ag.id);
                        return (
                          <label key={ag.id} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAgentSelected}
                              onChange={() => {
                                const newEqs = [...equipes];
                                newEqs[eqIdx].agents_ids = isAgentSelected
                                  ? newEqs[eqIdx].agents_ids.filter((id) => id !== ag.id)
                                  : [...newEqs[eqIdx].agents_ids, ag.id];
                                setEquipes(newEqs);
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded-xs"
                            />
                            <span>{ag.profiles?.nom} {ag.profiles?.prenom} ({ag.matricule})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Entreprises affectées à cette équipe */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                    Entreprises assignées à cette équipe *
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-2 space-y-1">
                    {selectedAssujettis.length > 0 ? (
                      selectedAssujettis.map((assId) => {
                        const assObj = assujettis.find((a) => a.id === assId);
                        const isAssSelected = eq.assujettis_ids.includes(assId);
                        return (
                          <label key={assId} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssSelected}
                              onChange={() => {
                                const newEqs = [...equipes];
                                newEqs[eqIdx].assujettis_ids = isAssSelected
                                  ? newEqs[eqIdx].assujettis_ids.filter((id) => id !== assId)
                                  : [...newEqs[eqIdx].assujettis_ids, assId];
                                setEquipes(newEqs);
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded-xs"
                            />
                            <span>{assObj?.nom_raison_sociale} ({assObj?.identifiant})</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Veuillez d&apos;abord sélectionner des entreprises à l&apos;étape 3.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/missions"
          className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          )}
          Enregistrer le Brouillon
        </button>
      </div>
    </form>
  );
}
