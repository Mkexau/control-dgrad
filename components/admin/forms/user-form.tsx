'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE UTILISATEUR & PROFIL (CRÉATION & ÉDITION)
// =============================================================================

import React, { useState } from 'react';
import { createUserAccount, updateUserProfile } from '@/app/actions/admin-users';

export interface ProfileRecord {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  bureau_id?: string | null;
  role: string;
  actif: boolean;
  bureaux?: { id: string; code: string; nom: string } | null;
}

interface UserFormProps {
  initialData?: ProfileRecord | null;
  bureauxList: { id: string; code: string; nom: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLES = [
  { value: 'ADMIN', label: 'ADMIN (Administrateur technique)' },
  { value: 'DIRECTEUR_GENERAL', label: 'DIRECTEUR_GENERAL (Directeur Général)' },
  { value: 'DIRECTEUR_CONTROLES', label: 'DIRECTEUR_CONTROLES (Directeur des contrôles et recoupements)' },
  { value: 'CHEF_DIVISION', label: 'CHEF_DIVISION (Chef de Division Contrôle / Recoupement)' },
  { value: 'CHEF_BUREAU', label: 'CHEF_BUREAU (Chef de Bureau)' },
  { value: 'CHEF_EQUIPE', label: 'CHEF_EQUIPE (Chef d\'équipe de terrain)' },
  { value: 'CONTROLEUR', label: 'CONTROLEUR (Contrôleur de terrain / pièces)' },
  { value: 'ANALYSTE', label: 'ANALYSTE (Analyste Recoupement)' },
  { value: 'CONSULTATION', label: 'CONSULTATION (Lecture seule autorisée)' },
];

export function UserForm({ initialData, bureauxList, onSuccess, onCancel }: UserFormProps) {
  const isEditing = Boolean(initialData);

  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState(initialData?.nom ?? '');
  const [prenom, setPrenom] = useState(initialData?.prenom ?? '');
  const [telephone, setTelephone] = useState(initialData?.telephone ?? '');
  const [bureauId, setBureauId] = useState(initialData?.bureau_id ?? '');
  const [role, setRole] = useState(initialData?.role ?? 'CONTROLEUR');
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
            nom: nom.trim(),
            prenom: prenom.trim(),
            telephone: telephone.trim() || null,
            bureau_id: bureauId || null,
            role,
            actif,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
            nom: nom.trim(),
            prenom: prenom.trim(),
            telephone: telephone.trim() || undefined,
            bureau_id: bureauId || null,
            role,
            actif,
          };

      const response = isEditing
        ? await updateUserProfile(payload)
        : await createUserAccount(payload);

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

      {!isEditing && (
        <>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Adresse email professionnelle *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@dgrad.cd"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Mot de passe initial * (min. 8 caractères)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password[0]}</p>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
            Nom de famille *
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: MUKENDI"
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
            Prénom *
          </label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Ex: Jean-Paul"
            required
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.prenom && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.prenom[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Téléphone de contact
        </label>
        <input
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="+243 81 000 0000"
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.telephone && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.telephone[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Rôle applicatif officiel *
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {fieldErrors.role && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.role[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
          Bureau d&apos;affectation
        </label>
        <select
          value={bureauId}
          onChange={(e) => setBureauId(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Aucun bureau rattaché (Direction / Cadre général) --</option>
          {bureauxList.map((bur) => (
            <option key={bur.id} value={bur.id}>
              {bur.code} — {bur.nom}
            </option>
          ))}
        </select>
        {fieldErrors.bureau_id && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.bureau_id[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="user_actif"
          checked={actif}
          onChange={(e) => setActif(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 text-blue-600 rounded-sm border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
        />
        <label htmlFor="user_actif" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
          Compte utilisateur actif
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
          {isEditing ? 'Mettre à jour le compte' : 'Créer le compte'}
        </button>
      </div>
    </form>
  );
}
