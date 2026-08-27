'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE DIVISION (CRÉATION & ÉDITION)
// =============================================================================

import React, { useState } from 'react';
import { createDivision, updateDivision } from '@/app/actions/admin-referentiels';

export interface DivisionRecord {
  id: string;
  direction_id: string;
  code: string;
  nom: string;
  actif: boolean;
  directions?: { id: string; code: string; nom: string } | null;
}

interface DivisionFormProps {
  initialData?: DivisionRecord | null;
  directionsList: { id: string; code: string; nom: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function DivisionForm({ initialData, directionsList, onSuccess, onCancel }: DivisionFormProps) {
  const isEditing = Boolean(initialData);

  const [directionId, setDirectionId] = useState(
    initialData?.direction_id ?? (directionsList[0]?.id || '')
  );
  const [code, setCode] = useState(initialData?.code ?? '');
  const [nom, setNom] = useState(initialData?.nom ?? '');
  const [actif, setActif] = useState(initialData?.actif ?? true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const payload = isEditing
        ? { id: initialData!.id, direction_id: directionId, code: code.trim().toUpperCase(), nom: nom.trim(), actif }
        : { direction_id: directionId, code: code.trim().toUpperCase(), nom: nom.trim(), actif };

      const response = isEditing
        ? await updateDivision(payload)
        : await createDivision(payload);

      if (response.success) {
        onSuccess();
      } else {
        setErrorMessage(response.error || 'Une erreur est survenue.');
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Direction de rattachement *
        </label>
        <select
          value={directionId}
          onChange={(e) => setDirectionId(e.target.value)}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          {directionsList.map((dir) => (
            <option key={dir.id} value={dir.id}>
              {dir.code} — {dir.nom}
            </option>
          ))}
        </select>
        {fieldErrors.direction_id && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.direction_id[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Code officiel *
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex: DIV_CTRL"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 uppercase font-mono"
        />
        {fieldErrors.code && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.code[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Nom de la division *
        </label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Division Contrôle"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.nom && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.nom[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="division_actif"
          checked={actif}
          onChange={(e) => setActif(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 text-blue-600 rounded-sm border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
        />
        <label htmlFor="division_actif" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
          Division active
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          )}
          {isEditing ? 'Mettre à jour' : 'Créer la division'}
        </button>
      </div>
    </form>
  );
}
