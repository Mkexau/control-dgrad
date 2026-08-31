'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheAControlerItem } from '@/lib/controles/controle-ordonnancement-service';
import { enregistrerVerificationAction } from '@/app/actions/controle-ordonnancement';
import {
  calculerResteDu,
  calculerPenalite,
  calculerTotalDu,
  calculerDateEcheance,
  calculerRetard,
  determinerSituationAssujetti,
  type StatutNoteVerification,
  type StatutPaiementAssujetti,
} from '@/lib/validations/controle-ordonnancement';

interface Props {
  fiche: FicheAControlerItem;
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

export function ControleFicheClient({ fiche, currentUser }: Props) {
  const existingVerif = fiche.verification;

  // Formulaire de vérification
  const [statutNote, setStatutNote] = useState<StatutNoteVerification>(
    existingVerif?.statut_note || 'RETROUVEE'
  );
  const [numeroNoteVerifie, setNumeroNoteVerifie] = useState(
    existingVerif?.numero_note_verifie || fiche.numero_note_perception || ''
  );
  const [montantPayeCDF, setMontantPayeCDF] = useState(
    existingVerif?.montant_paye_cdf ?? (fiche.montant_cdf > 0 ? fiche.montant_cdf : 0)
  );
  const [montantPayeUSD, setMontantPayeUSD] = useState(
    existingVerif?.montant_paye_usd ?? (fiche.montant_usd > 0 ? fiche.montant_usd : 0)
  );
  const [datePaiement, setDatePaiement] = useState(
    existingVerif?.date_paiement || new Date().toISOString().slice(0, 10)
  );
  const [observations, setObservations] = useState(existingVerif?.observations || '');
  const [situationExplicite, setSituationExplicite] = useState<StatutPaiementAssujetti | ''>(
    existingVerif?.statut_paiement === 'NON_DECLARE' ? 'NON_DECLARE' : ''
  );

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Autorisation d'écriture : Chef de bureau et Analyste du bureau concerné
  const canEdit =
    ['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
    currentUser.bureau_id === fiche.bureau.id;

  // Calculs dynamiques en direct (sans conversion)
  const ordCDF = fiche.montant_cdf;
  const ordUSD = fiche.montant_usd;
  const payCDF = Math.max(0, Number(montantPayeCDF) || 0);
  const payUSD = Math.max(0, Number(montantPayeUSD) || 0);

  const dateEcheance = calculerDateEcheance(fiche.date_note_perception, fiche.delai_traitement_jours);
  const { joursRetard, estEnRetard } = calculerRetard(dateEcheance, datePaiement);

  const resteCDF = statutNote === 'ABSENTE' ? ordCDF : calculerResteDu(ordCDF, payCDF);
  const resteUSD = statutNote === 'ABSENTE' ? ordUSD : calculerResteDu(ordUSD, payUSD);

  const penCDF = calculerPenalite(resteCDF);
  const penUSD = calculerPenalite(resteUSD);

  const totalExigibleCDF = calculerTotalDu(resteCDF, penCDF);
  const totalExigibleUSD = calculerTotalDu(resteUSD, penUSD);

  const situationActuelle = determinerSituationAssujetti({
    statutNote,
    montantOrdonnanceCDF: ordCDF,
    montantOrdonnanceUSD: ordUSD,
    montantPayeCDF: payCDF,
    montantPayeUSD: payUSD,
    joursRetard,
    situationExplicite: situationExplicite || null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await enregistrerVerificationAction({
        fiche_ordonnancement_id: fiche.id,
        statut_note: statutNote,
        numero_note_verifie: numeroNoteVerifie || undefined,
        montant_paye_cdf: payCDF,
        montant_paye_usd: payUSD,
        date_paiement: datePaiement || undefined,
        observations: observations || undefined,
        situation_explicite: situationExplicite || undefined,
      });

      if (res.success && res.data) {
        setSuccessMsg('Vérification et calculs de contrôle enregistrés avec succès.');
      } else {
        setErrorMsg(res.error || 'Erreur lors de l’enregistrement de la vérification.');
      }
    });
  };

  const fmtCDF = (v: number) =>
    `${new Intl.NumberFormat('fr-CD').format(v)} CDF`;

  const fmtUSD = (v: number) =>
    `$${new Intl.NumberFormat('fr-CD').format(v)} USD`;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/controles/ordonnancements" className="text-[#0a5db5] font-semibold hover:underline">
          ← Données d&apos;Ordonnancement & Contrôle
        </Link>
        <span>/</span>
        <span className="font-mono font-bold text-slate-900">{fiche.numero_fiche}</span>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <Link href="/controles/ordonnancements" className="underline text-emerald-900">
            Retour à la liste des ordonnancements →
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
          ⚠ {errorMsg}
        </div>
      )}

