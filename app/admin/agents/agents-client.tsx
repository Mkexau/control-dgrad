'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES AGENTS DE CONTRÔLE
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge, RoleBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { AgentForm, type AgentRecord } from '@/components/admin/forms/agent-form';
import { toggleAgentStatus } from '@/app/actions/admin-users';

interface AgentsClientProps {
  initialAgents: AgentRecord[];
  profilesList: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    hasAgent?: boolean;
  }[];
}

export function AgentsClient({ initialAgents, profilesList }: AgentsClientProps) {
  const [agents, setAgents] = useState<AgentRecord[]>(initialAgents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<AgentRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const filteredAgents = agents.filter((ag) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ag.matricule.toLowerCase().includes(query) ||
      (ag.nom && ag.nom.toLowerCase().includes(query)) ||
      (ag.prenom && ag.prenom.toLowerCase().includes(query)) ||
      (ag.profiles?.nom && ag.profiles.nom.toLowerCase().includes(query)) ||
      (ag.profiles?.prenom && ag.profiles.prenom.toLowerCase().includes(query)) ||
      (ag.specialite && ag.specialite.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && ag.actif) ||
      (statusFilter === 'INACTIVE' && !ag.actif);

    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    window.location.reload();
  };

  const handleToggleConfirm = async () => {
    if (!confirmTarget) return;
    setIsToggling(true);

    try {
      const res = await toggleAgentStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setAgents((prev) =>
          prev.map((a) => (a.id === confirmTarget.id ? { ...a, actif: !a.actif } : a))
        );
      } else {
        alert(res.error || 'Erreur lors du changement de statut.');
      }
    } finally {
      setIsToggling(false);
      setConfirmTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Agents de Contrôle & de Recette</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion des matricules, compétences techniques et disponibilités des agents pour les équipes de mission.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
        >
          <span>+</span>
          <span>Nouvel Agent</span>
        </button>
      </div>

      {/* Barre de filtre et recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher par matricule, nom, prénom, spécialité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">🔍</span>
        </div>

        <div className="w-full sm:w-60">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous ({agents.length})</option>
            <option value="ACTIVE">Disponibles / Actifs ({agents.filter((a) => a.actif).length})</option>
            <option value="INACTIVE">Indisponibles ({agents.filter((a) => !a.actif).length})</option>
          </select>
        </div>
      </div>

      {/* Tableau des agents */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Matricule</th>
                <th className="px-6 py-3.5">Agent / Profil</th>
                <th className="px-6 py-3.5">Rôle / Type</th>
                <th className="px-6 py-3.5">Spécialité & Compétence</th>
                <th className="px-6 py-3.5">Disponibilité</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => (
                  <tr key={ag.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {ag.matricule}
                    </td>
                    <td className="px-6 py-4">
                      {ag.profiles ? (
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {ag.profiles.nom} {ag.profiles.prenom}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {ag.profiles.email}
                          </div>
                        </div>
                      ) : ag.nom ? (
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {ag.nom} {ag.prenom}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {ag.bureaux?.nom || 'Bureau'} {ag.secteurs ? `· ${ag.secteurs.nom}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Agent de recette</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {ag.profiles ? (
                        <RoleBadge role={ag.profiles.role} />
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#0a5db5] border border-blue-200">
                          AGENT DE RECETTE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-600 dark:text-zinc-300">
                      {ag.specialite ? (
                        <div>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{ag.specialite}</span>
                          {ag.domaine_competence && (
                            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">{ag.domaine_competence}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Non renseignée</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={ag.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(ag)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(ag)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          ag.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {ag.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucun agent de contrôle trouvé selon les critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulaire */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAgent ? 'Modifier l\'Agent' : 'Enregistrer un Agent de Contrôle'}
        description="Rattachez un profil utilisateur et renseignez le matricule officiel."
      >
        <AgentForm
          initialData={editingAgent}
          profilesList={profilesList}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver la disponibilité' : 'Activer la disponibilité'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } la disponibilité de l'agent matricule ${confirmTarget?.matricule} (${confirmTarget?.profiles?.nom ?? ''}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
