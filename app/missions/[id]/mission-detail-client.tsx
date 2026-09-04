'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT DÉTAILLÉE DU DOSSIER DE MISSION (ÉTAPE 11)
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MissionStatus, MissionType } from '@/lib/validations/missions';
import { MissionStatusBadge, MissionTypeBadge } from '@/components/missions/mission-badges';
import { WorkflowTimeline, type ValidationRecord } from '@/components/missions/workflow-timeline';
import { ValidationModal } from '@/components/missions/validation-modal';
import {
  submitMission,
  examineDivision,
  examineDirecteur,
  decideDG,
  decideChefBureau,
  designateControleur,
  resetRejectedMission,
  getMissionDocumentDownloadUrl,
} from '@/app/actions/missions';
import {
  saveRapportMission,
  genererDocumentRapportMission,
  tenterClotureMission,
} from '@/app/actions/rapports';

export interface MissionDetailData {
  id: string;
  reference: string;
  type_controle: MissionType;
  bureau_id: string;
  secteur_id?: string | null;
  statut: MissionStatus;
  motif?: string | null;
  date_creation: string;
  date_soumission?: string | null;
  date_approbation?: string | null;
  bureaux?: { code: string; nom: string } | null;
  secteurs?: { code: string; nom: string } | null;
  profiles?: { nom: string; prenom: string; email: string } | null;
  mission_assujettis?: {
    ordre: number;
    statut?: string | null;
    assujettis: { id: string; nom_raison_sociale: string; identifiant: string; adresse?: string | null };
  }[];
  equipes?: {
    id: string;
    nom: string;
    statut: string;
    chef_equipe_id: string;
    chef_equipe: { id: string; matricule: string; profiles: { nom: string; prenom: string } };
    equipe_agents: { agents: { id: string; matricule: string; profiles: { nom: string; prenom: string } } }[];
    equipe_assujettis: { assujettis: { id: string; nom_raison_sociale: string; identifiant: string } }[];
  }[];
  mission_validations?: ValidationRecord[];
  ordres_mission?: { id: string; reference: string; storage_path: string; date_generation: string } | null;
  autorisations_controle_pieces?: { id: string; reference: string; storage_path: string; date_generation: string } | null;
  rapports_mission?: {
    id: string;
    date: string;
    contenu: string;
    statut?: string | null;
    storage_path?: string | null;
    auteur_id: string;
    created_at: string;
    updated_at: string;
    profiles?: { nom: string; prenom: string; role: string } | null;
  }[];
  controles?: {
    id: string;
    assujetti_id: string;
    statut: string;
    type_controle: string;
    controleur_responsable_id?: string | null;
    date_debut?: string | null;
    date_fin?: string | null;
    observations?: string | null;
    assujettis?: { id: string; nom_raison_sociale: string; identifiant: string } | null;
    profiles?: { id: string; nom: string; prenom: string } | null;
    resultats_controle?: {
      id: string;
      type_resultat: string;
      montant_du?: number | null;
      montant_penalites?: number | null;
      montant_total?: number | null;
      devise: string;
      justification?: string | null;
      redressements?: { id: string; montant: number; devise: string; motif: string; statut?: string | null }[];
      penalites?: { id: string; montant: number; devise: string; motif: string }[];
      avis_recouvrement?: { id: string; reference: string; date: string; montant: number; devise: string; storage_path?: string | null }[];
    }[] | {
      id: string;
      type_resultat: string;
      montant_du?: number | null;
      montant_penalites?: number | null;
      montant_total?: number | null;
      devise: string;
      justification?: string | null;
      redressements?: { id: string; montant: number; devise: string; motif: string; statut?: string | null }[];
      penalites?: { id: string; montant: number; devise: string; motif: string }[];
      avis_recouvrement?: { id: string; reference: string; date: string; montant: number; devise: string; storage_path?: string | null }[];
    } | null;
    demandes_renseignements?: {
      id: string;
      statut: string;
      date_envoi: string;
      date_limite?: string | null;
      date_reponse?: string | null;
      contenu: string;
      reponse_contenu?: string | null;
      auteur?: { nom: string; prenom: string } | null;
    }[];
  }[];
}

export interface DocumentRecord {
  id: string;
  document_type: string;
  nom: string;
  mime_type: string;
  taille: number;
  storage_path: string;
  version: number;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  created_at: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  profiles?: { nom: string; prenom: string; role: string } | null;
}

