'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

/** Lien de navigation qui signale la page courante (`aria-current`), pour le style et les lecteurs d'écran. */
export function NavLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  return <Link href={href} aria-current={active ? 'page' : undefined} {...props} />;
}
