'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { createNotePerceptionAction, createOrdonnancementAction } from '@/app/actions/recoupement';
import { updateAssujettiAction } from '@/app/actions/assujettis';
import type { AssujettiItem, NotePerceptionItem, OrdonnancementItem, RecoupementSynthese } from '@/lib/recoupement/recoupement-service';

const ROLES_ECRITURE = ['ANALYSTE', 'CHEF_BUREAU'];

interface CurrentUser {
  id: string;
  role: string;
  bureau_id: string | null;
  nom: string;
  prenom: string;
}

interface Props {
  assujetti: AssujettiItem;
  notes: NotePerceptionItem[];
  ordonnancements: OrdonnancementItem[];
  synthese: RecoupementSynthese | null;
  currentUser: CurrentUser;
}

type ActiveTab = 'recap' | 'notes' | 'ordonnancements';

export function AssujettiDetailClient({ assujetti, notes: initialNotes, ordonnancements: initialOrds, synthese, currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recap');
  const [notes, setNotes] = useState(initialNotes);
  const [ordonnancements, setOrds] = useState(initialOrds);

  // Modal note de perception
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ numero: '', date: '', acte_generateur: '', article_budgetaire: '', nombre_actes: 1, montant: 0, devise: 'CDF' as 'CDF' | 'USD' });
  const [noteError, setNoteError] = useState('');
  const [notePending, startNoteTransition] = useTransition();

  // Modal ordonnancement
  const [showOrdModal, setShowOrdModal] = useState(false);
  const [ordForm, setOrdForm] = useState({ numero: '', date: '', montant: 0, devise: 'CDF' as 'CDF' | 'USD', statut: 'ORDONNANCE' });
  const [ordError, setOrdError] = useState('');
  const [ordPending, startOrdTransition] = useTransition();

  const canWrite = ROLES_ECRITURE.includes(currentUser.role);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError('');
    startNoteTransition(async () => {
      const res = await createNotePerceptionAction({ ...noteForm, assujetti_id: assujetti.id });
      if (!res.success) { setNoteError(res.error || 'Erreur.'); return; }
      if (res.data) setNotes((prev) => [res.data!, ...prev]);
      setShowNoteModal(false);
    });
  };

  const handleCreateOrd = (e: React.FormEvent) => {
    e.preventDefault();
    setOrdError('');
    startOrdTransition(async () => {
      const res = await createOrdonnancementAction({ ...ordForm, assujetti_id: assujetti.id });
      if (!res.success) { setOrdError(res.error || 'Erreur.'); return; }
      if (res.data) setOrds((prev) => [res.data!, ...prev]);
      setShowOrdModal(false);
    });
  };

  const fmtMontant = (v: number, devise: string) =>
    `${new Intl.NumberFormat('fr-CD').format(v)} ${devise}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/assujettis" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          Assujettis
        </Link>
        <span>›</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{assujetti.nom_raison_sociale}</span>
      </nav>

      {/* En-tête de la fiche */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{assujetti.nom_raison_sociale}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${assujetti.actif ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-zinc-100 text-zinc-500'}`}>
                {assujetti.actif ? 'Actif' : 'Inactif'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${assujetti.type === 'PERSONNE_MORALE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'}`}>
                {assujetti.type === 'PERSONNE_MORALE' ? 'Personne morale' : 'Personne physique'}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><dt className="text-zinc-500 inline">Identifiant : </dt><dd className="font-mono inline">{assujetti.identifiant}</dd></div>
              {assujetti.secteur && <div><dt className="text-zinc-500 inline">Secteur : </dt><dd className="inline">{assujetti.secteur.nom}</dd></div>}
              {assujetti.email && <div><dt className="text-zinc-500 inline">Email : </dt><dd className="inline">{assujetti.email}</dd></div>}
              {assujetti.telephone && <div><dt className="text-zinc-500 inline">Tél. : </dt><dd className="inline">{assujetti.telephone}</dd></div>}
              {assujetti.adresse && <div className="col-span-2"><dt className="text-zinc-500 inline">Adresse : </dt><dd className="inline">{assujetti.adresse}</dd></div>}
            </dl>
          </div>
        </div>
      </div>

      {/* Synthèse recoupement */}
      {synthese && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['cdf', 'usd'] as const).map((dev) => {
            const d = synthese[dev];
            const devLabel = dev.toUpperCase();
            return (
              <div key={dev} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recoupement {devLabel}</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-zinc-600 dark:text-zinc-400">Notes de perception</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{fmtMontant(d.totalNotes, devLabel)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-zinc-600 dark:text-zinc-400">Ordonnancements</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{fmtMontant(d.totalOrdonnancements, devLabel)}</dd>
                  </div>
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex justify-between text-sm font-semibold">
                    <dt className={d.solde < 0 ? 'text-red-600' : 'text-green-700 dark:text-green-400'}>Solde</dt>
                    <dd className={d.solde < 0 ? 'text-red-600' : 'text-green-700 dark:text-green-400'}>{fmtMontant(d.solde, devLabel)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* Onglets */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 flex">
          {([['recap', 'Récapitulatif'], ['notes', `Notes de perception (${notes.length})`], ['ordonnancements', `Ordonnancements (${ordonnancements.length})`]] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Onglet récapitulatif */}
          {activeTab === 'recap' && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>Dossier créé le {new Date(assujetti.created_at).toLocaleDateString('fr-FR')}.</p>
              <p>Dernière mise à jour le {new Date(assujetti.updated_at).toLocaleDateString('fr-FR')}.</p>
               {assujetti.secteur?.bureau && (
                 <p>Bureau compétent : <strong className="text-zinc-800 dark:text-zinc-200">{assujetti.secteur.bureau.nom}</strong></p>
              )}
            </div>
          )}

          {/* Onglet notes */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {canWrite && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setNoteForm({ numero: '', date: '', acte_generateur: '', article_budgetaire: '', nombre_actes: 1, montant: 0, devise: 'CDF' }); setNoteError(''); setShowNoteModal(true); }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    + Nouvelle note
                  </button>
                </div>
              )}
              {notes.length === 0 ? (
                <p className="text-center text-zinc-400 py-8">Aucune note de perception enregistrée.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Numéro</th>
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Date</th>
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Acte générateur</th>
                      <th className="pb-2 text-right text-xs font-medium text-zinc-500">Montant</th>
                      <th className="pb-2 text-right text-xs font-medium text-zinc-500">Devise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {notes.map((n) => (
                      <tr key={n.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2 font-mono text-xs">{n.numero}</td>
                        <td className="py-2 text-zinc-600">{n.date}</td>
                        <td className="py-2 text-zinc-600">{n.acte_generateur}</td>
                        <td className="py-2 text-right font-medium">{new Intl.NumberFormat('fr-CD').format(n.montant)}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${n.devise === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{n.devise}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Onglet ordonnancements */}
          {activeTab === 'ordonnancements' && (
            <div className="space-y-4">
              {canWrite && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setOrdForm({ numero: '', date: '', montant: 0, devise: 'CDF', statut: 'ORDONNANCE' }); setOrdError(''); setShowOrdModal(true); }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    + Nouvel ordonnancement
                  </button>
                </div>
              )}
              {ordonnancements.length === 0 ? (
                <p className="text-center text-zinc-400 py-8">Aucun ordonnancement enregistré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Numéro</th>
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Date</th>
                      <th className="pb-2 text-left text-xs font-medium text-zinc-500">Statut</th>
                      <th className="pb-2 text-right text-xs font-medium text-zinc-500">Montant</th>
                      <th className="pb-2 text-right text-xs font-medium text-zinc-500">Devise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {ordonnancements.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2 font-mono text-xs">{o.numero}</td>
                        <td className="py-2 text-zinc-600">{o.date}</td>
                        <td className="py-2 text-zinc-600">{o.statut}</td>
                        <td className="py-2 text-right font-medium">{new Intl.NumberFormat('fr-CD').format(o.montant)}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${o.devise === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{o.devise}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal note de perception */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Nouvelle note de perception</h2>
              <button type="button" onClick={() => setShowNoteModal(false)} className="text-zinc-400 hover:text-zinc-700">✕</button>
            </div>
            <form onSubmit={handleCreateNote} className="px-6 py-5 space-y-4">
              {noteError && <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg">{noteError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Numéro <span className="text-red-500">*</span></label>
                  <input type="text" value={noteForm.numero} onChange={(e) => setNoteForm({ ...noteForm, numero: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required minLength={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={noteForm.date} onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Acte générateur <span className="text-red-500">*</span></label>
                <input type="text" value={noteForm.acte_generateur} onChange={(e) => setNoteForm({ ...noteForm, acte_generateur: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required minLength={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Montant <span className="text-red-500">*</span></label>
                  <input type="number" min={0} step="0.01" value={noteForm.montant} onChange={(e) => setNoteForm({ ...noteForm, montant: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Devise <span className="text-red-500">*</span></label>
                  <select value={noteForm.devise} onChange={(e) => setNoteForm({ ...noteForm, devise: e.target.value as 'CDF' | 'USD' })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors">Annuler</button>
                <button type="submit" disabled={notePending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60">{notePending ? 'Enregistrement…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ordonnancement */}
      {showOrdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Nouvel ordonnancement</h2>
              <button type="button" onClick={() => setShowOrdModal(false)} className="text-zinc-400 hover:text-zinc-700">✕</button>
            </div>
            <form onSubmit={handleCreateOrd} className="px-6 py-5 space-y-4">
              {ordError && <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-lg">{ordError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Numéro <span className="text-red-500">*</span></label>
                  <input type="text" value={ordForm.numero} onChange={(e) => setOrdForm({ ...ordForm, numero: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required minLength={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={ordForm.date} onChange={(e) => setOrdForm({ ...ordForm, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Montant <span className="text-red-500">*</span></label>
                  <input type="number" min={0} step="0.01" value={ordForm.montant} onChange={(e) => setOrdForm({ ...ordForm, montant: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Devise <span className="text-red-500">*</span></label>
                  <select value={ordForm.devise} onChange={(e) => setOrdForm({ ...ordForm, devise: e.target.value as 'CDF' | 'USD' })} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowOrdModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors">Annuler</button>
                <button type="submit" disabled={ordPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-60">{ordPending ? 'Enregistrement…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
