'use client';

import React, { useState, useTransition } from 'react';
import {
  fetchAssujettisAction,
  createAssujettiAction,
  updateAssujettiAction,
  type ActionResponse,
} from '@/app/actions/assujettis';
import type { AssujettiItem } from '@/lib/recoupement/recoupement-service';

interface Secteur {
  id: string;
  code: string;
  nom: string;
  bureau_id: string;
  bureaux?: { id: string; code: string; nom: string } | null;
}

interface CurrentUser {
  id: string;
  role: string;
  bureau_id: string | null;
  bureau_code?: string | null;
  division_code?: string | null;
  nom: string;
  prenom: string;
}

interface AssujettisClientProps {
  currentUser: CurrentUser;
  availableSecteurs: Secteur[];
  initialData: { assujettis: AssujettiItem[]; total: number };
}

const ROLES_ECRITURE = ['ANALYSTE', 'CHEF_BUREAU'];

export function AssujettisClient({
  currentUser,
  availableSecteurs,
  initialData,
}: AssujettisClientProps) {
  const [assujettis, setAssujettis] = useState<AssujettiItem[]>(initialData.assujettis);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [secteurFilter, setSecteurFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, startTransition] = useTransition();

  // Modal de création / modification
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AssujettiItem | null>(null);
  const [formData, setFormData] = useState({
    type: 'PERSONNE_MORALE' as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE',
    identifiant: '',
    nom_raison_sociale: '',
    adresse: '',
    email: '',
    telephone: '',
    secteur_principal_id: '',
  });
  const [formError, setFormError] = useState('');
  const [formPending, startFormTransition] = useTransition();

  const canWrite = ROLES_ECRITURE.includes(currentUser.role);
  const hasNationalDirectoryAccess = currentUser.bureau_code === 'BUR_ANA_REC';
  const limit = 20;

  const loadData = (p: number, s: string, secteur: string, type: string) => {
    startTransition(async () => {
      const res = await fetchAssujettisAction({
        page: p,
        limit,
        search: s || undefined,
        secteur_id: secteur || undefined,
        type: (type as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE') || undefined,
      });
      if (res.success && res.data) {
        setAssujettis(res.data.assujettis);
        setTotal(res.data.total);
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData(1, search, secteurFilter, typeFilter);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, search, secteurFilter, typeFilter);
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData({
      type: 'PERSONNE_MORALE',
      identifiant: '',
      nom_raison_sociale: '',
      adresse: '',
      email: '',
      telephone: '',
      secteur_principal_id: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (a: AssujettiItem) => {
    setEditTarget(a);
    setFormData({
      type: a.type,
      identifiant: a.identifiant,
      nom_raison_sociale: a.nom_raison_sociale,
      adresse: a.adresse || '',
      email: a.email || '',
      telephone: a.telephone || '',
      secteur_principal_id: a.secteur_principal_id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    startFormTransition(async () => {
      let res: ActionResponse<AssujettiItem>;
      if (editTarget) {
        res = await updateAssujettiAction({
          id: editTarget.id,
          ...formData,
          secteur_principal_id: formData.secteur_principal_id || null,
          adresse: formData.adresse || null,
          email: formData.email || null,
          telephone: formData.telephone || null,
        });
      } else {
        res = await createAssujettiAction({
          ...formData,
          secteur_principal_id: formData.secteur_principal_id || null,
          adresse: formData.adresse || null,
          email: formData.email || null,
          telephone: formData.telephone || null,
        });
      }

      if (!res.success) {
        setFormError(res.error || 'Erreur inconnue.');
        return;
      }

      setShowModal(false);
      loadData(page, search, secteurFilter, typeFilter);
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Assujettis</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} assujetti{total !== 1 ? 's' : ''}{' '}
            {hasNationalDirectoryAccess ? 'dans le répertoire national' : 'dans votre périmètre'}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <span>+</span> Nouvel assujetti
          </button>
        )}
      </div>

      {/* Filtres */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher (nom, NIF…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={secteurFilter}
          onChange={(e) => {
            setSecteurFilter(e.target.value);
            setPage(1);
            loadData(1, search, e.target.value, typeFilter);
          }}
          className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les secteurs</option>
          {availableSecteurs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
            loadData(1, search, secteurFilter, e.target.value);
          }}
          className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          <option value="PERSONNE_MORALE">Personne morale</option>
          <option value="PERSONNE_PHYSIQUE">Personne physique</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Rechercher
        </button>
      </form>

      {/* Tableau */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">Chargement…</div>
        ) : assujettis.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">Aucun assujetti trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Identifiant</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Nom / Raison sociale</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Secteur</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {assujettis.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{a.identifiant}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{a.nom_raison_sociale}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.type === 'PERSONNE_MORALE'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                        }`}
                      >
                        {a.type === 'PERSONNE_MORALE' ? 'Morale' : 'Physique'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                      {a.secteur?.nom || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.actif
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {a.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/assujettis/${a.id}`}
                          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Détail
                        </a>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          >
                            Modifier
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création / modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {editTarget ? "Modifier l'assujetti" : "Nouvel assujetti"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE' })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="PERSONNE_MORALE">Personne morale</option>
                    <option value="PERSONNE_PHYSIQUE">Personne physique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Identifiant (NIF/RCCM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.identifiant}
                    onChange={(e) => setFormData({ ...formData, identifiant: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom / Raison sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom_raison_sociale}
                  onChange={(e) => setFormData({ ...formData, nom_raison_sociale: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Secteur d&apos;activité
                </label>
                <select
                  value={formData.secteur_principal_id}
                  onChange={(e) => setFormData({ ...formData, secteur_principal_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Non rattaché —</option>
                  {availableSecteurs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Adresse
                </label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {formPending ? 'Enregistrement…' : editTarget ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
