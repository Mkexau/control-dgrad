'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ServiceAssietteAssujettiSchema, type ServiceAssietteAssujettiInput } from '@/lib/validations/assiette';
import {
  createAssujettiServiceAssiette,
  getAssujettisServiceAssiette,
  updateAssujettiServiceAssiette,
  type AssujettiAssiette,
} from '@/lib/assiette/assiette-service';

export async function fetchAssujettisAssietteAction(search = '') {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée.' };
    return { success: true, data: await getAssujettisServiceAssiette(user, search) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur de chargement.' };
  }
}

export async function updateAssujettiAssietteAction(
  assujettiId: string,
  input: ServiceAssietteAssujettiInput
): Promise<{ success: boolean; data?: AssujettiAssiette; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée.' };
    const parsed = ServiceAssietteAssujettiSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    const data = await updateAssujettiServiceAssiette(user, assujettiId, parsed.data);
    revalidatePath('/assiette/assujettis');
    revalidatePath('/assujettis');
    revalidatePath(`/assujettis/${assujettiId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Mise à jour impossible.' };
  }
}

export async function createAssujettiAssietteAction(input: ServiceAssietteAssujettiInput): Promise<{
  success: boolean; data?: AssujettiAssiette; error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Session expirée.' };
    const parsed = ServiceAssietteAssujettiSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    const data = await createAssujettiServiceAssiette(user, parsed.data);
    revalidatePath('/assiette/assujettis');
    revalidatePath('/assujettis');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Création impossible.' };
  }
}
