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
