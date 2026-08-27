'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : LISTE DES ÉQUIPES (SUR_PLACE)
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import type { EquipeStatus } from '@/lib/validations/equipes';
import { EquipeStatusBadge, MissionStatusBadge } from '@/components/missions/mission-badges';

export interface EquipeListItem {
  id: string;
  mission_id: string;
  nom: string;
  statut: EquipeStatus;
  created_at: string;
  updated_at: string;
  missions?: {
    id: string;
    reference: string;
    statut: string;
    bureau_id: string;
    bureaux?: { code: string; nom: string } | null;
  } | null;
  agents?: {
    id: string;
    matricule: string;
    profiles?: { nom: string; prenom: string; email: string } | null;
  } | null;
  equipe_agents?: {
    agent_id: string;
    agents?: {
      id: string;
      matricule: string;
      profiles?: { nom: string; prenom: string } | null;
    } | null;
  }[];
  equipe_assujettis?: {
    assujetti_id: string;
    assujettis?: {
      id: string;
      nom_raison_sociale: string;
      identifiant: string;
    } | null;
  }[];
  controles?: { id: string; statut: string }[];
}

interface EquipesClientProps {
  initialEquipes: EquipeListItem[];
  userRole: string;
  userBureauId?: string | null;
  userAgentId?: string | null;
}

export function EquipesClient({
  initialEquipes,
  userRole,
  userBureauId,
  userAgentId,
}: EquipesClientProps) {
  const [equipes] = useState<EquipeListItem[]>(initialEquipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'MINE' | 'CONFIRMED'>('ALL');

  // Filtrage des équipes selon rôle et paramètres
  const filteredEquipes = equipes.filter((eq) => {
    // Cloisonnement de sécurité : CHEF_EQUIPE ne voit que ses équipes et affectations
    if (userRole === 'CHEF_EQUIPE' || userRole === 'CONTROLEUR') {
      const isChef = eq.agents?.id === userAgentId;
      const isMember = (eq.equipe_agents || []).some((ea) => ea.agent_id === userAgentId);
      if (!isChef && !isMember) {
        return false;
      }
    } else if (
      (userRole === 'CHEF_BUREAU' || userRole === 'ANALYSTE') &&
      userBureauId &&
      eq.missions?.bureau_id !== userBureauId
    ) {
      return false;
    }

    const query = searchQuery.toLowerCase();
    const chefName = `${eq.agents?.profiles?.nom || ''} ${eq.agents?.profiles?.prenom || ''}`.toLowerCase();
    const chefMatricule = (eq.agents?.matricule || '').toLowerCase();
    const missionRef = (eq.missions?.reference || '').toLowerCase();
    const teamName = eq.nom.toLowerCase();

    const matchesSearch =
      teamName.includes(query) ||
      chefName.includes(query) ||
      chefMatricule.includes(query) ||
      missionRef.includes(query);

    const matchesStatus = statusFilter === 'ALL' || eq.statut === statusFilter;

    let matchesTab = true;
    if (tabFilter === 'MINE' && userAgentId) {
      const isChef = eq.agents?.id === userAgentId;
      const isMember = (eq.equipe_agents || []).some((ea) => ea.agent_id === userAgentId);
      matchesTab = isChef || isMember;
    } else if (tabFilter === 'CONFIRMED') {
      matchesTab = eq.statut === 'CONFIRMEE';
    }

    return matchesSearch && matchesStatus && matchesTab;
  });

  const totalCount = filteredEquipes.length;
  const confirmedCount = filteredEquipes.filter((e) => e.statut === 'CONFIRMEE').length;
  const proposedCount = filteredEquipes.filter((e) => e.statut === 'PROPOSEE').length;

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span>Équipes & Contrôles sur place</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Supervision et pilotage des équipes opérationnelles de terrain et des constatations.
          </p>
        </div>
      </div>

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Total Équipes
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {totalCount}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Équipes Confirmées
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {confirmedCount}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Équipes Proposées (Brouillon)
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {proposedCount}
          </div>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Onglets rapides */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tabFilter === 'ALL'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Toutes les équipes
            </button>
            <button
              onClick={() => setTabFilter('CONFIRMED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tabFilter === 'CONFIRMED'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Confirmées uniquement
            </button>
            {userAgentId && (
              <button
                onClick={() => setTabFilter('MINE')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tabFilter === 'MINE'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Mes affectations
              </button>
            )}
          </div>

          {/* Sélecteur de statut */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 w-full sm:w-auto"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PROPOSEE">PROPOSÉE</option>
              <option value="CONFIRMEE">CONFIRMÉE</option>
              <option value="ANNULEE">ANNULÉE</option>
            </select>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par nom d'équipe, chef d'équipe, matricule ou référence de mission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Liste des équipes */}
      {filteredEquipes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Aucune équipe trouvée
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Aucune équipe ne correspond aux filtres actuels ou à votre périmètre d&apos;autorisation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEquipes.map((equipe) => {
            const chef = equipe.agents?.profiles;
            const chefFullName = chef ? `${chef.nom} ${chef.prenom}` : 'Non désigné';
            const agentCount = (equipe.equipe_agents || []).length;
            const assujettiCount = (equipe.equipe_assujettis || []).length;
            const controlesCount = (equipe.controles || []).length;

            return (
              <div
                key={equipe.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {equipe.nom}
                        </h3>
                        <EquipeStatusBadge statut={equipe.statut} />
                      </div>
                      {equipe.missions && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          <span>Mission :</span>
                          <Link
                            href={`/missions/${equipe.missions.id}`}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {equipe.missions.reference}
                          </Link>
                          <span>•</span>
                          <MissionStatusBadge statut={equipe.missions.statut as unknown as never} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fiche Chef & Effectifs */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Chef d&apos;équipe :
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {chefFullName} <span className="font-mono text-zinc-400">({equipe.agents?.matricule || 'N/A'})</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Agents</div>
                        <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{agentCount}</div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Assujettis</div>
                        <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{assujettiCount}</div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Contrôles</div>
                        <div className="text-sm font-black text-blue-600 dark:text-blue-400">{controlesCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Créée le {new Date(equipe.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <Link
                    href={`/equipes/${equipe.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
                  >
                    <span>Détails & Contrôles</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
