'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateAssujettiAction } from '@/app/actions/assujettis';
import {
  creerFicheOrdonnancementAction,
  transmettreFicheDivisionControleAction,
} from '@/app/actions/recoupement-ordonnancement';
import type { AssujettiItem, RecoupementSynthese } from '@/lib/recoupement/recoupement-service';
import { Modal } from '@/components/ui/modal';

const ROLES_ECRITURE = ['ANALYSTE', 'CHEF_BUREAU'];

interface Bureau {
  id: string;
  code: string;
  nom: string;
  type: string;
}

interface Secteur {
  id: string;
  code: string;
  nom: string;
  bureau_id: string;
}

export interface FicheItem {
  id: string;
  numero_fiche: string;
  numero_serie: string;
  delai_traitement_jours: number;
  numero_note_perception: string;
  date_note_perception: string;
  acte_generateur: string;
  article_budgetaire: string | null;
  nombre_actes: number;
  montant_cdf: number;
  montant_usd: number;
  statut_transmission: 'CONSERVEE_BUREAU' | 'TRANSMIS_DIVISION_CONTROLE';
  date_transmission_division: string | null;
  created_at: string;
  secteurs?: { id: string; code: string; nom: string } | null;
  bureaux?: { id: string; code: string; nom: string } | null;
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
  assujetti: AssujettiItem;
  fiches: FicheItem[];
  availableBureaux: Bureau[];
  availableSecteurs: Secteur[];
  synthese: RecoupementSynthese | null;
  currentUser: CurrentUser;
}

