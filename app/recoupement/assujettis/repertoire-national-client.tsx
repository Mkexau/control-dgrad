'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AssujettiItem } from '@/lib/recoupement/recoupement-service';
import { fetchAssujettisAction } from '@/app/actions/assujettis';

interface Secteur {
  id: string;
  code: string;
  nom: string;
  bureau_id: string;
}

interface BureauControle {
  id: string;
  code: string;
  nom: string;
}

interface Props {
  initialAssujettis: AssujettiItem[];
  initialTotal: number;
  secteurs: Secteur[];
  bureauxControle: BureauControle[];
  assujettisAvecFiche: string[];
  assujettisTransmis: string[];
  initialOrdonnancementFilter: string;
  currentUser: {
    id: string;
    role: string;
    bureau_id: string | null;
    bureau_code: string | null;
    nom: string;
    prenom: string;
  };
}

export function RepertoireNationalClient({
  initialAssujettis,
  initialTotal,
  secteurs,
  bureauxControle,
  assujettisAvecFiche,
  assujettisTransmis,
  initialOrdonnancementFilter,
}: Props) {
  const [assujettis, setAssujettis] = useState<AssujettiItem[]>(initialAssujettis);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [secteurFilter, setSecteurFilter] = useState('');
  const [bureauFilter, setBureauFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ordonnancementFilter, setOrdonnancementFilter] = useState(initialOrdonnancementFilter);
  const [isPending, startTransition] = useTransition();

  const limit = 20;
  const avecFicheSet = new Set(assujettisAvecFiche);
  const transmisSet = new Set(assujettisTransmis);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    loadData(1, search, secteurFilter, typeFilter);
  };

  const loadData = (p: number, s: string, sec: string, t: string) => {
    startTransition(async () => {
      const res = await fetchAssujettisAction({
        page: p,
        limit,
        search: s || undefined,
        secteur_id: sec || undefined,
        type: (t as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE') || undefined,
      });
      if (res.success && res.data) {
        setAssujettis(res.data.assujettis);
        setTotal(res.data.total);
      }
    });
  };

  const handleReset = () => {
    setSearch('');
    setSecteurFilter('');
    setBureauFilter('');
    setTypeFilter('');
    setOrdonnancementFilter('');
    setPage(1);
    loadData(1, '', '', '');
  };

  // Filtrage local additionnel pour Bureau de contrôle ou État d'ordonnancement si sélectionné
  let filteredList = assujettis;
  if (bureauFilter) {
    filteredList = filteredList.filter((a) => a.secteur?.bureau_id === bureauFilter);
  }
  if (ordonnancementFilter === 'SANS_FICHE') {
    filteredList = filteredList.filter((a) => !avecFicheSet.has(a.id));
  } else if (ordonnancementFilter === 'AVEC_FICHE') {
    filteredList = filteredList.filter((a) => avecFicheSet.has(a.id) && !transmisSet.has(a.id));
  } else if (ordonnancementFilter === 'TRANSMIS') {
    filteredList = filteredList.filter((a) => transmisSet.has(a.id));
  }

  const filteredSecteurs = bureauFilter
    ? secteurs.filter((s) => s.bureau_id === bureauFilter)
    : secteurs;

  const totalPages = Math.ceil(total / limit);
  const isSansFicheMode = ordonnancementFilter === 'SANS_FICHE';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="text-[#0a5db5] hover:underline">
          Accueil
        </Link>
        <span>/</span>
        {isSansFicheMode ? (
          <>
            <Link href="/recoupement/assujettis" className="text-[#0a5db5] hover:underline">Assujettis</Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Fiches à préparer</span>
          </>
        ) : (
          <>
            <span className="text-slate-500">Assujettis</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Répertoire national</span>
          </>
        )}
      </nav>

      {/* 2. EN-TÊTE DE PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            {isSansFicheMode ? (
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                📝 Ordonnancement — Fiches à préparer
              </span>
            ) : (
              <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0a5db5]">
                Vue Transversale Nationale
              </span>
            )}
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">Bureau Analyse &amp; Recoupement</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            {isSansFicheMode
              ? 'Assujettis sans fiche d\'ordonnancement'
              : 'Répertoire National des Assujettis'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isSansFicheMode
              ? 'Liste des assujettis pour lesquels aucune fiche d\'ordonnancement n\'a encore été préparée. Cliquez sur « Préparer la fiche » pour initier le processus.'
              : 'Consultez les assujettis et préparez individuellement les fiches d\'ordonnancement destinées aux bureaux de contrôle.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            ← Tableau de bord
          </Link>
          {isSansFicheMode ? (
            <Link
              href="/recoupement/assujettis"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Répertoire national →
            </Link>
          ) : (
            <Link
              href="/recoupement/fiches-ordonnancement?statut_transmission=CONSERVEE_BUREAU"
              className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition"
            >
              Fiches à transmettre →
            </Link>
          )}
        </div>
      </div>

      {/* 3. BARRE DE RECHERCHE ET FILTRES MULTI-CRITÈRES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
          {/* Recherche texte */}
          <div className="lg:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Recherche (NIF ou Raison sociale)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: NIF-000001, Vodacom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#0a5db5] px-4 py-2 font-bold text-white hover:bg-[#093b78] transition disabled:opacity-50"
              >
                {isPending ? '...' : 'Filtrer'}
              </button>
            </div>
          </div>

          {/* Bureau de contrôle compétent */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bureau de contrôle compétent</label>
            <select
              value={bureauFilter}
              onChange={(e) => {
                setBureauFilter(e.target.value);
                setSecteurFilter('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les bureaux de contrôle</option>
              {bureauxControle.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Secteur d'activité */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Secteur d&apos;activité</label>
            <select
              value={secteurFilter}
              onChange={(e) => setSecteurFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les secteurs</option>
              {filteredSecteurs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>

          {/* État ordonnancement */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">État ordonnancement</label>
            <select
              value={ordonnancementFilter}
              onChange={(e) => setOrdonnancementFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
            >
              <option value="">Tous les états</option>
              <option value="SANS_FICHE">Sans fiche d&apos;ordonnancement</option>
              <option value="AVEC_FICHE">Fiche préparée (conservée)</option>
              <option value="TRANSMIS">Transmis au Contrôle</option>
            </select>
          </div>
        </form>

        {(search || secteurFilter || bureauFilter || typeFilter || ordonnancementFilter) && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">
              Filtres actifs · {filteredList.length} assujetti(s) affiché(s)
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="font-bold text-red-600 hover:underline"
            >
              ✕ Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </div>

      {/* 4. TABLEAU DES ASSUJETTIS */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Liste des assujettis nationaux ({total})
            </h2>
            <p className="text-xs text-slate-500">
              Chaque assujetti est rattaché à son secteur d&apos;activité et au bureau de contrôle compétent.
            </p>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <span className="block text-2xl mb-2">📋</span>
            <p className="font-semibold text-slate-600">Aucun assujetti trouvé</p>
            <p className="text-slate-400 mt-1">
              Aucun enregistrement ne correspond à vos critères de recherche.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">NIF / Raison Sociale</th>
                  <th className="px-4 py-3">Type & Activité</th>
                  <th className="px-4 py-3">Secteur d&apos;activité</th>
                  <th className="px-4 py-3">Bureau de Contrôle Compétent</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3 text-center">État Ordonnancement</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((a) => {
                  const hasFiche = avecFicheSet.has(a.id);
                  const isTransmis = transmisSet.has(a.id);
                  const bureauCompetent = a.secteur?.bureau;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/recoupement/assujettis/${a.id}`}
                          className="font-mono font-bold text-[#0a5db5] hover:underline"
                        >
                          {a.identifiant}
                        </Link>
                        <p className="font-bold text-slate-900 mt-0.5">{a.nom_raison_sociale}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {a.type === 'PERSONNE_MORALE' ? 'Personne Morale' : 'Personne Physique'}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                          {a.email || 'Sans contact renseigné'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900">
                          {a.secteur?.nom || 'Non spécifié'}
                        </span>
                        <p className="font-mono text-[10px] text-slate-400">
                          {a.secteur?.code || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {bureauCompetent ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {bureauCompetent.nom}
                            </span>
                            <p className="font-mono text-[10px] text-[#0a5db5]">
                              {bureauCompetent.code}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non déterminé</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-800">{a.adresse || 'Kinshasa'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isTransmis ? (
                          <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                            Transmis Contrôle
                          </span>
                        ) : hasFiche ? (
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0a5db5]">
                            Fiche préparée
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                            À préparer
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/recoupement/assujettis/${a.id}`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition">Consulter →</Link>
                          {!hasFiche && <Link href={`/recoupement/assujettis/${a.id}?mode=preparer`} className="rounded-lg bg-[#0a5db5] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#093b78] transition">Préparer la fiche</Link>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs">
            <span className="text-slate-500">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || isPending}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  loadData(p, search, secteurFilter, typeFilter);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isPending}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  loadData(p, search, secteurFilter, typeFilter);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
