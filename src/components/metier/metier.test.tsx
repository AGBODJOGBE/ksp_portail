import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Realisation } from '@/content/home';
import { CtaBand } from './cta-band';
import { FaqList } from './faq-section';
import { MetierHero } from './metier-hero';
import { OtherMetiers } from './other-metiers';
import { PageActions } from './page-actions';
import { RealisationsSection } from './pending-section';
import { StepList } from './steps-section';

const pending = {
  eyebrow: 'Réalisations',
  title: 'Nos chantiers',
  lead: 'Bientôt ici.',
  pendingTitle: 'Réalisation à venir',
  pendingText: 'Photos publiées prochainement.',
  count: 3,
};

function realisation(id: string, category: string): Realisation {
  return {
    id,
    title: `Chantier ${id}`,
    metierId: 'immobilier',
    category,
    href: `/realisations/${id}`,
    image: { src: '/test.jpg', alt: `Photo ${id}`, width: 800, height: 600 },
  };
}

describe('actions des pages métiers', () => {
  it('mène chaque action au bon endroit : espace client, contact avec sujet, autre site', () => {
    render(
      <PageActions
        actions={[
          { kind: 'account', label: 'Déposer un dossier' },
          { kind: 'contact', label: 'Demander un conseil', subject: 'recouvrement-conseil' },
          { kind: 'site', label: 'Découvrir KSP Shop', site: 'shop' },
          { kind: 'link', label: 'Simuler', href: '#simulateur' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Déposer un dossier/ })).toHaveAttribute('href', '/mon-espace');
    expect(screen.getByRole('link', { name: 'Demander un conseil' })).toHaveAttribute(
      'href',
      '/contact?sujet=recouvrement-conseil',
    );
    expect(screen.getByRole('link', { name: /Découvrir KSP Shop/ })).toHaveAttribute(
      'href',
      'http://localhost:3020',
    );
    expect(screen.getByRole('link', { name: 'Simuler' })).toHaveAttribute('href', '#simulateur');
  });

  it('met en avant la première action seulement', () => {
    render(
      <PageActions
        actions={[
          { kind: 'account', label: 'Principale' },
          { kind: 'account', label: 'Secondaire' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Principale/ })).toHaveClass('bg-accent');
    expect(screen.getByRole('link', { name: /Secondaire/ })).not.toHaveClass('bg-accent');
  });

  it('affiche une action pas encore ouverte comme inactive, avec une note visible qui la décrit', () => {
    render(
      <PageActions
        actions={[
          { kind: 'soon', label: 'Commander une course', note: 'Commande en ligne bientôt disponible' },
        ]}
      />,
    );
    const button = screen.getByRole('button', { name: 'Commander une course' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Commande en ligne bientôt disponible');
  });
});

describe('en-tête de page métier', () => {
  it('porte le seul titre de niveau 1, le fil d’Ariane et l’état du service', () => {
    render(
      <MetierHero
        content={{
          metierId: 'immobilier',
          status: 'Ouverture prochaine',
          title: 'Construire au Bénin',
          lead: 'Chapeau',
          actions: [{ kind: 'account', label: 'Action' }],
          highlightsTitle: 'Avec KSP',
          highlights: ['Point un', 'Point deux'],
        }}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Construire au Bénin');
    const breadcrumb = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
    expect(within(breadcrumb).getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    expect(within(breadcrumb).getByText('Immobilier clés en main')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Ouverture prochaine')).toBeInTheDocument();
  });
});

describe('liste d’étapes', () => {
  it('numérote les étapes et dit qui agit, en texte', () => {
    render(
      <StepList
        steps={[
          { actor: 'client', title: 'Vous déposez', text: 'Texte' },
          { actor: 'ksp', title: 'KSP analyse', text: 'Texte' },
          { actor: 'tiers', actorLabel: 'Votre débiteur', title: 'Il paie', text: 'Texte' },
        ]}
      />,
    );
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(
      screen.getByRole('heading', { level: 3, name: /^Étape 1\s*:\s*Vous déposez$/ }),
    ).toBeInTheDocument();
    expect(within(items[0]!).getByText('Vous')).toBeInTheDocument();
    expect(within(items[1]!).getByText('KSP')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Votre débiteur')).toBeInTheDocument();
  });
});

describe('questions fréquentes', () => {
  it('utilise <details>/<summary> natifs, fermés par défaut, avec la typographie française', () => {
    const { container } = render(
      <FaqList
        items={[
          { question: 'Combien coûte le recouvrement ?', answer: 'Une commission.' },
          { question: 'Dois-je créer un compte ?', answer: 'Oui.' },
        ]}
      />,
    );
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    details.forEach((item) => expect(item).not.toHaveAttribute('open'));
    expect(details[0]!.querySelector('summary')?.textContent).toBe('Combien coûte le recouvrement ?');
    expect(details[0]).toHaveTextContent('Une commission.');
  });
});

describe('renvoi vers les autres métiers', () => {
  it('propose les cinq autres métiers dans l’ordre de mise en avant', () => {
    render(<OtherMetiers current="nettoyage" />);
    const region = screen.getByRole('region', { name: 'Nos autres métiers' });
    expect(
      within(region)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/recouvrement', '/immobilier', '/impression', '/marketplace', '/livraison']);
  });
});

describe('bandeau d’appel à l’action', () => {
  it('présente son titre et ses actions', () => {
    render(
      <CtaBand
        content={{
          eyebrow: 'Passer à l’action',
          title: 'Un impayé à régler ?',
          actions: [{ kind: 'account', label: 'Déposer un dossier' }],
          whatsappMessage: 'Bonjour',
        }}
      />,
    );
    const region = screen.getByRole('region', { name: /Un impayé à régler/ });
    expect(within(region).getByRole('link', { name: /Déposer un dossier/ })).toHaveAttribute(
      'href',
      '/mon-espace',
    );
    // Numéro WhatsApp non configuré : pas de bouton WhatsApp.
    expect(within(region).queryByRole('link', { name: /WhatsApp/ })).toBeNull();
  });
});

describe('réalisations d’un métier', () => {
  it('sans contenu réel, affiche des emplacements « à venir » et aucun filtre', () => {
    const { container } = render(<RealisationsSection content={pending} items={[]} />);
    expect(container.querySelectorAll('[data-placeholder]')).toHaveLength(3);
    expect(screen.queryByRole('group', { name: 'Filtrer les réalisations' })).toBeNull();
  });

  it('avec du contenu, filtre par catégorie (catégories déduites des réalisations)', () => {
    render(
      <RealisationsSection
        content={pending}
        items={[
          realisation('a', 'Construction'),
          realisation('b', 'Rénovation'),
          realisation('c', 'Construction'),
        ]}
      />,
    );
    const filters = screen.getByRole('group', { name: 'Filtrer les réalisations' });
    expect(
      within(filters)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Toutes', 'Construction', 'Rénovation']);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);

    fireEvent.click(within(filters).getByRole('button', { name: 'Rénovation' }));
    expect(within(filters).getByRole('button', { name: 'Rénovation' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Chantier b']);
    expect(screen.getByRole('status')).toHaveTextContent('1 réalisation');
  });
});
