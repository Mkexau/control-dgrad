'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES SECTEURS D'ACTIVITÉ
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { SecteurForm, type SecteurRecord } from '@/components/admin/forms/secteur-form';
import { toggleSecteurStatus } from '@/app/actions/admin-referentiels';

interface SecteursClientProps {
  initialSecteurs: SecteurRecord[];
  bureauxList: { id: string; code: string; nom: string }[];
}

export function SecteursClient({ initialSecteurs, bureauxList }: SecteursClientProps) {
  const [secteurs, setSecteurs] = useState<SecteurRecord[]>(initialSecteurs);
  const [searchQuery, setSearchQuery] = useState('');
  const [bureauFilter, setBureauFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSecteur, setEditingSecteur] = useState<SecteurRecord | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<SecteurRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const filteredSecteurs = secteurs.filter((sec) => {
    const matchesSearch =
      sec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.nom.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBureau =
      bureauFilter === 'ALL' || sec.bureau_id === bureauFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && sec.actif) ||
      (statusFilter === 'INACTIVE' && !sec.actif);

    return matchesSearch && matchesBureau && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingSecteur(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sec: SecteurRecord) => {
    setEditingSecteur(sec);
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
      const res = await toggleSecteurStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setSecteurs((prev) =>
          prev.map((s) => (s.id === confirmTarget.id ? { ...s, actif: !s.actif } : s))
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Secteurs d&apos;activité</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestion des 36 secteurs d&apos;activité de contrôle économique (modélisation de travail).
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau Secteur
        </button>
      </div>

      {/* Note d'information projet */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Information référentiel :</strong> Ces 36 secteurs constituent les données de référence initiales du projet universitaire. Ils restent entièrement modifiables et paramétrables par l&apos;administrateur.
        </span>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un secteur..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous ({secteurs.length})</option>
              <option value="ACTIVE">Actifs ({secteurs.filter((s) => s.actif).length})</option>
              <option value="INACTIVE">Inactifs ({secteurs.filter((s) => !s.actif).length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des secteurs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Intitulé du Secteur</th>
                <th className="px-6 py-3.5">Bureau compétent</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredSecteurs.length > 0 ? (
                filteredSecteurs.map((sec) => (
                  <tr key={sec.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {sec.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {sec.nom}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {sec.bureaux ? `${sec.bureaux.code} — ${sec.bureaux.nom}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={sec.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(sec)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(sec)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          sec.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {sec.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucun secteur trouvé selon les critères sélectionnés.
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
        title={editingSecteur ? 'Modifier le Secteur' : 'Créer un Secteur'}
        description="Renseignez le bureau compétent, le code et l'intitulé du secteur."
      >
        <SecteurForm
          initialData={editingSecteur}
          bureauxList={bureauxList}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver le secteur' : 'Activer le secteur'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } le secteur ${confirmTarget?.code} (${confirmTarget?.nom}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
