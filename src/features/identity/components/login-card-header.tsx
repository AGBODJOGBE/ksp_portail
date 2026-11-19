import type { ReactNode } from 'react';
import { IconUser } from '@/components/ui/icons';

/**
 * En-tête de la carte de connexion (v3, F-020) : avatar rond bleu nuit, titre centré, sous-titre gris,
 * puis un trait qui traverse la carte. Présentation seulement : chaque étape garde son titre (`id`).
 */
export function LoginCardHeader({
  id,
  as: Tag = 'h1',
  title,
  children,
}: {
  id: string;
  as?: 'h1' | 'h2' | 'h3';
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-line -mx-6 border-b px-6 pb-7 text-center sm:-mx-12 sm:px-12">
      <span className="bg-brand text-on-brand mx-auto grid size-16 place-items-center rounded-full">
        <IconUser className="size-8" />
      </span>
      <Tag id={id} className="font-display text-h2 text-ink mt-5 font-bold">
        {title}
      </Tag>
      {children ? <div className="text-ink-muted mt-2">{children}</div> : null}
    </div>
  );
}
