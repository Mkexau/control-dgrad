import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { MissionCreateForm } from './mission-create-form';

export const dynamic = 'force-dynamic';

export default async function NouvelleMissionPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/missions/nouvelle');
  }

  if (currentUser.role === 'ADMIN') {
    redirect('/missions');
  }

  const supabase = createAdminClient();

  const [{ data: bureaux }, { data: secteurs }, { data: assujettis }, { data: agents }] =
    await Promise.all([
      supabase
        .from('bureaux')
        .select('id, code, nom')
        .eq('actif', true)
        .order('code', { ascending: true }),
      supabase
        .from('secteurs')
        .select('id, bureau_id, code, nom')
        .eq('actif', true)
        .order('code', { ascending: true }),
      supabase
        .from('assujettis')
        .select('id, nom_raison_sociale, identifiant, secteur_principal_id')
        .eq('actif', true)
        .order('nom_raison_sociale', { ascending: true }),
      supabase
        .from('agents')
        .select('id, matricule, profiles(nom, prenom)')
        .eq('actif', true)
        .order('matricule', { ascending: true }),
    ]);

  return (
    <MissionCreateForm
      userBureauId={currentUser.bureau_id}
      bureaux={bureaux || []}
      secteurs={secteurs || []}
      assujettis={assujettis || []}
      agents={
        (agents as unknown as {
          id: string;
          matricule: string;
          profiles: { nom: string; prenom: string } | null;
        }[]) || []
      }
    />
  );
}
