'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

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

/**
 * Rubrique « À faire » de l'accueil de l'espace : invitations à rejoindre une entreprise, e-mail à ajouter
 * ou à vérifier.
 */
export const AccountTodo = dynamic(() => import('./account-todo').then((module_) => module_.AccountTodo));

const ContextGate = dynamic(
  () => import('./organization-context-gate').then((module_) => module_.OrganizationContextGate),
  { loading: Loading },
);

/**
 * Dossier d'une organisation ouvert par un lien (`?organisation=`, ADR-050 §8) : passe dans ce contexte
 * avant d'afficher la page. Sans organisation dans le lien, la page s'affiche telle quelle et le changement
 * de contexte n'est pas téléchargé.
 */
export function OrganizationContextGate({
  organisation,
  back,
  children,
}: {
  /** Valeur brute de `?organisation=` (la première si répétée). */
  organisation: string | string[] | undefined;
  back: { href: string; label: string };
  children: ReactNode;
}) {
  const organizationId = (Array.isArray(organisation) ? organisation[0] : organisation)?.trim();
  if (!organizationId) return children;
  return (
    <ContextGate organizationId={organizationId} back={back}>
      {children}
    </ContextGate>
  );
}

/**
 * Même passage de contexte pour une page statique dont l'adresse est lue dans le navigateur, sous
 * `<Suspense>` (liste des factures ouverte par `/mon-espace/factures?organisation=<id>`).
 */
export function OrganizationContextFromSearch({
  back,
  children,
}: {
  back: { href: string; label: string };
  children: ReactNode;
}) {
  const organizationId = useSearchParams().get('organisation')?.trim();
  if (!organizationId) return children;
  return (
    <ContextGate organizationId={organizationId} back={back} inline>
      {children}
    </ContextGate>
  );
}
