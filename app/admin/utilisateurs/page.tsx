import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { UtilisateursClient } from './utilisateurs-client';

export const dynamic = 'force-dynamic';

export default async function UtilisateursPage() {
  const supabase = createAdminClient();

  const [{ data: users }, { data: bureaux }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, nom, prenom, telephone, bureau_id, role, actif, bureaux(id, code, nom)')
      .order('nom', { ascending: true }),
    supabase
      .from('bureaux')
      .select('id, code, nom')
      .eq('actif', true)
      .order('code', { ascending: true }),
  ]);

  return (
    <UtilisateursClient
      initialUsers={
        (users as unknown as {
          id: string;
          email: string;
          nom: string;
          prenom: string;
          telephone?: string | null;
          bureau_id?: string | null;
          role: string;
          actif: boolean;
          bureaux: { id: string; code: string; nom: string } | null;
        }[]) || []
      }
      bureauxList={bureaux || []}
    />
  );
}
