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
  variant = 'bar',
}: {
  login: NavItem;
  account: NavItem;
  /** `bar` : bouton de l'en-tête (icône seule sur téléphone) ; `menu` : grand bouton du menu mobile. */
  variant?: 'bar' | 'menu';
}) {
  const link = useSession() ? account : login;

  if (variant === 'menu') {
    return (
      <ButtonLink href={link.href} size="lg" className="mt-10 w-full">
        <IconUser />
        {link.label}
      </ButtonLink>
    );
  }
  return (
    <>
      <div className="hidden sm:block">
        <ButtonLink href={link.href}>
          <IconUser />
          {link.label}
        </ButtonLink>
      </div>
      <Link
        href={link.href}
        aria-label={link.label}
        className={buttonClasses({ variant: 'secondary', size: 'icon', className: 'sm:hidden' })}
      >
        <IconUser />
      </Link>
    </>
  );
}
