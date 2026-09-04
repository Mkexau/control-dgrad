'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import {
  fetchFichesOrdonnancementAction,
  transmettreFicheDivisionControleAction,
  transmettreFichesDivisionControleAction,
  transmettreToutesFichesDivisionControleAction,
} from '@/app/actions/recoupement-ordonnancement';
import { EmptyState } from '@/components/ui/institutional-state';

interface Props {
  initialData: { fiches: FicheOrdonnancementItem[]; total: number };
  availableBureaux: { id: string; code: string; nom: string }[];
  availableSecteurs: { id: string; code: string; nom: string; bureau_id: string }[];
  counts: { nonTransmises: number; transmises: number };
  initialStatutTransmission: string;
  initialSearch: string;
  initialBureauId: string;
  initialSecteurId: string;
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

export function FichesClient({
  initialData,
  availableBureaux = [],
  availableSecteurs = [],
  counts: initialCounts,
  initialStatutTransmission,
  initialSearch,
  initialBureauId,
  initialSecteurId,
  currentUser,
}: Props) {
  const [data, setData] = useState(initialData);
  const [statutTransmission, setStatutTransmission] = useState(initialStatutTransmission);
  const [search, setSearch] = useState(initialSearch);
  const [bureauId, setBureauId] = useState(initialBureauId);
  const [secteurId, setSecteurId] = useState(initialSecteurId);
  const [counts, setCounts] = useState(initialCounts);
  const [isPending, startTransition] = useTransition();
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [isTransmitting, startTransmitting] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const isBureauAnalyse =
    (['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
      (currentUser.bureau_code === 'BUR_ANA_REC' || currentUser.division_code === 'DIV_REC')) ||
    (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_REC') ||
    ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'].includes(currentUser.role);

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await fetchFichesOrdonnancementAction({
        statut_transmission: (statutTransmission as 'CONSERVEE_BUREAU' | 'TRANSMIS_DIVISION_CONTROLE') || undefined,
        bureau_id: bureauId || undefined,
        secteur_id: secteurId || undefined,
        search: search || undefined,
        page: 1,
        limit: 20,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleReset = () => {
    setStatutTransmission('CONSERVEE_BUREAU');
    setSearch('');
    setBureauId('');
    setSecteurId('');
    startTransition(async () => {
      const res = await fetchFichesOrdonnancementAction({ statut_transmission: 'CONSERVEE_BUREAU', page: 1, limit: 20 });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleEnvoyerAuControle = (ficheId: string) => {
    setTransmittingId(ficheId);
    startTransmitting(async () => {
      const res = await transmettreFicheDivisionControleAction(ficheId);
      if (res.success && res.data) {
        setCounts((previous) => ({
          nonTransmises: Math.max(0, previous.nonTransmises - 1),
          transmises: previous.transmises + 1,
        }));
        setData((prev) => ({
          ...prev,
          fiches: prev.fiches.map((f) =>
            f.id === ficheId ? { ...f, statut_transmission: 'TRANSMIS_DIVISION_CONTROLE' as const } : f
          ),
        }));
      }
      setTransmittingId(null);
    });
  };

  const fichesTransmissibles = data.fiches.filter((fiche) => fiche.statut_transmission === 'CONSERVEE_BUREAU');
  const toggleSelection = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const transmettreSelection = () => {
    if (!selectedIds.length) return;
    setBatchMessage(null);
    startTransmitting(async () => {
      const res = await transmettreFichesDivisionControleAction(selectedIds);
      if (!res.success || !res.data) {
        setBatchMessage(res.error || 'Transmission impossible.');
        return;
      }
      setBatchMessage(`${res.data.count} fiche(s) transmise(s) avec succès.`);
      setSelectedIds([]);
      setCounts((previous) => ({
        nonTransmises: Math.max(0, previous.nonTransmises - res.data!.count),
        transmises: previous.transmises + res.data!.count,
      }));
      setData((previous) => ({ ...previous, total: statutTransmission === 'CONSERVEE_BUREAU' ? Math.max(0, previous.total - res.data!.count) : previous.total, fiches: previous.fiches.filter((fiche) => !res.data!.transmittedIds.includes(fiche.id)) }));
    });
  };

  const transmettreToutes = () => {
    if (!counts.nonTransmises) return;
    setBatchMessage(null);
    startTransmitting(async () => {
      const res = await transmettreToutesFichesDivisionControleAction();
      if (!res.success || !res.data) {
        setBatchMessage(res.error || 'Transmission globale impossible.');
        return;
      }
      setBatchMessage(`${res.data.count} fiche(s) non transmise(s) ont été transmises avec succès.`);
      setSelectedIds([]);
      setCounts((previous) => ({ nonTransmises: Math.max(0, previous.nonTransmises - res.data!.count), transmises: previous.transmises + res.data!.count }));
      setData((previous) => {
        if (statutTransmission === 'CONSERVEE_BUREAU') return { fiches: [], total: 0 };
        return {
          ...previous,
          fiches: previous.fiches.map((fiche) => res.data!.transmittedIds.includes(fiche.id)
            ? { ...fiche, statut_transmission: 'TRANSMIS_DIVISION_CONTROLE' as const }
            : fiche),
        };
      });
    });
  };

  const filteredSecteurs = bureauId
    ? availableSecteurs.filter((secteur) => secteur.bureau_id === bureauId)
    : availableSecteurs;

  return (
    <div className="space-y-6 pb-12">
      {/* EN-TÊTE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0a5db5]">Ordonnancement</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">Bureau Analyse et Recoupement</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Fiches d&apos;ordonnancement
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Préparation, suivi et transmission des fiches d&apos;ordonnancement vers les bureaux de contrôle compétents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/recoupement/assujettis"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <span>◈ Répertoire des assujettis</span>
          </Link>
          <Link href="/recoupement/assujettis?filtre=SANS_FICHE" className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition">
            <span>📝 Préparer une fiche</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Non transmises</p><p className="mt-1 text-2xl font-extrabold text-[#0a5db5]">{counts.nonTransmises}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Transmises</p><p className="mt-1 text-2xl font-extrabold text-purple-700">{counts.transmises}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{counts.nonTransmises + counts.transmises}</p></div>
      </div>

      {isBureauAnalyse && counts.nonTransmises > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs">
          <span className="font-bold text-[#093b78]">{selectedIds.length} fiche(s) sélectionnée(s)</span>
          {fichesTransmissibles.length > 0 && <button type="button" onClick={() => setSelectedIds(fichesTransmissibles.map((fiche) => fiche.id))} className="font-semibold text-[#0a5db5] hover:underline">Sélectionner tout (page)</button>}
          <button type="button" onClick={() => setSelectedIds([])} className="font-semibold text-slate-600 hover:underline">Désélectionner tout</button>
          <button type="button" disabled={!selectedIds.length || isTransmitting} onClick={transmettreSelection} className="rounded-xl bg-[#0a5db5] px-4 py-2 font-bold text-white disabled:opacity-50">
            {isTransmitting ? 'Transmission...' : `Transmettre les ${selectedIds.length} fiche(s)`}
          </button>
          <button type="button" disabled={isTransmitting} onClick={transmettreToutes} className="rounded-xl border border-[#0a5db5] bg-white px-4 py-2 font-bold text-[#0a5db5] disabled:opacity-50">
            {isTransmitting ? 'Transmission...' : `Transmettre les ${counts.nonTransmises} fiches non transmises`}
          </button>
          {batchMessage && <span className={batchMessage.includes('succès') ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{batchMessage}</span>}
        </div>
      )}

      {/* FILTRES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              placeholder="NIF, raison sociale ou référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a5db5] focus:outline-hidden"
            />
          </div>

          <div className="w-56">
            <label className="mb-1 block text-[11px] font-bold text-slate-600">Statut de transmission</label>
            <select
              value={statutTransmission}
              onChange={(e) => setStatutTransmission(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="CONSERVEE_BUREAU">Non transmises</option>
              <option value="TRANSMIS_DIVISION_CONTROLE">Transmises</option>
              <option value="">Toutes</option>
            </select>
          </div>

          <div className="w-52">
            <label className="mb-1 block text-[11px] font-bold text-slate-600">Bureau de contrôle</label>
            <select
              value={bureauId}
              onChange={(e) => setBureauId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les bureaux</option>
              {availableBureaux.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="w-52">
            <label className="mb-1 block text-[11px] font-bold text-slate-600">Secteur</label>
            <select value={secteurId} onChange={(e) => setSecteurId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden">
              <option value="">Tous les secteurs</option>
              {filteredSecteurs.map((secteur) => <option key={secteur.id} value={secteur.id}>{secteur.nom} ({secteur.code})</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
          >
            {isPending ? 'Filtrage...' : 'Filtrer'}
          </button>

          {(statutTransmission !== 'CONSERVEE_BUREAU' || search || bureauId || secteurId) && (
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

      {/* TABLE DES FICHES */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {data.fiches.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Aucune fiche d'ordonnancement"
              description="Aucune fiche enregistrée ne correspond à vos critères de recherche."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  {isBureauAnalyse && statutTransmission !== 'TRANSMIS_DIVISION_CONTROLE' && <th className="px-4 py-3.5"><span className="sr-only">Sélection</span><input aria-label="Sélectionner toutes les fiches de la page" type="checkbox" checked={fichesTransmissibles.length > 0 && fichesTransmissibles.every((fiche) => selectedIds.includes(fiche.id))} onChange={(event) => setSelectedIds(event.target.checked ? fichesTransmissibles.map((fiche) => fiche.id) : [])} /></th>}
                  <th className="px-4 py-3.5">Référence</th>
                  <th className="px-4 py-3.5">NIF / Assujetti / Secteur</th>
                  <th className="px-4 py-3.5">Bureau Compétent</th>
                  <th className="px-4 py-3.5">Date note</th>
                  <th className="px-4 py-3.5 text-right">Montant dû CDF</th>
                  <th className="px-4 py-3.5 text-right">Montant dû USD</th>
                  <th className="px-4 py-3.5 text-center">Statut Transmission</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.fiches.map((fiche) => {
                  const isTransmise = fiche.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE';

                  return (
                    <tr key={fiche.id} className="hover:bg-slate-50/60 transition">
                      {isBureauAnalyse && statutTransmission !== 'TRANSMIS_DIVISION_CONTROLE' && <td className="px-4 py-3"><input aria-label={`Sélectionner ${fiche.numero_fiche}`} type="checkbox" disabled={isTransmise} checked={selectedIds.includes(fiche.id)} onChange={() => toggleSelection(fiche.id)} /></td>}
                      <td className="px-4 py-3 font-medium">
                        <span className="font-mono font-bold text-[#0a5db5]">{fiche.numero_fiche}</span>
                        <p className="text-[11px] text-slate-400">Série : {fiche.numero_serie} ({fiche.delai_traitement_jours}j)</p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{fiche.assujetti?.nom_raison_sociale || 'Assujetti'}</p>
                        <p className="font-mono text-[11px] text-slate-500">{fiche.assujetti?.identifiant}</p>
                        <p className="text-[11px] text-slate-400">{fiche.secteur?.nom}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{fiche.bureau?.nom}</span>
                        <p className="font-mono text-[11px] text-slate-400">{fiche.bureau?.code}</p>
                      </td>

                      <td className="px-4 py-3"><p className="font-medium text-slate-900">{new Date(`${fiche.date_note_perception}T00:00:00`).toLocaleDateString('fr-FR')}</p><p className="font-mono text-[11px] text-slate-500">{fiche.numero_note_perception}</p></td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{fiche.montant_cdf > 0 ? new Intl.NumberFormat('fr-CD').format(fiche.montant_cdf) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-800">{fiche.montant_usd > 0 ? new Intl.NumberFormat('fr-CD').format(fiche.montant_usd) : '—'}</td>

                      <td className="px-4 py-3 text-center">
                        {isTransmise ? (
                          <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                            Transmise au Contrôle
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            Conservée au Bureau
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isTransmise && isBureauAnalyse && (
                            <button
                              type="button"
                              onClick={() => handleEnvoyerAuControle(fiche.id)}
                              disabled={isTransmitting && transmittingId === fiche.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0a5db5] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
                            >
                              <span>📤</span>
                              <span>{isTransmitting && transmittingId === fiche.id ? 'Envoi...' : 'Envoyer au Contrôle'}</span>
                            </button>
                          )}
                          <Link
                            href={`/recoupement/fiches-ordonnancement/${fiche.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                          >
                            <span>Consulter</span>
                            <span>→</span>
                          </Link>
                        </div>
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
