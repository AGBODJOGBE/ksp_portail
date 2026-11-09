'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { IconBell } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { countUnread } from '@/features/notification/api';
import { notificationPaths } from '@/features/notification/paths';
import { notificationTexts } from '@/features/notification/texts';

const t = notificationTexts.bell;

/**
 * Accès aux notifications avec la pastille du nombre de non lues, lu à l'affichage (pas encore de
 * notification en direct). Une panne de lecture n'affiche pas de pastille : le lien reste utilisable.
 */
export function NotificationBell({ className }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    countUnread().then(
      (value) => {
        if (active) setCount(value);
      },
      () => {
        if (active) setCount(null);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const unread = count ?? 0;
  const label = count === null ? t.label : unread > 0 ? t.unread(unread) : t.none;
  return (
    <Link
      href={notificationPaths.list}
      aria-label={`${t.label} — ${label}`}
      className={buttonClasses({ variant: 'secondary', className: cn('relative', className) })}
    >
      <IconBell />
      <span>{t.label}</span>
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="bg-danger inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs leading-6 font-bold text-white tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
