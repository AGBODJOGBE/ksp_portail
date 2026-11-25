import { getCase, getDashboard, listCases } from './api';
import { listDecisions } from './decision-api';
import type { RecoveryDecision } from './decision-schemas';
import type { RecoveryCaseSummary, RecoveryDashboard } from './schemas';

/*
 * Ce qui attend le créancier, assemblé à partir des listes de la gateway (aucune route agrégée) :
 * brouillons (et, parmi eux, les mandats à signer), frais à payer, compléments demandés, décisions en
 * attente. La liste des dossiers ne dit pas si un brouillon a un mandat préparé : la fiche des brouillons
 * les plus récents est lue, 10 au plus.
 */

/** Brouillons dont la fiche est relue pour savoir si un mandat attend la signature. */
const DRAFT_DETAILS = 10;

export interface RecoveryTodo {
  drafts: RecoveryCaseSummary[];
  /** Brouillons dont le mandat est préparé et attend la signature. */
  mandates: RecoveryCaseSummary[];
  fees: RecoveryCaseSummary[];
  completions: RecoveryCaseSummary[];
  /** Décisions en attente, la plus proche échéance d'abord. */
  decisions: RecoveryDecision[];
  /**
   * Nombre de décisions en attente selon le tableau de bord : affiché seul quand leur liste n'a pas pu
   * être lue.
   */
  pendingDecisions: number;
}

export function todoCount(todo: RecoveryTodo): number {
  return (
    todo.drafts.length +
    todo.mandates.length +
    todo.fees.length +
    todo.completions.length +
    (todo.decisions.length || (todo.pendingDecisions ? 1 : 0))
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

/** Décisions en attente, ou null si leur liste n'a pas pu être lue (route pas encore servie, panne). */
const pendingDecisionList = () =>
  listDecisions({ status: 'pending' }).then(
    (page) => [...page.decisions].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    () => null,
  );

/**
 * À faire du créancier. Sans la liste des décisions, leur nombre vient du tableau de bord : `dashboard`
 * (déjà lu par la page du Recouvrement), sinon il est lu ici ; son échec n'empêche pas le reste.
 */
export async function loadRecoveryTodo(dashboard?: RecoveryDashboard): Promise<RecoveryTodo> {
  const [drafts, fees, completions, decisions] = await Promise.all([
    listCases({ status: 'draft' }),
    listCases({ status: 'awaiting_fee' }),
    listCases({ status: 'info_requested' }),
    pendingDecisionList(),
  ]);
  const count = decisions
    ? decisions.length
    : dashboard
      ? dashboard.pendingDecisions
      : await getDashboard().then(
          (value) => value.pendingDecisions,
          () => 0,
        );
  const split = await splitDrafts(drafts.cases);
  return {
    ...split,
    fees: fees.cases,
    completions: completions.cases,
    decisions: decisions ?? [],
    pendingDecisions: count,
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
