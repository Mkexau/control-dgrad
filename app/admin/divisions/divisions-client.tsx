'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES DIVISIONS
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { DivisionForm, type DivisionRecord } from '@/components/admin/forms/division-form';
import { toggleDivisionStatus } from '@/app/actions/admin-referentiels';

interface DivisionsClientProps {
  initialDivisions: DivisionRecord[];
  directionsList: { id: string; code: string; nom: string }[];
}

export function DivisionsClient({ initialDivisions, directionsList }: DivisionsClientProps) {
  const [divisions, setDivisions] = useState<DivisionRecord[]>(initialDivisions);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<DivisionRecord | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<DivisionRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const filteredDivisions = divisions.filter((div) => {
    const matchesSearch =
      div.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      div.nom.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDirection =
      directionFilter === 'ALL' || div.direction_id === directionFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && div.actif) ||
      (statusFilter === 'INACTIVE' && !div.actif);

    return matchesSearch && matchesDirection && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingDivision(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (div: DivisionRecord) => {
    setEditingDivision(div);
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
      const res = await toggleDivisionStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setDivisions((prev) =>
          prev.map((d) => (d.id === confirmTarget.id ? { ...d, actif: !d.actif } : d))
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Divisions</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion des divisions opérationnelles (Division Contrôle, Division Recoupement).
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle Division
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par code ou nom..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Direction :</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les directions</option>
              {directionsList.map((dir) => (
                <option key={dir.id} value={dir.id}>
                  {dir.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous ({divisions.length})</option>
              <option value="ACTIVE">Actifs ({divisions.filter((d) => d.actif).length})</option>
              <option value="INACTIVE">Inactifs ({divisions.filter((d) => !d.actif).length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des divisions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Nom de la Division</th>
                <th className="px-6 py-3.5">Direction de rattachement</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredDivisions.length > 0 ? (
                filteredDivisions.map((div) => (
                  <tr key={div.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {div.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {div.nom}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {div.directions ? `${div.directions.code} — ${div.directions.nom}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={div.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(div)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(div)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          div.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {div.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucune division trouvée selon les critères sélectionnés.
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
        title={editingDivision ? 'Modifier la Division' : 'Créer une Division'}
        description="Renseignez la direction de rattachement, le code et l'intitulé."
      >
        <DivisionForm
          initialData={editingDivision}
          directionsList={directionsList}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver la division' : 'Activer la division'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } la division ${confirmTarget?.code} (${confirmTarget?.nom}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
