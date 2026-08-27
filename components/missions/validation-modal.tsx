'use client';

// =============================================================================
// DGRAD CONTROLE - DIALOGUE MODAL DE VALIDATION HIÉRARCHIQUE DES MISSIONS
// =============================================================================

import React, { useState } from 'react';
import { Modal } from '@/components/admin/modal';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: (decision: 'APPROUVE' | 'REJETE', motif?: string, commentaire?: string) => Promise<void>;
  isLoading?: boolean;
}

export function ValidationModal({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  isLoading = false,
}: ValidationModalProps) {
  const [decision, setDecision] = useState<'APPROUVE' | 'REJETE'>('APPROUVE');
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (decision === 'REJETE' && (!motif || motif.trim().length < 5)) {
      setErrorMessage('Un motif explicite d\'au moins 5 caractères est obligatoire pour motiver un rejet.');
      return;
    }

    try {
      await onConfirm(decision, motif.trim() || undefined, commentaire.trim() || undefined);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
            Décision hiérarchique *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision('APPROUVE')}
              className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                decision === 'APPROUVE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-2 ring-emerald-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approuver / Transmettre
            </button>

            <button
              type="button"
              onClick={() => setDecision('REJETE')}
              className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                decision === 'REJETE'
                  ? 'border-red-600 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 ring-2 ring-red-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejeter la demande
            </button>
          </div>
        </div>

        {decision === 'REJETE' && (
          <div>
            <label className="block text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-1">
              Motif du rejet (obligatoire) *
            </label>
            <textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Précisez les raisons du rejet pour permettre au Bureau d'apporter les corrections..."
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
            Remarques & Instructions complémentaires (optionnel)
          </label>
          <textarea
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Instructions particulières ou observations..."
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 ${
              decision === 'APPROUVE'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            {decision === 'APPROUVE' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
