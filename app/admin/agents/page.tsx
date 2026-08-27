import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { AgentsClient } from './agents-client';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const supabase = createAdminClient();

  const [{ data: agents }, { data: profiles }] = await Promise.all([
    supabase
      .from('agents')
      .select('id, profile_id, matricule, specialite, domaine_competence, actif, profiles(id, nom, prenom, email, role, bureaux(code, nom))')
      .order('matricule', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, nom, prenom, email, role')
      .eq('actif', true)
      .order('nom', { ascending: true }),
  ]);

  const assignedProfileIds = new Set((agents || []).map((a) => a.profile_id));

  const enrichedProfiles = (profiles || []).map((p) => ({
    ...p,
    hasAgent: assignedProfileIds.has(p.id),
  }));

  return (
    <AgentsClient
      initialAgents={
        (agents as unknown as {
          id: string;
          profile_id: string;
          matricule: string;
          specialite?: string | null;
          domaine_competence?: string | null;
          actif: boolean;
          profiles: {
            id: string;
            nom: string;
            prenom: string;
            email: string;
            role: string;
            bureaux?: { code: string; nom: string } | null;
          } | null;
        }[]) || []
      }
      profilesList={enrichedProfiles}
    />
  );
}
