'use client';

import dynamic from 'next/dynamic';

/*
 * Écrans du compte chargés à la demande (même relais que le Nettoyage, voir docs/architecture.md) :
 * la garde de session et la connexion, importées par toutes les pages de l'espace, ne font pas
 * télécharger le profil, les comptes entreprise ni le sélecteur de contexte.
 */

/**
 * Libellé écrit ici plutôt que lu dans `texts.ts` : ce relais est chargé par toutes les pages de
 * l'espace et par la connexion, qui ne doivent pas télécharger les textes des écrans du compte.
 */
function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      Chargement…
    </p>
  );
}

export const ProfileSpace = dynamic(() => import('./profile-space').then((module_) => module_.ProfileSpace), {
  loading: Loading,
});

export const OrganizationSpace = dynamic(
  () => import('./organization-space').then((module_) => module_.OrganizationSpace),
  { loading: Loading },
);

export const OrganizationDetail = dynamic(
  () => import('./organization-detail').then((module_) => module_.OrganizationDetail),
  { loading: Loading },
);

/** Sans état de chargement visible : le sélecteur apparaît dès qu'il est prêt, sans décaler la page. */
export const ContextSwitcher = dynamic(() =>
  import('./context-switcher').then((module_) => module_.ContextSwitcher),
);

/**
 * Connexion intégrée à une page (demande de devis du Nettoyage) : téléchargée seulement quand la page
 * demande la connexion.
 */
export const InlineLogin = dynamic(() => import('./inline-login').then((module_) => module_.InlineLogin), {
  loading: Loading,
});

/** « Supprimer mon compte » (ADR-036), sur la page « Mon compte ». */
export const AccountDeletion = dynamic(
  () => import('./account-deletion').then((module_) => module_.AccountDeletion),
  { loading: Loading },
);

/**
 * Compte en cours de suppression (session restreinte) et confirmation après la demande : affichés par la
 * garde de l'espace, téléchargés seulement dans ces deux cas.
 */
export const PendingDeletion = dynamic(
  () => import('./pending-deletion').then((module_) => module_.PendingDeletion),
  { loading: Loading },
);

export const DeletionRequested = dynamic(
  () => import('./pending-deletion').then((module_) => module_.DeletionRequested),
  { loading: Loading },
);

/** E-mail à ajouter ou à vérifier, dans la rubrique « À faire » de l'accueil de l'espace. */
export const ProfileTodo = dynamic(() => import('./profile-todo').then((module_) => module_.ProfileTodo));
