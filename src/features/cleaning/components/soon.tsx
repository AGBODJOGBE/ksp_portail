import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cleaningPaths } from '@/features/cleaning/paths';
import { cleaningTexts } from '@/features/cleaning/texts';

const t = cleaningTexts.space;

/**
 * Page provisoire « Bientôt disponible » d'une adresse des notifications (programme, séance, nouvelle
 * commande, réclamation) : elle répond dès maintenant et mène aux demandes. Remplie à l'étape suivante ;
 * rien n'est lu dans l'adresse ni à la gateway.
 */
export function CleaningSoon({ title }: { title: string }) {
  return (
    <div className="grid gap-10">
      <BandHeader>
        <BandTitle back={{ href: cleaningPaths.space, label: t.back }} eyebrow={t.title} title={title} />
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
              <ButtonLink href={cleaningPaths.requests} variant="primary">
                {t.requestsTitle}
              </ButtonLink>
              <ButtonLink href={cleaningPaths.space} variant="secondary">
                {t.title}
              </ButtonLink>
            </div>
          }
        >
          {t.soonText}
        </EmptyState>
      </section>
    </div>
  );
}
