import { createClient } from '@/lib/supabase/server';
import { UserContext, UserProfile, UserAgent, AuthError } from '@/lib/types/auth';

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Fetch application profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const userProfile = profile as UserProfile;

  if (!userProfile.actif) {
    throw new AuthError('ACCOUNT_INACTIVE', 'Le compte utilisateur est désactivé.');
  }

  // Fetch division_id if bureau_id is present
  let divisionId: string | null = null;
  if (userProfile.bureau_id) {
    const { data: bureau } = await supabase
      .from('bureaux')
      .select('division_id')
      .eq('id', userProfile.bureau_id)
      .single();

    if (bureau) {
      divisionId = bureau.division_id;
    }
  }

  // Fetch agent details if applicable
  let agent: UserAgent | null = null;
  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('profile_id', userProfile.id)
    .single();

  if (agentData) {
    agent = agentData as UserAgent;
  }

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
    },
    profile: userProfile,
    agent,
    role: userProfile.role,
    bureauId: userProfile.bureau_id,
    divisionId,
  };
}
