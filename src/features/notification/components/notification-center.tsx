'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { PagedListState } from '@/components/ui/paged-list-state';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { frenchSpacing } from '@/lib/typography';
import { usePagedList } from '@/lib/use-paged-list';
import { listNotifications, markAllRead, markRead } from '@/features/notification/api';
import { internalLink } from '@/features/notification/link';
import { notificationPaths } from '@/features/notification/paths';
import type { InAppNotification } from '@/features/notification/schemas';
import { notificationTexts as t } from '@/features/notification/texts';

const CHIP =
  'rounded-full border px-4 text-sm font-semibold inline-flex min-h-11 items-center focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2';
const ROW = 'rounded-card border-line bg-surface grid gap-3 border p-4 shadow-xs sm:p-5';

const describe = (error: unknown) => (error instanceof ApiError ? error.message : t.genericError);

/** Filtre « Toutes / Non lues » : des liens (le filtre se partage par l'adresse, `?filtre=non-lues`). */
function Filters({ unreadOnly }: { unreadOnly: boolean }) {
  const choices = [
    { href: notificationPaths.list, label: t.filterAll, active: !unreadOnly },
    { href: `${notificationPaths.list}?filtre=non-lues`, label: t.filterUnread, active: unreadOnly },
  ];
  return (
    <nav aria-label={t.filtersLabel}>
      <ul className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <li key={choice.label}>
            <Link
              href={choice.href}
              aria-current={choice.active ? 'page' : undefined}
              className={cn(
                CHIP,
                choice.active
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line-strong bg-surface text-ink hover:border-brand',
              )}
            >
              {choice.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: InAppNotification;
  onRead: (id: string) => Promise<void>;
}) {
  const { push } = useRouter();
  const [pending, setPending] = useState(false);
  const unread = notification.readAt === null;
  const href = internalLink(notification.link);
  const titleId = `notification-${notification.id}`;

  async function read() {
    setPending(true);
    await onRead(notification.id);
    setPending(false);
  }

  /** Ouvrir la page concernée marque la notification lue (sans attendre la réponse pour naviguer). */
  function open() {
    if (unread) void onRead(notification.id);
    if (href) push(href);
  }

  return (
    <li aria-labelledby={titleId} className={cn(ROW, unread && 'border-l-action border-l-4')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2
          id={titleId}
          className={cn('font-display text-ink text-lg', unread ? 'font-bold' : 'font-semibold')}
        >
          {notification.title}
        </h2>
        {unread ? (
          <Badge tone="action" dot>
            {t.unreadLabel}
          </Badge>
        ) : null}
      </div>
      <p className="text-ink-muted whitespace-pre-line">{frenchSpacing(notification.body)}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-subtle">
          <time dateTime={notification.createdAt}>
            {t.receivedOn(formatDateTime(notification.createdAt))}
          </time>
        </p>
        <div className="flex flex-wrap gap-2">
          {unread ? (
            <Button variant="ghost" onClick={read} aria-busy={pending || undefined} disabled={pending}>
              {t.markRead}
            </Button>
          ) : null}
          {href ? (
            <Button variant="secondary" onClick={open}>
              {t.open}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Notifications({ unreadOnly }: { unreadOnly: boolean }) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<Record<string, string>>({});
  const [allPending, setAllPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      const page = await listNotifications(cursor, unreadOnly);
      setUnreadCount(page.unreadCount);
      return page;
    },
    [unreadOnly],
  );
  const list = usePagedList(load, describe);

  async function onRead(id: string) {
    setMessage(null);
    try {
      const result = await markRead(id);
      setReadIds((previous) => ({
        ...previous,
        [id]: result.notification.readAt ?? new Date().toISOString(),
      }));
      setUnreadCount(result.unreadCount);
    } catch (error) {
      setMessage({ tone: 'error', text: describe(error) });
    }
  }

  async function onReadAll() {
    setAllPending(true);
    setMessage(null);
    try {
      const result = await markAllRead();
      const now = new Date().toISOString();
      setReadIds((previous) => ({
        ...previous,
        ...Object.fromEntries(list.items.map((item) => [item.id, previous[item.id] ?? item.readAt ?? now])),
      }));
      setUnreadCount(result.unreadCount);
      setMessage({ tone: 'success', text: t.allMarked });
    } catch (error) {
      setMessage({ tone: 'error', text: describe(error) });
    } finally {
      setAllPending(false);
    }
  }

  const items = list.items.map((item) => (readIds[item.id] ? { ...item, readAt: readIds[item.id]! } : item));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink font-medium" role="status">
          {unreadCount === null ? '' : t.unreadCount(unreadCount)}
        </p>
        {unreadCount ? (
          <Button
            variant="secondary"
            onClick={onReadAll}
            aria-busy={allPending || undefined}
            disabled={allPending}
          >
            {allPending ? t.markingAll : t.markAllRead}
          </Button>
        ) : null}
      </div>
      <FormMessage tone={message?.tone ?? 'error'}>{message?.text}</FormMessage>
      <PagedListState
        list={list}
        labels={t}
        empty={
          <div className="grid gap-1">
            <p className="text-ink">{unreadOnly ? t.emptyUnread : t.empty}</p>
            {unreadOnly ? null : <p className="text-small text-ink-muted">{t.emptyHint}</p>}
          </div>
        }
      >
        <ul className="grid gap-3">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onRead={onRead} />
          ))}
        </ul>
      </PagedListState>
    </div>
  );
}

/** « Mes notifications » : filtre (dans l'adresse), liste paginée, marquer lu, tout marquer lu. */
export function NotificationCenter() {
  const unreadOnly = useSearchParams().get('filtre') === 'non-lues';
  return (
    <div className="grid gap-6">
      <Filters unreadOnly={unreadOnly} />
      {/* Une clé par filtre : la liste repart de la première page, avec son chargement. */}
      <Notifications key={unreadOnly ? 'unread' : 'all'} unreadOnly={unreadOnly} />
    </div>
  );
}
