'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AssujettiItem, RecoupementSynthese } from '@/lib/recoupement/recoupement-service';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import {
  creerFicheOrdonnancementAction,
  transmettreFicheDivisionControleAction,
} from '@/app/actions/recoupement-ordonnancement';

interface ExtendedAssujettiInfo {
  forme_juridique?: string | null;
  numero_rccm?: string | null;
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  activite_principale?: string | null;
  profiles?: {
    nom?: string | null;
    prenom?: string | null;
    role?: string | null;
    email?: string | null;
  } | null;
}

interface SecteurDetails {
  id: string;
  code: string;
  nom: string;
  bureaux?: {
    id: string;
    code: string;
    nom: string;
    type: string;
  } | Array<{
    id: string;
    code: string;
    nom: string;
    type: string;
  }> | null;
}

interface Props {
  assujetti: AssujettiItem;
  extendedInfo: ExtendedAssujettiInfo | null;
  secteurDetails: SecteurDetails | null;
  fiches: FicheOrdonnancementItem[];
  synthese: RecoupementSynthese | null;
  currentUser: {
    id: string;
    role: string;
    bureau_id: string | null;
    bureau_code: string | null;
    nom: string;
    prenom: string;
  };
}

export function AssujettiRecoupementClient({
  assujetti,
  extendedInfo,
  secteurDetails,
  fiches: initialFiches,
  synthese,
  currentUser,
}: Props) {
  const searchParams = useSearchParams();
  const [fiches, setFiches] = useState<FicheOrdonnancementItem[]>(initialFiches);
  const [showFicheForm, setShowFicheForm] = useState(false);
  const [ficheFormData, setFicheFormData] = useState({
    numero_serie: `SERIE-${new Date().getFullYear()}`,
    delai_traitement_jours: 30,
    numero_note_perception: '',
    date_note_perception: new Date().toISOString().split('T')[0],
    acte_generateur: '',
    article_budgetaire: '',
    nombre_actes: 1,
    montant_cdf: 0,
    montant_usd: 0,
  });
  const [ficheFormError, setFicheFormError] = useState('');
  const [ficheFormSuccess, setFicheFormSuccess] = useState('');
  const [ficheFormPending, startFicheFormTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get('mode') === 'preparer' && fiches.length === 0) setShowFicheForm(true);
  }, [fiches.length, searchParams]);

  // Confirmation de transmission modal state
  const [transmittingFiche, setTransmittingFiche] = useState<FicheOrdonnancementItem | null>(null);
  const [isTransmitting, startTransmitting] = useTransition();
  const [transmissionSuccess, setTransmissionSuccess] = useState('');
  const [transmissionError, setTransmissionError] = useState('');

  const bureauDestinataire = Array.isArray(secteurDetails?.bureaux)
    ? secteurDetails.bureaux[0]
    : secteurDetails?.bureaux;
  const canManage =
    (['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
      (currentUser.bureau_code === 'BUR_ANA_REC' || !currentUser.bureau_code)) ||
    ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION'].includes(currentUser.role);

  const fmtMontant = (v: number, devise: string) =>
    `${new Intl.NumberFormat('fr-CD').format(v)} ${devise}`;

  const handleCreateFiche = (e: React.FormEvent) => {
    e.preventDefault();
    setFicheFormError('');
    setFicheFormSuccess('');

    if (!assujetti.secteur_principal_id) {
      setFicheFormError("Cet assujetti n'a pas de secteur d'activité rattaché.");
      return;
    }
    if (!bureauDestinataire?.id) {
      setFicheFormError('Le bureau de contrôle compétent est introuvable.');
      return;
    }

    startFicheFormTransition(async () => {
      const res = await creerFicheOrdonnancementAction({
        assujetti_id: assujetti.id,
        secteur_id: assujetti.secteur_principal_id!,
        bureau_id: bureauDestinataire.id,
        numero_serie: ficheFormData.numero_serie,
        delai_traitement_jours: Number(ficheFormData.delai_traitement_jours),
        numero_note_perception: ficheFormData.numero_note_perception,
        date_note_perception: ficheFormData.date_note_perception,
        acte_generateur: ficheFormData.acte_generateur,
        article_budgetaire: ficheFormData.article_budgetaire || undefined,
        nombre_actes: Number(ficheFormData.nombre_actes),
        montant_cdf: Number(ficheFormData.montant_cdf) || 0,
        montant_usd: Number(ficheFormData.montant_usd) || 0,
      });

      if (!res.success || !res.data) {
        setFicheFormError(res.error || "Erreur lors de l'enregistrement de la fiche.");
        return;
      }

      setFiches((prev) => [res.data!, ...prev]);
      setFicheFormSuccess(`Fiche d'ordonnancement ${res.data.numero_fiche} préparée avec succès !`);
      setShowFicheForm(false);
      setFicheFormData({
        numero_serie: `SERIE-${new Date().getFullYear()}`,
        delai_traitement_jours: 30,
        numero_note_perception: '',
        date_note_perception: new Date().toISOString().split('T')[0],
        acte_generateur: '',
        article_budgetaire: '',
        nombre_actes: 1,
        montant_cdf: 0,
        montant_usd: 0,
      });
    });
  };

  const handleConfirmTransmission = () => {
    if (!transmittingFiche) return;
    setTransmissionError('');
    setTransmissionSuccess('');

    startTransmitting(async () => {
      const res = await transmettreFicheDivisionControleAction(transmittingFiche.id);
      if (!res.success || !res.data) {
        setTransmissionError(res.error || 'Erreur lors de la transmission.');
        return;
      }

      setFiches((prev) =>
        prev.map((f) => (f.id === transmittingFiche.id ? res.data! : f))
      );
      setTransmissionSuccess(
        `Fiche ${res.data.numero_fiche} transmise au ${res.data.bureau?.nom || 'Bureau de contrôle'} avec succès.`
      );
      setTransmittingFiche(null);
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="text-[#0a5db5] hover:underline">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/recoupement/assujettis" className="text-[#0a5db5] hover:underline">
          Assujettis
        </Link>
        <span>/</span>
        <Link href="/recoupement/assujettis" className="text-[#0a5db5] hover:underline">
          Répertoire national
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-900 truncate max-w-xs">{assujetti.nom_raison_sociale}</span>
      </nav>

      {/* 2. EN-TÊTE DÉTAIL ASSUJETTI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0a5db5]">
              Fiche d&apos;analyse de l&apos;assujetti
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="font-mono font-bold text-slate-700">{assujetti.identifiant}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            {assujetti.nom_raison_sociale}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Informations transmises par le Service d&apos;assiette · Analyse et recoupement DGRAD
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recoupement/assujettis"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            ← Retour au répertoire
          </Link>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowFicheForm(true)}
              className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#093b78] transition"
            >
              📋 Préparer une fiche d&apos;ordonnancement
            </button>
          )}
        </div>
      </div>

      {transmissionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          ✓ {transmissionSuccess}
        </div>
      )}

      {ficheFormSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          ✓ {ficheFormSuccess}
        </div>
      )}

      {/* 3. GRILLE DES INFORMATIONS MÉTIER */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOC A : IDENTIFICATION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>🆔</span> IDENTIFICATION
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Non modifiable par l&apos;analyse
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">NIF Officiel</span>
              <p className="font-mono font-bold text-[#0a5db5] text-sm mt-0.5">{assujetti.identifiant}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Type d&apos;assujetti</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {assujetti.type === 'PERSONNE_MORALE' ? 'Personne Morale' : 'Personne Physique'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Forme juridique</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {extendedInfo?.forme_juridique || 'Non spécifiée'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Numéro RCCM</span>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">
                {extendedInfo?.numero_rccm || 'Non renseigné'}
              </p>
            </div>
          </div>
        </div>

        {/* BLOC B : ACTIVITÉ & DÉTERMINATION DU BUREAU DE CONTRÔLE */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-6 shadow-xs space-y-4">
          <div className="border-b border-blue-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#093b78] flex items-center gap-2">
              <span>🏢</span> ACTIVITÉ & BUREAU DE CONTRÔLE COMPÉTENT
            </h2>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#0a5db5]">
              Résolution automatique
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-white p-3 border border-blue-100">
              <span className="text-slate-400 block font-medium">Activité principale déclarée</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {extendedInfo?.activite_principale || 'Non renseignée'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3 border border-blue-100">
                <span className="text-slate-400 block font-medium">Secteur d&apos;activité</span>
                <p className="font-bold text-slate-900 mt-0.5">{assujetti.secteur?.nom || 'Non rattaché'}</p>
                <p className="font-mono text-[10px] text-slate-400">{assujetti.secteur?.code || '—'}</p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-blue-200 shadow-2xs">
                <span className="text-[#0a5db5] block font-bold text-[11px]">Bureau de contrôle compétent</span>
                <p className="font-extrabold text-[#093b78] text-xs mt-0.5">
                  {bureauDestinataire?.nom || 'Non déterminé'}
                </p>
                <p className="font-mono text-[10px] font-bold text-[#0a5db5]">
                  {bureauDestinataire?.code || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BLOC C : LOCALISATION & CONTACT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>📍</span> LOCALISATION & CONTACT
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Province / Ville</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {extendedInfo?.province || 'Kinshasa'} / {extendedInfo?.ville || 'Kinshasa'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Commune & Adresse</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {extendedInfo?.commune ? `${extendedInfo.commune} — ` : ''}{assujetti.adresse || 'Non renseignée'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Téléphone</span>
              <p className="font-semibold text-slate-900 mt-0.5">{assujetti.telephone || 'Non renseigné'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-medium">Email de contact</span>
              <p className="font-semibold text-slate-900 mt-0.5">{assujetti.email || 'Non renseigné'}</p>
            </div>
          </div>
        </div>

        {/* BLOC D : TRAÇABILITÉ DE L'ENREGISTREMENT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>📜</span> TRAÇABILITÉ & SOURCE D&apos;ASSIETTE
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">Origine de l&apos;assujetti</span>
                <p className="font-bold text-slate-900 mt-0.5">Service d&apos;assiette (Répertoire national)</p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Officiel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-slate-400 block font-medium">Date d&apos;enregistrement</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {new Date(assujetti.created_at).toLocaleDateString('fr-CD', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-slate-400 block font-medium">Enregistré par</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {extendedInfo?.profiles?.nom
                    ? `${extendedInfo.profiles.prenom} ${extendedInfo.profiles.nom}`
                    : 'Service d’Assiette'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FORMULAIRE DE PRÉPARATION D'UNE FICHE D'ORDONNANCEMENT */}
      {showFicheForm && (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5]">
                Bureau Analyse & Recoupement
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                Préparation de la Fiche d&apos;Ordonnancement
              </h2>
              <p className="text-xs text-slate-500">
                Les informations d&apos;identification, de secteur et de bureau compétent sont automatiquement récupérées de l&apos;assujetti.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFicheForm(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ✕ Fermer
            </button>
          </div>

          {ficheFormError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              ⚠ {ficheFormError}
            </div>
          )}

          <form onSubmit={handleCreateFiche} className="space-y-4 text-xs">
            {/* Ligne récapitulative automatique */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 font-medium block">Assujetti / NIF :</span>
                <p className="font-bold text-slate-900">{assujetti.nom_raison_sociale} ({assujetti.identifiant})</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Secteur d&apos;activité :</span>
                <p className="font-bold text-slate-900">{assujetti.secteur?.nom || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Bureau destinataire :</span>
                <p className="font-bold text-[#0a5db5]">{bureauDestinataire?.nom || '—'} ({bureauDestinataire?.code || '—'})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Numéro Série <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={ficheFormData.numero_serie}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, numero_serie: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Délai traitement (jours) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  required
                  value={ficheFormData.delai_traitement_jours}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, delai_traitement_jours: parseInt(e.target.value) || 30 }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">N° Note de perception <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NP-2026-0099"
                  value={ficheFormData.numero_note_perception}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, numero_note_perception: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date Note perception <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={ficheFormData.date_note_perception}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, date_note_perception: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Acte générateur <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Redevance minière, Droits fonciers..."
                  value={ficheFormData.acte_generateur}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, acte_generateur: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Article budgétaire</label>
                <input
                  type="text"
                  placeholder="Ex: ART-701-01"
                  value={ficheFormData.article_budgetaire}
                  onChange={(e) => setFicheFormData((prev) => ({ ...prev, article_budgetaire: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Montants avec séparation stricte CDF et USD */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <span className="block font-bold text-slate-800 mb-2">Montants de l&apos;ordonnancement (Séparation stricte CDF ≠ USD)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant en Francs Congolais (CDF) :</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ficheFormData.montant_cdf}
                    onChange={(e) => setFicheFormData((prev) => ({ ...prev, montant_cdf: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant en Dollars Américains (USD) :</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ficheFormData.montant_usd}
                    onChange={(e) => setFicheFormData((prev) => ({ ...prev, montant_usd: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFicheForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={ficheFormPending}
                className="rounded-xl bg-[#0a5db5] px-6 py-2 font-bold text-white shadow-xs hover:bg-[#093b78] transition disabled:opacity-50"
              >
                {ficheFormPending ? 'Enregistrement en cours...' : 'Enregistrer la Fiche'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. TABLEAU DES FICHES D'ORDONNANCEMENT DE CET ASSUJETTI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Fiches d&apos;Ordonnancement Établies ({fiches.length})
            </h2>
            <p className="text-xs text-slate-500">
              Fiches préparées par le Bureau Analyse & Recoupement et transmises aux bureaux de contrôle.
            </p>
          </div>
          <Link
            href="/recoupement/fiches-ordonnancement"
            className="text-xs font-bold text-[#0a5db5] hover:underline"
          >
            Voir tout le registre →
          </Link>
        </div>

        {fiches.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">
            Aucune fiche d&apos;ordonnancement établie pour cet assujetti pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Numéro Fiche</th>
                  <th className="px-3 py-2.5">Note de perception</th>
                  <th className="px-3 py-2.5">Bureau destinataire</th>
                  <th className="px-3 py-2.5 text-right">Montants</th>
                  <th className="px-3 py-2.5 text-center">Statut</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fiches.map((f) => {
                  const isTransmise = f.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-3 py-2.5 font-medium">
                        <span className="font-mono font-bold text-[#0a5db5]">{f.numero_fiche}</span>
                        <p className="text-[10px] text-slate-400">Série : {f.numero_serie}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-mono font-semibold">{f.numero_note_perception}</p>
                        <p className="truncate max-w-[180px] text-[11px] text-slate-500">{f.acte_generateur}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-900">{f.bureau?.nom || 'Bureau'}</p>
                        <p className="text-[10px] text-slate-400">{f.secteur?.nom}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {f.montant_cdf > 0 && (
                          <p className="font-semibold text-slate-900">
                            {new Intl.NumberFormat('fr-CD').format(f.montant_cdf)} <span className="text-[10px] text-blue-700 font-sans font-bold">CDF</span>
                          </p>
                        )}
                        {f.montant_usd > 0 && (
                          <p className="font-semibold text-emerald-800">
                            {new Intl.NumberFormat('fr-CD').format(f.montant_usd)} <span className="text-[10px] text-emerald-700 font-sans font-bold">USD</span>
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isTransmise ? (
                          <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Transmis Contrôle
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            Conservée Bureau
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isTransmise && canManage && (
                            <button
                              type="button"
                              onClick={() => setTransmittingFiche(f)}
                              className="rounded-lg bg-[#0a5db5] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#093b78] transition"
                            >
                              📤 Transmettre au Contrôle
                            </button>
                          )}
                          <Link
                            href={`/recoupement/fiches-ordonnancement/${f.id}`}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
                          >
                            Consulter →
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

      {/* 6. SYNTHÈSE DE RECOUPEMENT */}
      {synthese && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['cdf', 'usd'] as const).map((dev) => {
            const d = synthese[dev];
            const devLabel = dev.toUpperCase();
            return (
              <div key={dev} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Recoupement {devLabel} (Notes vs Ordonnancements)
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Total Notes de perception</dt>
                    <dd className="font-bold text-slate-900">{fmtMontant(d.totalNotes, devLabel)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Total Ordonnancé</dt>
                    <dd className="font-bold text-slate-900">{fmtMontant(d.totalOrdonnancements, devLabel)}</dd>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-bold">
                    <dt className={d.solde < 0 ? 'text-red-600' : 'text-emerald-700'}>Solde</dt>
                    <dd className={d.solde < 0 ? 'text-red-600' : 'text-emerald-700'}>{fmtMontant(d.solde, devLabel)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. MODAL DE CONFIRMATION AVANT TRANSMISSION */}
      {transmittingFiche && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5]">
                Confirmation de transmission officielle
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                Transmettre la fiche au Bureau de contrôle compétent ?
              </h3>
            </div>

            {transmissionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-700">
                ⚠ {transmissionError}
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Numéro de fiche :</span>
                <span className="font-mono font-bold text-[#0a5db5]">{transmittingFiche.numero_fiche}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assujetti :</span>
                <span className="font-bold text-slate-900">{assujetti.nom_raison_sociale} ({assujetti.identifiant})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Secteur d&apos;activité :</span>
                <span className="font-semibold text-slate-900">{transmittingFiche.secteur?.nom || assujetti.secteur?.nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bureau destinataire :</span>
                <span className="font-bold text-[#093b78]">{transmittingFiche.bureau?.nom || bureauDestinataire?.nom}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Montants concernés :</span>
                <div className="text-right font-mono font-bold">
                  {transmittingFiche.montant_cdf > 0 && <p className="text-slate-900">{fmtMontant(transmittingFiche.montant_cdf, 'CDF')}</p>}
                  {transmittingFiche.montant_usd > 0 && <p className="text-emerald-700">{fmtMontant(transmittingFiche.montant_usd, 'USD')}</p>}
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-[11px]">
              Après transmission, la fiche sera verrouillée et mise à disposition immédiate du Bureau de contrôle compétent pour la planification des contrôles.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransmittingFiche(null)}
                disabled={isTransmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmTransmission}
                disabled={isTransmitting}
                className="rounded-xl bg-[#0a5db5] px-5 py-2 font-bold text-white hover:bg-[#093b78] transition disabled:opacity-50 shadow-xs"
              >
                {isTransmitting ? 'Transmission en cours...' : '✓ Confirmer la Transmission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
