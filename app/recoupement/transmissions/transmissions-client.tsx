'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import { fetchFichesOrdonnancementAction } from '@/app/actions/recoupement-ordonnancement';
import { EmptyState } from '@/components/ui/institutional-state';

interface Props {
  initialData: { fiches: FicheOrdonnancementItem[]; total: number };
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

export function TransmissionsClient({ initialData, initialSearch }: Props) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetchFichesOrdonnancementAction({
        statut_transmission: 'TRANSMIS_DIVISION_CONTROLE',
        search: search || undefined,
        page: 1,
        limit: 20,
      });
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#0a5db5]">Circuit documentaire</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">Recoupement → Contrôle</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Fiches Transmises au Chef de Division Contrôle
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Ensemble des fiches d&apos;ordonnancement certifiées et transmises pour l&apos;organisation éventuelle des opérations de contrôle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/recoupement/fiches-ordonnancement"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <span>📋 Toutes les Fiches</span>
          </Link>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher une transmission par référence, assujetti, bureau..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a5db5] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
          >
            {isPending ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>
      </div>

      {/* TABLE DES TRANSMISSIONS */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {data.fiches.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Aucune fiche transmise"
              description="Aucune fiche d'ordonnancement n'a encore été transmise à la Division Contrôle."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Numéro Fiche</th>
                  <th className="px-4 py-3.5">Assujetti / Secteur</th>
                  <th className="px-4 py-3.5">Bureau de Contrôle</th>
                  <th className="px-4 py-3.5">Date Transmission</th>
                  <th className="px-4 py-3.5 text-right">Montants Enregistrés</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.fiches.map((fiche) => (
                  <tr key={fiche.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-medium">
                      <span className="font-mono font-bold text-[#0a5db5]">{fiche.numero_fiche}</span>
                      <p className="text-[11px] text-slate-400">Note : {fiche.numero_note_perception}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{fiche.assujetti?.nom_raison_sociale}</p>
                      <p className="font-mono text-[11px] text-slate-500">{fiche.assujetti?.identifiant}</p>
                      <p className="text-[11px] text-slate-400">{fiche.secteur?.nom}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{fiche.bureau?.nom}</span>
                      <p className="font-mono text-[11px] text-slate-400">{fiche.bureau?.code}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {fiche.date_transmission_division ? new Date(fiche.date_transmission_division).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Par {fiche.agent_transmetteur ? `${fiche.agent_transmetteur.prenom} ${fiche.agent_transmetteur.nom}` : 'Agent habilité'}
                      </p>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
