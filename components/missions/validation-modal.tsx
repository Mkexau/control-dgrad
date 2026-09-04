'use client';

// =============================================================================
// DGRAD CONTROLE - DIALOGUE MODAL DE VALIDATION HIÉRARCHIQUE DES MISSIONS
// =============================================================================

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

function emptySubscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export interface MissionValidationContext {
  reference: string;
  assujettiNom?: string;
  bureauCode?: string;
  secteurNom?: string;
}

export interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  missionContext?: MissionValidationContext;
  roleAction?: 'CHEF_DIVISION' | 'DIRECTEUR_CONTROLES' | 'DIRECTEUR_GENERAL' | 'CHEF_BUREAU';
  onConfirm: (decision: 'APPROUVE' | 'REJETE', motif?: string, commentaire?: string) => Promise<void>;
  isLoading?: boolean;
}

export function ValidationModal({
  isOpen,
  onClose,
  title,
  description,
  missionContext,
  roleAction = 'CHEF_DIVISION',
  onConfirm,
  isLoading = false,
}: ValidationModalProps) {
  const isClient = useIsClient();
  const [decision, setDecision] = useState<'APPROUVE' | 'REJETE'>('APPROUVE');
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Gestion de la touche Escape et du verrouillage du scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, isLoading, onClose]);

  // Réinitialisation de l'erreur lors d'un changement de décision
  const handleDecisionChange = (value: 'APPROUVE' | 'REJETE') => {
    setDecision(value);
    setErrorMessage(null);
  };

  if (!isOpen || !isClient || typeof document === 'undefined') return null;

  const defaultTitle =
    roleAction === 'CHEF_DIVISION'
      ? 'Examiner le dossier'
      : roleAction === 'DIRECTEUR_CONTROLES'
      ? 'Instruction Directeur des Contrôles'
      : roleAction === 'DIRECTEUR_GENERAL'
      ? 'Décision du Directeur Général'
      : 'Décision du Chef de Bureau';

  const modalTitle = title || defaultTitle;

  const getApprovalLabel = () => {
    switch (roleAction) {
      case 'CHEF_DIVISION':
        return 'Transmettre au Directeur des Contrôles';
      case 'DIRECTEUR_CONTROLES':
        return 'Transmettre au Directeur Général';
      case 'DIRECTEUR_GENERAL':
        return 'Approuver et signer l’Ordre de Mission';
      case 'CHEF_BUREAU':
        return 'Approuver le contrôle sur pièces';
      default:
        return 'Approuver / Transmettre';
    }
  };

  const isRejetValid = decision === 'APPROUVE' || motif.trim().length >= 5;
  const canSubmit = !isSubmitting && !isLoading && isRejetValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (decision === 'REJETE' && (!motif || motif.trim().length < 5)) {
      setErrorMessage('Un motif explicite d’au moins 5 caractères est obligatoire pour motiver un rejet.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(decision, motif.trim() || undefined, commentaire.trim() || undefined);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
      setIsSubmitting(false);
    }
  };

  const modalElement = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isLoading) {
          onClose();
        }
      }}
      role="presentation"
      data-testid="mission-validation-modal-backdrop"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
        className="relative w-full my-auto max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all text-slate-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE DE LA MODALE */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
          <div>
            <h2
              id="validation-modal-title"
              className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight"
            >
              {modalTitle}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Fermer la boîte de dialogue"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CORPS DE LA MODALE */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* BANDEAU D'ERREUR */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* RÉCAPITULATIF DU DOSSIER CIBLÉ */}
          {missionContext && (
            <div className="bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  {missionContext.reference}
                </span>
                {missionContext.bureauCode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    {missionContext.bureauCode}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                  {missionContext.assujettiNom || 'Assujetti'}
                </span>
                {missionContext.secteurNom && (
                  <span className="text-slate-500 dark:text-zinc-400 shrink-0">
                    {missionContext.secteurNom}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SÉLECTEUR DE DÉCISION */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Décision formelle *
            </label>

            <div className="space-y-2">
              {/* Option 1: Approuver / Transmettre */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  decision === 'APPROUVE'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="APPROUVE"
                  checked={decision === 'APPROUVE'}
                  onChange={() => handleDecisionChange('APPROUVE')}
                  disabled={isSubmitting || isLoading}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    {getApprovalLabel()}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Valide la conformité du dossier et le transmet au niveau hiérarchique supérieur.
                  </p>
                </div>
              </label>

              {/* Option 2: Rejeter le dossier */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  decision === 'REJETE'
                    ? 'border-red-600 bg-red-50/70 dark:bg-red-950/40 text-red-950 dark:text-red-200 ring-2 ring-red-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="REJETE"
                  checked={decision === 'REJETE'}
                  onChange={() => handleDecisionChange('REJETE')}
                  disabled={isSubmitting || isLoading}
                  className="mt-0.5 h-4 w-4 text-red-600 border-slate-300 focus:ring-red-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    Rejeter le dossier
                  </span>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Retourne le dossier au Bureau initiateur pour motif de non-conformité ou correction.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* CHAMP MOTIF EN CAS DE REJET */}
          {decision === 'REJETE' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rejet-motif"
                  className="block text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400"
                >
                  Motif du rejet (obligatoire) *
                </label>
                <span className={`text-[11px] font-medium ${motif.trim().length >= 5 ? 'text-slate-400' : 'text-red-500 font-semibold'}`}>
                  {motif.trim().length}/5 car. min.
                </span>
              </div>
              <textarea
                id="rejet-motif"
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Précisez les raisons précises et motivées justifiant le renvoi du dossier au Bureau..."
                required
                disabled={isSubmitting || isLoading}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-800/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* COMMENTAIRE OPTIONNEL EN CAS DE TRANSMISSION */}
          {decision === 'APPROUVE' && (
            <div className="space-y-1.5">
              <label
                htmlFor="instruction-commentaire"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300"
              >
                Instructions ou observations (optionnel)
              </label>
              <textarea
                id="instruction-commentaire"
                rows={2}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Instructions particulières ou observations pour la suite du traitement..."
                disabled={isSubmitting || isLoading}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* PIED DE MODALE & ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                decision === 'APPROUVE'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {(isSubmitting || isLoading) && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>
                {isSubmitting
                  ? decision === 'APPROUVE'
                    ? 'Transmission en cours...'
                    : 'Rejet en cours...'
                  : decision === 'APPROUVE'
                  ? 'Confirmer la transmission'
                  : 'Confirmer le rejet'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
