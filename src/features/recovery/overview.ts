import { getCase, getDashboard, listCases } from './api';
import type { RecoveryCaseSummary, RecoveryDashboard } from './schemas';

/*
 * Ce qui attend le créancier, assemblé à partir des listes de la gateway (aucune route agrégée) :
 * brouillons (et, parmi eux, les mandats à signer), frais à payer, compléments demandés, nombre de
 * décisions en attente (tableau de bord). La liste des dossiers ne dit pas si un brouillon a un mandat
 * préparé : la fiche des brouillons les plus récents est lue, 10 au plus.
 */

/** Brouillons dont la fiche est relue pour savoir si un mandat attend la signature. */
const DRAFT_DETAILS = 10;

export interface RecoveryTodo {
  drafts: RecoveryCaseSummary[];
  /** Brouillons dont le mandat est préparé et attend la signature. */
  mandates: RecoveryCaseSummary[];
  fees: RecoveryCaseSummary[];
  completions: RecoveryCaseSummary[];
  /** Décisions en attente (tableau de bord) ; la liste des décisions n'est pas encore servie. */
  pendingDecisions: number;
}

export function todoCount(todo: RecoveryTodo): number {
  return (
    todo.drafts.length +
    todo.mandates.length +
    todo.fees.length +
    todo.completions.length +
    (todo.pendingDecisions ? 1 : 0)
  );
}

/** Brouillons répartis entre « à terminer » et « mandat à signer ». Une fiche illisible reste un brouillon. */
async function splitDrafts(drafts: RecoveryCaseSummary[]) {
  const checked = await Promise.all(
    drafts.slice(0, DRAFT_DETAILS).map((summary) =>
      getCase(summary.id).then(
        (full) => full.mandate?.status === 'pending_signature',
        () => false,
      ),
    ),
  );
  return {
    mandates: drafts.filter((_, index) => checked[index] === true),
    drafts: drafts.filter((_, index) => checked[index] !== true),
  };
}

/**
 * À faire du créancier. `dashboard` : tableau de bord déjà lu (page du Recouvrement), sinon il est lu ici
 * pour le nombre de décisions ; son échec n'empêche pas le reste.
 */
export async function loadRecoveryTodo(dashboard?: RecoveryDashboard): Promise<RecoveryTodo> {
  const [drafts, fees, completions, decisions] = await Promise.all([
    listCases({ status: 'draft' }),
    listCases({ status: 'awaiting_fee' }),
    listCases({ status: 'info_requested' }),
    dashboard
      ? Promise.resolve(dashboard.pendingDecisions)
      : getDashboard().then(
          (value) => value.pendingDecisions,
          () => 0,
        ),
  ]);
  const split = await splitDrafts(drafts.cases);
  return {
    ...split,
    fees: fees.cases,
    completions: completions.cases,
    pendingDecisions: decisions,
  };
}

export interface RecoveryOverview {
  dashboard: RecoveryDashboard;
  todo: RecoveryTodo;
  /** Cinq derniers dossiers, tous états confondus. */
  latest: RecoveryCaseSummary[];
}

export async function loadRecoveryOverview(): Promise<RecoveryOverview> {
  const [dashboard, latest] = await Promise.all([getDashboard(), listCases({ limit: 5 })]);
  const todo = await loadRecoveryTodo(dashboard);
  return { dashboard, todo, latest: latest.cases };
}
