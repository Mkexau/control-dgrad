'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InformationRecueItem } from '@/lib/recoupement/ordonnancement-service';
import type { AssujettiItem } from '@/lib/recoupement/recoupement-service';

import {
  prendreEnChargeInformationAction,
  associerAssujettiInformationAction,
  creerAssujettiDepuisInformationAction,
  creerFicheOrdonnancementAction,
} from '@/app/actions/recoupement-ordonnancement';

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

interface Props {
  information: InformationRecueItem;
  availableAssujettis: AssujettiItem[];
  availableBureaux: Bureau[];
  availableSecteurs: Secteur[];
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

export function InformationDetailClient({
  information: initialInfo,
  availableAssujettis = [],
  availableBureaux = [],
  availableSecteurs = [],
  currentUser,
}: Props) {
  const router = useRouter();
  const [info, setInfo] = useState<InformationRecueItem>(initialInfo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transitions
  const [isTakingCharge, startTakeCharge] = useTransition();
  const [isLinking, startLinking] = useTransition();
  const [isCreatingAssujetti, startCreatingAssujetti] = useTransition();
  const [isCreatingFiche, startCreatingFiche] = useTransition();

  // Association assujetti
  const [selectedAssujettiId, setSelectedAssujettiId] = useState<string>(info.assujetti_id || '');
  const [assujettiType, setAssujettiType] = useState<'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE'>('PERSONNE_MORALE');
  const [assujettiSecteurId, setAssujettiSecteurId] = useState(info.secteur_id || availableSecteurs[0]?.id || '');

  // Formulaire Fiche d'ordonnancement
  const defaultSecteur = availableSecteurs.find((s) => s.id === info.secteur_id || s.code === info.secteur_code);
  const defaultBureauId = defaultSecteur ? defaultSecteur.bureau_id : (availableBureaux[0]?.id || '');

  const [formData, setFormData] = useState({
    bureau_id: defaultBureauId,
    secteur_id: defaultSecteur?.id || info.secteur_id || (availableSecteurs[0]?.id || ''),
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

  const canManage =
    ['DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES'].includes(currentUser.role) ||
    (['CHEF_BUREAU', 'ANALYSTE'].includes(currentUser.role) &&
      (currentUser.bureau_code === 'BUR_ANA_REC' || currentUser.division_code === 'DIV_REC')) ||
    (currentUser.role === 'CHEF_DIVISION' && currentUser.division_code === 'DIV_REC');

  const handlePrendreEnCharge = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTakeCharge(async () => {
      const res = await prendreEnChargeInformationAction(info.id);
      if (res.success && res.data) {
        setInfo(res.data);
        setSuccessMsg('Bordereau d’information pris en charge avec succès.');
      } else {
        setErrorMsg(res.error || 'Erreur lors de la prise en charge.');
      }
    });
  };

  const handleAssocierAssujetti = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssujettiId) {
      setErrorMsg('Veuillez sélectionner un assujetti.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    startLinking(async () => {
      const res = await associerAssujettiInformationAction(info.id, selectedAssujettiId);
      if (res.success && res.data) {
        setInfo(res.data);
        setSuccessMsg('Assujetti officiel lié avec succès.');
      } else {
        setErrorMsg(res.error || 'Erreur lors de l’association.');
      }
    });
  };

  const handleCreerAssujetti = () => {
    if (!assujettiSecteurId) {
      setErrorMsg('Sélectionnez le secteur principal de l’assujetti.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    startCreatingAssujetti(async () => {
      const res = await creerAssujettiDepuisInformationAction(info.id, assujettiType, assujettiSecteurId);
      if (res.success && res.data) {
        setInfo(res.data);
        setSelectedAssujettiId(res.data.assujetti_id || '');
        setSuccessMsg('Assujetti officiel créé et lié à cette arrivée.');
      } else {
        setErrorMsg(res.error || 'Erreur lors de la création de l’assujetti.');
      }
    });
  };

  const handleCreerFiche = (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.assujetti_id && !selectedAssujettiId) {
      setErrorMsg('Veuillez associer un assujetti officiel avant de créer la fiche d’ordonnancement.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const assujettiId = info.assujetti_id || selectedAssujettiId;

    startCreatingFiche(async () => {
      const res = await creerFicheOrdonnancementAction({
        information_recue_id: info.id,
        assujetti_id: assujettiId,
        secteur_id: formData.secteur_id,
        bureau_id: formData.bureau_id,
        numero_serie: formData.numero_serie,
        delai_traitement_jours: Number(formData.delai_traitement_jours),
        numero_note_perception: formData.numero_note_perception,
        date_note_perception: formData.date_note_perception,
        acte_generateur: formData.acte_generateur,
        article_budgetaire: formData.article_budgetaire || undefined,
        nombre_actes: Number(formData.nombre_actes),
        montant_cdf: Number(formData.montant_cdf),
        montant_usd: Number(formData.montant_usd),
      });

      if (res.success && res.data) {
        router.push(`/recoupement/fiches-ordonnancement/${res.data.id}`);
      } else {
        setErrorMsg(res.error || 'Erreur lors de l’enregistrement de la fiche.');
      }
    });
  };

  // Synchronisation du bureau quand le secteur change
  const handleSecteurChange = (newSecteurId: string) => {
    const foundSecteur = availableSecteurs.find((s) => s.id === newSecteurId);
    setFormData((prev) => ({
      ...prev,
      secteur_id: newSecteurId,
      bureau_id: foundSecteur?.bureau_id || prev.bureau_id,
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE ET ACTIONS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/recoupement/informations-recues" className="text-[#0a5db5] hover:underline">
            ← Arrivées d&apos;Informations
          </Link>
          <span>/</span>
          <span className="font-mono font-bold text-slate-900">{info.numero_reference}</span>
        </div>

        <div className="flex items-center gap-3">
          {info.statut === 'A_TRAITER' && canManage && (
            <button
              onClick={handlePrendreEnCharge}
              disabled={isTakingCharge}
              className="rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-xs disabled:opacity-50"
            >
              {isTakingCharge ? 'Prise en charge...' : '⚡ Prendre en charge ce dossier'}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 2. PANNEAU DE GAUCHE : DONNÉES DU SERVICE D'ASSIETTE */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Source Externe</span>
              <h2 className="text-base font-bold text-slate-900">Bordereau d&apos;Information</h2>
              <p className="text-xs text-slate-500">Transmis par le Service d&apos;assiette</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Numéro de référence :</span>
                <p className="font-mono font-bold text-slate-900">{info.numero_reference}</p>
              </div>

              <div>
                <span className="text-slate-400">Date de réception :</span>
                <p className="font-medium text-slate-900">{info.date_reception}</p>
              </div>

              <div>
                <span className="text-slate-400">Secteur déclaré :</span>
                <p className="font-semibold text-slate-900">{info.secteur?.nom || info.secteur_code}</p>
              </div>

              <div>
                <span className="text-slate-400">Forme juridique :</span>
                <p className="font-medium text-slate-900">{info.forme_juridique || 'Non communiquée'}</p>
              </div>

              <div>
                <span className="text-slate-400">Adresse déclarée :</span>
                <p className="font-medium text-slate-900">{info.adresse_declaree || 'Non communiquée'}</p>
              </div>
            </div>
          </div>

          {/* VÉRIFICATION DE L'ASSUJETTI */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Identification de l&apos;Assujetti</h3>

            <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
              <span className="text-slate-400">Déclaré par la source :</span>
              <p className="font-semibold text-slate-900">{info.nom_assujetti_declare}</p>
              <p className="font-mono text-slate-500">{info.identifiant_assujetti_declare}</p>
            </div>

            {info.assujetti ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs border border-emerald-200">
                <span className="font-bold text-emerald-800">✓ Assujetti confirmé en base :</span>
                <p className="mt-1 font-semibold text-slate-900">{info.assujetti.nom_raison_sociale}</p>
                <p className="font-mono text-slate-600">{info.assujetti.identifiant}</p>
              </div>
            ) : (
              <form onSubmit={handleAssocierAssujetti} className="space-y-3 text-xs">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-800 border border-amber-200">
                  <span className="font-bold">⚠ Non lié automatiquement</span>
                  <p className="mt-0.5">Veuillez sélectionner l&apos;assujetti officiel dans le répertoire pour valider le dossier.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assujetti officiel :</label>
                  <select
                    value={selectedAssujettiId}
                    onChange={(e) => setSelectedAssujettiId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                  >
                    <option value="">-- Sélectionner dans le répertoire --</option>
                    {availableAssujettis.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom_raison_sociale} ({a.identifiant})
                      </option>
                    ))}
                  </select>
                </div>

                {canManage && info.statut !== 'TRAITE' && (
                  <button
                    type="submit"
                    disabled={isLinking || !selectedAssujettiId}
                    className="w-full rounded-xl bg-slate-800 py-2 font-bold text-white hover:bg-slate-900 transition disabled:opacity-50"
                  >
                    {isLinking ? 'Liaison en cours...' : 'Associer cet assujetti'}
                  </button>
                )}

                {canManage && info.statut !== 'TRAITE' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <p className="font-semibold text-slate-700">Aucun résultat dans le répertoire ?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={assujettiType} onChange={(e) => setAssujettiType(e.target.value as 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE')} className="rounded-lg border border-slate-200 bg-white p-2">
                        <option value="PERSONNE_MORALE">Personne morale</option>
                        <option value="PERSONNE_PHYSIQUE">Personne physique</option>
                      </select>
                      <select value={assujettiSecteurId} onChange={(e) => setAssujettiSecteurId(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2">
                        <option value="">Secteur principal</option>
                        {availableSecteurs.map((secteur) => <option key={secteur.id} value={secteur.id}>{secteur.nom}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={handleCreerAssujetti} disabled={isCreatingAssujetti || !assujettiSecteurId} className="w-full rounded-lg border border-[#0a5db5] bg-white py-2 font-bold text-[#0a5db5] disabled:opacity-50">
                      {isCreatingAssujetti ? 'Création…' : 'Créer et associer un assujetti officiel'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* 3. PANNEAU DE DROITE : ÉTABLISSEMENT DE LA FICHE D'ORDONNANCEMENT */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a5db5]">Livrable Métier</span>
              <h2 className="text-lg font-extrabold text-slate-900">
                Fiche d&apos;Enregistrement des Données d&apos;Ordonnancement
              </h2>
              <p className="text-xs text-slate-500">
                Validation définitive des données à conserver et à transmettre au Chef de Division Contrôle.
              </p>
            </div>

            {info.statut === 'TRAITE' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-3">
                <span className="text-2xl">✓</span>
                <h3 className="text-base font-bold text-emerald-900">Information déjà traitée</h3>
                <p className="text-xs text-emerald-700">
                  La fiche d&apos;enregistrement des données d&apos;ordonnancement a été établie et enregistrée au registre.
                </p>
                <Link
                  href="/recoupement/fiches-ordonnancement"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  <span>📋 Consulter le registre des fiches</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreerFiche} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Secteur d&apos;activité :</label>
                    <select
                      value={formData.secteur_id}
                      onChange={(e) => handleSecteurChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                    >
                      {availableSecteurs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bureau de contrôle compétent :</label>
                    <select
                      value={formData.bureau_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bureau_id: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                    >
                      {availableBureaux.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nom} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Numéro de série :</label>
                    <input
                      type="text"
                      value={formData.numero_serie}
                      onChange={(e) => setFormData((prev) => ({ ...prev, numero_serie: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Délai de traitement (jours) :</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.delai_traitement_jours}
                      onChange={(e) => setFormData((prev) => ({ ...prev, delai_traitement_jours: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Numéro de Note de perception :</label>
                    <input
                      type="text"
                      value={formData.numero_note_perception}
                      onChange={(e) => setFormData((prev) => ({ ...prev, numero_note_perception: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date de Note de perception :</label>
                    <input
                      type="date"
                      value={formData.date_note_perception}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date_note_perception: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Acte générateur :</label>
                  <input
                    type="text"
                    value={formData.acte_generateur}
                    onChange={(e) => setFormData((prev) => ({ ...prev, acte_generateur: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Article budgétaire :</label>
                    <input
                      type="text"
                      value={formData.article_budgetaire}
                      onChange={(e) => setFormData((prev) => ({ ...prev, article_budgetaire: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre d&apos;actes :</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.nombre_actes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nombre_actes: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Montants constatés (Séparation stricte CDF & USD)
                  </span>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Montant dû en CDF :</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.montant_cdf}
                        onChange={(e) => setFormData((prev) => ({ ...prev, montant_cdf: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Montant dû en USD :</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.montant_usd}
                        onChange={(e) => setFormData((prev) => ({ ...prev, montant_usd: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 focus:border-[#0a5db5] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreatingFiche || (!info.assujetti_id && !selectedAssujettiId)}
                      className="w-full rounded-xl bg-[#0a5db5] py-3 text-xs font-bold text-white hover:bg-[#093b78] transition shadow-sm disabled:opacity-50"
                    >
                      {isCreatingFiche
                        ? 'Enregistrement de la Fiche en cours...'
                        : '📋 Enregistrer la Fiche d’Ordonnancement (Conservation Bureau)'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