      {/* 2. IDENTIFICATION DE L'ASSUJETTI & SECTEUR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5] bg-blue-50 px-2 py-0.5 rounded-md">
                Dossier de Contrôle
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                {fiche.assujetti?.type === 'PERSONNE_MORALE' ? 'Personne morale' : 'Personne physique'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0a5db5] border border-blue-200">
                {fiche.secteur?.nom} ({fiche.secteur?.code})
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {fiche.assujetti?.nom_raison_sociale}
            </h1>
            <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">
              NIF / Identifiant fiscal : {fiche.assujetti?.identifiant}
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block font-medium">Bureau de contrôle compétent :</span>
            <p className="font-bold text-slate-900 mt-0.5">{fiche.bureau?.nom}</p>
            <p className="font-mono text-[11px] text-slate-400">{fiche.bureau?.code}</p>
          </div>
        </div>

        {/* Détails supplémentaires de l'assujetti */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Adresse déclarée</span>
            <p className="font-semibold text-slate-900 mt-0.5">{fiche.assujetti?.adresse || 'Non renseignée'}</p>
          </div>
          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Contact email</span>
            <p className="font-semibold text-slate-900 mt-0.5">{fiche.assujetti?.email || 'Non renseigné'}</p>
          </div>
          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Téléphone</span>
            <p className="font-semibold text-slate-900 mt-0.5">{fiche.assujetti?.telephone || 'Non renseigné'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 3. DONNÉES D'ORDONNANCEMENT DE RÉFÉRENCE (Non modifiables) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Données de Référence
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Fiche d&apos;Ordonnancement Source
                </h2>
              </div>
              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-mono font-bold text-[#0a5db5]">
                {fiche.numero_fiche}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Numéro de série :</span>
                <span className="font-mono font-bold text-slate-900">{fiche.numero_serie}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Délai de traitement :</span>
                <span className="font-semibold text-slate-900">{fiche.delai_traitement_jours} jours calendaires</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Note de perception source :</span>
                <span className="font-mono font-bold text-slate-900">{fiche.numero_note_perception}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Date de la note :</span>
                <span className="font-semibold text-slate-900">{fiche.date_note_perception}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Date d&apos;échéance calculée :</span>
                <span className="font-mono font-bold text-slate-900">{dateEcheance}</span>
              </div>

              <div className="border-b border-slate-50 pb-2">
                <span className="text-slate-500 block mb-0.5">Acte générateur :</span>
                <span className="font-medium text-slate-800">{fiche.acte_generateur}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Article budgétaire :</span>
                <span className="font-mono text-slate-700">{fiche.article_budgetaire || 'Non spécifié'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Nombre d&apos;actes :</span>
                <span className="font-semibold text-slate-900">{fiche.nombre_actes}</span>
              </div>

              {/* Montants ordonnancés */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5] block">
                  Montants Ordonnancés Réclamés
                </span>
                {ordCDF > 0 && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Total dû en Francs Congolais :</span>
                    <span className="font-black text-slate-900">{fmtCDF(ordCDF)}</span>
                  </div>
                )}
                {ordUSD > 0 && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600">Total dû en Dollars Américains :</span>
                    <span className="font-black text-emerald-800">{fmtUSD(ordUSD)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. FORMULAIRE DE VÉRIFICATION & RÉSULTATS DE CONTRÔLE */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5]">
                  Contrôle & Constats
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Vérification de la Note de Perception
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0a5db5] border border-blue-200">
                Séparation stricte CDF ≠ USD
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 1. ÉTAT DE LA NOTE DE PERCEPTION */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="block font-bold text-slate-800">
                  État de la note de perception constatée <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      statutNote === 'RETROUVEE'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutNote"
                      value="RETROUVEE"
                      checked={statutNote === 'RETROUVEE'}
                      onChange={() => setStatutNote('RETROUVEE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>✓ Note retrouvée</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      statutNote === 'ABSENTE'
                        ? 'border-red-500 bg-red-50/80 text-red-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutNote"
                      value="ABSENTE"
                      checked={statutNote === 'ABSENTE'}
                      onChange={() => setStatutNote('ABSENTE')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>✕ Note absente</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      statutNote === 'A_VERIFIER'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutNote"
                      value="A_VERIFIER"
                      checked={statutNote === 'A_VERIFIER'}
                      onChange={() => setStatutNote('A_VERIFIER')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>? À vérifier</span>
                  </label>
                </div>
              </div>

              {/* 2. NUMÉRO DE NOTE VÉRIFIÉ & DATE EFFECTIVE */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Numéro de note vérifié (si disponible) :
                  </label>
                  <input
                    type="text"
                    value={numeroNoteVerifie}
                    onChange={(e) => setNumeroNoteVerifie(e.target.value)}
                    disabled={statutNote === 'ABSENTE'}
                    placeholder="Ex : NP-2026-0001"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Date effective du paiement :
                  </label>
                  <input
                    type="date"
                    value={datePaiement}
                    onChange={(e) => setDatePaiement(e.target.value)}
                    disabled={statutNote === 'ABSENTE'}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 3. MONTANTS PAYÉS (CDF & USD SÉPARÉS) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Montants effectivement payés constatés
                </span>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Montant payé en Francs Congolais (CDF) :
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={montantPayeCDF}
                      onChange={(e) => setMontantPayeCDF(parseFloat(e.target.value) || 0)}
                      disabled={statutNote === 'ABSENTE'}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Montant payé en Dollars Américains (USD) :
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={montantPayeUSD}
                      onChange={(e) => setMontantPayeUSD(parseFloat(e.target.value) || 0)}
                      disabled={statutNote === 'ABSENTE'}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* 4. SITUATION PARTICULIÈRE & OBSERVATIONS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qualification explicite (si applicable) :
                  </label>
                  <select
                    value={situationExplicite}
                    onChange={(e) => setSituationExplicite(e.target.value as StatutPaiementAssujetti | '')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  >
                    <option value="">— Calcul automatique selon constats —</option>
                    <option value="NON_DECLARE">Non déclaré (Aucune déclaration établie)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observations du contrôle :</label>
                  <input
                    type="text"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Observations ou motifs particuliers..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 5. PANNEAU DE SYNTHÈSE FINANCIÈRE EN TEMPS RÉEL */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Résultats du Contrôle
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Situation Financière & Reste Dû
                    </h3>
                  </div>

                  {/* BADGE DE SITUATION */}
                  <div>
                    {situationActuelle === 'CONFORME' && (
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                        CONFORME / SOLDÉ
                      </span>
                    )}
                    {situationActuelle === 'DEBITEUR' && (
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                        DÉBITEUR
                      </span>
                    )}
                    {situationActuelle === 'NOTE_ABSENTE' && (
                      <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                        NOTE ABSENTE
                      </span>
                    )}
                    {situationActuelle === 'PAIEMENT_RETARD' && (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                        PAIEMENT EN RETARD
                      </span>
                    )}
                    {situationActuelle === 'NON_DECLARE' && (
                      <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-800">
                        NON DÉCLARÉ
                      </span>
                    )}
                  </div>
                </div>

                {/* DÉLAI ET RETARD */}
                <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-600">Échéance de référence : <strong>{dateEcheance}</strong></span>
                  {estEnRetard ? (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠ Paiement en retard de {joursRetard} jour(s)
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Paiement effectué dans les délais
                    </span>
                  )}
                </div>

                {/* DÉCOMPTE CDF */}
                {ordCDF > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <span className="font-bold text-slate-800 text-xs">Décompte en Francs Congolais (CDF)</span>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Montant ordonnancé :</span>
                        <span>{fmtCDF(ordCDF)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Montant payé constaté :</span>
                        <span className="text-emerald-700 font-semibold">{fmtCDF(payCDF)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-100 pt-1 text-slate-900">
                        <span>Reste dû (Manque à gagner) :</span>
                        <span className={resteCDF > 0 ? 'text-red-600' : 'text-emerald-700'}>
                          {fmtCDF(resteCDF)}
                        </span>
                      </div>
                      {resteCDF > 0 && (
                        <>
                          <div className="flex justify-between text-red-600 font-semibold">
                            <span>Pénalité légale (5 % du reste dû) :</span>
                            <span>+ {fmtCDF(penCDF)}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-1 text-sm">
                            <span>Total exigible après pénalité :</span>
                            <span className="text-red-700">{fmtCDF(totalExigibleCDF)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* DÉCOMPTE USD */}
                {ordUSD > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <span className="font-bold text-slate-800 text-xs">Décompte en Dollars Américains (USD)</span>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Montant ordonnancé :</span>
                        <span>{fmtUSD(ordUSD)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Montant payé constaté :</span>
                        <span className="text-emerald-700 font-semibold">{fmtUSD(payUSD)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-100 pt-1 text-slate-900">
                        <span>Reste dû (Manque à gagner) :</span>
                        <span className={resteUSD > 0 ? 'text-red-600' : 'text-emerald-700'}>
                          {fmtUSD(resteUSD)}
                        </span>
                      </div>
                      {resteUSD > 0 && (
                        <>
                          <div className="flex justify-between text-red-600 font-semibold">
                            <span>Pénalité légale (5 % du reste dû) :</span>
                            <span>+ {fmtUSD(penUSD)}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-1 text-sm">
                            <span>Total exigible après pénalité :</span>
                            <span className="text-red-700">{fmtUSD(totalExigibleUSD)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BOUTON D'ENREGISTREMENT */}
              {canEdit && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#093b78] transition disabled:opacity-50"
                  >
                    <span>💾</span>
                    <span>{isPending ? 'Enregistrement en cours...' : 'Enregistrer la Vérification du Contrôle'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
