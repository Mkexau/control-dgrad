import Link from 'next/link';
import type { ServiceAssietteDashboard } from '@/lib/assiette/assiette-service';

interface Props {
  prenom: string | null | undefined;
  dashboard: ServiceAssietteDashboard;
}

export function ServiceAssietteDashboardClient({ prenom, dashboard }: Props) {
  return (
    <div className="space-y-6 pb-12">
      {/* En-tête institutionnel */}
      <header className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0a5db5]">
              Service d’assiette · Répertoire National
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Bonjour, {prenom || 'Agent'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Direction Générale des Recettes Administratives, Judiciaires, Domaniales et de Participations (DGRAD)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/assiette/assujettis?mode=create"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a5db5] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#093b78]"
            >
              <span>+</span>
              <span>Nouvel assujetti</span>
            </Link>
            <Link
              href="/assiette/assujettis"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span>◈</span>
              <span>Voir le répertoire</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Cartes Métriques */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total des assujettis" value={dashboard.total} tone="blue" />
        <Metric label="Enregistrés aujourd’hui" value={dashboard.enregistresAujourdhui} tone="emerald" />
        <Metric label="Enregistrés ce mois" value={dashboard.enregistresCeMois} tone="amber" />
        <Metric
          label="Assujettis actifs"
          value={dashboard.actifs}
          detail={`${dashboard.inactifs} inactif(s)`}
          tone="slate"
        />
      </section>

      {/* Tableau des Derniers Inscrits */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Derniers assujettis enregistrés</h2>
            <p className="text-xs text-slate-500">Dernières inscriptions au répertoire national des assujettis.</p>
          </div>
          <Link
            href="/assiette/assujettis"
            className="text-xs font-bold text-[#0a5db5] hover:underline"
          >
            Consulter tout le répertoire →
          </Link>
        </div>

        {dashboard.derniersAssujettis.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">Aucun assujetti enregistré pour le moment.</p>
            <Link
              href="/assiette/assujettis?mode=create"
              className="mt-3 inline-block text-xs font-bold text-[#0a5db5] hover:underline"
            >
              Enregistrer le premier assujetti →
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">NIF</th>
                  <th className="p-3">Raison sociale</th>
                  <th className="p-3">Secteur</th>
                  <th className="p-3">Localisation</th>
                  <th className="p-3 text-right">Enregistré le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboard.derniersAssujettis.map((assujetti) => (
                  <tr key={assujetti.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono text-xs font-bold text-[#0a5db5]">
                      <Link href={`/assujettis/${assujetti.id}`} className="hover:underline">
                        {assujetti.identifiant}
                      </Link>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      <Link href={`/assujettis/${assujetti.id}`} className="hover:underline">
                        {assujetti.nom_raison_sociale}
                      </Link>
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {assujetti.secteurs?.nom || 'Non rattaché'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {[assujetti.province, assujetti.ville, assujetti.commune].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-right text-xs text-slate-500 font-mono">
                      {new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium' }).format(new Date(assujetti.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail?: string;
  tone: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const tones = {
    blue: 'border-blue-100 text-blue-700 bg-blue-50/50',
    emerald: 'border-emerald-100 text-emerald-700 bg-emerald-50/50',
    amber: 'border-amber-100 text-amber-700 bg-amber-50/50',
    slate: 'border-slate-200 text-slate-700 bg-slate-50/50',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-extrabold text-slate-900">{value}</p>
        <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>
          {tone === 'emerald' ? '▲ Jour' : tone === 'amber' ? '● Mois' : tone === 'blue' ? 'Total' : 'Statut'}
        </span>
      </div>
      {detail && <p className="mt-1.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
