import { render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import { homeContent } from '@/features/home/content';
import { KeyFiguresSection, TestimonialsSection } from './proof-sections';

describe('accueil', () => {
  it('affiche la promesse du groupe en titre principal', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Vos services du quotidien, réunis par un seul groupe',
    );
  });

  it('présente les six métiers, chacun avec son lien et son action', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'Six métiers, un seul groupe' });
    const links = within(section).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/recouvrement',
      '/nettoyage',
      '/immobilier',
      '/impression',
      '/marketplace',
      '/livraison',
    ]);
    expect(within(section).getByText('Simuler ma prestation')).toBeInTheDocument();
  });

  it('n’invente aucun contenu : sans données, il affiche des emplacements « à venir »', () => {
    const { container } = render(<HomePage />);
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

  it('affiche les témoignages fournis avec leur auteur', () => {
    render(
      <TestimonialsSection
        content={{
          ...homeContent.testimonials,
          items: [{ id: 't1', quote: 'Texte de test', author: 'Auteur de test', metierId: 'nettoyage' }],
        }}
      />,
    );
    expect(screen.getByText('« Texte de test »')).toBeInTheDocument();
    expect(screen.getByText('Auteur de test')).toBeInTheDocument();
  });
});
