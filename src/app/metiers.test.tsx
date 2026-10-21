import { render, screen, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import ImmobilierPage from './immobilier/page';
import ImpressionPage from './impression/page';
import LivraisonPage from './livraison/page';
import MarketplacePage from './marketplace/page';
import NettoyagePage from './nettoyage/page';
import RecouvrementPage from './recouvrement/page';
import sitemap from './sitemap';

type Expectation = { name: string; href: string | null };

const PAGES: ReadonlyArray<{ path: string; Page: ComponentType; h1: RegExp; actions: Expectation[] }> = [
  {
    path: '/recouvrement',
    Page: RecouvrementPage,
    h1: /Récupérez vos impayés/,
    actions: [
      { name: 'Déposer un dossier', href: '/mon-espace' },
      { name: 'Demander un conseil', href: '/contact?sujet=recouvrement-conseil' },
    ],
  },
  {
    path: '/nettoyage',
    Page: NettoyagePage,
    h1: /Des locaux propres et sains/,
    actions: [
      { name: 'Simuler ma prestation', href: '#simulateur' },
      { name: 'Demander un devis', href: '/contact?sujet=nettoyage-devis' },
    ],
  },
  {
    path: '/immobilier',
    Page: ImmobilierPage,
    h1: /Construire au Bénin/,
    actions: [
      { name: 'Préparer mon projet', href: '#demande-de-devis' },
      { name: 'Prendre rendez-vous', href: '/contact?sujet=immobilier-rendez-vous' },
    ],
  },
  {
    path: '/livraison',
    Page: LivraisonPage,
    h1: /Vos colis et vos courses/,
    actions: [
      { name: 'Commander une course', href: null },
      { name: 'Nous contacter', href: '/contact?sujet=livraison' },
    ],
  },
  {
    path: '/impression',
    Page: ImpressionPage,
    h1: /Vos supports imprimés/,
    actions: [
      { name: 'Découvrir KSP Print', href: 'http://localhost:3030' },
      { name: 'Demander un devis', href: '/contact?sujet=impression-devis' },
    ],
  },
  {
    path: '/marketplace',
    Page: MarketplacePage,
    h1: /Acheter et vendre en ligne/,
    actions: [
      { name: 'Découvrir KSP Shop', href: 'http://localhost:3020' },
      { name: 'Devenir vendeur', href: '/contact?sujet=marketplace-vendeur' },
    ],
  },
];

describe.each(PAGES)('page métier $path', ({ path, Page, h1, actions }) => {
  it('a un seul titre de niveau 1, puis des titres de section de niveau 2', () => {
    render(<Page />);
    const titles = screen.getAllByRole('heading', { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent(h1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(1);
  });

  it('mène ses actions principales au bon endroit', () => {
    render(<Page />);
    const hero = screen.getByRole('region', { name: h1 });
    for (const action of actions) {
      if (action.href === null) {
        expect(within(hero).getByRole('button', { name: action.name })).toBeDisabled();
      } else {
        expect(within(hero).getByRole('link', { name: new RegExp(action.name) })).toHaveAttribute(
          'href',
          action.href,
        );
      }
    }
  });

  it('renvoie vers les cinq autres métiers et figure dans le plan du site', () => {
    render(<Page />);
    const others = screen.getByRole('region', { name: 'Nos autres métiers' });
    const hrefs = within(others)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toHaveLength(5);
    expect(hrefs).not.toContain(path);
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toContain(path);
  });

  it('n’invente aucun prix', () => {
    const { container } = render(<Page />);
    expect(container.textContent).not.toMatch(/FCFA|F\s?CFA|XOF|\d+\s?%/);
  });
});