interface MissionDetailClientProps {
  mission: MissionDetailData;
  currentUser: {
    id: string;
    role: string;
    bureau_id?: string | null;
    nom: string;
    prenom: string;
  };
  userAgentId?: string | null;
  documents?: DocumentRecord[];
  auditLogs?: AuditLogRecord[];
  availableControleurs?: { id: string; nom: string; prenom: string; email: string }[];
}

export function MissionDetailClient({
  mission,
  currentUser,
  userAgentId,
  documents = [],
  auditLogs = [],
  availableControleurs = [],
}: MissionDetailClientProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<
    'EXAMEN_DIVISION' | 'EXAMEN_DIRECTEUR' | 'DECISION_DG' | 'DECISION_CHEF_BUREAU' | null
  >(null);

  const missionContext = {
    reference: mission.reference,
    assujettiNom: mission.mission_assujettis?.[0]?.assujettis?.nom_raison_sociale || 'Assujetti non spécifié',
    bureauCode: mission.bureaux?.code,
    secteurNom: mission.secteurs?.nom || mission.secteurs?.code,
  };

  const [selectedControleurId, setSelectedControleurId] = useState<string>(
    availableControleurs[0]?.id || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // État pour le Rapport de Mission
  const currentRapport = mission.rapports_mission && mission.rapports_mission.length > 0
    ? mission.rapports_mission[0]
    : null;

  const [isEditingRapport, setIsEditingRapport] = useState(false);
  const [rapportContenu, setRapportContenu] = useState(currentRapport?.contenu || '');

  // Calcul des totaux financiers consolidés de la mission
  let totalDuCDF = 0;
  let totalPenalitesCDF = 0;
  let totalGlobalCDF = 0;
  let totalDuUSD = 0;
  let totalPenalitesUSD = 0;
  let totalGlobalUSD = 0;
  let redressementsCount = 0;
  let penalitesCount = 0;
  let avisCount = 0;

  const controlesList = mission.controles || [];
  controlesList.forEach((c) => {
    const res = Array.isArray(c.resultats_controle) ? c.resultats_controle[0] : c.resultats_controle;
    if (res) {
      const du = Number(res.montant_du ?? 0);
      const pen = Number(res.montant_penalites ?? 0);
      const tot = Number(res.montant_total ?? (du + pen));

      if (res.devise === 'CDF') {
        totalDuCDF += du;
        totalPenalitesCDF += pen;
        totalGlobalCDF += tot;
      } else if (res.devise === 'USD') {
        totalDuUSD += du;
        totalPenalitesUSD += pen;
        totalGlobalUSD += tot;
      }

      redressementsCount += (res.redressements || []).length;
      penalitesCount += (res.penalites || []).length;
      avisCount += (res.avis_recouvrement || []).length;
    }
  });

  // Actions de workflow hiérarchique
  const handleDirectSubmit = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await submitMission({ mission_id: mission.id });
      if (res.success) {
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de la soumission.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToDraft = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await resetRejectedMission({ mission_id: mission.id });
      if (res.success) {
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de la réouverture du dossier.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDesignateControleur = async () => {
    if (!selectedControleurId) return;
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await designateControleur({
        mission_id: mission.id,
        controleur_id: selectedControleurId,
      });
      if (res.success) {
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de la désignation du contrôleur.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDoc = async (storagePath: string) => {
    try {
      const res = await getMissionDocumentDownloadUrl({
        storage_path: storagePath,
        mission_id: mission.id,
      });
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        alert(res.error || 'Impossible d\'ouvrir le document.');
      }
    } catch {
      alert('Erreur lors du téléchargement.');
    }
  };

  // Actions Rapport de mission
  const handleSaveRapport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await saveRapportMission({
        mission_id: mission.id,
        contenu: rapportContenu,
        statut: 'FINALISE',
      });
      if (res.success) {
        setActionSuccess('Rapport de mission enregistré avec succès.');
        setIsEditingRapport(false);
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de l\'enregistrement du rapport.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenererDocRapport = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await genererDocumentRapportMission({
        mission_id: mission.id,
      });
      if (res.success) {
        setActionSuccess(`Document officiel du rapport généré (Réf: ${res.data?.reference}).`);
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de la génération du document officiel.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Action Clôture
  const handleCloturerMission = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await tenterClotureMission({
        mission_id: mission.id,
      });
      if (res.success) {
        setActionSuccess(res.data?.message || 'Mission clôturée.');
        window.location.reload();
      } else {
        setActionError(res.error || 'Erreur lors de la clôture.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Permissions d'actions hiérarchiques
  const canSubmit =
    mission.statut === 'BROUILLON' &&
    (currentUser.role === 'CHEF_BUREAU' || currentUser.role === 'ANALYSTE' || currentUser.role === 'CONTROLEUR');

  const canResetDraft =
    mission.statut === 'REJETEE' &&
    (currentUser.role === 'CHEF_BUREAU' || currentUser.role === 'ANALYSTE' || currentUser.role === 'CONTROLEUR');

  const canExamineDivision =
    mission.type_controle === 'SUR_PLACE' &&
    (mission.statut === 'SOUMISE' || mission.statut === 'EXAMEN_CHEF_DIVISION') &&
    currentUser.role === 'CHEF_DIVISION';

  const canExamineDirecteur =
    mission.type_controle === 'SUR_PLACE' &&
    mission.statut === 'EXAMEN_DIRECTEUR_CONTROLES' &&
    currentUser.role === 'DIRECTEUR_CONTROLES';

  const canDecideDG =
    mission.type_controle === 'SUR_PLACE' &&
    mission.statut === 'ATTENTE_DG' &&
    currentUser.role === 'DIRECTEUR_GENERAL';

  const canDecideChefBureau =
    mission.type_controle === 'SUR_PIECES' &&
    (mission.statut === 'DEMANDE_SOUMISE' || mission.statut === 'EXAMEN_CHEF_BUREAU') &&
    currentUser.role === 'CHEF_BUREAU' && currentUser.bureau_id === mission.bureau_id;

  const canDesignate =
    mission.type_controle === 'SUR_PIECES' &&
    mission.statut === 'AUTORISATION_GENEREE' &&
    currentUser.role === 'CHEF_BUREAU' && currentUser.bureau_id === mission.bureau_id;

  // Permission de gérer le rapport
  const isChefEquipe =
    mission.type_controle === 'SUR_PLACE' &&
    currentUser.role === 'CHEF_EQUIPE' &&
    mission.equipes?.some((e) => e.chef_equipe_id === userAgentId);

  const isControleurDesignated =
    mission.type_controle === 'SUR_PIECES' &&
    currentUser.role === 'CONTROLEUR' &&
    mission.controles?.some((c) => c.controleur_responsable_id === currentUser.id);

  const isBureauOrHierarchy =
    currentUser.role === 'DIRECTEUR_GENERAL' ||
    currentUser.role === 'DIRECTEUR_CONTROLES' ||
    currentUser.role === 'CHEF_DIVISION' ||
    (currentUser.role === 'CHEF_BUREAU' && currentUser.bureau_id === mission.bureau_id);

  const canManageRapport = currentUser.role !== 'ADMIN' && (isChefEquipe || isControleurDesignated || isBureauOrHierarchy);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. EN-TÊTE DE LA MISSION */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {mission.reference}
              </h1>
              <MissionTypeBadge type={mission.type_controle} />
              <MissionStatusBadge statut={mission.statut} />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Créé le {new Date(mission.date_creation).toLocaleString('fr-FR')} par{' '}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {mission.profiles ? `${mission.profiles.nom} ${mission.profiles.prenom}` : 'Agent DGRAD'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/missions"
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              ← Retour à la liste
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
            {actionSuccess}
          </div>
        )}

        {/* Panneau d'actions hiérarchiques contextuelles */}
        {(canSubmit || canResetDraft || canExamineDivision || canExamineDirecteur || canDecideDG || canDecideChefBureau || canDesignate) && (
          <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                Action requise à votre niveau ({currentUser.role})
              </h2>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Ce dossier attend une décision formelle ou une transmission hiérarchique.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canSubmit && (
                <button
                  onClick={handleDirectSubmit}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  Soumettre pour Examen
                </button>
              )}

              {canResetDraft && (
                <button
                  onClick={handleResetToDraft}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
                >
                  Reprendre en Brouillon pour Correction
                </button>
              )}

              {canExamineDivision && (
                <button
                  onClick={() => setActiveModal('EXAMEN_DIVISION')}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs"
                >
                  Examiner / Transmettre (Chef de Division)
                </button>
              )}

              {canExamineDirecteur && (
                <button
                  onClick={() => setActiveModal('EXAMEN_DIRECTEUR')}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  Examiner / Transmettre au DG (Directeur)
                </button>
              )}

              {canDecideDG && (
                <button
                  onClick={() => setActiveModal('DECISION_DG')}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                >
                  Statuér & Signer Ordre de Mission (DG)
                </button>
              )}

              {canDecideChefBureau && (
                <button
                  onClick={() => setActiveModal('DECISION_CHEF_BUREAU')}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                >
                  Statuér sur le Contrôle sur Pièces (Chef Section)
                </button>
              )}

              {canDesignate && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedControleurId}
                    onChange={(e) => setSelectedControleurId(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    {availableControleurs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} {c.prenom}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleDesignateControleur}
                    disabled={isProcessing || !selectedControleurId}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Désigner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. TIMELINE & WORKFLOW STEPPER */}
      <WorkflowTimeline
        typeControle={mission.type_controle}
        currentStatus={mission.statut}
        validations={mission.mission_validations || []}
      />

      {/* 3. CADRE INSTITUTIONNEL & ASSUJETTIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Compétence & Justification
          </h2>
          <div className="text-xs space-y-2">
            <div>
              <span className="text-zinc-500">Bureau compétent : </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                {mission.bureaux ? `${mission.bureaux.code} — ${mission.bureaux.nom}` : '-'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Secteur d&apos;activité : </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                {mission.secteurs ? `${mission.secteurs.code} — ${mission.secteurs.nom}` : 'Non sectorisé'}
              </span>
            </div>
            <div className="pt-2">
              <span className="text-zinc-500 block mb-1">Motif / Justification :</span>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {mission.motif || 'Aucun motif renseigné.'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Entreprises & Assujettis ({mission.mission_assujettis?.length || 0})
          </h2>
          <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {mission.mission_assujettis && mission.mission_assujettis.length > 0 ? (
              mission.mission_assujettis.map((ma, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {ma.assujettis?.nom_raison_sociale}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      NIF / RCCM : {ma.assujettis?.identifiant}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Ordre #{ma.ordre}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-zinc-400 italic py-3 text-center">Aucun assujetti associé.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. CONTRÔLES OPÉRATIONNELS & AVANCEMENT */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Contrôles Opérationnels ({controlesList.length})
          </h2>
          <span className="text-xs text-zinc-500">
            {controlesList.filter((c) => c.statut === 'TERMINE').length} / {controlesList.length} terminés
          </span>
        </div>

        {controlesList.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {controlesList.map((ctrl) => {
              const res = Array.isArray(ctrl.resultats_controle) ? ctrl.resultats_controle[0] : ctrl.resultats_controle;
              return (
                <div key={ctrl.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {ctrl.assujettis?.nom_raison_sociale || 'Assujetti'}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        ({ctrl.assujettis?.identifiant})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>Statut : <strong className="font-mono text-zinc-700 dark:text-zinc-300">{ctrl.statut}</strong></span>
                      {ctrl.date_debut && <span>Début : {ctrl.date_debut}</span>}
                      {ctrl.date_fin && <span>Fin : {ctrl.date_fin}</span>}
                      {ctrl.profiles && (
                        <span>Contrôleur : <strong>{ctrl.profiles.nom} {ctrl.profiles.prenom}</strong></span>
                      )}
                    </div>

                    {res && (
                      <div className="mt-1 text-xs">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          res.type_resultat === 'CHARGEE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          Résultat : {res.type_resultat}
                        </span>
                        {res.type_resultat === 'CHARGEE' && (
                          <span className="ml-2 font-mono text-zinc-700 dark:text-zinc-300">
                            Total dû : <strong>{Number(res.montant_total ?? 0).toLocaleString('fr-FR')} {res.devise}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/controles/${ctrl.id}`}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>Accéder au contrôle</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Aucun contrôle opérationnel initié. Les contrôles sont générés après confirmation DG ou désignation de contrôleur.
          </p>
        )}
      </div>

      {/* 5. CONSOLIDATION FINANCIÈRE DE LA MISSION */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Consolidation Financière du Dossier
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Totaux CDF */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2">
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase font-mono">
              Recettes en Francs Congolais (CDF)
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Droits éludés / Principal :</span>
                <span className="font-mono font-semibold">{totalDuCDF.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pénalités & majorations :</span>
                <span className="font-mono font-semibold">{totalPenalitesCDF.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700 text-sm font-bold text-blue-600 dark:text-blue-400">
                <span>TOTAL CDF :</span>
                <span className="font-mono">{totalGlobalCDF.toLocaleString('fr-FR')} CDF</span>
              </div>
            </div>
          </div>

          {/* Totaux USD */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2">
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase font-mono">
              Recettes en Dollars Américains (USD)
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Droits éludés / Principal :</span>
                <span className="font-mono font-semibold">{totalDuUSD.toLocaleString('fr-FR')} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pénalités & majorations :</span>
                <span className="font-mono font-semibold">{totalPenalitesUSD.toLocaleString('fr-FR')} USD</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700 text-sm font-bold text-blue-600 dark:text-blue-400">
                <span>TOTAL USD :</span>
                <span className="font-mono">{totalGlobalUSD.toLocaleString('fr-FR')} USD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-zinc-500">
          <span>Redressements : <strong>{redressementsCount}</strong></span>
          <span>Pénalités : <strong>{penalitesCount}</strong></span>
          <span>Avis de recouvrement : <strong>{avisCount}</strong></span>
        </div>
      </div>

      {/* 6. RAPPORT DE MISSION (ÉTAPE 11) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Rapport de Mission & Synthèse Finale
            </h2>
            <p className="text-xs text-zinc-500">
              Synthèse officielle des constats, opérations, résultats et conclusions de la mission.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManageRapport && !isEditingRapport && (
              <button
                onClick={() => setIsEditingRapport(true)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                {currentRapport ? 'Modifier le rapport' : 'Rédiger le rapport'}
              </button>
            )}

            {currentRapport && (
              <button
                onClick={handleGenererDocRapport}
                disabled={isProcessing}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Générer le Document Officiel
              </button>
            )}
          </div>
        </div>

        {isEditingRapport ? (
          <form onSubmit={handleSaveRapport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Observations, analyse globale et conclusions de la mission :
              </label>
              <textarea
                value={rapportContenu}
                onChange={(e) => setRapportContenu(e.target.value)}
                rows={8}
                placeholder="Rédigez la synthèse complète des contrôles, constats majeurs, irrégularités relevées et recommandations..."
                className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingRapport(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isProcessing || rapportContenu.trim().length < 10}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                Enregistrer le Rapport
              </button>
            </div>
          </form>
        ) : currentRapport ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span>Rédigé le : <strong>{currentRapport.date}</strong></span>
              <span>Auteur : <strong>{currentRapport.profiles?.nom} {currentRapport.profiles?.prenom}</strong> ({currentRapport.profiles?.role})</span>
              <span>Statut : <strong className="font-mono">{currentRapport.statut}</strong></span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {currentRapport.contenu}
            </div>

            {currentRapport.storage_path && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  Document officiel du rapport archivé
                </div>
                <button
                  onClick={() => handleDownloadDoc(currentRapport.storage_path!)}
                  className="px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded-md hover:bg-emerald-50"
                >
                  Télécharger le document certifié
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Aucun rapport de mission n&apos;a encore été rédigé pour ce dossier.
          </p>
        )}
      </div>

      {/* 7. DOCUMENTS OFFICIELS & PIÈCES JOINTES */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Référentiel Documentaire Centralisé ({documents.length})
        </h2>

        {documents.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>{doc.nom}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {doc.document_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Version v{doc.version} • {(doc.taille / 1024).toFixed(1)} Ko • Enregistré le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadDoc(doc.storage_path)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Télécharger
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Aucun document archivé pour cette mission.
          </p>
        )}
      </div>

      {/* 8. CLÔTURE DE LA MISSION & ÉTAT QM-026 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Finalisation & Clôture du Dossier
        </h2>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
          <div className="text-xs space-y-1.5">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">
              Vérification des prérequis de fin de mission :
            </div>
            <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <span className={controlesList.length > 0 ? 'text-emerald-600 font-bold' : 'text-zinc-400'}>
                  {controlesList.length > 0 ? '✓' : '○'}
                </span>
                <span>Contrôles opérationnels initiés ({controlesList.length})</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={controlesList.length > 0 && controlesList.every((c) => c.statut === 'TERMINE' || c.statut === 'ANNULE') ? 'text-emerald-600 font-bold' : 'text-amber-500'}>
                  {controlesList.length > 0 && controlesList.every((c) => c.statut === 'TERMINE' || c.statut === 'ANNULE') ? '✓' : '○'}
                </span>
                <span>Tous les contrôles achevés (statut TERMINE)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={currentRapport ? 'text-emerald-600 font-bold' : 'text-amber-500'}>
                  {currentRapport ? '✓' : '○'}
                </span>
                <span>Rapport de mission rédigé et finalisé</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-amber-700 dark:text-amber-400">
              <strong>Statut QM-026 :</strong> L&apos;autorité officielle de clôture définitive est à valider. Le système garantit la complétude du dossier sans simuler de clôture arbitraire.
            </div>

            <button
              onClick={handleCloturerMission}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg transition-colors shrink-0"
            >
              Vérifier & Clôturer la mission
            </button>
          </div>
        </div>
      </div>

      {/* 9. JOURNAL D'AUDIT & HISTORIQUE */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Journal d&apos;Audit & Traçabilité Immuable ({auditLogs.length})
        </h2>

        {auditLogs.length > 0 ? (
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 text-xs font-mono">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {log.action}
                  </span>
                  <span className="text-zinc-500 ml-2">
                    par {log.profiles ? `${log.profiles.nom} ${log.profiles.prenom}` : 'Système'} ({log.profiles?.role || 'SYSTEM'})
                  </span>
                </div>
                <span className="text-zinc-400 text-[11px] shrink-0">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Aucun journal d&apos;audit enregistré pour cette mission.
          </p>
        )}
      </div>

      {/* MODALES DE VALIDATION HIÉRARCHIQUE */}
      <ValidationModal
        isOpen={activeModal === 'EXAMEN_DIVISION'}
        onClose={() => setActiveModal(null)}
        title="Examiner le dossier (Chef de Division)"
        description="Vérifiez la conformité de la proposition et transmettez-la au Directeur des Contrôles ou rejetez-la avec motif."
        missionContext={missionContext}
        roleAction="CHEF_DIVISION"
        onConfirm={async (decision, motif, commentaire) => {
          const res = await examineDivision({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            setActionSuccess(
              decision === 'APPROUVE'
                ? 'Dossier instruit et transmis avec succès au Directeur des Contrôles.'
                : 'Dossier rejeté et retourné au Bureau avec motif.'
            );
            router.refresh();
          } else {
            throw new Error(res.error);
          }
        }}
      />

      <ValidationModal
        isOpen={activeModal === 'EXAMEN_DIRECTEUR'}
        onClose={() => setActiveModal(null)}
        title="Examiner le dossier (Directeur des Contrôles)"
        description="Transmettez le dossier instruit au Directeur Général pour décision finale ou rejetez-le avec motif."
        missionContext={missionContext}
        roleAction="DIRECTEUR_CONTROLES"
        onConfirm={async (decision, motif, commentaire) => {
          const res = await examineDirecteur({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            setActionSuccess(
              decision === 'APPROUVE'
                ? 'Dossier instruit et transmis avec succès au Directeur Général.'
                : 'Dossier rejeté et retourné avec motif.'
            );
            router.refresh();
          } else {
            throw new Error(res.error);
          }
        }}
      />

      <ValidationModal
        isOpen={activeModal === 'DECISION_DG'}
        onClose={() => setActiveModal(null)}
        title="Décision du Directeur Général de la DGRAD"
        description="L'approbation confirme les équipes proposées et génère automatiquement l'ordre de mission officiel."
        missionContext={missionContext}
        roleAction="DIRECTEUR_GENERAL"
        onConfirm={async (decision, motif, commentaire) => {
          const res = await decideDG({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            setActionSuccess(
              decision === 'APPROUVE'
                ? 'Mission approuvée avec succès. Ordre de mission officiel généré.'
                : 'Mission rejetée avec motif.'
            );
            router.refresh();
          } else {
            throw new Error(res.error);
          }
        }}
      />

      <ValidationModal
        isOpen={activeModal === 'DECISION_CHEF_BUREAU'}
        onClose={() => setActiveModal(null)}
        title="Décision du Chef de Bureau"
        description="L'approbation génère automatiquement l'autorisation officielle de contrôle sur pièces."
        missionContext={missionContext}
        roleAction="CHEF_BUREAU"
        onConfirm={async (decision, motif, commentaire) => {
          const res = await decideChefBureau({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            setActionSuccess(
              decision === 'APPROUVE'
                ? 'Contrôle sur pièces approuvé avec succès. Autorisation officielle générée.'
                : 'Demande de contrôle rejetée avec motif.'
            );
            router.refresh();
          } else {
            throw new Error(res.error);
          }
        }}
      />
    </div>
  );
}
