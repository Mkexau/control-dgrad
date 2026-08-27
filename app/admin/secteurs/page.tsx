import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { SecteursClient } from './secteurs-client';

export const dynamic = 'force-dynamic';

export default async function SecteursPage() {
  const supabase = createAdminClient();

  const [{ data: secteurs }, { data: bureaux }] = await Promise.all([
    supabase
      .from('secteurs')
      .select('id, bureau_id, code, nom, actif, bureaux(id, code, nom)')
      .order('code', { ascending: true }),
    supabase
      .from('bureaux')
      .select('id, code, nom')
      .eq('actif', true)
      .order('code', { ascending: true }),
  ]);

  return (
    <SecteursClient
      initialSecteurs={
        (secteurs as unknown as {
          id: string;
          bureau_id: string;
          code: string;
          nom: string;
          actif: boolean;
          bureaux: { id: string; code: string; nom: string } | null;
        }[]) || []
      }
      bureauxList={bureaux || []}
    />
  );
}
