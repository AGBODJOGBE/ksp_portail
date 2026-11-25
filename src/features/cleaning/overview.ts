import { listProgramSessions, listPrograms, listRequests } from './api';
import type { ProgramDetail, RequestSummary, Session } from './schemas';
import { ACTIVE_PROGRAM_STATUSES, UPCOMING_SESSION_STATUSES, isPayable } from './status-texts';

/*
 * Vue d'ensemble du Nettoyage pour le tableau « Mes prestations de nettoyage », le panneau « Nettoyage »
 * de Mon espace et « Suivre ma demande ». La gateway n'a pas encore de route agrégée des séances
 * (décision 7 de la fiche) : un appel par programme actif, 10 programmes au plus, sur une fenêtre qui
 * commence une semaine avant aujourd'hui. Une séance en retard plus ancienne a suspendu son programme :
 * elle se retrouve par le programme suspendu, affiché lui aussi. À remplacer par une route agrégée
 * (`GET /cleaning/sessions?paymentStatus=…`, `?from=`) dès qu'elle existe.
 */

/** Programmes dont les séances sont lues. */
export const MAX_PROGRAMS = 10;
/** Séances lues par programme (le contrat en permet 100). */
const SESSIONS_PER_PROGRAM = 50;
const WINDOW_BEFORE_MS = 7 * 86_400_000;

export interface ProgramSession {
  session: Session;
  program: ProgramDetail;
}

export interface CleaningOverview {
  /** Demandes qui attendent le client : frais de visite à payer, devis à accepter (filtrés par la gateway). */
  requests: RequestSummary[];
  /** Séances à payer ou en retard (particulier). */
  sessionsToPay: ProgramSession[];
  /** Programmes suspendus, avec leurs causes. */
  suspended: ProgramDetail[];
  /** Prochaine séance de chaque programme actif, la plus proche d'abord. */
  upcomingSessions: ProgramSession[];
  /** Visites programmées (`nextVisitAt`). */
  upcomingVisits: RequestSummary[];
  /** Programmes actifs (tri : prochaine séance d'abord). */
  programs: ProgramDetail[];
  /** Les séances d'au moins un programme n'ont pas pu être lues. */
  partial: boolean;
}

/** Demandes qui attendent le client : frais de visite à payer, devis à accepter. */
export async function loadRequestTodo(): Promise<RequestSummary[]> {
  const [fees, quotes] = await Promise.all([
    listRequests({ status: 'awaiting_visit_fee', limit: 10 }),
    listRequests({ status: 'quote_sent', limit: 10 }),
  ]);
  return [...fees.data, ...quotes.data];
}

/**
 * Programmes dont les séances sont lues (10 au plus, la prochaine séance d'abord) : les programmes
 * vivants, et ceux terminés ou arrêtés dont la dernière séance est dans la fenêtre (elle peut rester à
 * payer).
 */
async function activePrograms(now: Date): Promise<ProgramDetail[]> {
  const list = await listPrograms({ sort: 'nextSession', limit: 20 });
  const windowStart = new Date(now.getTime() - WINDOW_BEFORE_MS).toISOString();
  return list.data
    .filter(
      (program) =>
        ACTIVE_PROGRAM_STATUSES.has(program.status) ||
        (!!program.lastSessionAt && program.lastSessionAt >= windowStart),
    )
    .slice(0, MAX_PROGRAMS);
}

/**
 * Séances récentes et à venir de chaque programme : une erreur sur un programme n'empêche pas les autres
 * (`partial`). `upcoming` : faut-il aussi lire les séances à venir (sinon, seulement jusqu'à maintenant).
 */
async function programSessions(
  programs: ReadonlyArray<ProgramDetail>,
  now: Date,
  upcoming: boolean,
): Promise<{ sessions: ProgramSession[]; partial: boolean }> {
  const from = new Date(now.getTime() - WINDOW_BEFORE_MS).toISOString();
  const results = await Promise.allSettled(
    programs.map(async (program) => {
      const page = await listProgramSessions(program.id, {
        from,
        to: upcoming ? undefined : now.toISOString(),
        limit: SESSIONS_PER_PROGRAM,
      });
      return page.data.map((session) => ({ session, program }));
    }),
  );
  return {
    sessions: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    partial: results.some((result) => result.status === 'rejected'),
  };
}

const byStart = (a: ProgramSession, b: ProgramSession) =>
  a.session.scheduledStart.localeCompare(b.session.scheduledStart);

/** Séances à payer (particulier), les plus en retard d'abord. */
function toPay(sessions: ReadonlyArray<ProgramSession>): ProgramSession[] {
  return sessions
    .filter(({ session }) => isPayable(session.paymentStatus))
    .sort((a, b) => {
      const late =
        Number(b.session.paymentStatus === 'overdue') - Number(a.session.paymentStatus === 'overdue');
      return late || byStart(a, b);
    });
}

/** Tout le tableau du Nettoyage : à faire, prochains rendez-vous. */
export async function loadCleaningOverview(now: Date = new Date()): Promise<CleaningOverview> {
  const [requests, visits, programs] = await Promise.all([
    loadRequestTodo(),
    listRequests({ status: 'visit_scheduled', limit: 10 }),
    activePrograms(now),
  ]);
  const { sessions, partial } = await programSessions(programs, now, true);
  const nowIso = now.toISOString();
  const next = new Map<string, ProgramSession>();
  for (const item of [...sessions].sort(byStart)) {
    if (
      item.session.scheduledStart > nowIso &&
      UPCOMING_SESSION_STATUSES.has(item.session.status) &&
      !next.has(item.program.id)
    ) {
      next.set(item.program.id, item);
    }
  }
  return {
    requests,
    sessionsToPay: toPay(sessions),
    suspended: programs.filter((program) => program.status === 'suspended'),
    upcomingSessions: [...next.values()].sort(byStart),
    upcomingVisits: visits.data.filter((request) => request.nextVisitAt),
    programs,
    partial,
  };
}

/**
 * Panneau « Nettoyage » de Mon espace : seulement ce qui attend le client (frais, devis, séances à payer,
 * programmes suspendus). Seuls les programmes d'un particulier ont des séances à payer en ligne.
 */
export async function loadCleaningTodo(
  now: Date = new Date(),
): Promise<Pick<CleaningOverview, 'requests' | 'sessionsToPay' | 'suspended'>> {
  const [requests, programs] = await Promise.all([loadRequestTodo(), activePrograms(now)]);
  const paying = programs.filter(
    (program) => program.payerKind === 'individual' && program.status !== 'confirmed',
  );
  const { sessions } = await programSessions(paying, now, false);
  return {
    requests,
    sessionsToPay: toPay(sessions),
    suspended: programs.filter((program) => program.status === 'suspended'),
  };
}
