'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES DIRECTIONS
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { DirectionForm, type DirectionRecord } from '@/components/admin/forms/direction-form';
import { toggleDirectionStatus } from '@/app/actions/admin-referentiels';

export function DirectionsClient({ initialDirections }: { initialDirections: DirectionRecord[] }) {
  const [directions, setDirections] = useState<DirectionRecord[]>(initialDirections);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // État de la modal de création / édition
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDirection, setEditingDirection] = useState<DirectionRecord | null>(null);

  // État du dialogue de confirmation de bascule de statut
  const [confirmTarget, setConfirmTarget] = useState<DirectionRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Filtrage local dynamique
  const filteredDirections = directions.filter((dir) => {
    const matchesSearch =
      dir.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dir.nom.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && dir.actif) ||
      (statusFilter === 'INACTIVE' && !dir.actif);

    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingDirection(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dir: DirectionRecord) => {
    setEditingDirection(dir);
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
      const res = await toggleDirectionStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setDirections((prev) =>
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
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Directions</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion du référentiel des directions générales et techniques de la DGRAD.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle Direction
        </button>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par code ou nom..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Statut :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous ({directions.length})</option>
            <option value="ACTIVE">Actifs ({directions.filter((d) => d.actif).length})</option>
            <option value="INACTIVE">Inactifs ({directions.filter((d) => !d.actif).length})</option>
          </select>
        </div>
      </div>

      {/* Tableau des Directions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Nom complet de la Direction</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredDirections.length > 0 ? (
                filteredDirections.map((dir) => (
                  <tr key={dir.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {dir.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {dir.nom}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={dir.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(dir)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(dir)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          dir.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {dir.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucune direction trouvée selon les critères sélectionnés.
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
        title={editingDirection ? 'Modifier la Direction' : 'Créer une Direction'}
        description="Renseignez le code officiel et l'intitulé de la structure."
      >
        <DirectionForm
          initialData={editingDirection}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation de Statut */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver la direction' : 'Activer la direction'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } la direction ${confirmTarget?.code} (${confirmTarget?.nom}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
