'use client';

// =============================================================================
// DGRAD CONTROLE - VUE CLIENT : GESTION DES UTILISATEURS & PROFILS
// =============================================================================

import React, { useState } from 'react';
import { StatusBadge, RoleBadge } from '@/components/admin/status-badge';
import { Modal, ConfirmDialog } from '@/components/admin/modal';
import { UserForm, type ProfileRecord } from '@/components/admin/forms/user-form';
import { toggleUserStatus } from '@/app/actions/admin-users';

interface UsersClientProps {
  initialUsers: ProfileRecord[];
  bureauxList: { id: string; code: string; nom: string }[];
}

export function UtilisateursClient({ initialUsers, bureauxList }: UsersClientProps) {
  const [users, setUsers] = useState<ProfileRecord[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [bureauFilter, setBureauFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileRecord | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<ProfileRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(query) ||
      u.nom.toLowerCase().includes(query) ||
      u.prenom.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesBureau = bureauFilter === 'ALL' || u.bureau_id === bureauFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.actif) ||
      (statusFilter === 'INACTIVE' && !u.actif);

    return matchesSearch && matchesRole && matchesBureau && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: ProfileRecord) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    window.location.reload();
  };

  const handleToggleConfirm = async () => {
    if (!confirmTarget) return;
    setIsToggling(true);

    try {
      const res = await toggleUserStatus({
        id: confirmTarget.id,
        actif: !confirmTarget.actif,
      });

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === confirmTarget.id ? { ...u, actif: !u.actif } : u))
        );
      } else {
        alert(res.error || 'Erreur lors du changement de statut.');
      }
    } finally {
      setIsToggling(false);
      setConfirmTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Comptes Utilisateurs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Création, modification et attribution des rôles applicatifs aux agents et responsables.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau Compte
        </button>
      </div>

      {/* Note de sécurité */}
      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>
          <strong>Règle de séparation des pouvoirs :</strong> L&apos;attribution du rôle ADMIN est strictement technique. Il ne confère aucun droit d&apos;approbation de mission DG ou Chef de Bureau.
        </span>
      </div>

      {/* Filtres */}
      <div className="flex flex-col xl:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
        <div className="w-full xl:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DIRECTEUR_GENERAL">DIRECTEUR_GENERAL</option>
              <option value="DIRECTEUR_CONTROLES">DIRECTEUR_CONTROLES</option>
              <option value="CHEF_DIVISION">CHEF_DIVISION</option>
              <option value="CHEF_BUREAU">CHEF_BUREAU</option>
              <option value="CHEF_EQUIPE">CHEF_EQUIPE</option>
              <option value="CONTROLEUR">CONTROLEUR</option>
              <option value="ANALYSTE">ANALYSTE</option>
              <option value="CONSULTATION">CONSULTATION</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Bureau :</span>
            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les bureaux</option>
              {bureauxList.map((bur) => (
                <option key={bur.id} value={bur.id}>
                  {bur.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous ({users.length})</option>
              <option value="ACTIVE">Actifs ({users.filter((u) => u.actif).length})</option>
              <option value="INACTIVE">Inactifs ({users.filter((u) => !u.actif).length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Agent / Utilisateur</th>
                <th className="px-6 py-3.5">Email professionnel</th>
                <th className="px-6 py-3.5">Rôle attribué</th>
                <th className="px-6 py-3.5">Bureau</th>
                <th className="px-6 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {u.nom} {u.prenom}
                      </div>
                      {u.telephone && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{u.telephone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {u.bureaux ? `${u.bureaux.code}` : <span className="text-zinc-400 italic">Cadre central</span>}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge actif={u.actif} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmTarget(u)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          u.actif
                            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                      >
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    Aucun compte utilisateur trouvé selon les critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulaire */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? 'Modifier le Compte Utilisateur' : 'Créer un Compte Utilisateur'}
        description="Renseignez les informations d'identité, les coordonnées et le rôle attribué."
      >
        <UserForm
          initialData={editingUser}
          bureauxList={bureauxList}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Dialogue de Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleConfirm}
        title={confirmTarget?.actif ? 'Désactiver le compte' : 'Activer le compte'}
        message={`Êtes-vous sûr de vouloir ${
          confirmTarget?.actif ? 'désactiver' : 'activer'
        } le compte de ${confirmTarget?.nom} ${confirmTarget?.prenom} (${confirmTarget?.email}) ?`}
        confirmLabel={confirmTarget?.actif ? 'Désactiver' : 'Activer'}
        isDestructive={confirmTarget?.actif}
        isLoading={isToggling}
      />
    </div>
  );
}
