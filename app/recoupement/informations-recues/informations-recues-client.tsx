'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { InformationRecueItem } from '@/lib/recoupement/ordonnancement-service';
import { creerInformationRecueAction, fetchInformationsRecuesAction } from '@/app/actions/recoupement-ordonnancement';
import { EmptyState } from '@/components/ui/institutional-state';

interface Props {
  initialData: { informations: InformationRecueItem[]; total: number };
  availableSecteurs: { id: string; code: string; nom: string }[];
  initialStatut: string;
  initialSearch: string;
  currentUser: {
    id: string;
    role: string;
    bureau_id: string | null;
    bureau_code: string | null;
    division_code: string | null;
    nom: string;
    prenom: string;
  };
}

const STATUT_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  A_TRAITER: { label: 'À traiter', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  EN_COURS: { label: 'En cours', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  TRAITE: { label: 'Traité', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  REJETE: { label: 'Rejeté', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
};

export function InformationsRecuesClient({
  initialData,
  availableSecteurs = [],
  initialStatut,
  initialSearch,
  currentUser: currentUser, // gardé pour usage futur (permissions UI granulaires)
}: Props) {
  const [data, setData] = useState(initialData);
  const [statut, setStatut] = useState(initialStatut);
  const [search, setSearch] = useState(initialSearch);
  const [secteurId, setSecteurId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showSimulator, setShowSimulator] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();
  const [arrival, setArrival] = useState({
    identifiant_assujetti_declare: '',
    nom_assujetti_declare: '',
    forme_juridique: '',
    adresse_declaree: '',
    secteur_id: '',
  });
  const canManage =
    ['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
    currentUser.bureau_code === 'BUR_ANA_REC';

  const handleCreateArrival = (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    startCreating(async () => {
      const result = await creerInformationRecueAction({
        ...arrival,
        secteur_id: arrival.secteur_id || null,
      });
      if (!result.success) {
        setCreateError(result.error || 'La simulation de l’arrivée a échoué.');
        return;
      }
      setShowSimulator(false);
      setArrival({ identifiant_assujetti_declare: '', nom_assujetti_declare: '', forme_juridique: '', adresse_declaree: '', secteur_id: '' });
      handleReset();
    });
  };

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await fetchInformationsRecuesAction({
        statut: (statut as 'A_TRAITER' | 'EN_COURS' | 'TRAITE' | 'REJETE') || undefined,
        search: search || undefined,
        secteur_id: secteurId || undefined,
        page: 1,
        limit: 20,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleReset = () => {
    setStatut('');
    setSearch('');
    setSecteurId('');
    startTransition(async () => {
      const res = await fetchInformationsRecuesAction({ page: 1, limit: 20 });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0a5db5]">Division Recoupement</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">Bureau Analyse et Recherche</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Arrivées d&apos;Informations du Service d&apos;assiette</h1>
          <p className="mt-1 text-xs text-slate-500">
            Source externe simulée : exploitation, vérification et établissement des fiches d&apos;ordonnancement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              type="button"
              onClick={() => setShowSimulator((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#093b78]"
            >
              {showSimulator ? 'Fermer la simulation' : 'Simuler une arrivée'}
            </button>
          )}
          <Link
            href="/recoupement/fiches-ordonnancement"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <span>📋 Registre des Fiches ({data.total})</span>
          </Link>
        </div>
      </div>

      {showSimulator && (
        <form onSubmit={handleCreateArrival} className="grid gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs sm:grid-cols-2">
          <p className="sm:col-span-2 text-slate-600">Cette simulation crée uniquement une arrivée source : ni assujetti officiel ni fiche ne sont créés automatiquement.</p>
          <input required value={arrival.identifiant_assujetti_declare} onChange={(e) => setArrival((value) => ({ ...value, identifiant_assujetti_declare: e.target.value }))} placeholder="NIF ou identifiant déclaré" className="rounded-xl border border-slate-200 bg-white p-2.5" />
          <input required value={arrival.nom_assujetti_declare} onChange={(e) => setArrival((value) => ({ ...value, nom_assujetti_declare: e.target.value }))} placeholder="Nom ou raison sociale déclarée" className="rounded-xl border border-slate-200 bg-white p-2.5" />
          <input value={arrival.forme_juridique} onChange={(e) => setArrival((value) => ({ ...value, forme_juridique: e.target.value }))} placeholder="Forme juridique (facultatif)" className="rounded-xl border border-slate-200 bg-white p-2.5" />
          <input value={arrival.adresse_declaree} onChange={(e) => setArrival((value) => ({ ...value, adresse_declaree: e.target.value }))} placeholder="Adresse déclarée (facultatif)" className="rounded-xl border border-slate-200 bg-white p-2.5" />
          <select value={arrival.secteur_id} onChange={(e) => setArrival((value) => ({ ...value, secteur_id: e.target.value }))} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <option value="">Secteur non déterminé</option>
            {availableSecteurs.map((secteur) => <option key={secteur.id} value={secteur.id}>{secteur.nom} ({secteur.code})</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isCreating} className="rounded-xl bg-[#0a5db5] px-4 py-2 font-bold text-white disabled:opacity-50">{isCreating ? 'Création…' : 'Créer l’arrivée'}</button>
            {createError && <span className="text-red-700">{createError}</span>}
          </div>
        </form>
      )}

      {/* 2. BARRE DE FILTRES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              placeholder="Rechercher par référence, assujetti, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a5db5] focus:outline-hidden"
            />
          </div>

          <div className="w-40">
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les statuts</option>
              <option value="A_TRAITER">À traiter</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITE">Traité</option>
              <option value="REJETE">Rejeté</option>
            </select>
          </div>

          <div className="w-52">
            <select
              value={secteurId}
              onChange={(e) => setSecteurId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les secteurs</option>
              {availableSecteurs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
          >
            {isPending ? 'Filtrage...' : 'Filtrer'}
          </button>

          {(statut || search || secteurId) && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Réinitialiser
            </button>
          )}
        </form>
      </div>

      {/* 3. TABLE DES INFORMATIONS REÇUES */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {data.informations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Aucune information reçue trouvée"
              description="Aucun bordereau ne correspond aux filtres sélectionnés."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Référence de réception</th>
                  <th className="px-4 py-3.5">Date de réception</th>
                  <th className="px-4 py-3.5">Assujetti déclaré</th>
                  <th className="px-4 py-3.5">NIF</th>
                  <th className="px-4 py-3.5">Secteur d&apos;activité déclaré</th>
                  <th className="px-4 py-3.5">Forme juridique</th>
                  <th className="px-4 py-3.5 text-center">Statut</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.informations.map((info) => {
                  const badge = STATUT_BADGES[info.statut] || { label: info.statut, bg: 'bg-slate-50', text: 'text-slate-700' };

                  return (
                    <tr key={info.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#0a5db5]">
                        {info.numero_reference}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {info.date_reception}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {info.nom_assujetti_declare}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                        {info.identifiant_assujetti_declare}
                      </td>

                      <td className="px-4 py-3 text-slate-800">
                        {info.secteur?.nom || info.secteur_code}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {info.forme_juridique || '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/recoupement/informations-recues/${info.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#0a5db5] hover:bg-[#0a5db5] hover:text-white transition"
                        >
                          <span>{info.statut === 'TRAITE' ? 'Consulter' : 'Traiter'}</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
