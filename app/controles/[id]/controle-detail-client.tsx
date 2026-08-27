'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : EXÉCUTION DU CONTRÔLE & RÉSULTATS FINANCIERS (ÉTAPE 8)
// =============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@/lib/validations/auth';
import type { ControleStatus } from '@/lib/validations/controles';
import type { CurrencyType, ResultatType } from '@/lib/validations/results';
import { ControleStatusBadge } from '@/components/missions/mission-badges';
import {
  demarrerControle,
  enregistrerConstatations,
  terminerControle,
} from '@/app/actions/controles';
import {
  saveResultatControle,
  genererAvisRecouvrement,
  deleteRedressement,
  deletePenalite,
} from '@/app/actions/results';
import { getMissionDocumentDownloadUrl } from '@/app/actions/missions';
import {
  creerDemandeRenseignements,
  enregistrerReponseDemandeRenseignements,
  relancerDemandeRenseignements,
} from '@/app/actions/demandes-renseignements';

export interface RedressementData {
  id: string;
  montant: number;
  devise: CurrencyType;
  motif: string;
  statut?: string | null;
  created_at: string;
}

export interface PenaliteData {
  id: string;
  montant: number;
  devise: CurrencyType;
  motif: string;
  created_at: string;
}

export interface AvisRecouvrementData {
  id: string;
  reference: string;
  date: string;
  montant: number;
  devise: CurrencyType;
  storage_path?: string | null;
  created_at: string;
}

export interface ResultatControleData {
  id: string;
  type_resultat: ResultatType;
  montant_du?: number | null;
  montant_penalites?: number | null;
  montant_total?: number | null;
  devise: CurrencyType;
  justification?: string | null;
  created_at: string;
  updated_at: string;
  redressements?: RedressementData[];
  penalites?: PenaliteData[];
  avis_recouvrement?: AvisRecouvrementData[] | AvisRecouvrementData | null;
}

export interface ControleDetailData {
  id: string;
  mission_id: string;
  equipe_id?: string | null;
  assujetti_id: string;
  type_controle: 'SUR_PLACE' | 'SUR_PIECES';
  controleur_responsable_id?: string | null;
  statut: ControleStatus;
  date_debut?: string | null;
  date_fin?: string | null;
  observations?: string | null;
  created_at: string;
  updated_at: string;
  missions: {
    id: string;
    reference: string;
    type_controle: string;
    statut: string;
    motif?: string | null;
    date_approbation?: string | null;
    bureau_id: string;
    bureaux?: { code: string; nom: string } | null;
    secteurs?: { code: string; nom: string } | null;
    ordres_mission?: { id: string; reference: string; storage_path: string } | null;
    autorisations_controle_pieces?: { id: string; reference: string; storage_path: string } | null;
  };
  equipes?: {
    id: string;
    nom: string;
    statut: string;
    chef_equipe_id: string;
    agents?: {
      id: string;
      matricule: string;
      profiles?: { nom: string; prenom: string; email: string } | null;
    } | null;
  } | null;
  assujettis: {
    id: string;
    type: string;
    identifiant: string;
    nom_raison_sociale: string;
    adresse?: string | null;
    email?: string | null;
    telephone?: string | null;
    secteurs?: { nom: string } | null;
  };
  profiles?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  } | null;
  resultats_controle?: ResultatControleData[] | ResultatControleData | null;
}

export interface DemandeRenseignementsData {
  id: string;
  statut: string;
  date_envoi: string;
  date_limite?: string | null;
  date_reponse?: string | null;
  contenu: string;
  created_at: string;
  auteur?: { nom: string; prenom: string } | null;
}

interface ControleDetailClientProps {
  controle: ControleDetailData;
  currentUser: CurrentUser;
  userAgentId: string | null;
  auditLogs: {
    id: string;
    action: string;
    created_at: string;
    old_data?: Record<string, unknown> | null;
    new_data?: Record<string, unknown> | null;
    profiles?: { nom: string; prenom: string; email: string; role: string } | null;
  }[];
  demandesRenseignements?: DemandeRenseignementsData[];
}

