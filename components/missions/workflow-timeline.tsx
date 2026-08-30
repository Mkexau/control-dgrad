'use client';

// =============================================================================
// DGRAD CONTROLE - COMPOSANT CHRONOLOGIE & HISTORIQUE DU WORKFLOW
// =============================================================================

import React from 'react';
import type { MissionStatus, MissionType, ValidationStatus, ValidationType } from '@/lib/validations/missions';
import { ValidationDecisionBadge } from './mission-badges';

export interface ValidationRecord {
  id: string;
  type_validation: ValidationType;
  statut: ValidationStatus;
  motif?: string | null;
  commentaire?: string | null;
  date_validation: string;
  profiles?: {
    nom: string;
    prenom: string;
    role: string;
  } | null;
}

interface WorkflowTimelineProps {
  typeControle: MissionType;
  currentStatus: MissionStatus;
  validations: ValidationRecord[];
}

const SUR_PLACE_STEPS: { key: MissionStatus; label: string; description: string }[] = [
  { key: 'BROUILLON', label: 'Brouillon', description: 'Préparation par le Bureau' },
  { key: 'SOUMISE', label: 'Soumise', description: 'Transmise au Chef de Division' },
  { key: 'EXAMEN_CHEF_DIVISION', label: 'Examen Division', description: 'Instruction Chef de Division' },
  { key: 'EXAMEN_DIRECTEUR_CONTROLES', label: 'Examen Directeur', description: 'Instruction Directeur des Contrôles' },
  { key: 'ATTENTE_DG', label: 'Attente DG', description: 'Décision Directeur Général' },
  { key: 'ORDRE_MISSION_GENERE', label: 'Ordre de mission', description: 'OM généré & Équipes confirmées' },
  { key: 'EQUIPES_AFFECTEES', label: 'Équipes prêtes', description: 'Prêt pour le terrain' },
  { key: 'CONTROLE_EN_COURS', label: 'Sur le terrain', description: 'Opérations de contrôle' },
  { key: 'CLOTUREE', label: 'Clôturée', description: 'Mission achevée' },
];

const SUR_PIECES_STEPS: { key: MissionStatus; label: string; description: string }[] = [
  { key: 'BROUILLON', label: 'Brouillon', description: 'Préparation par le Bureau' },
  { key: 'DEMANDE_SOUMISE', label: 'Soumise', description: 'Transmise au Chef de Bureau' },
  { key: 'EXAMEN_CHEF_BUREAU', label: 'Examen Bureau', description: 'Décision du Chef de Bureau' },
  { key: 'AUTORISATION_GENEREE', label: 'Autorisation', description: 'Autorisation officielle générée' },
  { key: 'CONTROLEUR_DESIGNE', label: 'Contrôleur désigné', description: 'Affectation au contrôleur' },
  { key: 'CONTROLE_EN_COURS', label: 'En cours', description: 'Examen des actes et pièces' },
  { key: 'CLOTUREE', label: 'Clôturée', description: 'Contrôle clôturé' },
];

export function WorkflowTimeline({ typeControle, currentStatus, validations }: WorkflowTimelineProps) {
  const steps = typeControle === 'SUR_PLACE' ? SUR_PLACE_STEPS : SUR_PIECES_STEPS;

  // Calculer l'indice de l'étape courante
  const currentStepIndex = steps.findIndex((s) => s.key === currentStatus);
  const isRejected = currentStatus === 'REJETEE';
  const isCancelled = currentStatus === 'ANNULEE';

  return (
    <div className="space-y-6">
      {/* Visual Stepper */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-5">
          Progression du Workflow ({typeControle === 'SUR_PLACE' ? 'Contrôle sur place' : 'Contrôle sur pièces'})
        </h3>

        {isRejected && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Dossier rejeté par l&apos;autorité compétente</h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                La mission a fait l&apos;objet d&apos;un rejet lors de l&apos;instruction hiérarchique. Le Bureau de contrôle initiateur peut consulter le motif ci-dessous, reprendre le dossier en brouillon, apporter les corrections requises et le resoumettre.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Mission Annulée</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Cette mission a été annulée avec archivage logique et conservation intégrale de l&apos;historique probant.
              </p>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, idx) => {
              const isCompleted = currentStepIndex > idx || currentStatus === 'CLOTUREE';
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center relative group">
                  {/* Ligne connectrice */}
                  {idx > 0 && (
                    <div
                      className={`absolute top-4 -left-1/2 right-1/2 h-0.5 -z-10 transition-colors ${
                        isCompleted ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    />
                  )}

                  {/* Cercle d'étape */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                        : isCurrent
                        ? isRejected
                          ? 'bg-red-600 text-white ring-4 ring-red-100 dark:ring-red-950'
                          : 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950'
                        : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Labels */}
                  <div className="mt-2.5">
                    <div
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? isRejected
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-blue-600 dark:text-blue-400 font-bold'
                          : isCompleted
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-400 dark:text-zinc-600'
                      }`}
                    >
                      {step.label}
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[90px] mx-auto mt-0.5 line-clamp-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historique des validations hiérarchiques */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4">
          Historique des Validations Hiérarchiques ({validations.length})
        </h3>

        {validations.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6">
            {validations.map((v) => (
              <div key={v.id} className="relative">
                {/* Point sur la ligne de temps */}
                <div
                  className={`w-3 h-3 rounded-full absolute -left-[31px] top-1.5 border-2 border-white dark:border-zinc-900 ${
                    v.statut === 'APPROUVE'
                      ? 'bg-emerald-500'
                      : v.statut === 'REJETE'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono">
                      Échelon : {v.type_validation}
                    </span>
                    <ValidationDecisionBadge statut={v.statut} />
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(v.date_validation).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Décideur :{' '}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {v.profiles ? `${v.profiles.nom} ${v.profiles.prenom} (${v.profiles.role})` : 'Autorité compétente'}
                  </span>
                </div>

                {v.motif && (
                  <div className="mt-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="font-semibold text-red-600 dark:text-red-400">Motif / Justification : </span>
                    {v.motif}
                  </div>
                )}

                {v.commentaire && (
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 italic">
                    « {v.commentaire} »
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-4">
            Aucune validation hiérarchique enregistrée pour cette mission pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
