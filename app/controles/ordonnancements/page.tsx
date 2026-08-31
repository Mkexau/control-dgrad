import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getOrdonnancementsAControler,
  getSyntheseSectorielleControle,
} from '@/lib/controles/controle-ordonnancement-service';
import { ControlesOrdonnancementsClient } from './controles-ordonnancements-client';

export const dynamic = 'force-dynamic';

export default async function ControlesOrdonnancementsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/connexion?redirect=/controles/ordonnancements');
  }

  const supabase = createAdminClient();

  const isGlobal = [
    'ADMIN',
    'DIRECTEUR_GENERAL',
    'DIRECTEUR_CONTROLES',
    'CHEF_DIVISION',
    'CONSULTATION',
  ].includes(currentUser.role);

  // 1. Charger les secteurs pour le filtrage
  let secteursQuery = supabase
    .from('secteurs')
    .select('id, code, nom, bureau_id, bureaux(id, code, nom)')
    .eq('actif', true)
    .order('nom');

  if (!isGlobal && currentUser.bureau_id) {
    secteursQuery = secteursQuery.eq('bureau_id', currentUser.bureau_id);
  }

  const [{ data: secteurs }, initialData, synthese] = await Promise.all([
    secteursQuery,
    getOrdonnancementsAControler(currentUser, { page: 1, limit: 20 }),
    getSyntheseSectorielleControle(currentUser),
  ]);

  return (
    <ControlesOrdonnancementsClient
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
        bureau_id: currentUser.bureau_id ?? null,
        bureau_code: currentUser.bureau_code ?? null,
        division_code: currentUser.division_code ?? null,
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
      }}
      availableSecteurs={secteurs || []}
      initialData={initialData}
      synthese={synthese}
    />
  );
}
