import { redirect } from 'next/navigation';

/** Les informations intermédiaires ne font plus partie du parcours actif. */
export default function InformationDetailPage() {
  redirect('/assujettis');
}
