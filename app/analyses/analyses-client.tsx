'use client';

import React, { useState, useTransition } from 'react';
import {
  fetchAnalysesAction,
  createAnalyseAction,
} from '@/app/actions/analyses';
import type { AnalyseItem } from '@/lib/recoupement/recoupement-service';
import { EmptyState } from '@/components/ui/institutional-state';
import { Modal } from '@/components/ui/modal';

interface Bureau {
  id: string;
  code: string;
  nom: string;
}

interface CurrentUser {
  id: string;
  role: string;
  bureau_id: string | null;
  nom: string;
  prenom: string;
}

interface Props {
  currentUser: CurrentUser;
  availableBureaux: Bureau[];
  initialData: { analyses: AnalyseItem[]; total: number };
}

const ROLES_CREATION = ['ANALYSTE', 'CHEF_BUREAU'];

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  VALIDEE: 'Validée',
  CLOTUREE: 'Clôturée',
};

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  EN_COURS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  VALIDEE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CLOTUREE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export function AnalysesClient({ currentUser, availableBureaux, initialData }: Props) {
  const [analyses, setAnalyses] = useState<AnalyseItem[]>(initialData.analyses);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(1);
  const [statutFilter, setStatutFilter] = useState('');
  const [bureauFilter, setBureauFilter] = useState('');
  const [isLoading, startTransition] = useTransition();

  // Modal création
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    bureau_id: currentUser.bureau_id || '',
    secteur_id: '',
    observations: '',
  });
  const [formError, setFormError] = useState('');
  const [formPending, startFormTransition] = useTransition();

  const canCreate = ROLES_CREATION.includes(currentUser.role);
  const limit = 20;

  const loadData = (p: number, statut: string, bureau: string) => {
    startTransition(async () => {
      const res = await fetchAnalysesAction({
        page: p,
        limit,
        statut: (statut as AnalyseItem['statut']) || undefined,
        bureau_id: bureau || undefined,
      });
      if (res.success && res.data) {
        setAnalyses(res.data.analyses);
        setTotal(res.data.total);
      }
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    startFormTransition(async () => {
      const res = await createAnalyseAction({
        bureau_id: formData.bureau_id,
        secteur_id: formData.secteur_id || null,
        observations: formData.observations || null,
      });
      if (!res.success) {
        setFormError(res.error || 'Erreur inconnue.');
        return;
      }
      setShowModal(false);
      loadData(1, statutFilter, bureauFilter);
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dossiers d&apos;analyse</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} dossier{total !== 1 ? 's' : ''} dans votre périmètre
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setFormData({ bureau_id: currentUser.bureau_id || '', secteur_id: '', observations: '' }); setFormError(''); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <span>+</span> Nouveau dossier
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statutFilter}
          onChange={(e) => { setStatutFilter(e.target.value); setPage(1); loadData(1, e.target.value, bureauFilter); }}
          className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {availableBureaux.length > 1 && (
          <select
            value={bureauFilter}
            onChange={(e) => { setBureauFilter(e.target.value); setPage(1); loadData(1, statutFilter, e.target.value); }}
            className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les bureaux</option>
            {availableBureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        )}
      </div>

      {/* Liste */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500" role="status">Chargement des dossiers…</div>
        ) : analyses.length === 0 ? (
          <EmptyState
            title="Aucun dossier d’analyse"
            description="Les dossiers accessibles dans votre périmètre apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Bureau</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Auteur</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Assujettis</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.date}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{(a.bureau as { nom?: string } | null)?.nom || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {a.auteur ? `${(a.auteur as { prenom?: string }).prenom || ''} ${(a.auteur as { nom?: string }).nom || ''}`.trim() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {a.assujettis_count ?? 0} assujetti{(a.assujettis_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[a.statut] || STATUT_COLORS.BROUILLON}`}>
                        {STATUT_LABELS[a.statut] || a.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/analyses/${a.id}`} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        Détail
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { const p = page - 1; setPage(p); loadData(p, statutFilter, bureauFilter); }} disabled={page <= 1} className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Précédent</button>
              <button type="button" onClick={() => { const p = page + 1; setPage(p); loadData(p, statutFilter, bureauFilter); }} disabled={page >= totalPages} className="px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal création */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau dossier d'analyse"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Bureau <span className="text-red-500">*</span></label>
            <select
              value={formData.bureau_id}
              onChange={(e) => setFormData({ ...formData, bureau_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">— Sélectionner —</option>
              {availableBureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observations initiales</label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">Annuler</button>
            <button type="submit" disabled={formPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer">{formPending ? 'Création…' : 'Créer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
