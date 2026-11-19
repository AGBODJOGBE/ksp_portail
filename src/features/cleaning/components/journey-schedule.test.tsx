import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { CATALOG, ZONES, errorBody, stubGateway } from '@/features/cleaning/fake-gateway.test-utils';
import {
  emptyDraft,
  firstAllowedDate,
  type JourneyDraft,
  type JourneyErrors,
} from '@/features/cleaning/journey';
import type { PlaceCatalog } from '@/features/cleaning/schemas';
import { ScheduleStep } from './journey-schedule';
import { previewProblem, resetPreviewCache } from './use-schedule-preview';

const PREVIEW = '/api/v1/cleaning/schedules/preview';
/** Aperçu après une pause de saisie (400 ms) : marge pour une machine chargée. */
const WAIT = { timeout: 4000 };

/** Jour civil `AAAA-MM-JJ` décalé de `days` jours (dates de test seulement). */
const shift = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const preview = (dates: string[], warnings: unknown[] = []) => ({
  dates,
  count: dates.length,
  firstDate: dates[0],
  lastDate: dates.at(-1),
  warnings,
});

/** L'étape seule, avec un vrai brouillon et de vraies erreurs (comme dans le parcours). */
function Harness({
  initial = emptyDraft('house'),
  block,
}: {
  initial?: JourneyDraft;
  block?: (errors: JourneyErrors) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<JourneyErrors>({});
  return (
    <ScheduleStep
      draft={draft}
      catalog={CATALOG as PlaceCatalog}
      zones={ZONES.data}
      errors={errors}
      update={(change) => setDraft((current) => change(current))}
      clearError={(key) =>
        setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)))
      }
      block={block}
    />
  );
}

/** Plan hebdomadaire complet : lundi et jeudi, 3 mois depuis `start`, à 08:00. */
function fillWeekly(start: string) {
  fireEvent.click(screen.getByLabelText(/^Chaque semaine/));
  const days = screen.getByRole('group', { name: 'Quels jours de la semaine ?' });
  fireEvent.click(within(days).getByLabelText('lundi'));
  fireEvent.click(within(days).getByLabelText('jeudi'));
  fireEvent.change(screen.getByLabelText('À partir du'), { target: { value: start } });
  fireEvent.click(screen.getByLabelText('3 mois'));
  fireEvent.change(screen.getByLabelText('Heure d’arrivée'), { target: { value: '08:00' } });
}

beforeEach(() => resetPreviewCache());
afterEach(() => vi.unstubAllGlobals());

