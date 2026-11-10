'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Container } from '@/components/ui/container';
import { IconArrowRight, IconClose, IconInfo } from '@/components/ui/icons';

/**
 * Bandeau d'information bleu clair, refermable (v3, F-020). Un fait du portail, avec son lien ; une fois
 * fermé, il disparaît jusqu'au prochain chargement de la page.
 */
export function InfoBanner({
  text,
  action,
  closeLabel,
}: {
  text: string;
  action: { label: string; href: string };
  closeLabel: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="bg-brand-100 text-ink border-brand-200 border-b">
      <Container size="wide" className="flex items-center gap-3 py-2.5 sm:justify-center">
        <IconInfo className="text-brand-700 size-5" />
        <p className="text-small sm:text-body font-display min-w-0 flex-1 font-medium sm:flex-none">
          {text}{' '}
          <Link
            href={action.href}
            className="text-brand-ink inline-flex items-center gap-1 font-semibold whitespace-nowrap underline underline-offset-4"
          >
            {action.label}
            <IconArrowRight className="size-4" />
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={closeLabel}
          className="hover:bg-brand-200 -mr-2 grid size-11 shrink-0 place-items-center rounded-full sm:ml-4"
        >
          <IconClose className="size-5" />
        </button>
      </Container>
    </div>
  );
}
