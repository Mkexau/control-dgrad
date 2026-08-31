'use client';

// =============================================================================
// DGRAD CONTROLE - FORMULAIRE INTELLIGENT DE PRÉPARATION DE MISSION
// =============================================================================
// Processus en 5 étapes :
// 1. Type de contrôle
// 2. Secteur (avec suggestion automatique basée sur le manque à gagner)
// 3. Entreprises présélectionnées (cochées par défaut, ajustables)
// 4. Équipes et répartition automatique équilibrée
// 5. Récapitulatif et validation

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MissionType } from '@/lib/validations/missions';
import type { SyntheseSecteurItem } from '@/lib/controles/controle-ordonnancement-service';
import type { AssujettiBrief, AgentBrief } from '@/app/actions/mission-preparation';
import { createMission } from '@/app/actions/missions';
import { genererEquipesProposees } from '@/lib/missions/mission-preparation';

// ─── Types locaux ────────────────────────────────────────────────────────────

interface BureauItem {
  id: string;
  code: string;
  nom: string;
}

interface SecteurItem {
  id: string;
  bureau_id: string;
  code: string;
  nom: string;
}

type EquipeProposal = ReturnType<typeof genererEquipesProposees>[number];

interface MissionCreateFormProps {
  userBureauId: string | null;
  bureaux: BureauItem[];
  secteurs: SecteurItem[];
  synthese: SyntheseSecteurItem[];
  secteurPrioritaireId: string | null;
  assujettisParSecteur: Record<string, AssujettiBrief[]>;
  agents: AgentBrief[];
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  if (amount === 0) return `0 ${currency}`;
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

// ─── Composants d'interface ──────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function MissionCreateForm({
  userBureauId,
  bureaux,
  secteurs,
  synthese,
  secteurPrioritaireId,
  assujettisParSecteur,
  agents,
}: MissionCreateFormProps) {
  const router = useRouter();

  // ── État global ──
  const [typeControle, setTypeControle] = useState<MissionType>('SUR_PLACE');
  const [bureauId, setBureauId] = useState<string>(userBureauId || bureaux[0]?.id || '');
  const [motif, setMotif] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRecap, setShowRecap] = useState(false);

  // ── Étape 2 : Secteur ──
  const secteursPourBureau = secteurs.filter((s) => s.bureau_id === bureauId);
  const [secteurId, setSecteurId] = useState<string>(secteurPrioritaireId ?? secteursPourBureau[0]?.id ?? '');

  // Secteur prioritaire pour le bureau courant
  const secteurPrioritaire = synthese.find((s) => s.is_prioritaire && s.bureau_id === bureauId) ?? null;
  const syntheseseBureau = synthese.filter((s) => s.bureau_id === bureauId);
  const syntheseSelectionnee = synthese.find((s) => s.secteur_id === secteurId) ?? null;

  // ── Étape 3 : Entreprises ──
  const assujettisDisponibles: AssujettiBrief[] = secteurId
    ? (assujettisParSecteur[secteurId] ?? [])
    : Object.values(assujettisParSecteur).flat();

  // Par défaut : toutes les entreprises du secteur sont pré-cochées (sauf déjà contrôlées)
  const [selectedAssujettis, setSelectedAssujettis] = useState<string[]>(() =>
    (assujettisParSecteur[secteurId] ?? []).filter((a) => !a.deja_controle).map((a) => a.id)
  );

  // ── Étape 4 : Équipes ──
  const agentsDuBureau = agents.filter((a) => !bureauId || a.bureau_id === bureauId);

  const [nbEquipes, setNbEquipes] = useState(1);
  const [equipes, setEquipes] = useState<EquipeProposal[]>(() =>
    genererEquipesProposees(
      1,
      (assujettisParSecteur[secteurId] ?? []).filter((a) => !a.deja_controle).map((a) => a.id),
      agents.filter((a) => !bureauId || a.bureau_id === bureauId),
      secteurId
    )
  );

  const regenererEquipes = (assujettisIds: string[], nombreEquipes = nbEquipes, secteur = secteurId, bureau = bureauId) => {
    const agentsEligibles = agents.filter((agent) => !bureau || agent.bureau_id === bureau);
    setEquipes(
      typeControle === 'SUR_PLACE'
        ? genererEquipesProposees(nombreEquipes, assujettisIds, agentsEligibles, secteur)
        : []
    );
  };

  const selectionParDefaut = (secteur: string) =>
    (assujettisParSecteur[secteur] ?? [])
      .filter((assujetti) => !assujetti.deja_controle)
      .map((assujetti) => assujetti.id);

  const handleSecteurChange = (newSecteurId: string) => {
    const assujettisIds = selectionParDefaut(newSecteurId);
    setSecteurId(newSecteurId);
    setSelectedAssujettis(assujettisIds);
    regenererEquipes(assujettisIds, nbEquipes, newSecteurId);
    setShowRecap(false);
  };

  const handleBureauChange = (newBureauId: string) => {
    const firstSecteur = secteurs.find((s) => s.bureau_id === newBureauId)?.id ?? '';
    const assujettisIds = selectionParDefaut(firstSecteur);
    setBureauId(newBureauId);
    setSecteurId(firstSecteur);
    setSelectedAssujettis(assujettisIds);
    regenererEquipes(assujettisIds, nbEquipes, firstSecteur, newBureauId);
    setShowRecap(false);
  };

  const handleToggleAssujetti = (id: string) => {
    const nextSelection = selectedAssujettis.includes(id)
      ? selectedAssujettis.filter((selectedId) => selectedId !== id)
      : [...selectedAssujettis, id];
    setSelectedAssujettis(nextSelection);
    regenererEquipes(nextSelection);
    setShowRecap(false);
  };

  const handleNbEquipesChange = (n: number) => {
    const nextNombreEquipes = Math.max(1, Math.min(n, 20));
    setNbEquipes(nextNombreEquipes);
    regenererEquipes(selectedAssujettis, nextNombreEquipes);
    setShowRecap(false);
  };

  // ── Soumission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedAssujettis.length === 0) {
      setErrorMessage('Veuillez sélectionner au moins une entreprise pour cette mission.');
      return;
    }

    if (typeControle === 'SUR_PLACE') {
      if (equipes.length === 0) {
        setErrorMessage('Veuillez proposer au moins une équipe pour une mission sur place.');
        return;
      }
      for (let i = 0; i < equipes.length; i++) {
        const eq = equipes[i];
        if (!eq.chef_equipe_id) {
          setErrorMessage(`Veuillez désigner un chef d'équipe pour « ${eq.nom} ».`);
          return;
        }
        if (eq.agents_ids.length === 0) {
          setErrorMessage(`Veuillez affecter au moins un agent pour « ${eq.nom} ».`);
          return;
        }
        if (eq.assujettis_ids.length === 0) {
          setErrorMessage(`Veuillez affecter au moins une entreprise à « ${eq.nom} ».`);
          return;
        }
      }
    }

    if (motif.trim().length < 5) {
      setErrorMessage('Le motif de la mission doit comporter au moins 5 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        type_controle: typeControle,
        bureau_id: bureauId,
        secteur_id: secteurId || null,
        motif: motif.trim(),
        assujettis_ids: selectedAssujettis,
        equipes_propositions: typeControle === 'SUR_PLACE' ? equipes : null,
      };

      const res = await createMission(payload);

      if (res.success && res.data) {
        router.push(`/missions/${res.data.id}`);
      } else {
        setErrorMessage(res.error || 'Erreur lors de la création de la mission.');
        setShowRecap(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur inattendue.');
      setShowRecap(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Données pour le récapitulatif ──
  const assujettisNonSelectionnes = assujettisDisponibles.filter(
    (a) => !selectedAssujettis.includes(a.id)
  );

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Préparer une Demande de Mission
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Le système propose. Vous décidez.
          </p>
        </div>
        <Link
          href="/missions"
          className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          ← Retour aux missions
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Étape 1 : Type de contrôle ─────────────────────────────────── */}
        <SectionCard>
          <SectionTitle step={1} title="Type de mission" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['SUR_PLACE', 'SUR_PIECES'] as const).map((type) => (
              <label
                key={type}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  typeControle === type
                    ? type === 'SUR_PLACE'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-600'
                      : 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="type_controle"
                    value={type}
                    checked={typeControle === type}
                    onChange={() => {
                      setTypeControle(type);
                      setEquipes(
                        type === 'SUR_PLACE'
                          ? genererEquipesProposees(nbEquipes, selectedAssujettis, agentsDuBureau, secteurId)
                          : []
                      );
                      setShowRecap(false);
                    }}
                    className={`w-4 h-4 focus:ring-2 ${type === 'SUR_PLACE' ? 'text-blue-600 focus:ring-blue-500' : 'text-purple-600 focus:ring-purple-500'}`}
                  />
                  <div>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {type === 'SUR_PLACE' ? 'Contrôle sur place' : 'Contrôle sur pièces'}
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {type === 'SUR_PLACE'
                        ? 'Déplacement physique d\'équipes. Requiert approbation DG, génère un ordre de mission.'
                        : 'Instruction sur dossier. Requiert approbation Chef de section, génère une autorisation.'}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </SectionCard>

        {/* ─── Étape 2 : Bureau & Secteur (avec suggestion automatique) ────── */}
        <SectionCard>
          <SectionTitle
            step={2}
            title="Bureau compétent & Secteur prioritaire"
            subtitle="Le secteur ayant le manque à gagner le plus élevé est proposé automatiquement."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bureau */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Bureau de contrôle compétent *
              </label>
              <select
                value={bureauId}
                onChange={(e) => handleBureauChange(e.target.value)}
                required
                disabled={Boolean(userBureauId) || isLoading}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {bureaux.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Secteur */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Secteur d&apos;activité *
              </label>
              <select
                value={secteurId}
                onChange={(e) => handleSecteurChange(e.target.value)}
                required
                disabled={isLoading || secteursPourBureau.length === 0}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sélectionnez un secteur —</option>
                {secteursPourBureau.map((s) => {
                  const synth = syntheseseBureau.find((sy) => sy.secteur_id === s.id);
                  const isPrioritaire = synth?.is_prioritaire;
                  return (
                    <option key={s.id} value={s.id}>
                      {isPrioritaire ? '★ ' : ''}{s.nom}
                      {synth && synth.manque_a_gagner_cdf > 0
                        ? ` — MAG: ${synth.manque_a_gagner_cdf.toLocaleString('fr-FR')} CDF`
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Bandeau secteur prioritaire */}
          {secteurPrioritaire ? (
            <div className={`rounded-xl p-4 border ${
              secteurPrioritaire.secteur_id === secteurId
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">★</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Secteur prioritaire proposé : {secteurPrioritaire.secteur_nom}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Manque à gagner le plus élevé dans votre périmètre.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <span className="font-mono font-semibold text-red-700 dark:text-red-400">
                      MAG CDF : {formatCurrency(secteurPrioritaire.manque_a_gagner_cdf, 'CDF')}
                    </span>
                    {secteurPrioritaire.manque_a_gagner_usd > 0 && (
                      <span className="font-mono font-semibold text-orange-700 dark:text-orange-400">
                        MAG USD : {formatCurrency(secteurPrioritaire.manque_a_gagner_usd, 'USD')}
                      </span>
                    )}
                    <span className="text-zinc-500">
                      {secteurPrioritaire.nombre_assujettis} assujetti(s) concerné(s)
                    </span>
                  </div>
                </div>
                {secteurPrioritaire.secteur_id !== secteurId && (
                  <button
                    type="button"
                    onClick={() => handleSecteurChange(secteurPrioritaire.secteur_id)}
                    className="shrink-0 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Appliquer
                  </button>
                )}
              </div>
            </div>
          ) : syntheseseBureau.length > 0 ? (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 italic">
              Aucune donnée suffisante pour proposer automatiquement un secteur prioritaire. Sélectionnez un secteur manuellement.
            </div>
          ) : null}

          {/* Manque à gagner du secteur sélectionné */}
          {syntheseSelectionnee && secteurId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { label: 'MAG CDF', value: formatCurrency(syntheseSelectionnee.manque_a_gagner_cdf, 'CDF'), color: 'text-red-700 dark:text-red-400' },
                { label: 'MAG USD', value: formatCurrency(syntheseSelectionnee.manque_a_gagner_usd, 'USD'), color: 'text-orange-700 dark:text-orange-400' },
                { label: 'Assujettis', value: syntheseSelectionnee.nombre_assujettis.toString(), color: 'text-blue-700 dark:text-blue-400' },
                { label: 'Débiteurs', value: syntheseSelectionnee.nombre_debiteurs.toString(), color: 'text-zinc-700 dark:text-zinc-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
                  <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ─── Étape 3 : Motif ─────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle step={3} title="Motif de la mission" />
          <textarea
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={
              secteurPrioritaire && secteurPrioritaire.secteur_id === secteurId
                ? `Manque à gagner élevé dans le secteur ${secteurPrioritaire.secteur_nom} : ${formatCurrency(secteurPrioritaire.manque_a_gagner_cdf, 'CDF')}. Contrôle ciblé requis.`
                : 'Justifiez les raisons du contrôle (recoupement, défaillance déclarative, analyse statistique...)'
            }
            required
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </SectionCard>

        {/* ─── Étape 4 : Entreprises présélectionnées ──────────────────────── */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <SectionTitle
              step={4}
              title={`Entreprises ciblées (${selectedAssujettis.length} sélectionnée(s))`}
              subtitle="Les entreprises du secteur sont pré-cochées. Décochez celles à exclure de cette mission."
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextSelection = assujettisDisponibles
                    .filter((assujetti) => !assujetti.deja_controle)
                    .map((assujetti) => assujetti.id);
                  setSelectedAssujettis(nextSelection);
                  regenererEquipes(nextSelection);
                  setShowRecap(false);
                }}
                className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAssujettis([]);
                  regenererEquipes([]);
                  setShowRecap(false);
                }}
                className="px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-md transition-colors"
              >
                Tout décocher
              </button>
            </div>
          </div>

          {assujettisDisponibles.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 italic border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
              {secteurId
                ? 'Aucun assujetti enregistré pour ce secteur.'
                : 'Sélectionnez un secteur pour voir les entreprises disponibles.'}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              {assujettisDisponibles.map((ass) => {
                const isChecked = selectedAssujettis.includes(ass.id);
                return (
                  <label
                    key={ass.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-50/60 dark:bg-blue-950/30'
                        : ass.deja_controle
                        ? 'bg-zinc-50 dark:bg-zinc-800/30 opacity-60'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleAssujetti(ass.id)}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {ass.nom_raison_sociale}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {ass.identifiant}
                        {ass.deja_controle && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 not-italic">
                            ⚠ Déjà contrôlé(e)
                          </span>
                        )}
                      </div>
                    </div>
                    {isChecked ? (
                      <span className="shrink-0 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
                        SÉLECTIONNÉ
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-2 py-0.5">
                        Non sélectionné
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {assujettisNonSelectionnes.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{assujettisNonSelectionnes.length}</span> entreprise(s) non sélectionnée(s) pour cette mission. Elles pourront être ciblées lors d&apos;une prochaine mission.
            </p>
          )}
        </SectionCard>

        {/* ─── Étape 5 : Équipes (uniquement SUR_PLACE) ─────────────────────── */}
        {typeControle === 'SUR_PLACE' && (
          <SectionCard>
            <SectionTitle
              step={5}
              title="Équipes de terrain"
              subtitle="Indiquez le nombre d'équipes. La répartition des entreprises est proposée automatiquement."
            />

            {/* Sélecteur nombre d'équipes */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                Nombre d&apos;équipes
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNbEquipesChange(nbEquipes - 1)}
                  className="w-8 h-8 flex items-center justify-center text-lg font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {nbEquipes}
                </span>
                <button
                  type="button"
                  onClick={() => handleNbEquipesChange(nbEquipes + 1)}
                  className="w-8 h-8 flex items-center justify-center text-lg font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  +
                </button>
              </div>
              {selectedAssujettis.length > 0 && (
                <span className="text-xs text-zinc-500">
                  → {selectedAssujettis.length} entreprise(s) réparties sur {nbEquipes} équipe(s)
                  {selectedAssujettis.length % nbEquipes !== 0 && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      ({Math.floor(selectedAssujettis.length / nbEquipes) + 1}+{Math.floor(selectedAssujettis.length / nbEquipes)}… répartition inégale ajustée)
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Équipes générées */}
            {equipes.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400 italic border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                Sélectionnez des entreprises à l&apos;étape 4 pour générer les équipes.
              </div>
            ) : (
              <div className="space-y-5">
                {equipes.map((eq, eqIdx) => {
                  const agentsPrioritaires = agentsDuBureau.filter((a) => a.secteur_id === secteurId);
                  return (
                    <div
                      key={eqIdx}
                      className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-4"
                    >
                      {/* Nom de l'équipe */}
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                        <input
                          type="text"
                          value={eq.nom}
                          onChange={(e) => {
                            const copy = [...equipes];
                            copy[eqIdx] = { ...copy[eqIdx], nom: e.target.value };
                            setEquipes(copy);
                          }}
                          required
                          className="font-bold text-sm bg-transparent border-b border-dashed border-zinc-400 focus:outline-none text-zinc-900 dark:text-zinc-100 min-w-0 flex-1"
                        />
                        <span className="ml-3 text-xs text-zinc-500 shrink-0">
                          {eq.assujettis_ids.length} entreprise(s) · {eq.agents_ids.length} agent(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chef d'équipe */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                            Chef d&apos;équipe *
                          </label>
                          <select
                            value={eq.chef_equipe_id}
                            onChange={(e) => {
                              const copy = [...equipes];
                              copy[eqIdx] = { ...copy[eqIdx], chef_equipe_id: e.target.value };
                              setEquipes(copy);
                            }}
                            required
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none"
                          >
                            <option value="">— Chef d&apos;équipe —</option>
                            {agentsDuBureau.map((ag) => {
                              const nomComplet = `${ag.prenom} ${ag.nom}`.trim() || ag.matricule;
                              const isPrioritaire = agentsPrioritaires.some((p) => p.id === ag.id);
                              return (
                                <option key={ag.id} value={ag.id}>
                                  {isPrioritaire ? '★ ' : ''}{nomComplet} ({ag.matricule})
                                  {ag.specialite ? ` — ${ag.specialite}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Agents membres */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                            Agents ({eq.agents_ids.length} sélectionné(s))
                          </label>
                          <div className="max-h-36 overflow-y-auto border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-2 space-y-1">
                            {agentsDuBureau.map((ag) => {
                              const isSelected = eq.agents_ids.includes(ag.id);
                              const nomComplet = `${ag.prenom} ${ag.nom}`.trim() || ag.matricule;
                              const isPrioritaire = agentsPrioritaires.some((p) => p.id === ag.id);
                              return (
                                <label
                                  key={ag.id}
                                  className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      const copy = [...equipes];
                                      copy[eqIdx] = {
                                        ...copy[eqIdx],
                                        agents_ids: isSelected
                                          ? copy[eqIdx].agents_ids.filter((id) => id !== ag.id)
                                          : [...copy[eqIdx].agents_ids, ag.id],
                                      };
                                      setEquipes(copy);
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600"
                                  />
                                  <span>
                                    {isPrioritaire && (
                                      <span className="text-blue-600 font-bold mr-1">★</span>
                                    )}
                                    <strong>{nomComplet}</strong>
                                    <span className="text-zinc-400 ml-1">({ag.matricule})</span>
                                    {ag.specialite && (
                                      <span className="text-zinc-500 text-[10px] ml-1">— {ag.specialite}</span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Entreprises affectées à l'équipe */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                          Entreprises affectées à cette équipe ({eq.assujettis_ids.length})
                        </label>
                        <div className="max-h-28 overflow-y-auto border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-2 space-y-1">
                          {selectedAssujettis.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">Sélectionnez des entreprises à l&apos;étape 4.</p>
                          ) : (
                            selectedAssujettis.map((assId) => {
                              const assObj = assujettisDisponibles.find((a) => a.id === assId);
                              const isAssigned = eq.assujettis_ids.includes(assId);
                              return (
                                <label
                                  key={assId}
                                  className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => {
                                      const copy = [...equipes];
                                      copy[eqIdx] = {
                                        ...copy[eqIdx],
                                        assujettis_ids: isAssigned
                                          ? copy[eqIdx].assujettis_ids.filter((id) => id !== assId)
                                          : [...copy[eqIdx].assujettis_ids, assId],
                                      };
                                      setEquipes(copy);
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600"
                                  />
                                  <span>
                                    {assObj?.nom_raison_sociale}
                                    <span className="text-zinc-400 ml-1 font-mono">({assObj?.identifiant})</span>
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* ─── Récapitulatif ───────────────────────────────────────────────── */}
        {!showRecap ? (
          <div className="flex justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/missions"
              className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Annuler
            </Link>
            <button
              type="button"
              disabled={selectedAssujettis.length === 0 || isLoading}
              onClick={() => {
                setErrorMessage(null);
                if (selectedAssujettis.length === 0) {
                  setErrorMessage('Veuillez sélectionner au moins une entreprise.');
                  return;
                }
                if (motif.trim().length < 5) {
                  setErrorMessage('Le motif doit comporter au moins 5 caractères.');
                  return;
                }
                setShowRecap(true);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
            >
              Voir le récapitulatif →
            </button>
          </div>
        ) : (
          <>
            {/* ─── Bloc récapitulatif ─── */}
            <SectionCard className="!border-blue-200 dark:!border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex items-start justify-between gap-4">
                <SectionTitle step={typeControle === 'SUR_PLACE' ? 6 : 5} title="Récapitulatif avant validation" />
                <button
                  type="button"
                  onClick={() => setShowRecap(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 underline shrink-0"
                >
                  ← Modifier
                </button>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Type de contrôle</dt>
                  <dd className="font-bold text-zinc-900 dark:text-zinc-100">{typeControle === 'SUR_PLACE' ? 'Contrôle sur place' : 'Contrôle sur pièces'}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Secteur</dt>
                  <dd className="font-bold text-zinc-900 dark:text-zinc-100">
                    {syntheseSelectionnee?.secteur_nom ?? secteurs.find((s) => s.id === secteurId)?.nom ?? '—'}
                  </dd>
                </div>
                {syntheseSelectionnee && (
                  <>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold uppercase text-zinc-500">Manque à gagner CDF</dt>
                      <dd className="font-bold font-mono text-red-700 dark:text-red-400">
                        {formatCurrency(syntheseSelectionnee.manque_a_gagner_cdf, 'CDF')}
                      </dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold uppercase text-zinc-500">Manque à gagner USD</dt>
                      <dd className="font-bold font-mono text-orange-700 dark:text-orange-400">
                        {formatCurrency(syntheseSelectionnee.manque_a_gagner_usd, 'USD')}
                      </dd>
                    </div>
                  </>
                )}
                <div className="space-y-0.5">
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Entreprises sélectionnées</dt>
                  <dd className="font-bold text-blue-700 dark:text-blue-400">{selectedAssujettis.length}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Entreprises non sélectionnées</dt>
                  <dd className="font-bold text-zinc-500">{assujettisNonSelectionnes.length}</dd>
                </div>
                {typeControle === 'SUR_PLACE' && (
                  <div className="space-y-0.5 md:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Équipes proposées</dt>
                    <dd className="space-y-1">
                      {equipes.map((eq, i) => {
                        const chef = agentsDuBureau.find((a) => a.id === eq.chef_equipe_id);
                        const chefNom = chef ? `${chef.prenom} ${chef.nom}`.trim() || chef.matricule : '—';
                        return (
                          <div key={i} className="text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2">
                            <span className="font-bold">{eq.nom}</span>
                            <span className="mx-2 text-zinc-400">·</span>
                            Chef : <span className="font-semibold">{chefNom}</span>
                            <span className="mx-2 text-zinc-400">·</span>
                            {eq.agents_ids.length} agent(s)
                            <span className="mx-2 text-zinc-400">·</span>
                            {eq.assujettis_ids.length} entreprise(s)
                          </div>
                        );
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </SectionCard>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowRecap(false)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                ← Modifier
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {isLoading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Valider la demande de mission
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
