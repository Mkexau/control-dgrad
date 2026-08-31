import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`mx-auto flex max-w-md flex-col items-center text-center ${compact ? 'py-3' : 'py-8'}`}>
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#0a5db5]" aria-hidden="true">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.75A2.25 2.25 0 016.25 4.5h11.5A2.25 2.25 0 0120 6.75v10.5a2.25 2.25 0 01-2.25 2.25H6.25A2.25 2.25 0 014 17.25V6.75z" />
          <path strokeLinecap="round" d="M8 9h8M8 13h5" />
        </svg>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="space-y-6" aria-label="Chargement du contenu" role="status">
      <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
      <span className="sr-only">Chargement en cours</span>
    </div>
  );
}