export function AssujettiDetailClient({
  assujetti: initialAssujetti,
  fiches: initialFiches,
  availableBureaux = [],
  availableSecteurs = [],
  synthese,
  currentUser,
}: Props) {
  const [assujetti, setAssujetti] = useState(initialAssujetti);
  const [fiches, setFiches] = useState<FicheItem[]>(initialFiches || []);

  // Modal mise à jour informations générales
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nom_raison_sociale: assujetti.nom_raison_sociale,
    adresse: assujetti.adresse || '',
    email: assujetti.email || '',
    telephone: assujetti.telephone || '',
    secteur_principal_id: assujetti.secteur_principal_id || '',
  });
  const [editError, setEditError] = useState('');
  const [editPending, startEditTransition] = useTransition();

  // Formulaire Données d'ordonnancement
  const initialSecteurId = assujetti.secteur_principal_id || availableSecteurs[0]?.id || '';
  const foundInitialSecteur = availableSecteurs.find((s) => s.id === initialSecteurId);
  const initialBureauId = foundInitialSecteur ? foundInitialSecteur.bureau_id : (availableBureaux[0]?.id || '');

  const [ordFormData, setOrdFormData] = useState({
    secteur_id: initialSecteurId,
    bureau_id: initialBureauId,
    numero_serie: '',
    delai_traitement_jours: 1,
    numero_note_perception: '',
    date_note_perception: new Date().toISOString().slice(0, 10),
    acte_generateur: '',
    article_budgetaire: '',
    nombre_actes: 1,
    montant_cdf: 0,
    montant_usd: 0,
  });
  const [ordFormError, setOrdFormError] = useState('');
  const [ordFormSuccess, setOrdFormSuccess] = useState('');
  const [ordFormPending, startOrdFormTransition] = useTransition();

  // Action d'envoi fiche au contrôle
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [transmittingPending, startTransmittingTransition] = useTransition();

  const isBureauAnalyse =
    (['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
      (currentUser.bureau_code === 'BUR_ANA_REC' || currentUser.division_code === 'DIV_REC')) ||
    (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_REC') ||
    ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'].includes(currentUser.role);

  const canWrite = ROLES_ECRITURE.includes(currentUser.role) || isBureauAnalyse;
  const canCreateFicheOrdonnancement =
    ['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) && currentUser.bureau_code === 'BUR_ANA_REC';

  // Changement de secteur -> maj automatique du bureau
  const handleSecteurChange = (newSecteurId: string) => {
    const foundSecteur = availableSecteurs.find((s) => s.id === newSecteurId);
    setOrdFormData((prev) => ({
      ...prev,
      secteur_id: newSecteurId,
      bureau_id: foundSecteur?.bureau_id || prev.bureau_id,
    }));
  };

  // Enregistrement des données d'ordonnancement -> création de la Fiche
  const handleSaveOrdonnancement = (e: React.FormEvent) => {
    e.preventDefault();
    setOrdFormError('');
    setOrdFormSuccess('');

    startOrdFormTransition(async () => {
      const res = await creerFicheOrdonnancementAction({
        assujetti_id: assujetti.id,
        secteur_id: ordFormData.secteur_id,
        bureau_id: ordFormData.bureau_id,
        numero_serie: ordFormData.numero_serie,
        delai_traitement_jours: Number(ordFormData.delai_traitement_jours),
        numero_note_perception: ordFormData.numero_note_perception,
        date_note_perception: ordFormData.date_note_perception,
        acte_generateur: ordFormData.acte_generateur,
        article_budgetaire: ordFormData.article_budgetaire || undefined,
        nombre_actes: Number(ordFormData.nombre_actes),
        montant_cdf: Number(ordFormData.montant_cdf),
        montant_usd: Number(ordFormData.montant_usd),
      });

      if (!res.success || !res.data) {
        setOrdFormError(res.error || 'Erreur lors de l’enregistrement de la fiche d’ordonnancement.');
        return;
      }

      setOrdFormSuccess(`Fiche d’ordonnancement ${res.data.numero_fiche} enregistrée avec succès au registre.`);
      const newFiche: FicheItem = {
        id: res.data.id,
        numero_fiche: res.data.numero_fiche,
        numero_serie: res.data.numero_serie,
        delai_traitement_jours: res.data.delai_traitement_jours,
        numero_note_perception: res.data.numero_note_perception,
        date_note_perception: res.data.date_note_perception,
        acte_generateur: res.data.acte_generateur,
        article_budgetaire: res.data.article_budgetaire,
        nombre_actes: res.data.nombre_actes,
        montant_cdf: res.data.montant_cdf,
        montant_usd: res.data.montant_usd,
        statut_transmission: res.data.statut_transmission,
        date_transmission_division: res.data.date_transmission_division,
        created_at: res.data.created_at,
        secteurs: res.data.secteur ? { id: res.data.secteur.id, code: res.data.secteur.code, nom: res.data.secteur.nom } : null,
        bureaux: res.data.bureau ? { id: res.data.bureau.id, code: res.data.bureau.code, nom: res.data.bureau.nom } : null,
      };
      setFiches((prev) => [newFiche, ...prev]);

      // Réinitialiser les champs de formulaire d'ordonnancement
      setOrdFormData((prev) => ({
        ...prev,
        numero_serie: '',
        numero_note_perception: '',
        acte_generateur: '',
        article_budgetaire: '',
        nombre_actes: 1,
        montant_cdf: 0,
        montant_usd: 0,
      }));
    });
  };

  // Envoi direct d'une fiche au contrôle
  const handleEnvoyerAuControle = (ficheId: string) => {
    setTransmittingId(ficheId);
    startTransmittingTransition(async () => {
      const res = await transmettreFicheDivisionControleAction(ficheId);
      if (res.success && res.data) {
        setFiches((prev) =>
          prev.map((f) => (f.id === ficheId ? { ...f, statut_transmission: 'TRANSMIS_DIVISION_CONTROLE' as const } : f))
        );
      }
      setTransmittingId(null);
    });
  };

  // Modification informations générales de l'assujetti
  const handleUpdateAssujetti = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    startEditTransition(async () => {
      const res = await updateAssujettiAction({
        id: assujetti.id,
        nom_raison_sociale: editFormData.nom_raison_sociale,
        adresse: editFormData.adresse || null,
        email: editFormData.email || null,
        telephone: editFormData.telephone || null,
        secteur_principal_id: editFormData.secteur_principal_id || null,
      });

      if (!res.success || !res.data) {
        setEditError(res.error || 'Erreur lors de la mise à jour.');
        return;
      }

      setAssujetti(res.data);
      setShowEditModal(false);
    });
  };

  const isServiceAssiette = currentUser.role === 'SERVICE_ASSIETTE';
  const repertoireUrl = isServiceAssiette ? '/assiette/assujettis' : '/assujettis';

  const fmtMontant = (v: number, devise: string) =>
    `${new Intl.NumberFormat('fr-CD').format(v)} ${devise}`;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="text-[#0a5db5] hover:underline">
          Accueil
        </Link>
        <span>/</span>
        <Link href={repertoireUrl} className="text-[#0a5db5] font-medium hover:underline">
          {isServiceAssiette ? 'Assujettis' : 'Répertoire'}
        </Link>
        <span>/</span>
        <Link href={repertoireUrl} className="text-[#0a5db5] font-medium hover:underline">
          Répertoire
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-900 truncate max-w-xs">{assujetti.nom_raison_sociale}</span>
      </nav>

      {/* Bouton retour explicite */}
      <div>
        <Link
          href={repertoireUrl}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a5db5] hover:underline"
        >
          <span>←</span>
          <span>Retour au répertoire</span>
        </Link>
      </div>

      {/* 2. SECTION A : INFORMATIONS GÉNÉRALES DE L'ASSUJETTI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5] bg-blue-50 px-2 py-0.5 rounded-md">
                Dossier Répertoire Officiel
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                assujetti.actif ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {assujetti.actif ? 'Actif' : 'Inactif'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                {assujetti.type === 'PERSONNE_MORALE' ? 'Personne morale' : 'Personne physique'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{assujetti.nom_raison_sociale}</h1>
            <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">NIF / Identifiant fiscal : {assujetti.identifiant}</p>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => {
                setEditFormData({
                  nom_raison_sociale: assujetti.nom_raison_sociale,
                  adresse: assujetti.adresse || '',
                  email: assujetti.email || '',
                  telephone: assujetti.telephone || '',
                  secteur_principal_id: assujetti.secteur_principal_id || '',
                });
                setEditError('');
                setShowEditModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
            >
              <span>✎</span>
              <span>Modifier les informations</span>
            </button>
          )}
        </div>

        {/* Détails déclaratifs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Secteur d&apos;activité</span>
            <p className="font-bold text-slate-900 mt-0.5">{assujetti.secteur?.nom || 'Non rattaché'}</p>
            {assujetti.secteur?.bureau && (
              <p className="text-[11px] text-slate-500">Bureau : {assujetti.secteur.bureau.nom}</p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Adresse</span>
            <p className="font-semibold text-slate-900 mt-0.5">{assujetti.adresse || 'Non renseignée'}</p>
          </div>

          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Email de contact</span>
            <p className="font-semibold text-slate-900 mt-0.5">{assujetti.email || 'Non renseigné'}</p>
          </div>

          <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Téléphone</span>
            <p className="font-semibold text-slate-900 mt-0.5">{assujetti.telephone || 'Non renseigné'}</p>
          </div>
        </div>
      </div>

      {/* 3. SECTION B : SAISIE DES DONNÉES D'ORDONNANCEMENT */}
      {canCreateFicheOrdonnancement && (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5]">Bureau Analyse & Recoupement</span>
              <h2 className="text-base font-extrabold text-slate-900">
                Saisie des Données d&apos;Ordonnancement & Établissement de la Fiche
              </h2>
              <p className="text-xs text-slate-500">
                Complétez les données d&apos;ordonnancement pour enregistrer la fiche officielle au registre.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0a5db5] border border-blue-200">
              Séparation stricte CDF ≠ USD
            </span>
          </div>

          {ordFormSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
              <span>✓ {ordFormSuccess}</span>
              <Link href="/recoupement/fiches-ordonnancement" className="underline text-emerald-900 hover:opacity-80">
                Voir dans le registre →
              </Link>
            </div>
          )}

          {ordFormError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              ⚠ {ordFormError}
            </div>
          )}

          <form onSubmit={handleSaveOrdonnancement} className="space-y-4 text-xs">
            {/* Ligne 1 : Secteur & Bureau */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Secteur d&apos;activité <span className="text-red-500">*</span>
                </label>
                <select
                  value={ordFormData.secteur_id}
                  onChange={(e) => handleSecteurChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                >
                  {availableSecteurs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bureau de contrôle compétent <span className="text-red-500">*</span>
                </label>
                <select
                  value={ordFormData.bureau_id}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, bureau_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                >
                  {availableBureaux.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ligne 2 : Numéro série & Délai traitement */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Numéro de série du bordereau <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : SERIE-2026-A1"
                  value={ordFormData.numero_serie}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, numero_serie: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Délai de traitement (jours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={ordFormData.delai_traitement_jours}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, delai_traitement_jours: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Ligne 3 : Note de perception */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Numéro de Note de perception <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : NP-2026-0001"
                  value={ordFormData.numero_note_perception}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, numero_note_perception: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Date d&apos;émission de la note de perception <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={ordFormData.date_note_perception}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, date_note_perception: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Ligne 4 : Acte générateur */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Acte générateur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex : Taxe d'implantation ou redevance de régulation"
                value={ordFormData.acte_generateur}
                onChange={(e) => setOrdFormData((prev) => ({ ...prev, acte_generateur: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                required
              />
            </div>

            {/* Ligne 5 : Article budgétaire & Nombre d'actes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Article budgétaire (facultatif)</label>
                <input
                  type="text"
                  placeholder="Ex : ART-7401-2026"
                  value={ordFormData.article_budgetaire}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, article_budgetaire: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre d&apos;actes <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={ordFormData.nombre_actes}
                  onChange={(e) => setOrdFormData((prev) => ({ ...prev, nombre_actes: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Ligne 6 : Montants constatés (CDF & USD strictement séparés) */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Montants constatés (Sans conversion automatique)
                </span>
                <span className="text-[10px] text-slate-500">Renseignez au moins l’un des deux montants</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant dû en Francs Congolais (CDF) :</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ordFormData.montant_cdf}
                    onChange={(e) => setOrdFormData((prev) => ({ ...prev, montant_cdf: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant dû en Dollars Américains (USD) :</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ordFormData.montant_usd}
                    onChange={(e) => setOrdFormData((prev) => ({ ...prev, montant_usd: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={ordFormPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#093b78] transition disabled:opacity-50"
              >
                <span>📋</span>
                <span>{ordFormPending ? 'Enregistrement en cours...' : 'Enregistrer la Fiche d’Ordonnancement'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SECTION C : FICHES D'ORDONNANCEMENT DE CET ASSUJETTI */}
      {!isServiceAssiette && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fiches d&apos;Ordonnancement Établies ({fiches.length})
              </h2>
              <p className="text-xs text-slate-500">
                Fiches d&apos;ordonnancement enregistrées et conservées ou transmises au Contrôle.
              </p>
            </div>
            <Link
              href="/recoupement/fiches-ordonnancement"
              className="text-xs font-bold text-[#0a5db5] hover:underline"
            >
              Accéder au Registre Complet →
            </Link>
          </div>

          {fiches.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">
              Aucune fiche d&apos;ordonnancement enregistrée pour cet assujetti pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Numéro Fiche</th>
                    <th className="px-3 py-2.5">Note de perception</th>
                    <th className="px-3 py-2.5">Bureau compétent</th>
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
                          <p className="font-medium text-slate-900">{f.bureaux?.nom || 'Bureau'}</p>
                          <p className="text-[10px] text-slate-400">{f.secteurs?.nom}</p>
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
                            {!isTransmise && isBureauAnalyse && (
                              <button
                                type="button"
                                onClick={() => handleEnvoyerAuControle(f.id)}
                                disabled={transmittingPending && transmittingId === f.id}
                                className="rounded-lg bg-[#0a5db5] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#093b78] transition disabled:opacity-50"
                              >
                                {transmittingPending && transmittingId === f.id ? 'Envoi...' : '📤 Envoyer au Contrôle'}
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
      )}

      {/* 5. SECTION D : SYNTHÈSE DE RECOUPEMENT & HISTORIQUE */}
      {!isServiceAssiette && synthese && (
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

      {/* MODAL MODIFICATION INFORMATIONS GÉNÉRALES DE L'ASSUJETTI */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier les informations de l'assujetti"
      >
        <form onSubmit={handleUpdateAssujetti} className="space-y-4 text-xs">
          {editError && (
            <div className="p-3 text-red-700 bg-red-50 rounded-lg border border-red-200">
              {editError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Raison sociale / Nom <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editFormData.nom_raison_sociale}
              onChange={(e) => setEditFormData({ ...editFormData, nom_raison_sociale: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Secteur d&apos;activité principal</label>
            <select
              value={editFormData.secteur_principal_id}
              onChange={(e) => setEditFormData({ ...editFormData, secteur_principal_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Non rattaché —</option>
              {availableSecteurs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Adresse</label>
            <textarea
              value={editFormData.adresse}
              onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Téléphone</label>
              <input
                type="tel"
                value={editFormData.telephone}
                onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 font-medium text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={editPending}
              className="px-4 py-2 font-bold text-white bg-[#0a5db5] hover:bg-[#093b78] rounded-lg shadow-xs transition disabled:opacity-60 cursor-pointer"
            >
              {editPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
