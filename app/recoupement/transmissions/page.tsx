import { redirect } from 'next/navigation';

/** Ancienne URL conservée uniquement pour les favoris ; la vue est désormais unique. */
export default function TransmissionsPage() {
  redirect('/recoupement/fiches-ordonnancement?statut_transmission=TRANSMIS_DIVISION_CONTROLE');
}
