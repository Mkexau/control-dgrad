'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import {
  fetchFichesOrdonnancementAction,
  transmettreFicheDivisionControleAction,
  transmettreFichesDivisionControleAction,
} from '@/app/actions/recoupement-ordonnancement';
import { EmptyState } from '@/components/ui/institutional-state';

interface Props {
  initialData: { fiches: FicheOrdonnancementItem[]; total: number };
  availableBureaux: { id: string; code: string; nom: string }[];
  initialStatutTransmission: string;
  initialSearch: string;
  initialBureauId: string;
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
  initialStatutTransmission,
  initialSearch,
  initialBureauId,
  currentUser,
}: Props) {
  const [data, setData] = useState(initialData);
  const [statutTransmission, setStatutTransmission] = useState(initialStatutTransmission);
  const [search, setSearch] = useState(initialSearch);
  const [bureauId, setBureauId] = useState(initialBureauId);
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
    setStatutTransmission('');
    setSearch('');
    setBureauId('');
    startTransition(async () => {
      const res = await fetchFichesOrdonnancementAction({ page: 1, limit: 20 });
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
      setData((previous) => ({ ...previous, total: statutTransmission === 'CONSERVEE_BUREAU' ? Math.max(0, previous.total - res.data!.count) : previous.total, fiches: previous.fiches.filter((fiche) => !res.data!.transmittedIds.includes(fiche.id)) }));
    });
  };

  const pageTitle =
    initialStatutTransmission === 'CONSERVEE_BUREAU'
      ? 'Fiches à transmettre'
      : initialStatutTransmission === 'TRANSMIS_DIVISION_CONTROLE'
        ? 'Fiches transmises'
        : 'Fiches d\'Enregistrement des Données d\'Ordonnancement';

  const pageDescription =
    initialStatutTransmission === 'CONSERVEE_BUREAU'
      ? 'Fiches d\'ordonnancement préparées, enregistrées et encore conservées au Bureau — non encore transmises au Contrôle.'
      : initialStatutTransmission === 'TRANSMIS_DIVISION_CONTROLE'
        ? 'Fiches d\'ordonnancement déjà transmises à la Division Contrôle. Consultation uniquement.'
        : 'Registre des fiches d\'ordonnancement enregistrées, conservées au Bureau et transmises au Contrôle.';

  const pageBadge =
    initialStatutTransmission === 'CONSERVEE_BUREAU'
      ? { label: '📋 À transmettre', className: 'rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0a5db5]' }
      : initialStatutTransmission === 'TRANSMIS_DIVISION_CONTROLE'
        ? { label: '📤 Transmises', className: 'rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-700' }
        : { label: 'Ordonnancement', className: 'rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600' };

  return (
    <div className="space-y-6 pb-12">
      {/* EN-TÊTE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={pageBadge.className}>{pageBadge.label}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">Bureau Analyse et Recoupement</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            {pageTitle}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {pageDescription}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/recoupement/assujettis"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <span>◈ Répertoire des assujettis</span>
          </Link>
          {initialStatutTransmission === 'CONSERVEE_BUREAU' && (
            <Link
              href="/recoupement/assujettis?filtre=SANS_FICHE"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition"
            >
              <span>📝 Fiches à préparer</span>
            </Link>
          )}
          {initialStatutTransmission === 'TRANSMIS_DIVISION_CONTROLE' && (
            <Link
              href="/recoupement/fiches-ordonnancement?statut_transmission=CONSERVEE_BUREAU"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition"
            >
              <span>📋 Fiches à transmettre</span>
            </Link>
          )}
        </div>
      </div>

      {isBureauAnalyse && statutTransmission !== 'TRANSMIS_DIVISION_CONTROLE' && fichesTransmissibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs">
          <span className="font-bold text-[#093b78]">{selectedIds.length} fiche(s) sélectionnée(s)</span>
          <button type="button" onClick={() => setSelectedIds(fichesTransmissibles.map((fiche) => fiche.id))} className="font-semibold text-[#0a5db5] hover:underline">Sélectionner tout</button>
          <button type="button" onClick={() => setSelectedIds([])} className="font-semibold text-slate-600 hover:underline">Désélectionner tout</button>
          <button type="button" disabled={!selectedIds.length || isTransmitting} onClick={transmettreSelection} className="rounded-xl bg-[#0a5db5] px-4 py-2 font-bold text-white disabled:opacity-50">
            {isTransmitting ? 'Transmission...' : `Transmettre les ${selectedIds.length} fiche(s)`}
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
              placeholder="Rechercher par numéro de fiche, note, série, assujetti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a5db5] focus:outline-hidden"
            />
          </div>

          <div className="w-56">
            <select
              value={statutTransmission}
              onChange={(e) => setStatutTransmission(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Toutes les fiches</option>
              <option value="CONSERVEE_BUREAU">Fiches non encore envoyées (Conservées)</option>
              <option value="TRANSMIS_DIVISION_CONTROLE">Fiches déjà envoyées (Transmises au Contrôle)</option>
            </select>
          </div>

          <div className="w-52">
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

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
          >
            {isPending ? 'Filtrage...' : 'Filtrer'}
          </button>

          {(statutTransmission || search || bureauId) && (
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
                  {isBureauAnalyse && statutTransmission !== 'TRANSMIS_DIVISION_CONTROLE' && <th className="px-4 py-3.5">Sélection</th>}
                  <th className="px-4 py-3.5">Numéro Fiche</th>
                  <th className="px-4 py-3.5">Assujetti / Secteur</th>
                  <th className="px-4 py-3.5">Bureau Compétent</th>
                  <th className="px-4 py-3.5">Note de Perception / Acte</th>
                  <th className="px-4 py-3.5 text-right">Montants Enregistrés</th>
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

                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-slate-800">{fiche.numero_note_perception}</p>
                        <p className="truncate max-w-[200px] text-slate-600" title={fiche.acte_generateur}>
                          {fiche.acte_generateur}
                        </p>
                        <p className="text-[10px] text-slate-400">Art. {fiche.article_budgetaire || 'N/A'} · {fiche.nombre_actes} acte(s)</p>
                      </td>

                      <td className="px-4 py-3 text-right font-mono">
                        {fiche.montant_cdf > 0 && (
                          <p className="font-semibold text-slate-900">
                            {new Intl.NumberFormat('fr-CD').format(fiche.montant_cdf)} <span className="text-[10px] font-sans font-bold text-blue-700">CDF</span>
                          </p>
                        )}
                        {fiche.montant_usd > 0 && (
                          <p className="font-semibold text-emerald-800">
                            {new Intl.NumberFormat('fr-CD').format(fiche.montant_usd)} <span className="text-[10px] font-sans font-bold text-emerald-700">USD</span>
                          </p>
                        )}
                      </td>

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
