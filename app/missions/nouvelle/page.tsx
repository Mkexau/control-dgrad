import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { getMissionPreparationData } from '@/app/actions/mission-preparation';
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

  // Récupérer le référentiel organisationnel (bureaux et secteurs)
  const [{ data: bureaux }, { data: secteurs }, prepResult] = await Promise.all([
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
    getMissionPreparationData(),
  ]);

  const prepData = prepResult.success ? prepResult.data : null;

  return (
    <MissionCreateForm
      userBureauId={currentUser.bureau_id ?? null}
      bureaux={bureaux ?? []}
      secteurs={secteurs ?? []}
      synthese={prepData?.synthese ?? []}
      secteurPrioritaireId={prepData?.secteurPrioritaireId ?? null}
      assujettisParSecteur={prepData?.assujettisParSecteur ?? {}}
      agents={prepData?.agents ?? []}
    />
  );
}
