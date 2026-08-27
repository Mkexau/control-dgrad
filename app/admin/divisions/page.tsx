import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { DivisionsClient } from './divisions-client';

export const dynamic = 'force-dynamic';

export default async function DivisionsPage() {
  const supabase = createAdminClient();

  const [{ data: divisions }, { data: directions }] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, direction_id, code, nom, actif, directions(id, code, nom)')
      .order('code', { ascending: true }),
    supabase
      .from('directions')
      .select('id, code, nom')
      .eq('actif', true)
      .order('code', { ascending: true }),
  ]);

  return (
    <DivisionsClient
      initialDivisions={
        (divisions as unknown as {
          id: string;
          direction_id: string;
          code: string;
          nom: string;
          actif: boolean;
          directions: { id: string; code: string; nom: string } | null;
        }[]) || []
      }
      directionsList={directions || []}
    />
  );
}
