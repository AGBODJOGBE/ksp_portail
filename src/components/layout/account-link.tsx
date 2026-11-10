'use client';

import Link from 'next/link';
import { IconUser } from '@/components/ui/icons';
import { buttonClasses, ButtonLink } from '@/components/ui/button';
import type { NavItem } from '@/config/navigation';
// Import direct du magasin de session : ni configuration ni zod dans le JavaScript de toutes les pages.
import { useSession } from '@/lib/api/session';

/**
 * Lien de compte de l'en-tête : « Se connecter », ou « Mon espace KSP » une fois connecté.
 *
 * Il ne lit que la session en mémoire, sans appel à la gateway : après un rechargement, il affiche
 * « Se connecter » et la page de connexion reprend aussitôt une session encore valide.
 * Libellés et adresses reçus de l'en-tête (serveur) : aucune configuration de plus dans le JavaScript.
 */
export function AccountLink({
  login,
  account,
  signup,
  variant = 'bar',
}: {
  login: NavItem;
  account: NavItem;
  /** « Créer un compte » (pilule à contour), proposé tant qu'aucune session n'est ouverte. */
  signup?: NavItem;
  /** `bar` : boutons de l'en-tête (icône seule sur téléphone) ; `menu` : grands boutons du menu mobile. */
  variant?: 'bar' | 'menu';
}) {
  const connected = useSession() !== null;
  const link = connected ? account : login;
  const create = connected ? null : signup;

  if (variant === 'menu') {
    return (
      <div className="mt-10 grid gap-3">
        <ButtonLink href={link.href} variant="accent" size="lg" className="w-full">
          <IconUser />
          {link.label}
        </ButtonLink>
        {create ? (
          <ButtonLink href={create.href} variant="outline" size="lg" className="w-full">
            {create.label}
          </ButtonLink>
        ) : null}
      </div>
    );
  }
  return (
    <>
      {create ? (
        <div className="header-signup hidden xl:block">
          <ButtonLink href={create.href} variant="outline">
            {create.label}
          </ButtonLink>
        </div>
      ) : null}
      <div className="header-full hidden sm:block">
        <ButtonLink href={link.href} variant="accent">
          {connected ? <IconUser /> : null}
          {link.label}
        </ButtonLink>
      </div>
      <Link
        href={link.href}
        aria-label={link.label}
        className={buttonClasses({ variant: 'accent', size: 'icon', className: 'header-full sm:hidden' })}
      >
        <IconUser />
      </Link>
    </>
  );
}
