import type { Metadata } from 'next';
import { BandFrame, BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { contactHref, navigation } from '@/config/navigation';
import { cleaningPaths, cleaningTexts } from '@/features/cleaning';
import { RequireSession } from '@/features/identity';

const t = cleaningTexts.space;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

/**
 * « Mes prestations de nettoyage » pendant la préparation de la nouvelle version du service (v2) : une
 * seule page pour tout `/mon-espace/nettoyage/…`. Elle reçoit les liens des notifications du service
 * cleaning (`demandes/{id}`, `programmes/{id}`, `reclamations/{id}`…) et les anciens liens de la v1, et
 * dit « Bientôt disponible ». Rien n'est lu dans l'adresse ni à la gateway.
 */
export default function CleaningSpacePage() {
  return (
    <BandFrame>
      <RequireSession>
        <div className="grid gap-10">
          <BandHeader>
            <BandTitle
              back={{ href: navigation.account.href, label: navigation.account.label }}
              eyebrow={t.eyebrow}
              title={t.title}
            />
          </BandHeader>
          <section
            aria-labelledby="nettoyage-bientot-titre"
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
          >
            <EmptyState
              illustration="soon"
              title={t.soonTitle}
              titleAs="h2"
              titleId="nettoyage-bientot-titre"
              action={
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={cleaningPaths.home} variant="primary">
                    {t.discover}
                  </ButtonLink>
                  <ButtonLink href={contactHref('nettoyage')} variant="secondary">
                    {t.contact}
                  </ButtonLink>
                </div>
              }
            >
              {t.soonText}
            </EmptyState>
          </section>
        </div>
      </RequireSession>
    </BandFrame>
  );
}
