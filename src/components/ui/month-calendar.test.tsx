import { fireEvent, render, screen, within } from '@testing-library/react';
import { MonthCalendar } from './month-calendar';

const props = {
  label: 'Calendrier des passages',
  previousLabel: 'Mois précédent',
  nextLabel: 'Mois suivant',
  monthCount: (count: number) => `${count} passage(s) ce mois-ci`,
};

describe('calendrier mois par mois', () => {
  it('affiche le mois du premier jour marqué, lundi en premier, et lit l’état de chaque jour', () => {
    render(
      <MonthCalendar
        {...props}
        marks={[
          { date: '2026-11-11', tone: 'brand', label: 'fait' },
          { date: '2026-11-30', tone: 'pending', label: 'à planifier' },
          { date: '2027-01-04', tone: 'action', label: 'planifié' },
        ]}
        legend={[{ tone: 'brand', label: 'Fait', count: 1 }]}
      />,
    );
    const calendar = screen.getByRole('region', { name: 'Calendrier des passages' });
    expect(within(calendar).getByText('novembre 2026')).toBeInTheDocument();
    expect(within(calendar).getByText('2 passage(s) ce mois-ci')).toBeInTheDocument();
    expect(within(calendar).getAllByRole('columnheader')[0]).toHaveTextContent('L');
    // Le 1er novembre 2026 est un dimanche : six cases vides avant lui.
    const firstWeek = within(calendar).getAllByRole('row')[1]!.querySelectorAll('td');
    expect([...firstWeek].map((cell) => cell.textContent)).toEqual([
      '',
      '',
      '',
      '',
      '',
      '',
      expect.stringMatching(/^1dimanche 1 novembre 2026/),
    ]);
    expect(within(calendar).getByText('mercredi 11 novembre 2026 : fait')).toBeInTheDocument();
    expect(within(calendar).getByText('lundi 30 novembre 2026 : à planifier')).toBeInTheDocument();
    expect(within(calendar).getByText('Fait').parentElement).toHaveTextContent('Fait 1');
  });

  it('passe d’un mois à l’autre entre le premier et le dernier mois marqués', () => {
    render(
      <MonthCalendar
        {...props}
        marks={[
          { date: '2026-11-11', tone: 'soft', label: 'prévu' },
          { date: '2027-01-04', tone: 'soft', label: 'prévu' },
        ]}
        initialMonth="2026-12"
      />,
    );
    expect(screen.getByText('décembre 2026')).toBeInTheDocument();
    expect(screen.getByText('0 passage(s) ce mois-ci')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(screen.getByText('janvier 2027')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mois précédent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(screen.getByText('novembre 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
  });

  it('sans jour marqué, n’affiche rien', () => {
    const { container } = render(<MonthCalendar {...props} marks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
