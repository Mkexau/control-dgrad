'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type {
  FicheAControlerItem,
  SyntheseSecteurItem,
} from '@/lib/controles/controle-ordonnancement-service';
import {
  fetchOrdonnancementsAControlerAction,
  fetchSyntheseSectorielleAction,
} from '@/app/actions/controle-ordonnancement';
import { EmptyState } from '@/components/ui/institutional-state';

interface Secteur {
  id: string;
  code: string;
  nom: string;
  bureau_id: string;
}

interface CurrentUser {
  id: string;
  role: string;
  bureau_id: string | null;
  bureau_code: string | null;
  division_code: string | null;
  nom: string;
  prenom: string;
}

interface Props {
  currentUser: CurrentUser;
  availableSecteurs: Secteur[];
  initialData: { fiches: FicheAControlerItem[]; total: number };
  synthese: SyntheseSecteurItem[];
}

export function ControlesOrdonnancementsClient({
  availableSecteurs = [],
  initialData,
  synthese: initialSynthese,
}: Props) {
  const [activeTab, setActiveTab] = useState<'ordonnancements' | 'synthese'>('ordonnancements');
  const [data, setData] = useState(initialData);
  const [synthese, setSynthese] = useState(initialSynthese);

  // Filtres
  const [secteurFilter, setSecteurFilter] = useState('');
  const [statutNoteFilter, setStatutNoteFilter] = useState('');
  const [statutPaiementFilter, setStatutPaiementFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await fetchOrdonnancementsAControlerAction({
        secteur_id: secteurFilter || undefined,
        statut_note: (statutNoteFilter as 'RETROUVEE' | 'ABSENTE' | 'A_VERIFIER') || undefined,
        statut_paiement: (statutPaiementFilter as 'CONFORME' | 'DEBITEUR' | 'NOTE_ABSENTE' | 'PAIEMENT_RETARD' | 'NON_DECLARE') || undefined,
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
    setSecteurFilter('');
    setStatutNoteFilter('');
    setStatutPaiementFilter('');
    setSearch('');
    startTransition(async () => {
      const [resFiches, resSynthese] = await Promise.all([
        fetchOrdonnancementsAControlerAction({ page: 1, limit: 20 }),
        fetchSyntheseSectorielleAction(),
      ]);

      if (resFiches.success && resFiches.data) setData(resFiches.data);
      if (resSynthese.success && resSynthese.data) setSynthese(resSynthese.data);
    });
  };

  const fmtCDF = (v: number) =>
    `${new Intl.NumberFormat('fr-CD').format(v)} CDF`;

  const fmtUSD = (v: number) =>
    `$${new Intl.NumberFormat('fr-CD').format(v)} USD`;

  const secteurPrioritaire = synthese.find((s) => s.is_prioritaire);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. EN-TÊTE DU BUREAU DE CONTRÔLE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0a5db5]">
              Division Contrôle
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">
              Bureau de Contrôle Compétent
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Contrôle des Données d&apos;Ordonnancement & Analyse des Paiements
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Exploitation des données d&apos;ordonnancement transmises, vérification des notes de perception et restes dus.
          </p>
        </div>

        {/* ONGLETS PRINCIPAUX */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('ordonnancements')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'ordonnancements'
                ? 'bg-white text-[#0a5db5] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Fiches à Contrôler ({data.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('synthese')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'synthese'
                ? 'bg-white text-[#0a5db5] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Synthèse Sectorielle & Priorisation
          </button>
        </div>
      </div>

      {/* 2. CONTENU SELON L'ONGLET */}
      {activeTab === 'ordonnancements' ? (
        <div className="space-y-6">
          {/* FILTRES DE RECHERCHE */}
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

              <div className="w-52">
                <select
                  value={secteurFilter}
                  onChange={(e) => setSecteurFilter(e.target.value)}
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

              <div className="w-44">
                <select
                  value={statutNoteFilter}
                  onChange={(e) => setStatutNoteFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                >
                  <option value="">État de la note</option>
                  <option value="RETROUVEE">Note retrouvée</option>
                  <option value="ABSENTE">Note absente</option>
                  <option value="A_VERIFIER">À vérifier</option>
                </select>
              </div>

              <div className="w-48">
                <select
                  value={statutPaiementFilter}
                  onChange={(e) => setStatutPaiementFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                >
                  <option value="">Situation assujetti</option>
                  <option value="CONFORME">Conforme / Soldé</option>
                  <option value="DEBITEUR">Débiteur</option>
                  <option value="NOTE_ABSENTE">Note absente</option>
                  <option value="PAIEMENT_RETARD">Paiement en retard</option>
                  <option value="NON_DECLARE">Non déclaré</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
              >
                {isPending ? 'Filtrage...' : 'Filtrer'}
              </button>

              {(secteurFilter || statutNoteFilter || statutPaiementFilter || search) && (
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

          {/* TABLEAU DES FICHES D'ORDONNANCEMENT REÇUES */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {data.fiches.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Aucune fiche d'ordonnancement trouvée"
                  description="Aucune donnée d'ordonnancement ne correspond à vos critères de recherche pour ce bureau de contrôle."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3.5">Fiche & Série</th>
                      <th className="px-4 py-3.5">Assujetti / Secteur</th>
                      <th className="px-4 py-3.5">Note de perception</th>
                      <th className="px-4 py-3.5 text-right">Montant Ordonnancé</th>
                      <th className="px-4 py-3.5 text-center">État Note</th>
                      <th className="px-4 py-3.5 text-right">Reste Dû & Pénalité</th>
                      <th className="px-4 py-3.5 text-center">Situation</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.fiches.map((fiche) => {
                      const v = fiche.verification;
                      const hasVerif = !!v;

                      return (
                        <tr key={fiche.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-medium">
                            <span className="font-mono font-bold text-[#0a5db5]">{fiche.numero_fiche}</span>
                            <p className="text-[10px] text-slate-400">Série : {fiche.numero_serie} ({fiche.delai_traitement_jours}j)</p>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{fiche.assujetti?.nom_raison_sociale}</p>
                            <p className="font-mono text-[10px] text-slate-500">{fiche.assujetti?.identifiant}</p>
                            <p className="text-[10px] text-slate-400">{fiche.secteur?.nom}</p>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-mono font-semibold text-slate-800">{fiche.numero_note_perception}</p>
                            <p className="text-[10px] text-slate-500">du {fiche.date_note_perception}</p>
                          </td>

                          <td className="px-4 py-3 text-right font-mono">
                            {fiche.montant_cdf > 0 && (
                              <p className="font-semibold text-slate-900">{fmtCDF(fiche.montant_cdf)}</p>
                            )}
                            {fiche.montant_usd > 0 && (
                              <p className="font-semibold text-emerald-800">{fmtUSD(fiche.montant_usd)}</p>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {hasVerif ? (
                              v.statut_note === 'RETROUVEE' ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  ✓ Retrouvée
                                </span>
                              ) : v.statut_note === 'ABSENTE' ? (
                                <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                                  ✕ Absente
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                  ? À vérifier
                                </span>
                              )
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Non contrôlée
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono">
                            {hasVerif ? (
                              <div>
                                {v.reste_du_cdf > 0 && (
                                  <p className="font-bold text-red-600">
                                    {fmtCDF(v.reste_du_cdf)}
                                    {v.penalite_cdf > 0 && (
                                      <span className="block text-[10px] font-medium text-red-500">
                                        + {fmtCDF(v.penalite_cdf)} (5%)
                                      </span>
                                    )}
                                  </p>
                                )}
                                {v.reste_du_usd > 0 && (
                                  <p className="font-bold text-red-600">
                                    {fmtUSD(v.reste_du_usd)}
                                    {v.penalite_usd > 0 && (
                                      <span className="block text-[10px] font-medium text-red-500">
                                        + {fmtUSD(v.penalite_usd)} (5%)
                                      </span>
                                    )}
                                  </p>
                                )}
                                {v.reste_du_cdf === 0 && v.reste_du_usd === 0 && (
                                  <span className="text-[10px] font-semibold text-emerald-700">Soldé</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {hasVerif ? (
                              v.statut_paiement === 'CONFORME' ? (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Conforme
                                </span>
                              ) : v.statut_paiement === 'DEBITEUR' ? (
                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
                                  Débiteur
                                </span>
                              ) : v.statut_paiement === 'NOTE_ABSENTE' ? (
                                <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                                  Note Absente
                                </span>
                              ) : v.statut_paiement === 'PAIEMENT_RETARD' ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  En Retard
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-800">
                                  Non Déclaré
                                </span>
                              )
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                En attente
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/controles/ordonnancements/${fiche.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0a5db5] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs"
                            >
                              <span>{hasVerif ? 'Modifier le contrôle' : 'Contrôler'}</span>
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
      ) : (
        /* 3. ONGLET SYNTHÈSE SECTORIELLE & PRIORISATION */
        <div className="space-y-6">
          {/* BANNIÈRE SECTEUR PRIORITAIRE */}
          {secteurPrioritaire && (
            <div className="rounded-2xl border border-red-200 bg-linear-to-r from-red-50 via-amber-50 to-white p-6 shadow-xs">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      🚨 Secteur Prioritaire de Contrôle
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {secteurPrioritaire.secteur_code}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    {secteurPrioritaire.secteur_nom}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ce secteur présente le manque à gagner le plus élevé ({fmtCDF(secteurPrioritaire.manque_a_gagner_cdf)}{secteurPrioritaire.manque_a_gagner_usd > 0 ? ` + ${fmtUSD(secteurPrioritaire.manque_a_gagner_usd)}` : ''}) et doit être priorisé pour les prochaines missions.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Exigible (avec pénalités)</span>
                  <p className="font-mono text-xl font-black text-red-600">
                    {fmtCDF(secteurPrioritaire.total_exigible_cdf)}
                  </p>
                  {secteurPrioritaire.total_exigible_usd > 0 && (
                    <p className="font-mono text-sm font-bold text-emerald-800">
                      {fmtUSD(secteurPrioritaire.total_exigible_usd)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU RÉCAPITULATIF SECTORIEL AVEC CLASSEMENT */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Classement des Secteurs par Manque à Gagner</h3>
                <p className="text-xs text-slate-500">
                  Synthèse calculée sur base des données d&apos;ordonnancement et des vérifications du Bureau de Contrôle.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {synthese.length} secteur(s) sous gestion
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-3 text-center">Rang</th>
                    <th className="px-4 py-3">Secteur</th>
                    <th className="px-3 py-3 text-center">Assujettis</th>
                    <th className="px-3 py-3 text-center">Débiteurs</th>
                    <th className="px-4 py-3 text-right">Total Dû (CDF)</th>
                    <th className="px-4 py-3 text-right">Payé (CDF)</th>
                    <th className="px-4 py-3 text-right text-red-600 font-black">Manque à Gagner (CDF)</th>
                    <th className="px-3 py-3 text-right">Pénalités (5%)</th>
                    <th className="px-4 py-3 text-right">Manque à Gagner (USD)</th>
                    <th className="px-3 py-3 text-center">Priorité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {synthese.map((s, index) => {
                    return (
                      <tr
                        key={s.secteur_id}
                        className={`hover:bg-slate-50/60 transition ${
                          s.is_prioritaire ? 'bg-amber-50/30 font-medium' : ''
                        }`}
                      >
                        <td className="px-3 py-3 text-center font-bold text-slate-500">
                          #{index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{s.secteur_nom}</p>
                          <p className="font-mono text-[10px] text-slate-400">{s.secteur_code}</p>
                        </td>

                        <td className="px-3 py-3 text-center font-semibold">
                          {s.nombre_assujettis}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {s.nombre_debiteurs > 0 ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700 border border-red-200 text-[10px]">
                              {s.nombre_debiteurs}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono">
                          {fmtCDF(s.total_du_cdf)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {fmtCDF(s.total_paye_cdf)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                          {fmtCDF(s.manque_a_gagner_cdf)}
                        </td>

                        <td className="px-3 py-3 text-right font-mono text-slate-600">
                          {s.penalites_cdf > 0 ? fmtCDF(s.penalites_cdf) : '—'}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                          {s.manque_a_gagner_usd > 0 ? fmtUSD(s.manque_a_gagner_usd) : '—'}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {s.is_prioritaire ? (
                            <span className="inline-flex rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                              PRIORITAIRE
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              Rang {index + 1}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