export function ControleDetailClient({
  controle,
  currentUser,
  userAgentId,
  auditLogs,
  demandesRenseignements = [],
}: ControleDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Extraction du résultat existant
  const existingResultat: ResultatControleData | null = Array.isArray(controle.resultats_controle)
    ? controle.resultats_controle[0] || null
    : controle.resultats_controle || null;

  const existingAvis: AvisRecouvrementData | null = existingResultat?.avis_recouvrement
    ? Array.isArray(existingResultat.avis_recouvrement)
      ? existingResultat.avis_recouvrement[0] || null
      : existingResultat.avis_recouvrement
    : null;

  // États pour les opérations de terrain
  const [observations, setObservations] = useState(controle.observations || '');
  const [dateDebutInput, setDateDebutInput] = useState(
    controle.date_debut || new Date().toISOString().split('T')[0]
  );
  const [dateFinInput, setDateFinInput] = useState(
    controle.date_fin || new Date().toISOString().split('T')[0]
  );

  // États pour les résultats financiers
  const [typeResultat, setTypeResultat] = useState<ResultatType>(
    existingResultat?.type_resultat || 'CHARGEE'
  );
  const [devise, setDevise] = useState<CurrencyType>(existingResultat?.devise || 'CDF');
  const [justification, setJustification] = useState<string>(
    existingResultat?.justification || ''
  );

  // Listes locales pour ajouts dynamiques
  const [newRedressements, setNewRedressements] = useState<{ motif: string; montant: number }[]>([]);
  const [tempRedMotif, setTempRedMotif] = useState('');
  const [tempRedMontant, setTempRedMontant] = useState('');

  const [newPenalites, setNewPenalites] = useState<{ motif: string; montant: number }[]>([]);
  const [tempPenMotif, setTempPenMotif] = useState('');
  const [tempPenMontant, setTempPenMontant] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);

  // États pour les demandes de renseignements
  const [demandesLocales, setDemandesLocales] = useState<DemandeRenseignementsData[]>(demandesRenseignements);
  const [demandeContenu, setDemandeContenu] = useState('');
  const [demandeDateLimite, setDemandeDateLimite] = useState('');
  const [isSubmittingDemande, setIsSubmittingDemande] = useState(false);
  const [demandeError, setDemandeError] = useState<string | null>(null);

  // Vérifier si l'utilisateur est le chef d'équipe ou le contrôleur responsable
  const isChefEquipe =
    controle.type_controle === 'SUR_PLACE' &&
    userAgentId &&
    userAgentId === controle.equipes?.chef_equipe_id;

  const isControleurPieces =
    controle.type_controle === 'SUR_PIECES' &&
    controle.controleur_responsable_id === currentUser.id;

  const isHierarchy =
    currentUser.role === 'CHEF_BUREAU' ||
    currentUser.role === 'CHEF_DIVISION' ||
    currentUser.role === 'DIRECTEUR_CONTROLES' ||
    currentUser.role === 'DIRECTEUR_GENERAL';

  const canExecute =
    (isChefEquipe || isControleurPieces || isHierarchy) &&
    (currentUser.role as string) !== 'ADMIN';

  // Les demandes de renseignements font partie de l'exécution SUR_PIECES :
  // elles sont strictement réservées au contrôleur responsable désigné.
  const canManageDemandesRenseignements =
    isControleurPieces &&
    currentUser.bureau_id === controle.missions.bureau_id &&
    (controle.statut === 'EN_ATTENTE' || controle.statut === 'EN_COURS');

  // Calcul dynamique des montants
  const existingRedSum =
    existingResultat?.redressements?.reduce((acc, r) => acc + Number(r.montant || 0), 0) ||
    Number(existingResultat?.montant_du || 0);
  const newRedSum = newRedressements.reduce((acc, r) => acc + Number(r.montant || 0), 0);
  const calculatedMontantDu = existingRedSum + newRedSum;

  const existingPenSum =
    existingResultat?.penalites?.reduce((acc, p) => acc + Number(p.montant || 0), 0) ||
    Number(existingResultat?.montant_penalites || 0);
  const newPenSum = newPenalites.reduce((acc, p) => acc + Number(p.montant || 0), 0);
  const calculatedMontantPenalites = existingPenSum + newPenSum;

  const totalFinal =
    typeResultat === 'DECHARGEE'
      ? 0
      : Math.round((calculatedMontantDu + calculatedMontantPenalites) * 100) / 100;

  // 1. Démarrer le contrôle
  const handleStart = () => {
    if (!confirm('Confirmez-vous le démarrage officiel des opérations de terrain pour cet assujetti ?')) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await demarrerControle({
        controle_id: controle.id,
        date_debut: dateDebutInput,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors du démarrage du contrôle.');
      } else {
        setSuccessMessage('Le contrôle a été démarré avec succès.');
        router.refresh();
      }
    });
  };

  // 2. Enregistrer les constatations
  const handleSaveConstatations = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await enregistrerConstatations({
        controle_id: controle.id,
        observations,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de l’enregistrement des constatations.');
      } else {
        setSuccessMessage('Constatations enregistrées avec succès.');
        router.refresh();
      }
    });
  };

  // 3. Clôturer le contrôle
  const handleFinish = () => {
    if (!confirm('Confirmez-vous la fin officielle des vérifications de terrain pour cet assujetti ?')) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await terminerControle({
        controle_id: controle.id,
        observations,
        date_fin: dateFinInput,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de la clôture du contrôle.');
      } else {
        setSuccessMessage('Le contrôle a été clôturé avec succès.');
        router.refresh();
      }
    });
  };

  // 4. Ajouter un redressement local
  const handleAddLocalRedressement = () => {
    const val = parseFloat(tempRedMontant);
    if (!tempRedMotif.trim() || isNaN(val) || val < 0) {
      alert('Veuillez renseigner un motif (au moins 3 caractères) et un montant positif.');
      return;
    }
    setNewRedressements([...newRedressements, { motif: tempRedMotif.trim(), montant: val }]);
    setTempRedMotif('');
    setTempRedMontant('');
  };

  // 5. Ajouter une pénalité locale
  const handleAddLocalPenalite = () => {
    const val = parseFloat(tempPenMontant);
    if (!tempPenMotif.trim() || isNaN(val) || val < 0) {
      alert('Veuillez renseigner un motif (au moins 3 caractères) et un montant positif.');
      return;
    }
    setNewPenalites([...newPenalites, { motif: tempPenMotif.trim(), montant: val }]);
    setTempPenMotif('');
    setTempPenMontant('');
  };

  // 6. Supprimer un redressement existant en base
  const handleDeleteExistingRedressement = (id: string) => {
    if (!confirm('Voulez-vous supprimer ce redressement ?')) return;
    startTransition(async () => {
      const res = await deleteRedressement({ redressement_id: id });
      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de la suppression.');
      } else {
        router.refresh();
      }
    });
  };

  // 7. Supprimer une pénalité existante en base
  const handleDeleteExistingPenalite = (id: string) => {
    if (!confirm('Voulez-vous supprimer cette pénalité ?')) return;
    startTransition(async () => {
      const res = await deletePenalite({ penalite_id: id });
      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de la suppression.');
      } else {
        router.refresh();
      }
    });
  };

  // 8. Enregistrer le résultat financier complet
  const handleSaveResultat = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (typeResultat === 'DECHARGEE' && (!justification || justification.trim().length < 5)) {
      setErrorMessage('Une justification détaillée (au moins 5 caractères) est obligatoire pour un résultat déchargé.');
      return;
    }

    startTransition(async () => {
      const res = await saveResultatControle({
        controle_id: controle.id,
        type_resultat: typeResultat,
        devise,
        montant_du: typeResultat === 'DECHARGEE' ? 0 : calculatedMontantDu,
        montant_penalites: typeResultat === 'DECHARGEE' ? 0 : calculatedMontantPenalites,
        montant_total: totalFinal,
        justification: typeResultat === 'DECHARGEE' ? justification : justification || null,
        redressements: newRedressements,
        penalites: newPenalites,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de l’enregistrement du résultat.');
      } else {
        setSuccessMessage('Résultat du contrôle enregistré avec succès.');
        setNewRedressements([]);
        setNewPenalites([]);
        router.refresh();
      }
    });
  };

  // 9. Générer l'avis de recouvrement
  const handleGenerateAvis = () => {
    if (!existingResultat) return;
    if (!confirm('Confirmez-vous la génération officielle de l’Avis de Recouvrement pour ce résultat chargé ?')) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await genererAvisRecouvrement({
        resultat_id: existingResultat.id,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de la génération de l’avis de recouvrement.');
      } else {
        setSuccessMessage(`Avis de recouvrement ${res.data?.reference} émis avec succès.`);
        router.refresh();
      }
    });
  };

  // 10. Télécharger document officiel
  const handleDownloadDoc = async (storagePath: string) => {
    try {
      setIsDownloadingDoc(true);
      const res = await getMissionDocumentDownloadUrl({
        storage_path: storagePath,
        mission_id: controle.mission_id,
      });
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        alert(res.error || 'Impossible de récupérer le document.');
      }
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  const om = controle.missions.ordres_mission;
  const aut = controle.missions.autorisations_controle_pieces;
  const docToDownload = om || aut;

  return (
    <div className="space-y-6">
      {/* Messages d'alerte */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs hover:underline font-bold">
            Fermer
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs hover:underline font-bold">
            Fermer
          </button>
        </div>
      )}

      {/* En-tête principal */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                {controle.type_controle}
              </span>
              <ControleStatusBadge statut={controle.statut} />
              {existingResultat && (
                <span className={`text-xs font-mono px-2.5 py-1 rounded font-bold ${
                  existingResultat.type_resultat === 'CHARGEE'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}>
                  RÉSULTAT : {existingResultat.type_resultat}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
              Contrôle : {controle.assujettis.nom_raison_sociale}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Rattaché à la mission{' '}
              <Link
                href={`/missions/${controle.mission_id}`}
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                {controle.missions.reference}
              </Link>{' '}
              ({controle.missions.bureaux?.nom})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {docToDownload?.storage_path && (
              <button
                onClick={() => handleDownloadDoc(docToDownload.storage_path)}
                disabled={isDownloadingDoc}
                className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-xl transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{om ? 'Ordre de Mission' : 'Autorisation'}</span>
              </button>
            )}

            {controle.equipe_id && (
              <Link
                href={`/equipes/${controle.equipe_id}`}
                className="px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl transition-all flex items-center gap-2"
              >
                <span>Voir l&apos;équipe</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Stepper opérationnel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="p-3 rounded-xl border text-xs bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium">
            <div className="uppercase text-[10px] tracking-wider text-zinc-500 dark:text-zinc-400">Étape 1</div>
            <div className="text-sm font-black mt-0.5">Mission validée & OM</div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
              Réf: {docToDownload?.reference || 'Disponible'}
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-xs ${
            controle.statut === 'EN_COURS'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 font-bold ring-2 ring-blue-500/20'
              : controle.statut === 'TERMINE'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-400 font-medium'
          }`}>
            <div className="uppercase text-[10px] tracking-wider text-zinc-500 dark:text-zinc-400">Étape 2</div>
            <div className="text-sm font-black mt-0.5">Opérations & Constatations</div>
            {controle.date_debut && (
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                Début : {new Date(controle.date_debut).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>

          <div className={`p-3 rounded-xl border text-xs ${
            controle.statut === 'TERMINE'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-400 font-medium'
          }`}>
            <div className="uppercase text-[10px] tracking-wider text-zinc-500 dark:text-zinc-400">Étape 3</div>
            <div className="text-sm font-black mt-0.5">Contrôle terminé</div>
            {controle.date_fin && (
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                Fin : {new Date(controle.date_fin).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>

          <div className={`p-3 rounded-xl border text-xs ${
            existingResultat
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-bold'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-400 font-medium'
          }`}>
            <div className="uppercase text-[10px] tracking-wider text-zinc-500 dark:text-zinc-400">Étape 4</div>
            <div className="text-sm font-black mt-0.5">Résultats & Sanctions</div>
            {existingResultat ? (
              <div className="text-[11px] font-mono text-purple-700 dark:text-purple-300 mt-0.5">
                {existingResultat.type_resultat === 'CHARGEE'
                  ? `${existingResultat.montant_total?.toLocaleString('fr-FR')} ${existingResultat.devise}`
                  : 'DÉCHARGÉE'}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-400 mt-0.5">À établir</div>
            )}
          </div>
        </div>
      </div>

      {/* Détails de l'assujetti & de la mission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 : Fiche Assujetti & Intervenant */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Fiche Assujetti</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Raison sociale :</span>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                  {controle.assujettis.nom_raison_sociale}
                </div>
              </div>

              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Identifiant fiscal / RCCM :</span>
                <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {controle.assujettis.identifiant}
                </div>
              </div>

              {controle.assujettis.adresse && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Adresse physique :</span>
                  <div className="text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {controle.assujettis.adresse}
                  </div>
                </div>
              )}

              {controle.assujettis.secteurs?.nom && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Secteur d&apos;activité :</span>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {controle.assujettis.secteurs.nom}
                  </div>
                </div>
              )}

              {controle.assujettis.telephone && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Téléphone :</span>
                  <div className="text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {controle.assujettis.telephone}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avis de Recouvrement si généré */}
          {existingAvis && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 font-mono text-[10px] font-black rounded uppercase">
                  Titre Exécutoire Émis
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {new Date(existingAvis.date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                  Avis de Recouvrement
                </h3>
                <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">
                  Réf: {existingAvis.reference}
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Montant officiel :</span>
                <span className="font-black font-mono text-emerald-800 dark:text-emerald-200 text-sm">
                  {existingAvis.montant?.toLocaleString('fr-FR')} {existingAvis.devise}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Colonne 2 & 3 : Opérations de Terrain & Résultats Financiers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action 1 : Démarrage du contrôle si EN_ATTENTE */}
          {controle.statut === 'EN_ATTENTE' && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Démarrer le contrôle sur le terrain
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    L&apos;ordre de mission officiel a été validé. Cliquez sur le bouton ci-dessous pour acter le début officiel des vérifications chez l&apos;assujetti.
                  </p>
                </div>
              </div>

              {canExecute ? (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <label htmlFor="dateDebut" className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Date de début effective :
                    </label>
                    <input
                      id="dateDebut"
                      type="date"
                      value={dateDebutInput}
                      onChange={(e) => setDateDebutInput(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={isPending}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span>{isPending ? 'Démarrage...' : 'Démarrer le contrôle'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-500 text-center">
                  Seul le Chef d&apos;équipe désigné ou un responsable habilité peut démarrer ce contrôle.
                </div>
              )}
            </div>
          )}

          {/* Formulaire de saisie des constatations (si EN_COURS ou TERMINE) */}
          {(controle.statut === 'EN_COURS' || controle.statut === 'TERMINE') && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Constatations préliminaires & Observations de terrain
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Saisie des constats, anomalies relevées, vérifications comptables et actes générateurs contrôlés.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {observations.length} / 5000 car.
                </span>
              </div>

              {controle.statut === 'EN_COURS' && canExecute ? (
                <div className="space-y-4">
                  <textarea
                    rows={6}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Saisissez ici les constatations détaillées issues du contrôle sur place (ex: vérification des quittances, déclarations, pièces justificatives, irrégularités éventuelles)..."
                    className="w-full p-4 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={handleSaveConstatations}
                      disabled={isPending || observations.trim().length < 5}
                      className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 disabled:opacity-50 rounded-xl transition-all"
                    >
                      {isPending ? 'Enregistrement...' : 'Enregistrer les constatations'}
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <label htmlFor="dateFin">Fin :</label>
                        <input
                          id="dateFin"
                          type="date"
                          value={dateFinInput}
                          onChange={(e) => setDateFinInput(e.target.value)}
                          className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleFinish}
                        disabled={isPending}
                        className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all"
                      >
                        {isPending ? 'Clôture...' : 'Terminer le contrôle'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                  {observations || 'Aucune observation enregistrée pour ce contrôle.'}
                </div>
              )}
            </div>
          )}

          {/* SECTION ÉTAPE 8 : RÉSULTATS DU CONTRÔLE, REDRESSEMENTS, PÉNALITÉS & RECOUVREMENT */}
          {(controle.statut === 'EN_COURS' || controle.statut === 'TERMINE') && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-purple-200 dark:border-purple-800/80 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Résultats Financiers & Sanctions</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Établissement du résultat (chargé ou déchargé), enregistrement des redressements et pénalités.
                  </p>
                </div>

                {existingResultat && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Dernière mise à jour :</span>
                    <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {new Date(existingResultat.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Sélection du Type de Résultat et Devise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Type de résultat :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canExecute}
                      onClick={() => setTypeResultat('CHARGEE')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        typeResultat === 'CHARGEE'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      CHARGÉE (Irrégularités)
                    </button>
                    <button
                      type="button"
                      disabled={!canExecute}
                      onClick={() => setTypeResultat('DECHARGEE')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        typeResultat === 'DECHARGEE'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      DÉCHARGÉE (Conforme)
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="deviseSelect" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Devise monétaire (RM-040) :
                  </label>
                  <select
                    id="deviseSelect"
                    value={devise}
                    disabled={!canExecute || typeResultat === 'DECHARGEE'}
                    onChange={(e) => setDevise(e.target.value as CurrencyType)}
                    className="w-full py-2.5 px-3 text-xs font-bold font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  >
                    <option value="CDF">Franc Congolais (CDF)</option>
                    <option value="USD">Dollar Américain (USD)</option>
                  </select>
                </div>
              </div>

              {/* Cas 1 : Résultat DÉCHARGÉE */}
              {typeResultat === 'DECHARGEE' && (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Contrôle Déchargé — Aucun montant exigé (RM-017)</span>
                  </div>
                  <div>
                    <label htmlFor="justifInput" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Motivation / Justification obligatoire (au moins 5 car.) :
                    </label>
                    <textarea
                      id="justifInput"
                      rows={3}
                      value={justification}
                      disabled={!canExecute}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Ex: Examen complet des pièces justificatives et bordereaux de versement probants. Aucune minoration constatée pour les exercices vérifiés..."
                      className="w-full p-3 text-xs bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}

              {/* Cas 2 : Résultat CHARGÉE */}
              {typeResultat === 'CHARGEE' && (
                <div className="space-y-6">
                  {/* Tableau des Redressements */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        1. Postes de Redressement (Droits éludés)
                      </h3>
                      <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-400">
                        Sous-total : {calculatedMontantDu.toLocaleString('fr-FR')} {devise}
                      </span>
                    </div>

                    {/* Liste des redressements existants */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 font-bold grid grid-cols-12 gap-2 text-zinc-500">
                        <div className="col-span-7">Motif / Acte générateur</div>
                        <div className="col-span-4 text-right">Montant ({devise})</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      {/* Existants en base */}
                      {existingResultat?.redressements?.map((r) => (
                        <div key={r.id} className="p-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7 font-medium text-zinc-800 dark:text-zinc-200">{r.motif}</div>
                          <div className="col-span-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {r.montant.toLocaleString('fr-FR')} {r.devise}
                          </div>
                          <div className="col-span-1 text-center">
                            {canExecute && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingRedressement(r.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Nouveaux locaux */}
                      {newRedressements.map((nr, idx) => (
                        <div key={`new-r-${idx}`} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-amber-50/40 dark:bg-amber-950/20 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7 font-medium text-amber-900 dark:text-amber-200">
                            {nr.motif} <span className="text-[10px] text-amber-600">(nouveau)</span>
                          </div>
                          <div className="col-span-4 text-right font-mono font-bold text-amber-900 dark:text-amber-200">
                            {nr.montant.toLocaleString('fr-FR')} {devise}
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => setNewRedressements(newRedressements.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Formulaire d'ajout de redressement */}
                      {canExecute && (
                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              placeholder="Motif (ex: Omission de déclaration taxe 2025)..."
                              value={tempRedMotif}
                              onChange={(e) => setTempRedMotif(e.target.value)}
                              className="w-full p-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Montant..."
                              value={tempRedMontant}
                              onChange={(e) => setTempRedMontant(e.target.value)}
                              className="w-full p-2 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-right"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={handleAddLocalRedressement}
                              className="w-full py-2 px-3 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 rounded-lg transition-all"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tableau des Pénalités (sans formule inventée, conforme QM-023) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          2. Pénalités et Majorations Légales
                        </h3>
                        <span className="text-[10px] text-zinc-400 block">
                          Conforme QM-023 : saisie explicite des fondements juridiques et montants
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-red-700 dark:text-red-400">
                        Sous-total : {calculatedMontantPenalites.toLocaleString('fr-FR')} {devise}
                      </span>
                    </div>

                    {/* Liste des pénalités */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 font-bold grid grid-cols-12 gap-2 text-zinc-500">
                        <div className="col-span-7">Fondement juridique / Sanction</div>
                        <div className="col-span-4 text-right">Montant ({devise})</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      {/* Existantes en base */}
                      {existingResultat?.penalites?.map((p) => (
                        <div key={p.id} className="p-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7 font-medium text-zinc-800 dark:text-zinc-200">{p.motif}</div>
                          <div className="col-span-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {p.montant.toLocaleString('fr-FR')} {p.devise}
                          </div>
                          <div className="col-span-1 text-center">
                            {canExecute && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingPenalite(p.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Nouvelles locales */}
                      {newPenalites.map((np, idx) => (
                        <div key={`new-p-${idx}`} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-red-50/40 dark:bg-red-950/20 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7 font-medium text-red-900 dark:text-red-200">
                            {np.motif} <span className="text-[10px] text-red-600">(nouvelle)</span>
                          </div>
                          <div className="col-span-4 text-right font-mono font-bold text-red-900 dark:text-red-200">
                            {np.montant.toLocaleString('fr-FR')} {devise}
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => setNewPenalites(newPenalites.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Formulaire d'ajout de pénalité */}
                      {canExecute && (
                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              placeholder="Fondement juridique (ex: Majoration pour non-déclaration art. 42)..."
                              value={tempPenMotif}
                              onChange={(e) => setTempPenMotif(e.target.value)}
                              className="w-full p-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Montant..."
                              value={tempPenMontant}
                              onChange={(e) => setTempPenMontant(e.target.value)}
                              className="w-full p-2 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-right"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={handleAddLocalPenalite}
                              className="w-full py-2 px-3 text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950 hover:bg-red-200 rounded-lg transition-all"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Récapitulatif et Total Général */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase text-purple-900 dark:text-purple-300">
                        Total Général Réclamé (Intégrité RM-041)
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Montant principal dû ({calculatedMontantDu.toLocaleString('fr-FR')}) + Pénalités ({calculatedMontantPenalites.toLocaleString('fr-FR')})
                      </div>
                    </div>
                    <div className="text-2xl font-black font-mono text-purple-900 dark:text-purple-100">
                      {totalFinal.toLocaleString('fr-FR')} {devise}
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons d'action pour le résultat */}
              {canExecute && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSaveResultat}
                    disabled={isPending}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isPending ? 'Enregistrement...' : 'Enregistrer le résultat financier'}</span>
                  </button>

                  {existingResultat && existingResultat.type_resultat === 'CHARGEE' && (existingResultat.montant_total ?? 0) > 0 && !existingAvis && (
                    <button
                      type="button"
                      onClick={handleGenerateAvis}
                      disabled={isPending}
                      className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Générer l&apos;Avis de Recouvrement</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section Demandes de Renseignements (SUR_PIECES) */}
          {controle.type_controle === 'SUR_PIECES' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Demandes de Pièces &amp; Renseignements ({demandesLocales.length})
                </div>
              </div>

              {/* Formulaire de nouvelle demande */}
              {canManageDemandesRenseignements && (
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-3">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Émettre une demande de renseignements ou de pièces complémentaires
                  </p>
                  {demandeError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                      {demandeError}
                    </div>
                  )}
                  <textarea
                    value={demandeContenu}
                    onChange={(e) => setDemandeContenu(e.target.value)}
                    placeholder="Libellé de la demande ou pièces requises (min. 10 caractères)..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-xs text-zinc-500 shrink-0">Date limite :</label>
                      <input
                        type="date"
                        value={demandeDateLimite}
                        onChange={(e) => setDemandeDateLimite(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSubmittingDemande || demandeContenu.trim().length < 10}
                      onClick={async () => {
                        setIsSubmittingDemande(true);
                        setDemandeError(null);
                        const res = await creerDemandeRenseignements({
                          controle_id: controle.id,
                          assujetti_id: controle.assujetti_id,
                          contenu: demandeContenu.trim(),
                          date_limite: demandeDateLimite || undefined,
                        });
                        setIsSubmittingDemande(false);
                        if (res.success) {
                          setDemandeContenu('');
                          setDemandeDateLimite('');
                          setDemandesLocales((prev) => [{
                            id: res.data?.id || crypto.randomUUID(),
                            statut: 'EN_ATTENTE',
                            date_envoi: new Date().toISOString().split('T')[0],
                            date_limite: demandeDateLimite || null,
                            date_reponse: null,
                            contenu: demandeContenu.trim(),
                            created_at: new Date().toISOString(),
                            auteur: { nom: currentUser.nom || '', prenom: currentUser.prenom || '' },
                          }, ...prev]);
                        } else {
                          setDemandeError(res.error || 'Erreur lors de l\'émission de la demande.');
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {isSubmittingDemande ? 'Envoi...' : 'Émettre la demande'}
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des demandes */}
              {demandesLocales.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  Aucune demande de renseignements émise pour l&apos;instant.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {demandesLocales.map((dr) => (
                    <div key={dr.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {dr.contenu}
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 font-mono">
                            <span>Émise le {new Date(dr.date_envoi).toLocaleDateString('fr-FR')}</span>
                            {dr.date_limite && (
                              <span className="text-amber-600 dark:text-amber-400">
                                Limite : {new Date(dr.date_limite).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                            {dr.date_reponse && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Répondu le {new Date(dr.date_reponse).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                            {dr.auteur && (
                              <span>par {dr.auteur.nom} {dr.auteur.prenom}</span>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          dr.statut === 'REPONDU' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          dr.statut === 'RELANCE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {dr.statut.replace('_', ' ')}
                        </span>
                      </div>
                      {/* Actions rapides sur la demande */}
                      {canManageDemandesRenseignements && (dr.statut === 'EN_ATTENTE' || dr.statut === 'RELANCE') && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const today = new Date().toISOString().split('T')[0];
                              const res = await enregistrerReponseDemandeRenseignements({
                                demande_id: dr.id,
                                date_reponse: today,
                              });
                              if (res.success) {
                                setDemandesLocales((prev) => prev.map((d) =>
                                  d.id === dr.id ? { ...d, statut: 'REPONDU', date_reponse: today } : d
                                ));
                              }
                            }}
                            className="px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            Marquer répondu
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await relancerDemandeRenseignements({
                                demande_id: dr.id,
                              });
                              if (res.success) {
                                setDemandesLocales((prev) => prev.map((d) =>
                                  d.id === dr.id ? { ...d, statut: 'RELANCE' } : d
                                ));
                              }
                            }}
                            className="px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            Relancer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section Journal d'audit */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
              Historique des événements du contrôle & Résultats
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                Aucun journal d&apos;audit pour l&apos;instant.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">
                          {log.action}
                        </span>
                        <span>par {log.profiles?.nom} {log.profiles?.prenom}</span>
                      </div>
                      {log.new_data && (
                        <div className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                          {JSON.stringify(log.new_data)}
                        </div>
                      )}
                    </div>
                    <div className="text-zinc-400 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
