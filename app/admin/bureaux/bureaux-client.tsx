'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES BUREAUX
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { BureauForm, type BureauRecord } from '@/components/admin/forms/bureau-form';
import { toggleBureauStatus } from '@/app/actions/admin-referentiels';

interface BureauxClientProps {
  initialBureaux: BureauRecord[];
  divisionsList: { id: string; code: string; nom: string }[];
}

export function BureauxClient({ initialBureaux, divisionsList }: BureauxClientProps) {
  const [bureaux, setBureaux] = useState<BureauRecord[]>(initialBureaux);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBureau, setEditingBureau] = useState<BureauRecord | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<BureauRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const filteredBureaux = bureaux.filter((bur) => {
    const matchesSearch =
      bur.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bur.nom.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision =
      divisionFilter === 'ALL' || bur.division_id === divisionFilter;

    const matchesType =
      typeFilter === 'ALL' || bur.type === typeFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && bur.actif) ||
      (statusFilter === 'INACTIVE' && !bur.actif);

    return matchesSearch && matchesDivision && matchesType && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingBureau(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bur: BureauRecord) => {
    setEditingBureau(bur);
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
      const res = await toggleBureauStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setBureaux((prev) =>
          prev.map((b) => (b.id === confirmTarget.id ? { ...b, actif: !b.actif } : b))
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bureaux</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion des 8 bureaux (6 bureaux de contrôle sectoriel et 2 bureaux de recoupement).
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau Bureau
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full lg:w-72 relative">
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

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Division :</span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les divisions</option>
              {divisionsList.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les types</option>
              <option value="CONTROLE">CONTRÔLE</option>
              <option value="RECOUPEMENT">RECOUPEMENT</option>
              <option value="ADMINISTRATIF">ADMINISTRATIF</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous ({bureaux.length})</option>
              <option value="ACTIVE">Actifs ({bureaux.filter((b) => b.actif).length})</option>
              <option value="INACTIVE">Inactifs ({bureaux.filter((b) => !b.actif).length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des bureaux */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Nom du Bureau</th>
                <th className="px-6 py-3.5">Division</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredBureaux.length > 0 ? (
                filteredBureaux.map((bur) => (
                  <tr key={bur.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {bur.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {bur.nom}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {bur.divisions ? `${bur.divisions.code} — ${bur.divisions.nom}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {bur.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={bur.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(bur)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(bur)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          bur.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {bur.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucun bureau trouvé selon les critères sélectionnés.
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
        title={editingBureau ? 'Modifier le Bureau' : 'Créer un Bureau'}
        description="Renseignez la division de rattachement, le code, l'intitulé et le type opérationnel."
      >
        <BureauForm
          initialData={editingBureau}
          divisionsList={divisionsList}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver le bureau' : 'Activer le bureau'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } le bureau ${confirmTarget?.code} (${confirmTarget?.nom}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
