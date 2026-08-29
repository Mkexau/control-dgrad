import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAssujettisAction } from '@/app/actions/assujettis';
import { AssujettisClient } from './assujettis-client';

export const dynamic = 'force-dynamic';

export default async function AssujettisPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/assujettis');
  }

  const supabase = createAdminClient();

  const isGlobal = ['ADMIN', 'DIRECTEUR_GENERAL', 'DIRECTEUR_CONTROLES', 'CHEF_DIVISION', 'CONSULTATION'].includes(
    currentUser.role
  );

  // Référentiels pour les filtres
  let secteursQuery = supabase
    .from('secteurs')
    .select('id, code, nom, bureau_id, bureaux(id, code, nom)')
    .eq('actif', true)
    .order('nom');

  if (!isGlobal && currentUser.bureau_id) {
    secteursQuery = secteursQuery.eq('bureau_id', currentUser.bureau_id);
  }

  const [{ data: secteurs }] = await Promise.all([secteursQuery]);

  // Données initiales
  const initialData = await fetchAssujettisAction({ page: 1, limit: 20 });

  return (
    <AssujettisClient
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
      availableSecteurs={(secteurs || []) as unknown as React.ComponentProps<typeof AssujettisClient>['availableSecteurs']}
      initialData={initialData.data || { assujettis: [], total: 0 }}
    />
  );
}
