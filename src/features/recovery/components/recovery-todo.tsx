'use client';

import { ActionCardIcon } from '@/components/ui/action-card';
import { IconClock, IconFileCheck, IconPen, IconRecouvrement, IconWallet } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { describeRecoveryError } from '@/features/recovery/errors';
import { type RecoveryTodo as Todo, loadRecoveryTodo, todoCount } from '@/features/recovery/overview';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCaseSummary } from '@/features/recovery/schemas';
import { spaceTexts as t } from '@/features/recovery/space-texts';

const deadlineOf = (summary: RecoveryCaseSummary) =>
  summary.nextDeadline ? formatDateTime(summary.nextDeadline.dueAt) : null;

/** Cartes « À faire » : mandats à signer, frais à payer, compléments, brouillons, décisions. */
export function RecoveryTodoItems({ todo }: { todo: Todo }) {
  return (
    <ul className="grid gap-3">
      {todo.mandates.map((summary) => (
        <TodoItem
          key={`mandat-${summary.id}`}
          title={t.mandateTitle(summary.number)}
          text={t.mandateText(summary.debtorName, deadlineOf(summary))}
          media={
            <ActionCardIcon>
              <IconPen className="size-5" />
            </ActionCardIcon>
          }
          action={{ href: recoveryPaths.case(summary.id), label: t.mandateAction }}
        />
      ))}
      {todo.fees.map((summary) => (
        <TodoItem
          key={`frais-${summary.id}`}
          title={t.feeTitle(summary.number)}
          text={t.feeText(summary.debtorName, deadlineOf(summary))}
          media={
            <ActionCardIcon>
              <IconWallet className="size-5" />
            </ActionCardIcon>
          }
          action={{ href: recoveryPaths.case(summary.id), label: t.feeAction }}
        />
      ))}
      {todo.completions.map((summary) => (
        <TodoItem
          key={`complement-${summary.id}`}
          title={t.infoTitle(summary.number)}
          text={t.infoText(summary.debtorName, deadlineOf(summary))}
          media={
            <ActionCardIcon>
              <IconFileCheck className="size-5" />
            </ActionCardIcon>
          }
          action={{ href: recoveryPaths.editCase(summary.id), label: t.infoAction }}
        />
      ))}
      {todo.drafts.map((summary) => (
        <TodoItem
          key={`brouillon-${summary.id}`}
          title={t.draftTitle(summary.number)}
          text={t.draftText(summary.debtorName, deadlineOf(summary))}
          media={
            <ActionCardIcon>
              <IconRecouvrement className="size-5" />
            </ActionCardIcon>
          }
          action={{ href: recoveryPaths.case(summary.id), label: t.draftAction }}
        />
      ))}
      {todo.pendingDecisions ? (
        <TodoItem
          title={t.decisionsTitle(todo.pendingDecisions)}
          text={t.decisionsText}
          media={
            <ActionCardIcon>
              <IconClock className="size-5" />
            </ActionCardIcon>
          }
          action={{ href: recoveryPaths.decisions, label: t.decisionsAction }}
        />
      ) : null}
    </ul>
  );
}

const load = () => loadRecoveryTodo();

/**
 * Panneau « Recouvrement » de « À faire maintenant » (accueil de Mon espace), seulement s'il y a quelque
 * chose à faire : rien pendant la lecture (la plupart des comptes n'ont pas de dossier), rien sans dossier
 * en attente, rien tant que le service n'est pas servi ou qu'il est injoignable. Placé en dernier : son apparition ne décale pas
 * les panneaux au-dessus.
 */
export function RecoveryTodo() {
  const key = contextKey(useSession()) ?? 'none';
  return <SpaceTodo key={key} />;
}

function SpaceTodo() {
  const { state, reload } = useResource(load);
  // Service pas encore servi, ou injoignable : un panneau secondaire de l'accueil se tait (le tableau
  // du Recouvrement, lui, affiche l'erreur et « Réessayer »).
  if (
    state.status === 'error' &&
    (isBackendPending(state.error) || describeRecoveryError(state.error).kind === 'unavailable')
  ) {
    return null;
  }
  if (state.status === 'loading') return null;
  if (state.status === 'ready' && !todoCount(state.data)) return null;
  return (
    <TodoPanel
      id="todo-recouvrement"
      title={t.dashboardTitle}
      icon={<IconRecouvrement className="size-5" />}
      link={{ href: recoveryPaths.space, label: t.dashboardSeeAll }}
      count={state.status === 'ready' ? todoCount(state.data) : undefined}
    >
      {state.status === 'ready' ? (
        <RecoveryTodoItems todo={state.data} />
      ) : (
        <TodoState
          loading={false}
          error={state.status === 'error' ? describeRecoveryError(state.error).message : null}
          loadingLabel={t.todoLoading}
          retryLabel={t.retry}
          onRetry={reload}
        />
      )}
    </TodoPanel>
  );
}

/** Rien à faire (tableau de bord du Recouvrement). */
export function RecoveryTodoNone() {
  return <TodoNone>{t.todoNone}</TodoNone>;
}
