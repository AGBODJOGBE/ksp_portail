import { Suspense } from 'react';
import { Heading } from '@/components/ui/heading';
import { NotificationCenter, NotificationPreferences, notificationTexts } from '@/features/notification';

/**
 * Notifications de l'espace KSP (ADR-039) et choix des canaux. Le filtre est lu dans l'adresse sous
 * Suspense : la page reste statique.
 */
export default function NotificationsPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="grid gap-8">
        <div>
          <Heading as="h1" size="h1">
            {notificationTexts.title}
          </Heading>
          <p className="text-ink-muted mt-3">{notificationTexts.lead}</p>
        </div>
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {notificationTexts.loading}
            </p>
          }
        >
          <NotificationCenter />
        </Suspense>
      </div>
      <NotificationPreferences />
    </div>
  );
}
