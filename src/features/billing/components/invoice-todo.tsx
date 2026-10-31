'use client';

import { Badge } from '@/components/ui/badge';
import { IconClock } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { ApiError, contextKey, useSession } from '@/lib/api';
import { formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { listInvoices } from '@/features/billing/api';
import type { Invoice } from '@/features/billing/schemas';
import { billingPaths, billingTexts, invoiceStatus } from '@/features/billing/texts';

const t = billingTexts.dashboard;

/** Factures à régler du contexte actif (filtrées par la gateway) : impayées d'abord, puis en attente. */
async function loadDue(): Promise<Invoice[]> {
  const [overdue, pending] = await Promise.all([
    listInvoices(undefined, 'overdue'),
    listInvoices(undefined, 'pending_payment'),
  ]);
  return [...overdue.data, ...pending.data];
}

/** « Mes factures » dans le tableau de bord de « Mon espace KSP » : ce qui reste à régler. */
export function InvoiceTodo() {
  // Factures du contexte actif : un changement de contexte relit la liste.
  const key = contextKey(useSession()) ?? 'none';
  return <Todo key={key} />;
}

function Todo() {
  const { state, reload } = useResource(loadDue);
  return (
    <TodoPanel
      id="todo-factures"
      title={billingTexts.title}
      icon={<IconClock className="size-5" />}
      link={{ href: billingPaths.list, label: t.seeAll }}
    >
      {state.status === 'ready' ? (
        state.data.length ? (
          <ul className="grid gap-3">
            {state.data.map((invoice) => {
              const status = invoiceStatus(invoice.status);
              return (
                <TodoItem
                  key={invoice.id}
                  title={billingTexts.invoice(invoice.number)}
                  badge={
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  }
                  text={t.itemText(formatXof(invoice.balance), formatShortDate(invoice.dueAt))}
                  action={{ href: billingPaths.invoice(invoice.id), label: t.action }}
                />
              );
            })}
          </ul>
        ) : (
          <TodoNone>{t.nothing}</TodoNone>
        )
      ) : (
        <TodoState
          loading={state.status === 'loading'}
          error={
            state.status === 'error'
              ? state.error instanceof ApiError
                ? state.error.message
                : billingTexts.genericError
              : null
          }
          loadingLabel={billingTexts.loading}
          retryLabel={billingTexts.retry}
          onRetry={reload}
        />
      )}
    </TodoPanel>
  );
}
