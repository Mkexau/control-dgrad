'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FicheOrdonnancementItem } from '@/lib/recoupement/ordonnancement-service';
import { transmettreFicheDivisionControleAction } from '@/app/actions/recoupement-ordonnancement';

interface Props {
  fiche: FicheOrdonnancementItem;
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

export function FicheDetailClient({ fiche: initialFiche, currentUser }: Props) {
  const [fiche, setFiche] = useState<FicheOrdonnancementItem>(initialFiche);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isTransmitting, startTransmission] = useTransition();

  const isTransmise = fiche.statut_transmission === 'TRANSMIS_DIVISION_CONTROLE';

  const canTransmettre =
    !isTransmise &&
    (['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'].includes(currentUser.role) ||
      (['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
        (currentUser.bureau_code === 'BUR_ANA_REC' || currentUser.division_code === 'DIV_REC')) ||
      (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_REC'));

  const handleTransmettre = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransmission(async () => {
      const res = await transmettreFicheDivisionControleAction(fiche.id);
      if (res.success && res.data) {
        setFiche(res.data);
        setSuccessMsg('La fiche a été transmise avec succès au Chef de Division Contrôle.');
      } else {
        setErrorMsg(res.error || 'Erreur lors de la transmission de la fiche.');
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE ET ACTIONS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/recoupement/fiches-ordonnancement" className="text-[#0a5db5] hover:underline">
            ← Registre des Fiches
          </Link>
          <span>/</span>
          <span className="font-mono font-bold text-slate-900">{fiche.numero_fiche}</span>
        </div>

        <div className="flex items-center gap-3">
          {canTransmettre && (
            <button
              onClick={handleTransmettre}
              disabled={isTransmitting}
              className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>📤</span>
              <span>{isTransmitting ? 'Transmission en cours...' : 'Transmettre au Chef de Division Contrôle'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* 2. BANNIÈRE DE STATUT */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between ${
        isTransmise
          ? 'border-purple-200 bg-purple-50/70 text-purple-900'
          : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isTransmise ? '📤' : '📋'}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {isTransmise ? 'Fiche Transmise au Contrôle' : 'Fiche Conservée au Bureau d’Analyse et Recherche'}
            </p>
            <p className="text-xs opacity-80">
              {isTransmise
                ? `Transmise le ${fiche.date_transmission_division ? new Date(fiche.date_transmission_division).toLocaleString('fr-FR') : 'Date non renseignée'} par ${fiche.agent_transmetteur ? `${fiche.agent_transmetteur.prenom} ${fiche.agent_transmetteur.nom}` : 'Agent habilité'}`
                : 'Document archivé et conservé au Bureau Analyse et Recoupement.'}
            </p>
          </div>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
          isTransmise
            ? 'bg-purple-100 border-purple-300 text-purple-800'
            : 'bg-white border-slate-300 text-slate-700'
        }`}>
          {isTransmise ? 'TRANSMIS_DIVISION_CONTROLE' : 'CONSERVEE_BUREAU'}
        </span>
      </div>

      {/* 3. DOCUMENT INSTITUTIONNEL - FICHE D'ORDONNANCEMENT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-8">
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0a5db5]">
              Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              FICHE D&apos;ENREGISTREMENT DES DONNÉES D&apos;ORDONNANCEMENT
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              RÉFÉRENCE OFFICIELLE : {fiche.numero_fiche}
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400">Date d&apos;établissement :</span>
            <p className="font-bold text-slate-900">
              {new Date(fiche.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* GRILLE D'INFORMATIONS */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* SECTION A : ASSUJETTI REDEVABLE */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              1. Identité de l&apos;Assujetti
            </h2>
            <div>
              <span className="text-slate-400">Raison sociale / Nom :</span>
              <p className="text-sm font-bold text-slate-900">{fiche.assujetti?.nom_raison_sociale || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Identifiant fiscal / NIF :</span>
              <p className="font-mono font-semibold text-slate-900">{fiche.assujetti?.identifiant || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Type de personne :</span>
              <p className="font-medium text-slate-700">{fiche.assujetti?.type || 'PERSONNE_MORALE'}</p>
            </div>
          </div>

          {/* SECTION B : SECTEUR & BUREAU */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              2. Compétence Organisationnelle
            </h2>
            <div>
              <span className="text-slate-400">Secteur d&apos;activité :</span>
              <p className="font-semibold text-slate-900">{fiche.secteur?.nom} ({fiche.secteur?.code})</p>
            </div>
            <div>
              <span className="text-slate-400">Bureau de contrôle compétent :</span>
              <p className="font-semibold text-slate-900">{fiche.bureau?.nom} ({fiche.bureau?.code})</p>
            </div>
            <div>
              <span className="text-slate-400">Division de tutelle :</span>
              <p className="font-medium text-slate-700">Division Contrôle (DIV_CTRL)</p>
            </div>
          </div>

          {/* SECTION C : DONNÉES D'ORDONNANCEMENT */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              3. Note de Perception & Ordonnancement
            </h2>
            <div>
              <span className="text-slate-400">Numéro de série du bordereau :</span>
              <p className="font-mono font-bold text-slate-900">{fiche.numero_serie}</p>
            </div>
            <div>
              <span className="text-slate-400">Délai de traitement imparti :</span>
              <p className="font-semibold text-slate-900">{fiche.delai_traitement_jours} jours calendaires</p>
            </div>
            <div>
              <span className="text-slate-400">Numéro & Date de la note de perception :</span>
              <p className="font-mono font-bold text-slate-900">{fiche.numero_note_perception} du {fiche.date_note_perception}</p>
            </div>
            <div>
              <span className="text-slate-400">Acte générateur :</span>
              <p className="font-medium text-slate-900">{fiche.acte_generateur}</p>
            </div>
            <div>
              <span className="text-slate-400">Article budgétaire & Nombre d&apos;actes :</span>
              <p className="font-medium text-slate-700">Art. {fiche.article_budgetaire || 'Non spécifié'} · {fiche.nombre_actes} acte(s)</p>
            </div>
          </div>

          {/* SECTION D : MONTANTS CONSTATÉS */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 space-y-4 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-200 pb-2">
              4. Montants Constatés (Sans Conversion)
            </h2>

            <div className="space-y-3">
              <div className="rounded-lg bg-white p-3 border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Montant dû en Francs Congolais</span>
                <p className="mt-1 font-mono text-base font-extrabold text-slate-900">
                  {fiche.montant_cdf > 0 ? (
                    <span>{new Intl.NumberFormat('fr-CD').format(fiche.montant_cdf)} <span className="text-xs font-sans text-blue-700">CDF</span></span>
                  ) : (
                    <span className="text-slate-400 font-normal">0,00 CDF</span>
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3 border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Montant dû en Dollars Américains</span>
                <p className="mt-1 font-mono text-base font-extrabold text-emerald-800">
                  {fiche.montant_usd > 0 ? (
                    <span>{new Intl.NumberFormat('fr-CD').format(fiche.montant_usd)} <span className="text-xs font-sans text-emerald-700">USD</span></span>
                  ) : (
                    <span className="text-slate-400 font-normal">0,00 USD</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION E : TRAÇABILITÉ & SIGNATURE */}
        <div className="border-t border-slate-200 pt-6 text-xs text-slate-500 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <span className="font-bold text-slate-700">Établi par :</span>
            <p className="font-medium text-slate-900 mt-0.5">
              {fiche.createur ? `${fiche.createur.prenom} ${fiche.createur.nom}` : 'Bureau Analyse et Recoupement'}
            </p>
            <p className="text-[11px] text-slate-400">Division Recoupement · DGRAD</p>
          </div>

          <div>
            <span className="font-bold text-slate-700">Transmission à la Division Contrôle :</span>
            <p className="font-medium text-slate-900 mt-0.5">
              {isTransmise
                ? `Transmis par ${fiche.agent_transmetteur ? `${fiche.agent_transmetteur.prenom} ${fiche.agent_transmetteur.nom}` : 'Agent autorisé'}`
                : 'En attente de transmission'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isTransmise && fiche.date_transmission_division
                ? `Le ${new Date(fiche.date_transmission_division).toLocaleString('fr-FR')}`
                : 'Copie actuellement conservée au Bureau'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
