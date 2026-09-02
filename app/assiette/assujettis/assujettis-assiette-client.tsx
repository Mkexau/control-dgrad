'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createAssujettiAssietteAction, fetchAssujettisAssietteAction } from '@/app/actions/assiette';
import type { AssujettiAssiette } from '@/lib/assiette/assiette-service';

interface Props {
  initialData: { assujettis: AssujettiAssiette[]; total: number };
  secteurs: { id: string; code: string; nom: string }[];
}

const emptyForm = {
  type: 'PERSONNE_MORALE' as const,
  nom_raison_sociale: '',
  forme_juridique: '',
  numero_rccm: '',
  adresse: '',
  province: '',
  ville: '',
  commune: '',
  telephone: '',
  email: '',
  activite_principale: '',
  secteur_principal_id: '',
  date_creation: '',
};

export function AssujettisAssietteClient({ initialData, secteurs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreating = searchParams.get('mode') === 'create';
  const [assujettis, setAssujettis] = useState(initialData.assujettis);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; nif?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    const result = await fetchAssujettisAssietteAction(search);
    if (result.success && result.data) {
      setAssujettis(result.data.assujettis);
      setTotal(result.data.total);
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Recherche impossible.' });
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createAssujettiAssietteAction({
        ...form,
        forme_juridique: form.forme_juridique || null,
        numero_rccm: form.numero_rccm || null,
        adresse: form.adresse || null,
        province: form.province || null,
        ville: form.ville || null,
        commune: form.commune || null,
        telephone: form.telephone || null,
        email: form.email || null,
        activite_principale: form.activite_principale || null,
        secteur_principal_id: form.secteur_principal_id || null,
        date_creation: form.date_creation || null,
      });

      if (!result.success || !result.data) {
        setMessage({ type: 'error', text: result.error ?? 'Création impossible.' });
        return;
      }

      setForm(emptyForm);
      setMessage({
        type: 'success',
        text: `Assujetti enregistré avec succès dans le répertoire national. NIF : ${result.data.identifiant}`,
        nif: result.data.identifiant,
      });
      await refresh();
      router.replace('/assiette/assujettis');
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FIL D'ARIANE (BREADCRUMBS) */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/dashboard" className="text-[#0a5db5] hover:underline">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/assiette/assujettis" className="text-[#0a5db5] hover:underline">
          Assujettis
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800">
          {isCreating ? 'Nouvel assujetti' : 'Répertoire'}
        </span>
      </nav>

      {/* 2. MESSAGE D'INFORMATION OU DE SUCCÈS */}
      {message && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 shadow-xs ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-base shadow-xs">
              {message.type === 'success' ? '✓' : '⚠'}
            </span>
            <p className="text-sm font-semibold">{message.text}</p>
          </div>
          {isCreating && (
            <button
              type="button"
              onClick={() => router.replace('/assiette/assujettis')}
              className="text-xs font-bold text-[#0a5db5] hover:underline"
            >
              ← Retour au répertoire
            </button>
          )}
        </div>
      )}

      {/* 3. FORMULAIRE DE CRÉATION */}
      {isCreating && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <button
                type="button"
                onClick={() => router.replace('/assiette/assujettis')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0a5db5] hover:underline mb-1"
              >
                ← Retour au répertoire
              </button>
              <h2 className="text-xl font-extrabold text-slate-900">Nouvel assujetti</h2>
              <p className="text-xs text-slate-500">
                Enregistrez les coordonnées de l’assujetti. Le NIF est généré automatiquement et verrouillé.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-mono font-bold text-[#0a5db5]">
              NIF : Attribué automatiquement
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Raison sociale ou Nom complet *"
              value={form.nom_raison_sociale}
              onChange={(value) => setForm({ ...form, nom_raison_sociale: value })}
              placeholder="Ex. BRASSERIE DU CONGO SARL"
              required
            />
            <Select
              label="Type de personne *"
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value as typeof form.type })}
              options={[
                ['PERSONNE_MORALE', 'Personne morale'],
                ['PERSONNE_PHYSIQUE', 'Personne physique'],
              ]}
            />
            <Field
              label="Forme juridique"
              value={form.forme_juridique}
              onChange={(value) => setForm({ ...form, forme_juridique: value })}
              placeholder="Ex. SARL, SA, Ets, ASBL…"
            />
            <Field
              label="Numéro RCCM"
              value={form.numero_rccm}
              onChange={(value) => setForm({ ...form, numero_rccm: value })}
              placeholder="Ex. CD/KIN/RCCM/24-B-0001"
            />
            <Field
              label="Activité principale"
              value={form.activite_principale}
              onChange={(value) => setForm({ ...form, activite_principale: value })}
              placeholder="Ex. Commerce général, Télécoms…"
            />
            <Select
              label="Secteur d’activité officiel"
              value={form.secteur_principal_id}
              onChange={(value) => setForm({ ...form, secteur_principal_id: value })}
              options={[
                ['', 'Non rattaché'],
                ...secteurs.map((s) => [s.id, `${s.code} — ${s.nom}`]),
              ]}
            />
            <Field
              label="Province"
              value={form.province}
              onChange={(value) => setForm({ ...form, province: value })}
              placeholder="Ex. Kinshasa, Haut-Katanga…"
            />
            <Field
              label="Ville"
              value={form.ville}
              onChange={(value) => setForm({ ...form, ville: value })}
              placeholder="Ex. Kinshasa, Lubumbashi…"
            />
            <Field
              label="Commune / Quartier"
              value={form.commune}
              onChange={(value) => setForm({ ...form, commune: value })}
              placeholder="Ex. Gombe, Limete…"
            />
            <Field
              label="Téléphone de contact"
              value={form.telephone}
              onChange={(value) => setForm({ ...form, telephone: value })}
              placeholder="Ex. +243810000000"
            />
            <Field
              label="Adresse email"
              type="email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              placeholder="contact@entreprise.cd"
            />
            <Field
              label="Date de création ou début d'activité"
              type="date"
              value={form.date_creation}
              onChange={(value) => setForm({ ...form, date_creation: value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Adresse physique complète
              <textarea
                value={form.adresse}
                onChange={(event) => setForm({ ...form, adresse: event.target.value })}
                placeholder="Numéro, Avenue, Immeuble, Réf..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-[#0a5db5] focus:outline-none"
                rows={2}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => router.replace('/assiette/assujettis')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#0a5db5] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#093b78] disabled:opacity-60"
            >
              {isPending ? 'Enregistrement en cours…' : 'Enregistrer l’assujetti'}
            </button>
          </div>
        </form>
      )}

      {/* 4. TABLEAU DU RÉPERTOIRE DES ASSUJETTI */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Répertoire des assujettis</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {total} assujetti{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''} au répertoire national.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <span>←</span>
              <span>Tableau de bord</span>
            </Link>
            <button
              type="button"
              onClick={() => router.push('/assiette/assujettis?mode=create')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a5db5] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#093b78]"
            >
              <span>+</span>
              <span>Nouvel assujetti</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') startTransition(refresh);
            }}
            placeholder="Rechercher par NIF, Raison sociale, RCCM ou contact..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-[#0a5db5] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => startTransition(refresh)}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
          >
            Rechercher
          </button>
        </div>

        {/* Liste tabulaire */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3">NIF</th>
                <th className="p-3">Raison sociale</th>
                <th className="p-3">RCCM</th>
                <th className="p-3">Secteur</th>
                <th className="p-3">Localité</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assujettis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                    Aucun assujetti trouvé dans le répertoire.
                  </td>
                </tr>
              ) : (
                assujettis.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono text-xs font-bold text-[#0a5db5]">
                      <Link href={`/assujettis/${item.id}`} className="hover:underline">
                        {item.identifiant}
                      </Link>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      <Link href={`/assujettis/${item.id}`} className="hover:underline">
                        {item.nom_raison_sociale}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">
                      {item.numero_rccm || '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {item.secteurs?.nom || 'Non rattaché'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {[item.province, item.ville, item.commune].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/assujettis/${item.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                      >
                        Consulter →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-[#0a5db5] focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-[#0a5db5] focus:outline-none bg-white"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
