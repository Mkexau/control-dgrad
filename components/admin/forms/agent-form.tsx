'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE AGENT DE CONTRÔLE (CRÉATION & ÉDITION)
// =============================================================================

import React, { useState } from 'react';
import { createAgent, updateAgent } from '@/app/actions/admin-users';

export interface AgentRecord {
  id: string;
  profile_id?: string | null;
  matricule: string;
  nom?: string | null;
  prenom?: string | null;
  bureau_id?: string | null;
  secteur_id?: string | null;
  specialite?: string | null;
  domaine_competence?: string | null;
  actif: boolean;
  profiles?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    bureaux?: { code: string; nom: string } | null;
  } | null;
  bureaux?: { code: string; nom: string } | null;
  secteurs?: { code: string; nom: string } | null;
}

interface AgentFormProps {
  initialData?: AgentRecord | null;
  profilesList: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    hasAgent?: boolean;
  }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AgentForm({ initialData, profilesList, onSuccess, onCancel }: AgentFormProps) {
  const isEditing = Boolean(initialData);

  // Pour la création, filtrer les profils qui n'ont pas encore d'agent rattaché
  const availableProfiles = isEditing
    ? profilesList
    : profilesList.filter((p) => !p.hasAgent);

  const [profileId, setProfileId] = useState(
    initialData?.profile_id ?? (availableProfiles[0]?.id || '')
  );
  const [matricule, setMatricule] = useState(initialData?.matricule ?? '');
  const [specialite, setSpecialite] = useState(initialData?.specialite ?? '');
  const [domaineCompetence, setDomaineCompetence] = useState(initialData?.domaine_competence ?? '');
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
        ? {
            id: initialData!.id,
            profile_id: profileId,
            matricule: matricule.trim().toUpperCase(),
            specialite: specialite.trim() || null,
            domaine_competence: domaineCompetence.trim() || null,
            actif,
          }
        : {
            profile_id: profileId,
            matricule: matricule.trim().toUpperCase(),
            specialite: specialite.trim() || null,
            domaine_competence: domaineCompetence.trim() || null,
            actif,
          };

      const response = isEditing
        ? await updateAgent(payload)
        : await createAgent(payload);

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
          Profil utilisateur à rattacher *
        </label>
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          required
          disabled={isLoading || isEditing}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {availableProfiles.length === 0 && (
            <option value="">Aucun profil disponible</option>
          )}
          {availableProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom} {p.prenom} ({p.email}) — [{p.role}]
            </option>
          ))}
        </select>
        {fieldErrors.profile_id && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.profile_id[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Matricule officiel de l&apos;agent *
        </label>
        <input
          type="text"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value.toUpperCase())}
          placeholder="Ex: AG-2026-001"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 uppercase font-mono"
        />
        {fieldErrors.matricule && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.matricule[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Spécialité technique
        </label>
        <input
          type="text"
          value={specialite}
          onChange={(e) => setSpecialite(e.target.value)}
          placeholder="Ex: Fiscalité minière, Droits domaniaux, Recettes judiciaires"
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.specialite && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.specialite[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Domaine de compétence
        </label>
        <input
          type="text"
          value={domaineCompetence}
          onChange={(e) => setDomaineCompetence(e.target.value)}
          placeholder="Ex: Contrôle sur place, Analyse documentaire, Évaluation des redevances"
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.domaine_competence && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.domaine_competence[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="agent_actif"
          checked={actif}
          onChange={(e) => setActif(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 text-blue-600 rounded-sm border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
        />
        <label htmlFor="agent_actif" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
          Agent disponible / actif pour les missions
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
          disabled={isLoading || (!isEditing && availableProfiles.length === 0)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          )}
          {isEditing ? 'Mettre à jour l\'agent' : 'Enregistrer l\'agent'}
        </button>
      </div>
    </form>
  );
}