describe('étape « Vos passages »', () => {
  it('chaque semaine : seuls ses champs sont envoyés, aperçu de la gateway et nombre annoncé', async () => {
    const start = shift(firstAllowedDate(), 5);
    const dates = [shift(start, 1), shift(start, 4), shift(start, 8)];
    const gateway = stubGateway({ [`POST ${PREVIEW}`]: { status: 200, body: preview(dates) } });
    render(<Harness />);

    // Aucun mode choisi : aucun champ de mode, aperçu au repos.
    expect(screen.queryByLabelText('À partir du')).not.toBeInTheDocument();
    expect(screen.getByText(/vos dates exactes s’affichent ici/)).toBeInTheDocument();

    fillWeekly(start);
    expect(screen.getByText(/^Jusqu’au .* inclus\.$/)).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Vos passages' });
    expect(await within(panel).findByText('3 passages', {}, WAIT)).toBeInTheDocument();
    expect(within(panel).getByText('3 passages prévus.')).toHaveAttribute('aria-live', 'polite');
    expect(within(panel).getByRole('region', { name: 'Calendrier des passages' })).toBeInTheDocument();

    // Une seule requête après la pause de saisie, avec les seuls champs du mode hebdomadaire.
    const calls = gateway.calls.filter((call) => call.path === PREVIEW);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toEqual({
      mode: 'weekly',
      startDate: start,
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      weekdays: ['mon', 'thu'],
      startTime: '08:00',
    });

    // Une semaine sur deux : nouvel aperçu, rythme envoyé.
    fireEvent.change(screen.getByLabelText('À quel rythme ?'), { target: { value: '2' } });
    await vi.waitFor(
      () => expect(gateway.calls.filter((call) => call.path === PREVIEW)).toHaveLength(2),
      WAIT,
    );
    expect(gateway.calls.at(-1)!.body).toMatchObject({ everyWeeks: 2 });
  });

  it('change de mode : chaque mois, des jours du mois ou un jour de semaine à un rang, jamais mêlés', async () => {
    const gateway = stubGateway({
      [`POST ${PREVIEW}`]: { status: 200, body: preview([shift(firstAllowedDate(), 20)]) },
    });
    render(<Harness />);
    fillWeekly(shift(firstAllowedDate(), 3));
    fireEvent.click(screen.getByLabelText(/^Chaque mois/));
    // Les jours de la semaine choisis plus haut restent gardés, mais la forme « jours du mois » ne les montre pas.
    expect(screen.queryByRole('group', { name: 'Quels jours de la semaine ?' })).not.toBeInTheDocument();
    const monthDays = screen.getByRole('group', { name: 'Jours du mois' });
    fireEvent.click(within(monthDays).getByLabelText('le 31'));
    fireEvent.click(within(monthDays).getByLabelText('le 1er'));
    await vi.waitFor(
      () =>
        expect(gateway.calls.at(-1)?.body).toEqual({
          mode: 'monthly',
          startDate: expect.any(String),
          endDate: expect.any(String),
          monthDays: [1, 31],
          startTime: '08:00',
        }),
      WAIT,
    );

    fireEvent.click(screen.getByLabelText('Un jour de la semaine dans le mois'));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Quelle semaine du mois ?' })).getByLabelText('La dernière'),
    );
    await vi.waitFor(
      () =>
        expect(gateway.calls.at(-1)?.body).toEqual({
          mode: 'monthly',
          startDate: expect.any(String),
          endDate: expect.any(String),
          weekdays: ['mon', 'thu'],
          weeksOfMonth: ['last'],
          startTime: '08:00',
        }),
      WAIT,
    );
  });

  it('dates précises : jours cochés au calendrier (souris et clavier), sans période', async () => {
    const gateway = stubGateway({
      [`POST ${PREVIEW}`]: (body) => ({
        status: 200,
        body: preview((body as { dates: string[] }).dates),
      }),
    });
    render(<Harness />);
    fireEvent.click(screen.getByLabelText(/^À des dates précises/));
    expect(screen.queryByLabelText('À partir du')).not.toBeInTheDocument();
    const first = firstAllowedDate();
    const calendar = screen.getByRole('region', { name: 'Calendrier : jours de passage' });
    // Avant J+2 : pas de bouton.
    expect(calendar.querySelector(`[data-day="${shift(first, -1)}"]`)).toBeNull();
    const day = calendar.querySelector<HTMLButtonElement>(`[data-day="${first}"]`)!;
    fireEvent.click(day);
    expect(day).toHaveAttribute('aria-pressed', 'true');
    // Clavier : flèche droite puis Entrée coche le lendemain.
    act(() => day.focus());
    fireEvent.keyDown(day, { key: 'ArrowRight' });
    const next = screen
      .getByRole('region', { name: 'Calendrier : jours de passage' })
      .querySelector<HTMLButtonElement>(`[data-day="${shift(first, 1)}"]`)!;
    await vi.waitFor(() => expect(document.activeElement).toBe(next));
    fireEvent.click(next);
    expect(screen.getByText('2 jours choisis')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Heure d’arrivée'), { target: { value: '14:00' } });

    const panel = screen.getByRole('region', { name: 'Vos passages' });
    expect(await within(panel).findByText('2 passages', {}, WAIT)).toBeInTheDocument();
    expect(gateway.calls.at(-1)!.body).toEqual({
      mode: 'dates',
      dates: [first, shift(first, 1)],
      startTime: '14:00',
    });
  });

  it('affiche les avertissements de la gateway tels quels, et envoie les jours retirés', async () => {
    const start = shift(firstAllowedDate(), 3);
    const gateway = stubGateway({
      [`POST ${PREVIEW}`]: {
        status: 200,
        body: preview(
          [shift(start, 2), shift(start, 30)],
          [
            {
              code: 'moved_to_month_end',
              date: shift(start, 30),
              message: 'Le 31 n’existe pas ce mois-ci : passage ramené au dernier jour du mois.',
            },
            { code: 'excluded', date: shift(start, 9), message: 'Jour exclu : aucun passage ce jour-là.' },
          ],
        ),
      },
    });
    render(<Harness />);
    fillWeekly(start);
    fireEvent.click(screen.getByText('Ajuster : retirer ou ajouter des jours'));
    fireEvent.change(screen.getByLabelText('Jour à retirer'), { target: { value: shift(start, 9) } });
    fireEvent.click(screen.getByRole('button', { name: 'Retirer ce jour' }));

    const panel = screen.getByRole('region', { name: 'Vos passages' });
    expect(await within(panel).findByText('2 remarques sur vos dates', {}, WAIT)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Le 31 n’existe pas ce mois-ci : passage ramené au dernier jour du mois\./),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/Jour exclu : aucun passage ce jour-là\./)).toBeInTheDocument();
    expect(gateway.calls.at(-1)!.body).toMatchObject({ excludedDates: [shift(start, 9)] });
  });

  it('422 délai trop court : message de la gateway sous la date de début, « Continuer » bloqué', async () => {
    const block = vi.fn();
    stubGateway({
      [`POST ${PREVIEW}`]: {
        status: 422,
        body: errorBody(
          'CLEANING_LEAD_TIME_TOO_SHORT',
          'Une intervention se réserve au moins 48 heures à l’avance.',
          { minimumHours: 48 },
        ),
      },
    });
    render(<Harness block={block} />);
    fillWeekly(firstAllowedDate());
    const start = screen.getByLabelText('À partir du');
    await vi.waitFor(() => expect(start).toHaveAttribute('aria-invalid', 'true'), WAIT);
    await vi.waitFor(() => {
      expect(start).toHaveAccessibleDescription(/au moins 48 heures à l’avance/);
      expect(screen.getByText('Corrigez le plan pour voir vos dates.')).toBeInTheDocument();
      expect(block).toHaveBeenLastCalledWith({
        'schedule.startDate': 'Une intervention se réserve au moins 48 heures à l’avance.',
      });
    }, WAIT);
  });

  it('400 sur un champ du plan : le message va sous ce champ', async () => {
    stubGateway({
      [`POST ${PREVIEW}`]: {
        status: 400,
        body: errorBody('CLEANING_VALIDATION_FAILED', 'Sans effet en mode weekly : à ne pas envoyer.', {
          field: 'schedule.weekdays',
        }),
      },
    });
    render(<Harness />);
    fillWeekly(shift(firstAllowedDate(), 3));
    await screen.findByText('Sans effet en mode weekly : à ne pas envoyer.', {}, WAIT);
    expect(screen.getByLabelText('lundi')).toHaveAttribute('aria-invalid', 'true');
  });

  it('429 : message calme, puis nouvel essai automatique après l’attente demandée', async () => {
    const gateway = stubGateway({
      [`POST ${PREVIEW}`]: [
        {
          status: 429,
          body: errorBody('GATEWAY_RATE_LIMITED', 'Trop de requêtes.', { retryAfterSeconds: 1 }),
        },
        { status: 200, body: preview([shift(firstAllowedDate(), 7)]) },
      ],
    });
    render(<Harness />);
    fillWeekly(shift(firstAllowedDate(), 3));
    expect(
      await screen.findByText(
        /Beaucoup de demandes en ce moment : nous recalculons vos dates dans 1 s/,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText('1 passage', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(gateway.calls.filter((call) => call.path === PREVIEW)).toHaveLength(2);
  });
});

describe('erreurs de l’aperçu', () => {
  it('range les erreurs : champ, délai (avec repli sur minimumHours), 429, autre', () => {
    expect(
      previewProblem(
        new ApiError(400, 'CLEANING_VALIDATION_FAILED', 'Rangs invalides.', {
          field: 'schedule.weeksOfMonth[0]',
        }),
        'monthly',
      ),
    ).toEqual({ status: 'invalid', key: 'schedule.weeksOfMonth', message: 'Rangs invalides.' });
    expect(
      previewProblem(
        new ApiError(400, 'CLEANING_VALIDATION_FAILED', 'Aucun passage.', { field: 'schedule' }),
        'weekly',
      ),
    ).toEqual({ status: 'invalid', key: 'schedule', message: 'Aucun passage.' });
    expect(
      previewProblem(new ApiError(422, 'CLEANING_LEAD_TIME_TOO_SHORT', '', { minimumHours: 72 }), 'dates'),
    ).toEqual({
      status: 'invalid',
      key: 'schedule.dates',
      message: 'Le premier passage doit avoir lieu au moins 72 heures après votre demande.',
    });
    expect(previewProblem(new ApiError(429, 'GATEWAY_RATE_LIMITED', 'Trop.', {}), 'dates')).toEqual({
      status: 'busy',
      seconds: 5,
    });
    expect(
      previewProblem(new ApiError(429, 'GATEWAY_RATE_LIMITED', 'Trop.', { retryAfterSeconds: 600 }), 'dates'),
    ).toEqual({ status: 'busy', seconds: 60 });
    expect(previewProblem(ApiError.network(), 'dates')).toEqual({
      status: 'failed',
      message: 'Connexion impossible. Vérifiez votre connexion internet et réessayez.',
    });
  });
});
