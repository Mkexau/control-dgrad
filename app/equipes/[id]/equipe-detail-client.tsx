'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : DÉTAIL & GESTION D'UNE ÉQUIPE
// =============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@/lib/validations/auth';
import type { EquipeStatus } from '@/lib/validations/equipes';
import {
  EquipeStatusBadge,
  MissionStatusBadge,
  ControleStatusBadge,
} from '@/components/missions/mission-badges';
import {
  addAgentToEquipe,
  removeAgentFromEquipe,
  addAssujettiToEquipe,
  removeAssujettiFromEquipe,
  designateChefEquipe,
} from '@/app/actions/equipes';
import { getMissionDocumentDownloadUrl } from '@/app/actions/missions';

export interface EquipeDetailData {
  id: string;
  mission_id: string;
  nom: string;
  statut: EquipeStatus;
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
  };
  agents: {
    id: string;
    matricule: string;
    specialite?: string | null;
    domaine_competence?: string | null;
    actif: boolean;
    profiles: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      telephone?: string | null;
    };
  };
  equipe_agents: {
    id: string;
    agent_id: string;
    agents: {
      id: string;
      matricule: string;
      specialite?: string | null;
      domaine_competence?: string | null;
      actif: boolean;
      profiles: {
        id: string;
        nom: string;
        prenom: string;
        email: string;
      };
    };
  }[];
  equipe_assujettis: {
    id: string;
    assujetti_id: string;
    assujettis: {
      id: string;
      type: string;
      identifiant: string;
      nom_raison_sociale: string;
      adresse?: string | null;
      email?: string | null;
      telephone?: string | null;
    };
  }[];
  controles: {
    id: string;
    mission_id: string;
    equipe_id: string;
    assujetti_id: string;
    type_controle: string;
    statut: string;
    date_debut?: string | null;
    date_fin?: string | null;
    observations?: string | null;
    assujettis: {
      id: string;
      nom_raison_sociale: string;
      identifiant: string;
      adresse?: string | null;
    };
  }[];
}

interface EquipeDetailClientProps {
  equipe: EquipeDetailData;
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
  availableAgents: { id: string; matricule: string; nom: string; prenom: string }[];
  availableAssujettis: { id: string; nom_raison_sociale: string; identifiant: string }[];
}

