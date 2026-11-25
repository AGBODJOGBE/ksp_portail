'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { FigureTile } from '@/components/ui/figure-tile';
import { IconArrowRight, IconClock, IconRecouvrement } from '@/components/ui/icons';
import { LinkCard } from '@/components/ui/link-card';
import { SkeletonCards } from '@/components/ui/skeleton';
import { TodoNone } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { formatNumber, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { type RecoveryOverview, loadRecoveryOverview, todoCount } from '@/features/recovery/overview';
import { recoveryPaths } from '@/features/recovery/paths';
import { spaceTexts as t } from '@/features/recovery/space-texts';
import { STAGE_PARAMS, formatRate, stageLabel } from '@/features/recovery/texts';
import { CaseRow } from './case-list';
import { RecoveryTodoItems } from './recovery-todo';

const PANEL = 'rounded-panel border-line bg-surface grid content-start gap-5 border p-5 shadow-xs sm:p-7';
const LINK =
  'group/link text-action-ink inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline';

function Section({
  id,
  title,
  link,
  children,
  className,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`${PANEL} ${className ?? ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-display text-h3 text-ink font-semibold">
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className={LINK}>
            {link.label}
            <IconArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Tableau de bord du Recouvrement (`/mon-espace/recouvrement`) : ce qui attend le créancier, ses chiffres
 * (`GET /recovery/dashboard` : confié, recouvré, reste, taux), dossiers par étape, prochaines échéances des
 * débiteurs, derniers dossiers, puis les liens (import, décisions, relevés, préférences). Relu à chaque
 * changement de compte actif.
 */
export function RecoveryHome() {
  const key = contextKey(useSession()) ?? 'none';
  return <Home key={key} />;
}

function Home() {
  const { state, reload } = useResource(loadRecoveryOverview);
  if (state.status === 'loading') {
    return (
      <div className="grid gap-8 lg:grid-cols-12">
        <SkeletonCards label={t.loading} rows={3} className="lg:col-span-7" />
        <SkeletonCards label={t.loading} rows={2} media={false} className="lg:col-span-5" />
      </div>
    );
  }
  if (state.status === 'error') {
    if (isBackendPending(state.error)) {
      return (
        <BackendPending
          id="recouvrement-attente"
          title={t.title}
          needs={[
            { method: 'GET', path: '/api/v1/recovery/dashboard', purpose: 'Tableau de bord du créancier.' },
          ]}
        >
          {t.lead}
        </BackendPending>
      );
    }
    return (
      <div className={`${PANEL} justify-items-start`}>
        <FormMessage>{errorWithReference(describeRecoveryError(state.error))}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  return <Overview overview={state.data} />;
}

/**
 * Montant d'une tuile de chiffre : nombre formaté par `formatNumber` (`fr-BJ`), l'unité à part. Les espaces
 * fines de groupement disparaissent dans la police des grands chiffres : espaces insécables ordinaires.
 */
const figure = (money: { amount: number }) => formatNumber(money.amount).replace(/\u202f/g, '\u00a0');

function Overview({ overview: { dashboard, todo, latest } }: { overview: RecoveryOverview }) {
  const stages = dashboard.casesByStage.filter((item) => item.count > 0);
  return (
    <div className="grid gap-8">
      <section aria-labelledby="recouvrement-chiffres" className="grid gap-4">
        <h2 id="recouvrement-chiffres" className="font-display text-h3 text-ink font-semibold">
          {t.figuresTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FigureTile label={t.entrusted} value={figure(dashboard.entrusted)} unit={t.currency} />
          <FigureTile label={t.recovered} value={figure(dashboard.recovered)} unit={t.currency} />
          <FigureTile label={t.outstanding} value={figure(dashboard.outstanding)} unit={t.currency} />
          <FigureTile label={t.rate} value={formatRate(dashboard.recoveryRateBps)} />
        </div>
        <p className="text-small text-ink-muted">
          {t.creditedNote}{' '}
          <Link href={recoveryPaths.wallet} className="text-brand-ink font-semibold underline">
            {t.wallet}
          </Link>
        </p>
      </section>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="grid gap-8 lg:col-span-7">
          <Section id="recouvrement-a-faire" title={t.todoTitle}>
            {todoCount(todo) ? <RecoveryTodoItems todo={todo} /> : <TodoNone>{t.todoNone}</TodoNone>}
          </Section>
          <Section
            id="recouvrement-derniers"
            title={t.latestTitle}
            link={latest.length ? { href: recoveryPaths.cases, label: t.allCases } : undefined}
          >
            {latest.length ? (
              <ul className="grid gap-3">
                {latest.map((summary) => (
                  <CaseRow key={summary.id} summary={summary} />
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-start gap-2">
                <p className="text-ink-muted">{t.latestNone}</p>
                <Link
                  href={recoveryPaths.newCase}
                  className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  {t.newCase}
                </Link>
              </div>
            )}
          </Section>
        </div>
        <div className="grid gap-8 lg:col-span-5">
          <Section id="recouvrement-etapes" title={t.stagesTitle}>
            {stages.length ? (
              <ul className="grid gap-1">
                {stages.map((item) => (
                  <li key={item.stage}>
                    <Link
                      href={recoveryPaths.casesWith({ etape: STAGE_PARAMS[item.stage] })}
                      className="hover:bg-surface-muted focus-visible:outline-focus rounded-control -mx-2 flex min-h-11 items-center justify-between gap-3 px-2 focus-visible:outline-2"
                    >
                      <span className="text-ink">{stageLabel(item.stage)}</span>
                      <span className="text-ink-muted text-sm font-semibold tabular-nums">
                        {t.cases(item.count)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">{t.stagesNone}</p>
            )}
          </Section>
          <Section id="recouvrement-echeances" title={t.upcomingTitle}>
            {dashboard.upcomingInstallments.length ? (
              <ul className="grid gap-2">
                {dashboard.upcomingInstallments.map((installment) => (
                  <li
                    key={`${installment.caseId}-${installment.dueDate}`}
                    className="border-line flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b py-2 last:border-b-0"
                  >
                    <span className="grid gap-0.5">
                      <span className="text-ink flex items-center gap-2 font-medium">
                        <IconClock className="text-brand-ink size-4" />
                        {formatShortDate(installment.dueDate)}
                      </span>
                      <Link
                        href={recoveryPaths.case(installment.caseId)}
                        className="text-small text-ink-muted underline underline-offset-4"
                      >
                        {t.upcomingText(installment.caseNumber, installment.debtorName)}
                      </Link>
                    </span>
                    <span className="text-ink font-semibold tabular-nums">
                      {formatXof(installment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">{t.upcomingNone}</p>
            )}
          </Section>
        </div>
      </div>
      <section aria-labelledby="recouvrement-liens">
        <h2 id="recouvrement-liens" className="font-display text-h3 text-ink font-semibold">
          {t.linksTitle}
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['import', recoveryPaths.imports],
              ['decisions', recoveryPaths.decisions],
              ['statements', recoveryPaths.statements],
              ['preferences', recoveryPaths.preferences],
            ] as const
          ).map(([name, href], index) => (
            <LinkCard
              key={name}
              index={index}
              href={href}
              title={t.links[name].title}
              text={t.links[name].text}
              icon={<IconRecouvrement className="size-5" />}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
