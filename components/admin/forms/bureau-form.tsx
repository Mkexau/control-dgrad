'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE BUREAU (CRÉATION & ÉDITION)
// =============================================================================

import React, { useState } from 'react';
import { createBureau, updateBureau } from '@/app/actions/admin-referentiels';

export interface BureauRecord {
  id: string;
  division_id: string;
  code: string;
  nom: string;
  type: 'CONTROLE' | 'RECOUPEMENT' | 'ADMINISTRATIF' | 'AUTRE';
  actif: boolean;
  divisions?: { id: string; code: string; nom: string } | null;
}

interface BureauFormProps {
  initialData?: BureauRecord | null;
  divisionsList: { id: string; code: string; nom: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function BureauForm({ initialData, divisionsList, onSuccess, onCancel }: BureauFormProps) {
  const isEditing = Boolean(initialData);

  const [divisionId, setDivisionId] = useState(
    initialData?.division_id ?? (divisionsList[0]?.id || '')
  );
  const [code, setCode] = useState(initialData?.code ?? '');
  const [nom, setNom] = useState(initialData?.nom ?? '');
  const [type, setType] = useState<'CONTROLE' | 'RECOUPEMENT' | 'ADMINISTRATIF' | 'AUTRE'>(
    initialData?.type ?? 'CONTROLE'
  );
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
        ? { id: initialData!.id, division_id: divisionId, code: code.trim().toUpperCase(), nom: nom.trim(), type, actif }
        : { division_id: divisionId, code: code.trim().toUpperCase(), nom: nom.trim(), type, actif };

      const response = isEditing
        ? await updateBureau(payload)
        : await createBureau(payload);

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
          Division de rattachement *
        </label>
        <select
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          {divisionsList.map((div) => (
            <option key={div.id} value={div.id}>
              {div.code} — {div.nom}
            </option>
          ))}
        </select>
        {fieldErrors.division_id && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.division_id[0]}</p>
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
          placeholder="Ex: BUR_CTRL_SOL"
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
          Nom du bureau *
        </label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Bureau Contrôle Sol"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.nom && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.nom[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Type de bureau *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'CONTROLE' | 'RECOUPEMENT' | 'ADMINISTRATIF' | 'AUTRE')}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="CONTROLE">CONTRÔLE (Opérations de contrôle non fiscal)</option>
          <option value="RECOUPEMENT">RECOUPEMENT (Analyse & Documentation)</option>
          <option value="ADMINISTRATIF">ADMINISTRATIF</option>
          <option value="AUTRE">AUTRE</option>
        </select>
        {fieldErrors.type && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.type[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="bureau_actif"
          checked={actif}
          onChange={(e) => setActif(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 text-blue-600 rounded-sm border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
        />
        <label htmlFor="bureau_actif" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
          Bureau actif
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
          {isEditing ? 'Mettre à jour' : 'Créer le bureau'}
        </button>
      </div>
    </form>
  );
}
