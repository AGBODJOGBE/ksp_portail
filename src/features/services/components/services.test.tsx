import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ServicesPage from '@/app/services/page';
import { buildServiceDirectory } from '@/features/services/catalog';
import { ServiceSearchBox } from './service-search-box';
import { ServicesView } from './services-view';

const push = vi.fn();
const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const GATEWAY = [
  { code: 'window_cleaning', name: 'Nettoyage de vitres', description: 'Fenêtres et baies vitrées.' },
  { code: 'deep_cleaning', name: 'Grand ménage', description: 'Nettoyage complet du sol au plafond.' },
];
const entries = buildServiceDirectory(GATEWAY);

afterEach(() => {
  push.mockReset();
  replace.mockReset();
  search = '';
  vi.useRealTimers();
});

describe('page « Tous nos services »', () => {
  it('liste les services et lit la catégorie dans l’adresse', async () => {
    search = 'categorie=nettoyage';
    render(await ServicesPage());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tous nos services');
    // L'annuaire est chargé à la demande (components/lazy.tsx).
    const cards = await screen.findAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => expect(card).toHaveTextContent('Nettoyage'));
    expect(screen.getByRole('link', { name: 'Nettoyage' })).toHaveAttribute('aria-current', 'true');
  });
});

describe('annuaire', () => {
  it('filtre par catégorie : seules les cartes de la catégorie, avec leur lien', () => {
    render(<ServicesView entries={entries} query={{ category: 'nettoyage', q: '', page: 1 }} />);
    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual(['Catégories de services', 'Nettoyage de vitres', 'Grand ménage']);
    screen
      .getAllByRole('link', { name: /Afficher les détails/ })
      .forEach((link) => expect(link).toHaveAttribute('href', '/nettoyage/demande'));
    expect(screen.getByText('2 services')).toBeInTheDocument();
  });

  it('garde la recherche en changeant de catégorie', () => {
    render(<ServicesView entries={entries} query={{ category: null, q: 'vitres', page: 1 }} />);
    expect(screen.getByRole('link', { name: 'Impression' })).toHaveAttribute(
      'href',
      '/services?categorie=impression&q=vitres',
    );
    expect(screen.getByRole('link', { name: 'Tous les services' })).toHaveAttribute('aria-current', 'true');
  });

  it('propose de tout revoir quand rien ne correspond', () => {
    render(<ServicesView entries={entries} query={{ category: null, q: 'zzz', page: 1 }} />);
    expect(screen.getByText('Aucun service ne correspond à votre recherche')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir tous les services' })).toHaveAttribute('href', '/services');
  });

  it('pagine une longue liste', () => {
    render(<ServicesView entries={entries} query={{ category: null, q: '', page: 2 }} />);
    const pagination = screen.getByRole('navigation', { name: 'Pages de résultats' });
    expect(within(pagination).getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(within(pagination).getByRole('link', { name: 'Page précédente' })).toHaveAttribute(
      'href',
      '/services',
    );
  });

  it('met la recherche dans l’adresse pendant la frappe', () => {
    vi.useFakeTimers();
    render(<ServicesView entries={entries} query={{ category: 'nettoyage', q: '', page: 1 }} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trouver un service' }), {
      target: { value: 'vitres' },
    });
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(replace).toHaveBeenCalledWith('/services?categorie=nettoyage&q=vitres', { scroll: false });
  });
});

describe('recherche du premier écran', () => {
  const labels = {
    label: 'Trouver un service',
    placeholder: 'Trouver un service',
    submit: 'Rechercher',
    suggestions: 'Suggestions',
    none: 'Aucun service ne correspond.',
    allResults: 'Voir les {total} services correspondants',
    allResultsOne: 'Voir le service correspondant',
  };

  it('propose des suggestions avec leur lien, au clavier', () => {
    render(<ServiceSearchBox entries={entries} labels={labels} />);
    const input = screen.getByRole('combobox', { name: 'Trouver un service' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'menage' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Grand ménage');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/nettoyage/demande');
  });

  it('mène à « Tous nos services » avec la recherche si aucune suggestion n’est choisie', () => {
    render(<ServiceSearchBox entries={entries} labels={labels} />);
    const input = screen.getByRole('combobox', { name: 'Trouver un service' });
    fireEvent.change(input, { target: { value: 'créance' } });
    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/services?q=cr%C3%A9ance');
  });

  it('dit quand rien ne correspond', () => {
    render(<ServiceSearchBox entries={entries} labels={labels} />);
    const input = screen.getByRole('combobox', { name: 'Trouver un service' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getAllByText('Aucun service ne correspond.').length).toBeGreaterThan(0);
  });
});
