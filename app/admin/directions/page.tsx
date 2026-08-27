import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { DirectionsClient } from './directions-client';

export const dynamic = 'force-dynamic';

export default async function DirectionsPage() {
  const supabase = createAdminClient();

  const { data: directions, error } = await supabase
    .from('directions')
    .select('id, code, nom, actif')
    .order('code', { ascending: true });

  if (error) {
    console.error('Erreur de chargement des directions:', error);
  }

  return <DirectionsClient initialDirections={directions || []} />;
}
