import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Récupérer les compteurs globaux
  const [
    { count: directionsCount },
    { count: divisionsCount },
    { count: bureauxCount },
    { count: secteursCount },
    { count: usersCount },
    { count: agentsCount },
    { data: recentAuditLogs },
  ] = await Promise.all([
    supabase.from('directions').select('*', { count: 'exact', head: true }),
    supabase.from('divisions').select('*', { count: 'exact', head: true }),
    supabase.from('bureaux').select('*', { count: 'exact', head: true }),
    supabase.from('secteurs').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const cards = [
    {
      title: 'Directions',
      count: directionsCount ?? 0,
      description: 'Direction générale & directions techniques',
      href: '/admin/directions',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: 'Divisions',
      count: divisionsCount ?? 0,
      description: 'Contrôle & Recoupement',
      href: '/admin/divisions',
      color: 'indigo',
      icon: (
        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
    },
    {
      title: 'Bureaux',
      count: bureauxCount ?? 0,
      description: 'Bureaux de contrôle & recoupement',
      href: '/admin/bureaux',
      color: 'sky',
      icon: (
        <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
    },
    {
      title: 'Secteurs d\'activité',
      count: secteursCount ?? 0,
      description: 'Secteurs de contrôle économique',
      href: '/admin/secteurs',
      color: 'emerald',
      icon: (
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      title: 'Comptes Utilisateurs',
      count: usersCount ?? 0,
      description: 'Profils avec rôles métier attribués',
      href: '/admin/utilisateurs',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Agents de Contrôle',
      count: agentsCount ?? 0,
      description: 'Agents et inspecteurs de terrain',
      href: '/admin/agents',
      color: 'amber',
      icon: (
        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Administration des Référentiels & Comptes
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gestion centrale de la structure organisationnelle, des secteurs d&apos;activité, des comptes applicatifs et des agents de la DGRAD.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-lg group-hover:scale-105 transition-transform">
                  {card.icon}
                </div>
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                  {card.count}
                </span>
              </div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {card.description}
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
              <span>Gérer les enregistrements</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity / Audit Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Journal d&apos;audit administratif récent
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Dernières actions de création, mise à jour et bascule d&apos;état enregistrées dans la table immuable <code className="font-mono text-[11px]">public.audit_logs</code>.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Audit Actif
          </span>
        </div>

        {recentAuditLogs && recentAuditLogs.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] ${
                      log.action === 'CREATION'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : log.action === 'MODIFICATION' || log.action === 'CHANGEMENT_ROLE'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    Entité : <span className="font-mono text-zinc-600 dark:text-zinc-400">{log.entity_type}</span>
                  </span>
                </div>
                <div className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4 text-center">
            Aucun événement d&apos;audit administratif enregistré pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
