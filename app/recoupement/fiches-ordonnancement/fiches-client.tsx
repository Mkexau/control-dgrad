'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import { fetchFichesOrdonnancementAction } from '@/app/actions/recoupement-ordonnancement';
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
  currentUser: _currentUser, // réservé pour affinage futur des permissions UI
}: Props) {
  const [data, setData] = useState(initialData);
  const [statutTransmission, setStatutTransmission] = useState(initialStatutTransmission);
  const [search, setSearch] = useState(initialSearch);
  const [bureauId, setBureauId] = useState(initialBureauId);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6 pb-12">
      {/* EN-TÊTE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0a5db5]">Division Recoupement</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">Bureau Analyse et Recherche</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Fiches d&apos;Enregistrement des Données d&apos;Ordonnancement
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Registre des fiches conservées par le Bureau et transmises au Chef de Division Contrôle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/recoupement/informations-recues"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition"
          >
            <span>📥 Traiter une arrivée</span>
          </Link>
        </div>
      </div>

      {/* FILTRES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input
              type="text"
              placeholder="Rechercher par numéro de fiche, note, série..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a5db5] focus:outline-hidden"
            />
          </div>

          <div className="w-48">
            <select
              value={statutTransmission}
              onChange={(e) => setStatutTransmission(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les statuts de transmission</option>
              <option value="CONSERVEE_BUREAU">Conservée au Bureau</option>
              <option value="TRANSMIS_DIVISION_CONTROLE">Transmise au Contrôle</option>
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
                  <th className="px-4 py-3.5">Numéro Fiche</th>
                  <th className="px-4 py-3.5">Assujetti / Secteur</th>
                  <th className="px-4 py-3.5">Bureau Compétent</th>
                  <th className="px-4 py-3.5">Note de Perception / Acte</th>
                  <th className="px-4 py-3.5 text-right">Montants Enregistrés</th>
                  <th className="px-4 py-3.5 text-center">Transmission</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.fiches.map((fiche) => {
                  const isTransmise = fiche.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE';

                  return (
                    <tr key={fiche.id} className="hover:bg-slate-50/60 transition">
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
                            Transmis au Contrôle
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            Conservée Bureau
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/recoupement/fiches-ordonnancement/${fiche.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#0a5db5] hover:text-white transition"
                        >
                          <span>Consulter</span>
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
