// =============================================================================
// DGRAD CONTROLE - COMPOSANT BADGE DE STATUT & RÔLE
// =============================================================================

export function StatusBadge({ actif }: { actif: boolean }) {
  if (actif) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Actif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
      Inactif
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const roleStyles: Record<string, { label: string; bg: string; text: string; border: string }> = {
    ADMIN: {
      label: 'Administrateur',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
    DIRECTEUR_GENERAL: {
      label: 'Directeur Général',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    DIRECTEUR_CONTROLES: {
      label: 'Dir. Contrôles & Rec.',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    CHEF_DIVISION: {
      label: 'Chef de Division',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    CHEF_BUREAU: {
      label: 'Chef de Bureau',
      bg: 'bg-sky-50 dark:bg-sky-950/50',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800',
    },
    CHEF_SECTION: {
      label: 'Chef de Section',
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
    },
    CHEF_EQUIPE: {
      label: 'Chef d\'Équipe',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
    },
    CONTROLEUR: {
      label: 'Contrôleur',
      bg: 'bg-green-50 dark:bg-green-950/50',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    ANALYSTE: {
      label: 'Analyste',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    },
    CONSULTATION: {
      label: 'Consultation',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-600 dark:text-zinc-300',
      border: 'border-zinc-200 dark:border-zinc-700',
    },
  };

  const style = roleStyles[role] || {
    label: role,
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-600 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
}
