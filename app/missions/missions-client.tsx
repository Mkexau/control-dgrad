'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : LISTE & GESTION DES MISSIONS
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import type { MissionStatus, MissionType } from '@/lib/validations/missions';
import { MissionStatusBadge, MissionTypeBadge } from '@/components/missions/mission-badges';

export interface MissionListItem {
  id: string;
  reference: string;
  type_controle: MissionType;
  bureau_id: string;
  secteur_id?: string | null;
  statut: MissionStatus;
  motif?: string | null;
  date_creation: string;
  date_soumission?: string | null;
  date_approbation?: string | null;
  bureaux?: { code: string; nom: string } | null;
  secteurs?: { code: string; nom: string } | null;
  mission_assujettis?: {
    assujettis: { id: string; nom_raison_sociale: string; identifiant: string };
  }[];
}

interface MissionsClientProps {
  initialMissions: MissionListItem[];
  userRole: string;
  userBureauId?: string | null;
  bureauxList: { id: string; code: string; nom: string }[];
}

export function MissionsClient({
  initialMissions,
  userRole,
  bureauxList,
}: MissionsClientProps) {
  const [missions] = useState<MissionListItem[]>(initialMissions);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [bureauFilter, setBureauFilter] = useState<string>('ALL');

  // Déterminer les statuts qui requièrent une action selon le rôle
  const isActionRequired = (statut: MissionStatus, type: MissionType): boolean => {
    switch (userRole) {
      case 'CHEF_BUREAU':
      case 'ANALYSTE':
        return statut === 'BROUILLON' || statut === 'REJETEE';
      case 'CHEF_DIVISION':
        return type === 'SUR_PLACE' && (statut === 'SOUMISE' || statut === 'EXAMEN_CHEF_DIVISION');
      case 'DIRECTEUR_CONTROLES':
        return type === 'SUR_PLACE' && statut === 'EXAMEN_DIRECTEUR_CONTROLES';
      case 'DIRECTEUR_GENERAL':
        return type === 'SUR_PLACE' && statut === 'ATTENTE_DG';
      case 'CHEF_SECTION':
        return type === 'SUR_PIECES' && (statut === 'DEMANDE_SOUMISE' || statut === 'EXAMEN_CHEF_SECTION' || statut === 'AUTORISATION_GENEREE');
      default:
        return false;
    }
  };

  const filteredMissions = missions.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      m.reference.toLowerCase().includes(query) ||
      (m.motif && m.motif.toLowerCase().includes(query)) ||
      (m.bureaux?.nom && m.bureaux.nom.toLowerCase().includes(query)) ||
      (m.secteurs?.nom && m.secteurs.nom.toLowerCase().includes(query)) ||
      (m.mission_assujettis &&
        m.mission_assujettis.some((ma) =>
          ma.assujettis?.nom_raison_sociale.toLowerCase().includes(query)
        ));

    const matchesType = typeFilter === 'ALL' || m.type_controle === typeFilter;
    const matchesBureau = bureauFilter === 'ALL' || m.bureau_id === bureauFilter;

    let matchesTab = true;
    if (activeTab === 'ACTION_REQUIRED') {
      matchesTab = isActionRequired(m.statut, m.type_controle);
    } else if (activeTab === 'IN_PROGRESS') {
      matchesTab = [
        'EQUIPES_AFFECTEES',
        'CONTROLEUR_DESIGNE',
        'CONTROLE_EN_COURS',
        'CONTROLE_TERMINE',
        'RESULTAT',
        'PROCES_VERBAL',
        'FEUILLE_OBSERVATIONS',
        'RAPPORT',
      ].includes(m.statut);
    } else if (activeTab === 'COMPLETED') {
      matchesTab = m.statut === 'CLOTUREE';
    }

    return matchesSearch && matchesType && matchesBureau && matchesTab;
  });

  const countActionRequired = missions.filter((m) => isActionRequired(m.statut, m.type_controle)).length;

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Missions de Contrôle Non Fiscal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion du cycle de vie des missions sur place et sur pièces de la DGRAD.
          </p>
        </div>

        {userRole !== 'ADMIN' && (
          <Link
            href="/missions/nouvelle"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Mission
          </Link>
        )}
      </div>

      {/* Onglets de filtrage */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-6 overflow-x-auto text-sm font-medium">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'ALL'
              ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Toutes les missions ({missions.length})
        </button>

        <button
          onClick={() => setActiveTab('ACTION_REQUIRED')}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'ACTION_REQUIRED'
              ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>À traiter / valider</span>
          {countActionRequired > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold animate-pulse">
              {countActionRequired}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'IN_PROGRESS'
              ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          En cours de contrôle
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'COMPLETED'
              ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Clôturées
        </button>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, assujetti ou motif..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les types</option>
              <option value="SUR_PLACE">SUR PLACE</option>
              <option value="SUR_PIECES">SUR PIÈCES</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Bureau :</span>
            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les bureaux</option>
              {bureauxList.map((bur) => (
                <option key={bur.id} value={bur.id}>
                  {bur.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des missions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Référence</th>
                <th className="px-6 py-3.5">Type & Compétence</th>
                <th className="px-6 py-3.5">Entreprises / Assujettis</th>
                <th className="px-6 py-3.5">Motif</th>
                <th className="px-6 py-3.5">Statut du Workflow</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredMissions.length > 0 ? (
                filteredMissions.map((m) => {
                  const assujettis = m.mission_assujettis || [];
                  const needsAction = isActionRequired(m.statut, m.type_controle);

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                        needsAction ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {needsAction && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                          {m.reference}
                        </div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Créée le {new Date(m.date_creation).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <MissionTypeBadge type={m.type_controle} />
                        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 font-mono">
                          {m.bureaux?.code} {m.secteurs ? `• ${m.secteurs.nom}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {assujettis.length > 0 ? (
                          <div>
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                              {assujettis[0].assujettis?.nom_raison_sociale}
                            </div>
                            {assujettis.length > 1 && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                + {assujettis.length - 1} autre(s) entreprise(s)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Aucun assujetti</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 max-w-xs">
                          {m.motif || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <MissionStatusBadge statut={m.statut} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/missions/${m.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            needsAction
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          {needsAction ? 'Traiter le dossier' : 'Consulter'}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucune mission trouvée pour les critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
