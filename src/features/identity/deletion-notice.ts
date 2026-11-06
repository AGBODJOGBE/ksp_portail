import { session } from '@/lib/api/session';

/*
 * Date prévue de la suppression qui vient d'être demandée. La demande ferme toutes les sessions : la
 * garde de l'espace, qui n'a plus de session, affiche alors cette confirmation au lieu de « Vous n'êtes
 * plus connecté ». Mémoire de l'onglet seulement, oubliée dès qu'une session s'ouvre à nouveau.
 *
 * Module à part, sans texte : la garde, chargée par toutes les pages de l'espace, l'importe.
 */
let requestedFor: string | null = null;

session.subscribe((current) => {
  if (current) requestedFor = null;
});

export const deletionNotice = {
  set(scheduledFor: string): void {
    requestedFor = scheduledFor;
  },
  get(): string | null {
    return requestedFor;
  },
};