export function EquipeDetailClient({
  equipe,
  currentUser,
  userAgentId,
  auditLogs,
  availableAgents,
  availableAssujettis,
}: EquipeDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'CONTROLES' | 'MEMBERS' | 'ASSUJETTIS' | 'AUDIT'>('CONTROLES');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for draft additions
  const [selectedAgentToAdd, setSelectedAgentToAdd] = useState('');
  const [selectedAssujettiToAdd, setSelectedAssujettiToAdd] = useState('');
  const [selectedNewChef, setSelectedNewChef] = useState('');
  const [isDownloadingOM, setIsDownloadingOM] = useState(false);

  const isDraft = equipe.statut === 'PROPOSEE' && equipe.missions.statut === 'BROUILLON';
  const isChefOfThisTeam = userAgentId && userAgentId === equipe.agents.id;
  const canEditDraft =
    isDraft &&
    (currentUser.role === 'CHEF_BUREAU' || currentUser.role === 'ANALYSTE');

  // 1. Ajouter un agent
  const handleAddAgent = () => {
    if (!selectedAgentToAdd) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await addAgentToEquipe({
        equipe_id: equipe.id,
        agent_id: selectedAgentToAdd,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de l\'ajout de l\'agent.');
      } else {
        setSuccessMessage('Agent ajouté à l\'équipe avec succès.');
        setSelectedAgentToAdd('');
        router.refresh();
      }
    });
  };

  // 2. Retirer un agent
  const handleRemoveAgent = (agentId: string) => {
    if (!confirm('Confirmez-vous le retrait de cet agent de l\'équipe ?')) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await removeAgentFromEquipe({
        equipe_id: equipe.id,
        agent_id: agentId,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors du retrait de l\'agent.');
      } else {
        setSuccessMessage('Agent retiré avec succès.');
        router.refresh();
      }
    });
  };

  // 3. Ajouter un assujetti
  const handleAddAssujetti = () => {
    if (!selectedAssujettiToAdd) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await addAssujettiToEquipe({
        equipe_id: equipe.id,
        assujetti_id: selectedAssujettiToAdd,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors de l\'affectation de l\'assujetti.');
      } else {
        setSuccessMessage('Assujetti affecté à l\'équipe avec succès.');
        setSelectedAssujettiToAdd('');
        router.refresh();
      }
    });
  };

  // 4. Retirer un assujetti
  const handleRemoveAssujetti = (assujettiId: string) => {
    if (!confirm('Confirmez-vous le retrait de cet assujetti de l\'équipe ?')) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await removeAssujettiFromEquipe({
        equipe_id: equipe.id,
        assujetti_id: assujettiId,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors du retrait de l\'assujetti.');
      } else {
        setSuccessMessage('Assujetti retiré de l\'équipe.');
        router.refresh();
      }
    });
  };

  // 5. Désigner un nouveau chef d'équipe
  const handleDesignateChef = () => {
    if (!selectedNewChef) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await designateChefEquipe({
        equipe_id: equipe.id,
        chef_equipe_id: selectedNewChef,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erreur lors du changement de chef d\'équipe.');
      } else {
        setSuccessMessage('Nouveau chef d\'équipe désigné avec succès.');
        setSelectedNewChef('');
        router.refresh();
      }
    });
  };

  // 6. Télécharger l'ordre de mission
  const handleDownloadOrdreMission = async () => {
    const om = equipe.missions.ordres_mission;
    if (!om) return;

    setIsDownloadingOM(true);
    try {
      const res = await getMissionDocumentDownloadUrl({
        storage_path: om.storage_path,
        mission_id: equipe.mission_id,
      });
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        setErrorMessage(res.error || 'Impossible de récupérer le document.');
      }
    } catch {
      setErrorMessage('Erreur réseau lors du téléchargement.');
    } finally {
      setIsDownloadingOM(false);
    }
  };

  // Filtrer les agents déjà affectés
  const currentAgentIds = new Set(equipe.equipe_agents.map((ea) => ea.agent_id));
  currentAgentIds.add(equipe.agents.id); // inclure le chef
  const unassignedAgents = availableAgents.filter((ag) => !currentAgentIds.has(ag.id));

  // Filtrer les assujettis déjà affectés
  const currentAssujettiIds = new Set(equipe.equipe_assujettis.map((ea) => ea.assujetti_id));
  const unassignedAssujettis = availableAssujettis.filter((ass) => !currentAssujettiIds.has(ass.id));

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane & Navigation retour */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/equipes" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          Équipes
        </Link>
        <span>/</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{equipe.nom}</span>
      </div>

      {/* Messages d'alerte */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* En-tête principal de la fiche équipe */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {equipe.nom}
              </h1>
              <EquipeStatusBadge statut={equipe.statut} />
              {isChefOfThisTeam && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                  Votre équipe
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1 font-mono">
                <span>Mission :</span>
                <Link
                  href={`/missions/${equipe.missions.id}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {equipe.missions.reference}
                </Link>
              </span>
              <span>•</span>
              <span className="font-medium">{equipe.missions.bureaux?.nom || 'Bureau de contrôle'}</span>
              <span>•</span>
              <MissionStatusBadge statut={equipe.missions.statut as unknown as never} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {equipe.missions.ordres_mission && (
              <button
                onClick={handleDownloadOrdreMission}
                disabled={isDownloadingOM}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{isDownloadingOM ? 'Téléchargement...' : 'Ordre de mission PDF'}</span>
              </button>
            )}
            <Link
              href={`/missions/${equipe.missions.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <span>Voir la mission</span>
            </Link>
          </div>
        </div>

        {/* Fiche Chef d'équipe */}
        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
              {equipe.agents.profiles.prenom?.[0] || 'C'}{equipe.agents.profiles.nom?.[0] || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Chef d&apos;équipe opérationnel
              </div>
              <div className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                {equipe.agents.profiles.nom} {equipe.agents.profiles.prenom}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-mono bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Matricule : {equipe.agents.matricule}
                </span>
                <span>{equipe.agents.profiles.email}</span>
                {equipe.agents.specialite && <span>• {equipe.agents.specialite}</span>}
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex flex-col justify-center">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Statut Opérationnel
            </div>
            <div className="mt-1 text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {equipe.statut === 'CONFIRMEE' ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Prête pour contrôle de terrain
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  En attente validation DG
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {equipe.equipe_agents.length} agent(s) • {equipe.equipe_assujettis.length} entreprise(s) affectée(s)
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par Onglets */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('CONTROLES')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'CONTROLES'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Contrôles de terrain ({equipe.controles.length})
        </button>

        <button
          onClick={() => setActiveTab('MEMBERS')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'MEMBERS'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Agents membres ({equipe.equipe_agents.length + 1})
        </button>

        <button
          onClick={() => setActiveTab('ASSUJETTIS')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'ASSUJETTIS'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Assujettis affectés ({equipe.equipe_assujettis.length})
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'AUDIT'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Historique d&apos;audit ({auditLogs.length})
        </button>
      </div>

      {/* Onglet 1 : Contrôles de terrain */}
      {activeTab === 'CONTROLES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              Contrôles opérationnels de terrain
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Un contrôle par entreprise affectée à l&apos;équipe
            </span>
          </div>

          {equipe.controles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {equipe.statut === 'CONFIRMEE'
                  ? 'Aucun contrôle opérationnel n\'a encore été initialisé pour cette équipe.'
                  : 'Les contrôles opérationnels seront initialisés dès que la mission sera approuvée par le DG.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {equipe.controles.map((ctrl) => (
                <div
                  key={ctrl.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {ctrl.assujettis?.nom_raison_sociale || 'Assujetti'}
                      </h3>
                      <ControleStatusBadge statut={ctrl.statut} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono">NIF/RCCM : {ctrl.assujettis?.identifiant || 'N/A'}</span>
                      {ctrl.assujettis?.adresse && <span>• {ctrl.assujettis.adresse}</span>}
                      {ctrl.date_debut && <span>• Démarré le {new Date(ctrl.date_debut).toLocaleDateString('fr-FR')}</span>}
                      {ctrl.date_fin && <span>• Clôturé le {new Date(ctrl.date_fin).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/controles/${ctrl.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Accéder au contrôle</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet 2 : Agents membres */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-6">
          {/* Ajout d'agent (si brouillon) */}
          {canEditDraft && unassignedAgents.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Ajouter un agent à l&apos;équipe
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
                <select
                  value={selectedAgentToAdd}
                  onChange={(e) => setSelectedAgentToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Sélectionner un agent actif...</option>
                  {unassignedAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.matricule} — {ag.nom} {ag.prenom}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAgent}
                  disabled={!selectedAgentToAdd || isPending}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all shadow-xs"
                >
                  {isPending ? 'Ajout...' : 'Ajouter l\'agent'}
                </button>
              </div>
            </div>
          )}

          {/* Changement de chef d'équipe (si brouillon) */}
          {canEditDraft && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Changer le Chef d&apos;équipe
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
                <select
                  value={selectedNewChef}
                  onChange={(e) => setSelectedNewChef(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Désigner un autre agent actif comme chef...</option>
                  {availableAgents
                    .filter((ag) => ag.id !== equipe.agents.id)
                    .map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.matricule} — {ag.nom} {ag.prenom}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleDesignateChef}
                  disabled={!selectedNewChef || isPending}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-all"
                >
                  {isPending ? 'Mise à jour...' : 'Désigner comme chef'}
                </button>
              </div>
            </div>
          )}

          {/* Table des agents */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3">Nom & Prénom</th>
                  <th className="px-4 py-3">Rôle dans l&apos;équipe</th>
                  <th className="px-4 py-3">Statut</th>
                  {canEditDraft && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* Chef d'équipe */}
                <tr className="bg-blue-50/30 dark:bg-blue-950/10 font-medium">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {equipe.agents.matricule}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-bold">
                    {equipe.agents.profiles.nom} {equipe.agents.profiles.prenom}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                      CHEF D&apos;ÉQUIPE
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Actif</span>
                  </td>
                  {canEditDraft && <td className="px-4 py-3 text-right text-xs text-zinc-400">Titulaire</td>}
                </tr>

                {/* Autres agents */}
                {equipe.equipe_agents.map((ea) => (
                  <tr key={ea.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                      {ea.agents.matricule}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {ea.agents.profiles.nom} {ea.agents.profiles.prenom}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Contrôleur de terrain
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Actif</span>
                    </td>
                    {canEditDraft && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveAgent(ea.agent_id)}
                          disabled={isPending}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                        >
                          Retirer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet 3 : Assujettis affectés */}
      {activeTab === 'ASSUJETTIS' && (
        <div className="space-y-6">
          {/* Ajout d'assujetti (si brouillon) */}
          {canEditDraft && unassignedAssujettis.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Affecter un assujetti de la mission
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
                <select
                  value={selectedAssujettiToAdd}
                  onChange={(e) => setSelectedAssujettiToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Sélectionner une entreprise de la mission...</option>
                  {unassignedAssujettis.map((ass) => (
                    <option key={ass.id} value={ass.id}>
                      {ass.nom_raison_sociale} ({ass.identifiant})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAssujetti}
                  disabled={!selectedAssujettiToAdd || isPending}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all shadow-xs"
                >
                  {isPending ? 'Affectation...' : 'Affecter à l\'équipe'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipe.equipe_assujettis.map((ea) => (
              <div
                key={ea.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {ea.assujettis.nom_raison_sociale}
                    </h4>
                    {canEditDraft && (
                      <button
                        onClick={() => handleRemoveAssujetti(ea.assujetti_id)}
                        disabled={isPending}
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <div>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Identifiant : </span>
                      <span className="font-mono">{ea.assujettis.identifiant}</span>
                    </div>
                    {ea.assujettis.adresse && (
                      <div>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Adresse : </span>
                        <span>{ea.assujettis.adresse}</span>
                      </div>
                    )}
                    {ea.assujettis.telephone && (
                      <div>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Contact : </span>
                        <span>{ea.assujettis.telephone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet 4 : Audit */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
            Journal des événements de l&apos;équipe
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">
                      {log.action}
                    </span>
                    <span>par {log.profiles?.nom} {log.profiles?.prenom} ({log.profiles?.role})</span>
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
        </div>
      )}
    </div>
  );
}
