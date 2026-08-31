'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';
import { RoleBadge } from '@/components/admin/status-badge';
import { NotificationBell } from '@/components/notifications/notification-bell';

type ShellUser = {
  email: string;
  role: string;
  nom?: string | null;
  prenom?: string | null;
  bureau_code?: string | null;
  division_code?: string | null;
};

const navigationGeneral = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '▦' },
  { href: '/controles/ordonnancements', label: 'Données d’ordonnancement', icon: '📋' },
  { href: '/missions', label: 'Missions', icon: '◇' },
  { href: '/equipes', label: 'Équipes', icon: '◌' },
  { href: '/assujettis', label: 'Assujettis', icon: '◈' },
  { href: '/analyses', label: 'Analyses', icon: '◫' },
];

const navigationRecoupement = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '▦' },
  { href: '/assujettis', label: 'Assujettis', icon: '◈' },
  { href: '/recoupement/fiches-ordonnancement', label: 'Fiches d’ordonnancement', icon: '📋' },
];

const pageTitles: Record<string, string> = {
  dashboard: 'Tableau de bord',
  missions: 'Missions de contrôle',
  equipes: 'Équipes de terrain',
  controles: 'Contrôles & Données d’ordonnancement',
  assujettis: 'Assujettis',
  analyses: 'Analyses et recoupements',
  recoupement: 'Recoupement & Ordonnancement',
  admin: 'Administration',
};

export function InstitutionalShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const section = pathname.split('/')[1] || 'dashboard';
  const title = pageTitles[section] ?? 'DGRAD Contrôle';
  const initials = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? user.email[0] ?? ''}`.toUpperCase();
  const isAdmin = user.role === 'ADMIN';
  const isRecoupement =
    user.bureau_code === 'BUR_ANA_REC' ||
    (user.role === 'CHEF_DIVISION' && user.division_code === 'DIV_REC');

  let items = navigationGeneral;
  if (isAdmin) {
    items = [{ href: '/dashboard', label: 'Tableau de bord', icon: '▦' }, { href: '/admin', label: 'Administration', icon: '⚙' }];
  } else if (isRecoupement) {
    items = navigationRecoupement;
  }

  return (
    <div className="institutional-shell min-h-screen bg-slate-50 text-slate-900">
      {isOpen && <button aria-label="Fermer le menu" onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" />}
      <aside className={`institutional-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-sm"><Image src="/images/branding/dgrad-logo.png" alt="DGRAD" width={42} height={42} className="h-full w-full object-contain" preload /></div>
          <div><p className="text-sm font-bold tracking-[0.13em] text-white">DGRAD</p><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-blue-200">Contrôle non fiscal</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6" aria-label="Navigation principale">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/65">Espace de travail</p>
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return <Link key={item.href} onClick={() => setIsOpen(false)} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-white text-[#093b78] shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}><span className={`grid h-6 w-6 place-items-center rounded-md text-sm ${active ? 'bg-blue-50 text-[#0a5db5]' : 'text-blue-200'}`}>{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/8 p-4">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-amber-300 text-xs font-bold text-[#093b78]">{initials}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{user.prenom} {user.nom}</p><p className="truncate text-[11px] text-blue-200">{user.email}</p></div></div>
          <div className="mt-3"><LogoutButton /></div>
        </div>
      </aside>
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
          <div className="flex h-[4.5rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button type="button" aria-label="Ouvrir le menu" onClick={() => setIsOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-[#093b78] lg:hidden">☰</button>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0a5db5]">DGRAD · Espace sécurisé</p><h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h1></div>
            <div className="flex items-center gap-2 sm:gap-3"><NotificationBell /><div className="hidden sm:block"><RoleBadge role={user.role} /></div><div className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#0a5db5]">{initials}</div></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
