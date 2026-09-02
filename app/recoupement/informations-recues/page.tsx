import { redirect } from 'next/navigation';

/**
 * Le flux intermédiaire d'informations reçues est archivé : les assujettis
 * sont créés directement par le Service d'assiette dans le répertoire.
 */
export default function InformationsRecuesPage() {
  redirect('/assujettis');
}
