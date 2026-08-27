import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { BureauxClient } from './bureaux-client';

export const dynamic = 'force-dynamic';

export default async function BureauxPage() {
  const supabase = createAdminClient();

  const [{ data: bureaux }, { data: divisions }] = await Promise.all([
    supabase
      .from('bureaux')
      .select('id, division_id, code, nom, type, actif, divisions(id, code, nom)')
      .order('code', { ascending: true }),
    supabase
      .from('divisions')
      .select('id, code, nom')
      .eq('actif', true)
      .order('code', { ascending: true }),
  ]);

  return (
    <BureauxClient
      initialBureaux={
        (bureaux as unknown as {
          id: string;
          division_id: string;
          code: string;
          nom: string;
          type: 'CONTROLE' | 'RECOUPEMENT' | 'ADMINISTRATIF' | 'AUTRE';
          actif: boolean;
          divisions: { id: string; code: string; nom: string } | null;
        }[]) || []
      }
      divisionsList={divisions || []}
    />
  );
}
