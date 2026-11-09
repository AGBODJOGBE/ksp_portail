import { navigation } from '@/config/navigation';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Suspense } from 'react';
import { NotificationCenter, NotificationPreferences, notificationTexts } from '@/features/notification';

/**
 * Notifications de l'espace KSP (ADR-039) et choix des canaux. Le filtre est lu dans l'adresse sous
 * Suspense : la page reste statique.
 */
export default function NotificationsPage() {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle
          back={{ href: navigation.account.href, label: navigation.account.label }}
          title={notificationTexts.title}
          lead={notificationTexts.lead}
        />
      </BandHeader>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {notificationTexts.loading}
            </p>
          }
        >
          <NotificationCenter />
        </Suspense>
        <NotificationPreferences />
      </div>
    </div>
  );
}
