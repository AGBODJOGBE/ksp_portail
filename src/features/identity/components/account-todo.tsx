'use client';

import { InvitationsTodo } from './organization-invitations';
import { ProfileTodo } from './profile-todo';

/**
 * Compte dans la rubrique « À faire » de Mon espace : invitations à rejoindre une entreprise (R-CP-03),
 * puis e-mail à ajouter ou à vérifier. Un seul relais chargé à la demande pour les deux.
 */
export function AccountTodo() {
  return (
    <>
      <InvitationsTodo />
      <ProfileTodo />
    </>
  );
}
