'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT DÉTAILLÉE DU DOSSIER DE MISSION
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import type { MissionStatus, MissionType } from '@/lib/validations/missions';
import { MissionStatusBadge, MissionTypeBadge } from '@/components/missions/mission-badges';
import { WorkflowTimeline, type ValidationRecord } from '@/components/missions/workflow-timeline';
import { ValidationModal } from '@/components/missions/validation-modal';
import {
  submitMission,
  examineDivision,
  examineDirecteur,
  decideDG,
  decideChefSection,
  designateControleur,
  resetRejectedMission,
  getMissionDocumentDownloadUrl,
} from '@/app/actions/missions';

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
    chef_equipe: { matricule: string; profiles: { nom: string; prenom: string } };
    equipe_agents: { agents: { matricule: string; profiles: { nom: string; prenom: string } } }[];
    equipe_assujettis: { assujettis: { nom_raison_sociale: string; identifiant: string } }[];
  }[];
  mission_validations?: ValidationRecord[];
  ordres_mission?: { id: string; reference: string; storage_path: string; date_generation: string } | null;
  autorisations_controle_pieces?: { id: string; reference: string; storage_path: string; date_generation: string } | null;
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
  availableControleurs?: { id: string; nom: string; prenom: string; email: string }[];
}

export function MissionDetailClient({
  mission: initialMission,
  currentUser,
  availableControleurs = [],
}: MissionDetailClientProps) {
  const [mission] = useState<MissionDetailData>(initialMission);
  const [activeModal, setActiveModal] = useState<
    'EXAMEN_DIVISION' | 'EXAMEN_DIRECTEUR' | 'DECISION_DG' | 'DECISION_CHEF_SECTION' | null
  >(null);

  const [selectedControleurId, setSelectedControleurId] = useState<string>(
    availableControleurs[0]?.id || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Actions de workflow
  const handleDirectSubmit = async () => {
    setIsProcessing(true);
    setActionError(null);

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

  // Conditions d'affichage des boutons d'actions hiérarchiques
  const canSubmit =
    (mission.statut === 'BROUILLON') &&
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

  const canDecideChefSection =
    mission.type_controle === 'SUR_PIECES' &&
    (mission.statut === 'DEMANDE_SOUMISE' || mission.statut === 'EXAMEN_CHEF_SECTION') &&
    currentUser.role === 'CHEF_SECTION';

  const canDesignate =
    mission.type_controle === 'SUR_PIECES' &&
    mission.statut === 'AUTORISATION_GENEREE' &&
    (currentUser.role === 'CHEF_SECTION' || currentUser.role === 'CHEF_BUREAU');

  return (
    <div className="space-y-8">
      {/* En-tête du dossier */}
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
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Retour à la liste
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
            {actionError}
          </div>
        )}

        {/* Panneau d'action rapide selon le rôle */}
        {(canSubmit || canResetDraft || canExamineDivision || canExamineDirecteur || canDecideDG || canDecideChefSection || canDesignate) && (
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

              {canDecideChefSection && (
                <button
                  onClick={() => setActiveModal('DECISION_CHEF_SECTION')}
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

      {/* Stepper & Historique des validations */}
      <WorkflowTimeline
        typeControle={mission.type_controle}
        currentStatus={mission.statut}
        validations={mission.mission_validations || []}
      />

      {/* Documents officiels générés */}
      {(mission.ordres_mission || mission.autorisations_controle_pieces) && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Documents Officiels Générés & Certifiés
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mission.ordres_mission && (
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Ordre de Mission Officiel
                  </div>
                  <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Réf: {mission.ordres_mission.reference}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    Émis le {new Date(mission.ordres_mission.date_generation).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDoc(mission.ordres_mission!.storage_path)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Consulter / Télécharger
                </button>
              </div>
            )}

            {mission.autorisations_controle_pieces && (
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-purple-800 dark:text-purple-300">
                    Autorisation de Contrôle sur Pièces
                  </div>
                  <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Réf: {mission.autorisations_controle_pieces.reference}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    Émise le {new Date(mission.autorisations_controle_pieces.date_generation).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDoc(mission.autorisations_controle_pieces!.storage_path)}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-white dark:bg-zinc-900 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Consulter / Télécharger
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cadre institutionnel & Assujettis */}
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
            Entreprises & Assujettis Ciblés ({mission.mission_assujettis?.length || 0})
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

      {/* Équipes pour SUR_PLACE */}
      {mission.type_controle === 'SUR_PLACE' && mission.equipes && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Équipes de Terrain ({mission.equipes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mission.equipes.map((eq) => (
              <div
                key={eq.id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{eq.nom}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                    {eq.statut}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-zinc-500">Chef d&apos;équipe : </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {eq.chef_equipe?.profiles?.nom} {eq.chef_equipe?.profiles?.prenom} ({eq.chef_equipe?.matricule})
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-zinc-500 block mb-1">Agents affectés :</span>
                    <ul className="list-disc pl-4 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {eq.equipe_agents?.map((ea, idx) => (
                        <li key={idx}>
                          {ea.agents?.profiles?.nom} {ea.agents?.profiles?.prenom} ({ea.agents?.matricule})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2">
                    <span className="text-zinc-500 block mb-1">Entreprises assignées :</span>
                    <ul className="list-disc pl-4 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {eq.equipe_assujettis?.map((eas, idx) => (
                        <li key={idx}>{eas.assujettis?.nom_raison_sociale}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales de validation hiérarchique */}
      <ValidationModal
        isOpen={activeModal === 'EXAMEN_DIVISION'}
        onClose={() => setActiveModal(null)}
        title="Instruction Chef de Division Contrôle"
        description="Vérifiez la conformité de la proposition et transmettez-la au Directeur des Contrôles ou rejetez-la avec motif."
        onConfirm={async (decision, motif, commentaire) => {
          const res = await examineDivision({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            window.location.reload();
          } else {
            throw new Error(res.error);
          }
        }}
      />

      <ValidationModal
        isOpen={activeModal === 'EXAMEN_DIRECTEUR'}
        onClose={() => setActiveModal(null)}
        title="Instruction Directeur des Contrôles & Recoupements"
        description="Transmettez le dossier instruit au Directeur Général pour décision finale ou rejetez-le avec motif."
        onConfirm={async (decision, motif, commentaire) => {
          const res = await examineDirecteur({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            window.location.reload();
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
        onConfirm={async (decision, motif, commentaire) => {
          const res = await decideDG({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            window.location.reload();
          } else {
            throw new Error(res.error);
          }
        }}
      />

      <ValidationModal
        isOpen={activeModal === 'DECISION_CHEF_SECTION'}
        onClose={() => setActiveModal(null)}
        title="Décision du Chef de Section Contrôle"
        description="L'approbation génère automatiquement l'autorisation officielle de contrôle sur pièces."
        onConfirm={async (decision, motif, commentaire) => {
          const res = await decideChefSection({
            mission_id: mission.id,
            decision,
            motif,
            commentaire,
          });
          if (res.success) {
            setActiveModal(null);
            window.location.reload();
          } else {
            throw new Error(res.error);
          }
        }}
      />
    </div>
  );
}
