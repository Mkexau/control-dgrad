'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT DU TABLEAU DE BORD EXÉCUTIF (ÉTAPE 12)
// =============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { DashboardMetrics } from '@/lib/stats/stats-service';
import type { StatsFilterInput } from '@/lib/validations/stats';
import { fetchDashboardMetrics } from '@/app/actions/stats';

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  currentUser: {
    id: string;
    role: string;
    bureau_id?: string | null;
    nom: string;
    prenom: string;
  };
  availableBureaux: { id: string; code: string; nom: string }[];
  availableSecteurs: { id: string; code: string; nom: string; bureau_id?: string }[];
}

export function DashboardClient({
  initialMetrics,
  currentUser,
  availableBureaux = [],
  availableSecteurs = [],
}: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtres
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [typeControle, setTypeControle] = useState<string>('');
  const [selectedBureauId, setSelectedBureauId] = useState<string>(
    !currentUser.bureau_id || initialMetrics.perimetre_applique.est_global ? '' : currentUser.bureau_id
  );
  const [selectedSecteurId, setSelectedSecteurId] = useState<string>('');

  // Filtrage des secteurs selon le bureau sélectionné
  const filteredSecteurs = selectedBureauId
    ? availableSecteurs.filter((s) => s.bureau_id === selectedBureauId)
    : availableSecteurs;

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const filterPayload: StatsFilterInput = {
      date_debut: dateDebut || undefined,
      date_fin: dateFin || undefined,
      type_controle: typeControle ? (typeControle as 'SUR_PLACE' | 'SUR_PIECES') : undefined,
      bureau_id: selectedBureauId || undefined,
      secteur_id: selectedSecteurId || undefined,
    };

    startTransition(async () => {
      const res = await fetchDashboardMetrics(filterPayload);
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        setErrorMsg(res.error || 'Erreur lors de l\'actualisation des statistiques.');
      }
    });
  };

  const handleResetFilters = () => {
    setDateDebut('');
    setDateFin('');
    setTypeControle('');
    setSelectedBureauId(
      !currentUser.bureau_id || initialMetrics.perimetre_applique.est_global ? '' : currentUser.bureau_id
    );
    setSelectedSecteurId('');
    setErrorMsg(null);

    startTransition(async () => {
      const res = await fetchDashboardMetrics({});
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. EN-TÊTE DU TABLEAU DE BORD */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Tableau de Bord Exécutif & Statistiques
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations (DGRAD)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/missions/nouvelle"
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>+ Nouvelle Mission</span>
            </Link>
            <Link
              href="/missions"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Dossiers de Missions →
            </Link>
            <Link
              href="/equipes"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Équipes de Terrain
            </Link>
            {currentUser.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition-colors"
              >
                Administration ⚙
              </Link>
            )}
          </div>
        </div>

        {/* Badge d'indication du périmètre organisationnel appliqué (RM-039) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              <strong>Périmètre actif :</strong>{' '}
              {metrics.perimetre_applique.est_global
                ? 'Direction Générale / Vision Transversale Globale'
                : `Bureau : ${metrics.perimetre_applique.bureau_nom || 'Bureau assigné'}`}
            </span>
          </div>

          <span className="text-zinc-400 text-[11px]">
            Données actualisées en temps réel selon les règles RM-053 & QM-028
          </span>
        </div>
      </div>

      {/* 2. BARRE DE FILTRES MULTI-CRITÈRES */}
      <form
        onSubmit={handleApplyFilters}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Filtres de Synthèse Statistique
          </h2>
          {isPending && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
              Calcul des agrégats en cours...
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date début */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Date Début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Date Fin
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Type de contrôle */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Type de Contrôle
            </label>
            <select
              value={typeControle}
              onChange={(e) => setTypeControle(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="">Tous types</option>
              <option value="SUR_PLACE">SUR_PLACE (Sur le terrain)</option>
              <option value="SUR_PIECES">SUR_PIECES (Sur pièces)</option>
            </select>
          </div>

          {/* Bureau (si rôle global) */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Bureau de Contrôle
            </label>
            <select
              value={selectedBureauId}
              onChange={(e) => {
                setSelectedBureauId(e.target.value);
                setSelectedSecteurId(''); // Réinitialiser le secteur lors du changement de bureau
              }}
              disabled={!metrics.perimetre_applique.est_global}
              className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {metrics.perimetre_applique.est_global ? (
                <>
                  <option value="">Tous les bureaux</option>
                  {availableBureaux.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.nom}
                    </option>
                  ))}
                </>
              ) : (
                <option value={currentUser.bureau_id || ''}>
                  {metrics.perimetre_applique.bureau_nom || 'Bureau assigné'}
                </option>
              )}
            </select>
          </div>

          {/* Secteur */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Secteur d&apos;activité
            </label>
            <select
              value={selectedSecteurId}
              onChange={(e) => setSelectedSecteurId(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="">Tous secteurs</option>
              {filteredSecteurs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={isPending}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors shadow-xs"
          >
            Appliquer les filtres
          </button>
        </div>
      </form>

      {/* 3. CARTES DE SYNTHÈSE DES KPIs CLÉS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Missions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Missions de Contrôle</span>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {metrics.missions.total} au total
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {metrics.missions.total}
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Sur place : <strong>{metrics.missions.sur_place}</strong></span>
            <span>Sur pièces : <strong>{metrics.missions.sur_pieces}</strong></span>
            <span>En cours : <strong>{metrics.missions.en_cours}</strong></span>
          </div>
        </div>

        {/* Contrôles Opérationnels */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Contrôles Opérationnels</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.controles.taux_achevement}% achevés
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {metrics.controles.total}
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Terminés : <strong>{metrics.controles.termines}</strong></span>
            <span>En cours : <strong>{metrics.controles.en_cours}</strong></span>
            <span>En attente : <strong>{metrics.controles.en_attente}</strong></span>
          </div>
        </div>

        {/* Consolidation CDF */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Réclamé (CDF)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              CDF
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 truncate">
            {metrics.finances.cdf.total_global.toLocaleString('fr-FR')} CDF
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Principal : {metrics.finances.cdf.total_du.toLocaleString('fr-FR')}</span>
            <span>Pénalités : {metrics.finances.cdf.total_penalites.toLocaleString('fr-FR')}</span>
          </div>
        </div>

        {/* Consolidation USD */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Réclamé (USD)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              USD
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            {metrics.finances.usd.total_global.toLocaleString('fr-FR')} USD
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Principal : {metrics.finances.usd.total_du.toLocaleString('fr-FR')}</span>
            <span>Pénalités : {metrics.finances.usd.total_penalites.toLocaleString('fr-FR')}</span>
          </div>
        </div>
      </div>

      {/* 4. CONSOLIDATION FINANCIÈRE SÉPARÉE (RM-040 & RM-041) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Consolidation Financière des Résultats & Redressements
            </h2>
            <p className="text-xs text-zinc-500">
              Agrégation stricte mono-devise sans conversion automatique (RM-040, RM-041)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span>Redressements : <strong className="text-zinc-900 dark:text-zinc-100">{metrics.finances.redressements_count}</strong></span>
            <span>Sanctions : <strong className="text-zinc-900 dark:text-zinc-100">{metrics.finances.penalites_count}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panneau Francs Congolais (CDF) */}
          <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono">
                Recettes en Francs Congolais (CDF)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                CDF
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500">Droits éludés / Principal :</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {metrics.finances.cdf.total_du.toLocaleString('fr-FR')} CDF
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500">Pénalités & majorations :</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {metrics.finances.cdf.total_penalites.toLocaleString('fr-FR')} CDF
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-300 dark:border-zinc-600 text-sm font-bold text-blue-600 dark:text-blue-400">
                <span>TOTAL CONSOLIDÉ CDF :</span>
                <span className="font-mono">{metrics.finances.cdf.total_global.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-zinc-500">
                <span>Avis de recouvrement émis :</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.finances.cdf.nombre_avis} avis ({metrics.finances.cdf.total_avis.toLocaleString('fr-FR')} CDF)
                </span>
              </div>
            </div>
          </div>

          {/* Panneau Dollars Américains (USD) */}
          <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono">
                Recettes en Dollars Américains (USD)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                USD
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500">Droits éludés / Principal :</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {metrics.finances.usd.total_du.toLocaleString('fr-FR')} USD
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500">Pénalités & majorations :</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {metrics.finances.usd.total_penalites.toLocaleString('fr-FR')} USD
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-300 dark:border-zinc-600 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <span>TOTAL CONSOLIDÉ USD :</span>
                <span className="font-mono">{metrics.finances.usd.total_global.toLocaleString('fr-FR')} USD</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-zinc-500">
                <span>Avis de recouvrement émis :</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.finances.usd.nombre_avis} avis ({metrics.finances.usd.total_avis.toLocaleString('fr-FR')} USD)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Typologie des résultats : Chargée vs Déchargée */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              Typologie des Contrôles Clôturés ({metrics.finances.resultats.total_resultats} résultats arrêtés)
            </div>
            <div className="text-[11px] text-zinc-500">
              Répartition entre contrôles avec irrégularités constatées (chargés) et conformités établies (déchargés).
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-amber-500" />
              <span>
                Résultats Chargés : <strong>{metrics.finances.resultats.total_charges}</strong> ({metrics.finances.resultats.taux_charges}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
              <span>
                Résultats Déchargés : <strong>{metrics.finances.resultats.total_decharges}</strong> ({metrics.finances.resultats.taux_decharges}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. RÉPARTITION PAR STATUT & WORKFLOW */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Répartition des Dossiers de Mission par Étape du Workflow
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(metrics.missions.par_statut).map(([statut, count]) => (
            <div
              key={statut}
              className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-1"
            >
              <div className="text-[10px] font-bold uppercase font-mono text-zinc-500 truncate" title={statut}>
                {statut.replace(/_/g, ' ')}
              </div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TABLEAUX PAR BUREAU ET PAR SECTEUR (RM-055) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureaux de Contrôle */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Activité par Bureau de Contrôle ({metrics.bureaux.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-bold text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2">Bureau</th>
                  <th className="py-2 text-center">Missions</th>
                  <th className="py-2 text-center">Contrôles</th>
                  <th className="py-2 text-right">Total CDF</th>
                  <th className="py-2 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                {metrics.bureaux.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-2.5 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                      {b.code} — {b.nom}
                    </td>
                    <td className="py-2.5 text-center">{b.missions_count}</td>
                    <td className="py-2.5 text-center">{b.controles_count}</td>
                    <td className="py-2.5 text-right text-blue-600 dark:text-blue-400">
                      {b.total_cdf.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                      {b.total_usd.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secteurs d'activité (Top secteurs) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Activité Sectorielle (Référentiel 36 Secteurs)
          </h2>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-bold text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900">
                <tr>
                  <th className="py-2">Secteur</th>
                  <th className="py-2 text-center">Bureau</th>
                  <th className="py-2 text-center">Missions</th>
                  <th className="py-2 text-right">Recouvrement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                {metrics.secteurs.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.nom}
                    </td>
                    <td className="py-2 text-center text-zinc-500">{s.bureau_code}</td>
                    <td className="py-2 text-center">{s.missions_count}</td>
                    <td className="py-2 text-right text-zinc-700 dark:text-zinc-300">
                      {s.total_cdf > 0 && <span>{s.total_cdf.toLocaleString('fr-FR')} CDF </span>}
                      {s.total_usd > 0 && <span>{s.total_usd.toLocaleString('fr-FR')} USD</span>}
                      {s.total_cdf === 0 && s.total_usd === 0 && <span className="text-zinc-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. JOURNAL D'ACTIVITÉ RÉCENTE (TRAÇABILITÉ & AUDIT) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Dernières Opérations Auditées (Traçabilité Système)
        </h2>

        {metrics.activite_recente.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs font-mono">
            {metrics.activite_recente.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {log.action}
                  </span>
                  <span className="text-zinc-400">({log.entity_type})</span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-sans">
                    par <strong>{log.auteur_nom}</strong> ({log.auteur_role})
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Aucun journal d&apos;audit récent enregistré dans le périmètre actif.
          </p>
        )}
      </div>
    </div>
  );
}
