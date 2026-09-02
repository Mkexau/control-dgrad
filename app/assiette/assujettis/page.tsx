import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAssujettisAssietteAction } from '@/app/actions/assiette';
import { AssujettisAssietteClient } from './assujettis-assiette-client';

export const dynamic = 'force-dynamic';

export default async function AssujettisAssiettePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?redirect=/assiette/assujettis');
  if (user.role !== 'SERVICE_ASSIETTE') redirect('/dashboard');

  const [initial, secteurs] = await Promise.all([
    fetchAssujettisAssietteAction(),
    createAdminClient().from('secteurs').select('id, code, nom').eq('actif', true).order('nom'),
  ]);

  return <AssujettisAssietteClient initialData={initial.data ?? { assujettis: [], total: 0 }} secteurs={secteurs.data ?? []} />;
}
