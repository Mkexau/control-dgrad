'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  addAssujettiToAnalyseAction,
  removeAssujettiFromAnalyseAction,
  transitionAnalyseAction,
} from '@/app/actions/analyses';
import type { AnalyseItem, AssujettiItem } from '@/lib/recoupement/recoupement-service';

interface CurrentUser {
  id: string;
  role: string;
  bureau_id: string | null;
  nom: string;
  prenom: string;
}

interface Props {
  analyse: AnalyseItem;
  availableAssujettis: AssujettiItem[];
  currentUser: CurrentUser;
}

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

// Transitions autorisées selon le statut et le rôle
function getAllowedTransitions(statut: string, role: string): string[] {
  if (statut === 'BROUILLON' && (role === 'ANALYSTE' || role === 'CHEF_BUREAU')) return ['EN_COURS'];
  if (statut === 'EN_COURS' && (role === 'ANALYSTE' || role === 'CHEF_BUREAU')) return ['BROUILLON', 'VALIDEE'];
  if (statut === 'VALIDEE' && role === 'CHEF_BUREAU') return ['EN_COURS', 'CLOTUREE'];
  return [];
}

export function AnalyseDetailClient({ analyse: initialAnalyse, availableAssujettis, currentUser }: Props) {
  const [analyse, setAnalyse] = useState<AnalyseItem>(initialAnalyse);
  const [globalError, setGlobalError] = useState('');

  // Modal ajout assujetti
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    assujetti_id: '',
    montant_du: '',
    montant_paye: '',
    devise: 'CDF' as 'CDF' | 'USD',
    manque_a_gagner: '',
    priorite: '' as '' | 'HAUTE' | 'MOYENNE' | 'BASSE',
  });
  const [addError, setAddError] = useState('');
  const [addPending, startAddTransition] = useTransition();

  // Transition statut
  const [transitionPending, startTransitionT] = useTransition();
  const [transitionError, setTransitionError] = useState('');

  // Suppression assujetti
  const [removePending, startRemoveTransition] = useTransition();

  const canModify = (currentUser.role === 'ANALYSTE' || currentUser.role === 'CHEF_BUREAU') &&
    analyse.statut !== 'CLOTUREE';

  const allowedTransitions = getAllowedTransitions(analyse.statut, currentUser.role);

  // Assujettis déjà dans l'analyse
  const existingAssujettiIds = new Set((analyse.assujettis || []).map((aa) => aa.assujetti_id));
  const availableToAdd = availableAssujettis.filter((a) => !existingAssujettiIds.has(a.id));

  const handleAddAssujetti = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.assujetti_id) { setAddError('Veuillez sélectionner un assujetti.'); return; }

    startAddTransition(async () => {
      const montantDu = addForm.montant_du ? parseFloat(addForm.montant_du) : undefined;
      const montantPaye = addForm.montant_paye ? parseFloat(addForm.montant_paye) : undefined;

      const res = await addAssujettiToAnalyseAction({
        analyse_id: analyse.id,
        assujetti_id: addForm.assujetti_id,
        montant_du: montantDu,
        montant_paye: montantPaye,
        devise: addForm.devise,
        manque_a_gagner: addForm.manque_a_gagner ? parseFloat(addForm.manque_a_gagner) : undefined,
        priorite: addForm.priorite || undefined,
      });

      if (!res.success) { setAddError(res.error || 'Erreur.'); return; }

      // Recharger la page (simple: forcer le refresh)
      window.location.reload();
    });
  };

  const handleRemoveAssujetti = (assujettiId: string) => {
    startRemoveTransition(async () => {
      const res = await removeAssujettiFromAnalyseAction(analyse.id, assujettiId);
      if (!res.success) { setGlobalError(res.error || 'Erreur.'); return; }
      window.location.reload();
    });
  };

  const handleTransition = (nouveauStatut: string) => {
    setTransitionError('');
    startTransitionT(async () => {
      const res = await transitionAnalyseAction({
        analyse_id: analyse.id,
        nouveau_statut: nouveauStatut as AnalyseItem['statut'],
      });
      if (!res.success) { setTransitionError(res.error || 'Erreur lors du changement de statut.'); return; }
      if (res.data) setAnalyse(res.data);
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/analyses" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Analyses</Link>
        <span>›</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">Dossier du {analyse.date}</span>
      </nav>

      {/* En-tête */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Analyse du {analyse.date}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[analyse.statut]}`}>
                {STATUT_LABELS[analyse.statut]}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="text-zinc-500 inline">Bureau : </dt>
                <dd className="inline font-medium">{(analyse.bureau as { nom?: string } | null)?.nom || '—'}</dd>
              </div>
              {analyse.auteur && (
                <div>
                  <dt className="text-zinc-500 inline">Auteur : </dt>
                  <dd className="inline">{(analyse.auteur as { prenom?: string; nom?: string }).prenom} {(analyse.auteur as { prenom?: string; nom?: string }).nom}</dd>
                </div>
              )}
              {analyse.observations && (
                <div className="col-span-2">
                  <dt className="text-zinc-500 inline">Observations : </dt>
                  <dd className="inline">{analyse.observations}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions de transition */}
          {allowedTransitions.length > 0 && (
            <div className="flex flex-col gap-2">
              {allowedTransitions.map((statut) => (
                <button
                  key={statut}
                  type="button"
                  onClick={() => handleTransition(statut)}
                  disabled={transitionPending}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {transitionPending ? '…' : `→ ${STATUT_LABELS[statut]}`}
                </button>
              ))}
              {transitionError && <p className="text-xs text-red-600 dark:text-red-400">{transitionError}</p>}
            </div>
          )}
        </div>
      </div>

      {globalError && (
        <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
          {globalError}
        </div>
      )}

      {/* Assujettis ciblés */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Assujettis ciblés ({(analyse.assujettis || []).length})
          </h2>
          {canModify && (
            <button
              type="button"
              onClick={() => { setAddForm({ assujetti_id: '', montant_du: '', montant_paye: '', devise: 'CDF', manque_a_gagner: '', priorite: '' }); setAddError(''); setShowAddModal(true); }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              + Ajouter un assujetti
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {(analyse.assujettis || []).length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              Aucun assujetti ciblé. {canModify && "Ajoutez-en un pour commencer l'analyse."}
            </div>
          ) : (
            (analyse.assujettis || []).map((aa) => (
              <div key={aa.assujetti_id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/recoupement/assujettis/${aa.assujetti_id}`} className="font-bold text-[#0a5db5] hover:underline text-sm">
                      {aa.assujetti?.nom_raison_sociale || aa.assujetti_id}
                    </Link>
                    {aa.assujetti?.identifiant && (
                      <span className="font-mono text-xs text-slate-500">({aa.assujetti.identifiant})</span>
                    )}
                    {aa.priorite && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${aa.priorite === 'HAUTE' ? 'bg-red-100 text-red-700' : aa.priorite === 'MOYENNE' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {aa.priorite}
                      </span>
                    )}
                  </div>
                  {aa.montant_du !== null && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 space-x-3">
                      {aa.montant_du !== null && <span>Dû : <strong>{new Intl.NumberFormat('fr-CD').format(aa.montant_du)} {aa.devise}</strong></span>}
                      {aa.montant_paye !== null && <span>Payé : {new Intl.NumberFormat('fr-CD').format(aa.montant_paye)} {aa.devise}</span>}
                      {aa.montant_restant !== null && <span className="font-semibold text-orange-600">Restant : {new Intl.NumberFormat('fr-CD').format(aa.montant_restant)} {aa.devise}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/recoupement/assujettis/${aa.assujetti_id}`}
                    className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-[#0a5db5] hover:bg-blue-100 transition"
                  >
                    📋 Préparer Fiche
                  </Link>
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssujetti(aa.assujetti_id)}
                      disabled={removePending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors px-2 py-1"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal ajout assujetti */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Ajouter un assujetti</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">✕</button>
            </div>
            <form onSubmit={handleAddAssujetti} className="px-6 py-5 space-y-4">
              {addError && <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg">{addError}</div>}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Assujetti <span className="text-red-500">*</span></label>
                <select
                  value={addForm.assujetti_id}
                  onChange={(e) => setAddForm({ ...addForm, assujetti_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">— Sélectionner —</option>
                  {availableToAdd.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom_raison_sociale} ({a.identifiant})</option>
                  ))}
                </select>
                {availableToAdd.length === 0 && <p className="text-xs text-zinc-500 mt-1">Tous les assujettis de votre périmètre sont déjà ajoutés.</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Devise <span className="text-red-500">*</span></label>
                <select
                  value={addForm.devise}
                  onChange={(e) => setAddForm({ ...addForm, devise: e.target.value as 'CDF' | 'USD' })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Montant dû</label>
                  <input type="number" min={0} step="0.01" value={addForm.montant_du} onChange={(e) => setAddForm({ ...addForm, montant_du: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Montant payé</label>
                  <input type="number" min={0} step="0.01" value={addForm.montant_paye} onChange={(e) => setAddForm({ ...addForm, montant_paye: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Manque à gagner</label>
                  <input type="number" min={0} step="0.01" value={addForm.manque_a_gagner} onChange={(e) => setAddForm({ ...addForm, manque_a_gagner: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Priorité</label>
                  <select value={addForm.priorite} onChange={(e) => setAddForm({ ...addForm, priorite: e.target.value as '' | 'HAUTE' | 'MOYENNE' | 'BASSE' })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
                    <option value="">— Non définie —</option>
                    <option value="HAUTE">Haute</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="BASSE">Basse</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Annuler</button>
                <button type="submit" disabled={addPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60">{addPending ? 'Ajout…' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
