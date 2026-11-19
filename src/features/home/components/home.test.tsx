import { fireEvent, render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import { homeContent } from '@/features/home/content';
import { KeyFiguresSection } from './home-sections';
import { NewsCarousel } from './news-carousel';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('accueil', () => {
  it('affiche la promesse du groupe en titre principal', async () => {
    render(await HomePage());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Vos services du quotidien, réunis par un seul groupe',
    );
  });

  it('propose la recherche des services et le mode guidé vers « Votre besoin »', async () => {
    render(await HomePage());
    // Recherche chargée à la demande (features/services/components/lazy.tsx).
    expect(await screen.findByRole('combobox', { name: 'Trouver un service' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Être guidé' })).toHaveAttribute('href', '#votre-besoin');
    expect(document.getElementById('votre-besoin')).not.toBeNull();
  });

  it('oriente chaque besoin vers le bon service', async () => {
    render(await HomePage());
    const section = screen.getByRole('region', { name: /Dites-nous ce qu’il vous faut/ });
    const hrefs = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/services',
      '/nettoyage/demande',
      '/recouvrement',
      '/immobilier',
      '/impression',
      '/marketplace',
      '/livraison',
    ]);
  });

  it('referme le bandeau d’information', async () => {
    render(await HomePage());
    fireEvent.click(screen.getByRole('button', { name: homeContent.banner.close }));
    expect(screen.queryByRole('button', { name: homeContent.banner.close })).toBeNull();
  });

  it('n’invente aucun contenu : sans données, il affiche des emplacements « à venir »', async () => {
    const { container } = render(await HomePage());
    expect(container.querySelectorAll('[data-placeholder]').length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Chiffres clés' })).toHaveTextContent('Chiffre clé à venir');
  });

  it('affiche les chiffres clés fournis, formatés en français', () => {
    render(
      <KeyFiguresSection
        content={{ ...homeContent.keyFigures, items: [{ value: 12500, label: 'Dossiers suivis' }] }}
      />,
    );
    const region = screen.getByRole('region', { name: 'Chiffres clés' });
    expect(region.querySelector('[data-placeholder]')).toBeNull();
    expect(within(region).getByText('Dossiers suivis')).toBeInTheDocument();
    expect(region.textContent?.replace(/\s/g, '')).toContain('12500');
  });
});

describe('nouveautés', () => {
  const { slides } = homeContent.news;
  const labels = {
    label: homeContent.news.label,
    pause: homeContent.news.pause,
    play: homeContent.news.play,
    slideLabels: slides.map((_, index) => homeContent.news.goTo(index + 1, slides.length)),
  };

  it('passe d’une nouveauté à l’autre avec les points de navigation', () => {
    render(<NewsCarousel slides={slides} labels={labels} illustrations={[]} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(slides[0]!.title);
    fireEvent.click(screen.getByRole('button', { name: 'Nouveauté 2 sur 3' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(slides[1]!.title);
    expect(screen.getByRole('button', { name: 'Nouveauté 2 sur 3' })).toHaveAttribute('aria-current', 'true');
  });

  it('se met en pause à la demande', () => {
    render(<NewsCarousel slides={slides} labels={labels} illustrations={[]} />);
    fireEvent.click(screen.getByRole('button', { name: labels.pause }));
    expect(screen.getByRole('button', { name: labels.play })).toBeInTheDocument();
  });
});
