import { createAdminClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/validations/auth';
import {
  ServiceAssietteAssujettiSchema,
  type ServiceAssietteAssujettiInput,
} from '@/lib/validations/assiette';
import { ForbiddenError } from '@/lib/auth/rules';
import { logAuditEvent } from '@/lib/audit/audit-service';

export interface AssujettiAssiette {
  id: string;
  identifiant: string;
  nom_raison_sociale: string;
  type: 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE';
  forme_juridique: string | null;
  numero_rccm: string | null;
  adresse: string | null;
  province: string | null;
  ville: string | null;
  commune: string | null;
  telephone: string | null;
  email: string | null;
  activite_principale: string | null;
  secteur_principal_id: string | null;
  date_creation: string | null;
  actif: boolean;
  secteurs: { id: string; code: string; nom: string } | null;
}

export interface ServiceAssietteDashboard {
  total: number;
  enregistresAujourdhui: number;
  enregistresCeMois: number;
  actifs: number;
  inactifs: number;
  derniersAssujettis: Array<{
    id: string;
    identifiant: string;
    nom_raison_sociale: string;
    province: string | null;
    ville: string | null;
    commune: string | null;
    created_at: string;
    secteurs: { code: string; nom: string } | null;
  }>;
}

function assertServiceAssiette(user: CurrentUser) {
  if (user.role !== 'SERVICE_ASSIETTE') {
    throw new ForbiddenError('Accès réservé au Service d’assiette.');
  }
}

const assujettiSelect = `
  id, identifiant, nom_raison_sociale, type, forme_juridique, numero_rccm,
  adresse, province, ville, commune, telephone, email, activite_principale,
  secteur_principal_id, date_creation, actif,
  secteurs (id, code, nom)
`;

export async function getAssujettisServiceAssiette(user: CurrentUser, search = '') {
  assertServiceAssiette(user);
  const supabase = createAdminClient();
  let query = supabase.from('assujettis').select(assujettiSelect, { count: 'exact' });
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`identifiant.ilike.${term},nom_raison_sociale.ilike.${term},numero_rccm.ilike.${term}`);
  }
  const { data, count, error } = await query.order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(`Erreur de chargement des assujettis : ${error.message}`);
  return { assujettis: (data ?? []) as unknown as AssujettiAssiette[], total: count ?? 0 };
}

export async function getServiceAssietteDashboard(user: CurrentUser): Promise<ServiceAssietteDashboard> {
  assertServiceAssiette(user);
  const supabase = createAdminClient();
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [totalResult, todayResult, monthResult, actifsResult, inactifsResult, derniersResult] = await Promise.all([
    supabase.from('assujettis').select('*', { count: 'exact', head: true }),
    supabase.from('assujettis').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
    supabase.from('assujettis').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('assujettis').select('*', { count: 'exact', head: true }).eq('actif', true),
    supabase.from('assujettis').select('*', { count: 'exact', head: true }).eq('actif', false),
    supabase.from('assujettis').select('id, identifiant, nom_raison_sociale, province, ville, commune, created_at, secteurs(code, nom)').order('created_at', { ascending: false }).limit(8),
  ]);
  const error = totalResult.error || todayResult.error || monthResult.error || actifsResult.error || inactifsResult.error || derniersResult.error;
  if (error) throw new Error(`Erreur de chargement du tableau de bord Assiette : ${error.message}`);
  return {
    total: totalResult.count ?? 0,
    enregistresAujourdhui: todayResult.count ?? 0,
    enregistresCeMois: monthResult.count ?? 0,
    actifs: actifsResult.count ?? 0,
    inactifs: inactifsResult.count ?? 0,
    derniersAssujettis: (derniersResult.data ?? []) as unknown as ServiceAssietteDashboard['derniersAssujettis'],
  };
}

export async function createAssujettiServiceAssiette(
  user: CurrentUser,
  input: ServiceAssietteAssujettiInput
): Promise<AssujettiAssiette> {
  assertServiceAssiette(user);
  const data = ServiceAssietteAssujettiSchema.parse(input);
  const supabase = createAdminClient();
  const { data: created, error } = await supabase
    .from('assujettis')
    .insert({
      type: data.type,
      nom_raison_sociale: data.nom_raison_sociale,
      forme_juridique: data.forme_juridique || null,
      numero_rccm: data.numero_rccm || null,
      adresse: data.adresse || null,
      province: data.province || null,
      ville: data.ville || null,
      commune: data.commune || null,
      telephone: data.telephone || null,
      email: data.email || null,
      activite_principale: data.activite_principale || null,
      secteur_principal_id: data.secteur_principal_id || null,
      date_creation: data.date_creation || null,
      actif: true,
      cree_par_id: user.id,
    })
    .select(assujettiSelect)
    .single();
  if (error || !created) throw new Error(`Création de l’assujetti impossible : ${error?.message}`);

  await logAuditEvent({
    userId: user.id,
    action: 'CREATION_ASSUJETTI_SERVICE_ASSIETTE',
    entityType: 'assujettis',
    entityId: created.id,
    newData: { nif: created.identifiant, nom_raison_sociale: created.nom_raison_sociale },
  });
  return created as unknown as AssujettiAssiette;
}

export async function updateAssujettiServiceAssiette(
  user: CurrentUser,
  assujettiId: string,
  input: ServiceAssietteAssujettiInput
): Promise<AssujettiAssiette> {
  assertServiceAssiette(user);
  const data = ServiceAssietteAssujettiSchema.parse(input);
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from('assujettis')
    .update({
      type: data.type,
      nom_raison_sociale: data.nom_raison_sociale,
      forme_juridique: data.forme_juridique || null,
      numero_rccm: data.numero_rccm || null,
      adresse: data.adresse || null,
      province: data.province || null,
      ville: data.ville || null,
      commune: data.commune || null,
      telephone: data.telephone || null,
      email: data.email || null,
      activite_principale: data.activite_principale || null,
      secteur_principal_id: data.secteur_principal_id || null,
      date_creation: data.date_creation || null,
    })
    .eq('id', assujettiId)
    .select(assujettiSelect)
    .single();
  if (error || !updated) throw new Error(`Mise à jour de l'assujetti impossible : ${error?.message}`);

  await logAuditEvent({
    userId: user.id,
    action: 'MODIFICATION_ASSUJETTI_SERVICE_ASSIETTE',
    entityType: 'assujettis',
    entityId: updated.id,
    newData: { nif: updated.identifiant, nom_raison_sociale: updated.nom_raison_sociale },
  });
  return updated as unknown as AssujettiAssiette;
}
