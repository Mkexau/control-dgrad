'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAssujettiAssietteAction, fetchAssujettisAssietteAction } from '@/app/actions/assiette';
import type { AssujettiAssiette } from '@/lib/assiette/assiette-service';

interface Props { initialData: { assujettis: AssujettiAssiette[]; total: number }; secteurs: { id: string; code: string; nom: string }[]; }

const emptyForm = { type: 'PERSONNE_MORALE' as const, nom_raison_sociale: '', forme_juridique: '', numero_rccm: '', adresse: '', province: '', ville: '', commune: '', telephone: '', email: '', activite_principale: '', secteur_principal_id: '', date_creation: '' };

export function AssujettisAssietteClient({ initialData, secteurs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreating = searchParams.get('mode') === 'create';
  const [assujettis, setAssujettis] = useState(initialData.assujettis);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    const result = await fetchAssujettisAssietteAction(search);
    if (result.success && result.data) { setAssujettis(result.data.assujettis); setTotal(result.data.total); }
    else setMessage(result.error ?? 'Recherche impossible.');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    startTransition(async () => {
      const result = await createAssujettiAssietteAction({ ...form, forme_juridique: form.forme_juridique || null, numero_rccm: form.numero_rccm || null, adresse: form.adresse || null, province: form.province || null, ville: form.ville || null, commune: form.commune || null, telephone: form.telephone || null, email: form.email || null, activite_principale: form.activite_principale || null, secteur_principal_id: form.secteur_principal_id || null, date_creation: form.date_creation || null });
      if (!result.success || !result.data) { setMessage(result.error ?? 'Création impossible.'); return; }
      setForm(emptyForm);
      setMessage(`Assujetti enregistré avec succès. NIF : ${result.data.identifiant}`);
      await refresh();
      router.replace('/assiette/assujettis');
    });
  };

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Service d’assiette</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Répertoire des assujettis</h1><p className="mt-1 text-sm text-slate-500">Saisissez les informations de base. Le NIF est généré automatiquement à l’enregistrement.</p></header>
    {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">{message}</div>}
    {isCreating && <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <button type="button" onClick={() => router.replace('/assiette/assujettis')} className="text-sm font-bold text-[#0a5db5] hover:underline">← Retour au répertoire</button>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="font-bold text-slate-900">Nouvel assujetti</h2><span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">NIF : généré automatiquement</span></div>
      <div className="grid gap-4 md:grid-cols-3"><Field label="Raison sociale *" value={form.nom_raison_sociale} onChange={(value) => setForm({ ...form, nom_raison_sociale: value })} required /><Select label="Type *" value={form.type} onChange={(value) => setForm({ ...form, type: value as typeof form.type })} options={[['PERSONNE_MORALE', 'Personne morale'], ['PERSONNE_PHYSIQUE', 'Personne physique']]} /><Field label="Forme juridique" value={form.forme_juridique} onChange={(value) => setForm({ ...form, forme_juridique: value })} placeholder="SARL, SA…" /><Field label="Numéro RCCM" value={form.numero_rccm} onChange={(value) => setForm({ ...form, numero_rccm: value })} /><Field label="Activité principale" value={form.activite_principale} onChange={(value) => setForm({ ...form, activite_principale: value })} /><Select label="Secteur d’activité" value={form.secteur_principal_id} onChange={(value) => setForm({ ...form, secteur_principal_id: value })} options={[['', 'Non rattaché'], ...secteurs.map((s) => [s.id, `${s.code} — ${s.nom}`])]} /><Field label="Province" value={form.province} onChange={(value) => setForm({ ...form, province: value })} /><Field label="Ville" value={form.ville} onChange={(value) => setForm({ ...form, ville: value })} /><Field label="Commune" value={form.commune} onChange={(value) => setForm({ ...form, commune: value })} /><Field label="Téléphone" value={form.telephone} onChange={(value) => setForm({ ...form, telephone: value })} /><Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label="Date de création" type="date" value={form.date_creation} onChange={(value) => setForm({ ...form, date_creation: value })} /></div>
      <label className="block text-xs font-semibold text-slate-700">Adresse<textarea value={form.adresse} onChange={(event) => setForm({ ...form, adresse: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" rows={2} /></label><button disabled={isPending} className="rounded-xl bg-[#0a5db5] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isPending ? 'Enregistrement…' : 'Enregistrer l’assujetti'}</button>
    </form>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Assujettis enregistrés</h2><p className="text-sm text-slate-500">{total} dans le répertoire</p></div><div className="flex flex-wrap gap-2"><button onClick={() => router.push('/assiette/assujettis?mode=create')} type="button" className="rounded-lg bg-[#0a5db5] px-3 py-2 text-sm font-semibold text-white">+ Nouvel assujetti</button><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="NIF, nom ou RCCM" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button onClick={() => startTransition(refresh)} type="button" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Rechercher</button></div></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50 text-left text-xs text-slate-500"><tr><th className="p-3">NIF</th><th className="p-3">Raison sociale</th><th className="p-3">RCCM</th><th className="p-3">Secteur</th><th className="p-3">Localité</th></tr></thead><tbody>{assujettis.map((item) => <tr key={item.id} className="border-b"><td className="p-3 font-mono font-semibold">{item.identifiant}</td><td className="p-3">{item.nom_raison_sociale}</td><td className="p-3">{item.numero_rccm || '—'}</td><td className="p-3">{item.secteurs?.nom || 'Non rattaché'}</td><td className="p-3">{[item.province, item.ville, item.commune].filter(Boolean).join(', ') || '—'}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) { return <label className="block text-xs font-semibold text-slate-700">{label}<input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="block text-xs font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>; }
