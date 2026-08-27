import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect('/missions');
  } else {
    redirect('/connexion');
  }
}
