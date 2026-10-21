import { act, render, screen, within } from '@testing-library/react';
import { session, type Session } from '@/lib/api/session';
import { SiteHeader } from './site-header';

vi.mock('next/navigation', () => ({ usePathname: () => '/a-propos' }));

const SESSION: Session = {
  status: 'authenticated',
  accessToken: 'jeton',
  accessTokenExpiresAt: '2099-01-01T00:00:00Z',
  sessionId: 's1',
  user: {
    id: 'u1',
    status: 'active',
    firstName: 'Koffi',
    lastName: 'Adjovi',
    phone: '+2290197000045',
    email: null,
    preferredLanguage: 'fr',
    createdAt: '2026-10-21T09:00:00Z',
  },
  profileIncomplete: false,
};

afterEach(() => session.clear());

describe('en-tête du site', () => {
  it('ouvre le menu mobile et le panneau des métiers avec l’API popover native', () => {
    const { container } = render(<SiteHeader />);
    const menuButton = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(menuButton).toHaveAttribute('popovertarget', 'menu-mobile');
    expect(container.querySelector('#menu-mobile')).toHaveAttribute('popover', 'auto');
    expect(screen.getByRole('button', { name: /Nos métiers/ })).toHaveAttribute(
      'popovertarget',
      'menu-metiers',
    );
  });

  it('liste les six métiers dans le menu mobile (fermé par défaut)', () => {
    const { container } = render(<SiteHeader />);
    const mobileMenu = container.querySelector<HTMLElement>('#menu-mobile');
    expect(mobileMenu).not.toBeNull();
    const links = within(mobileMenu!)
      .getAllByRole('link', { hidden: true })
      .map((link) => link.getAttribute('href'));
    expect(links).toEqual(
      expect.arrayContaining([
        '/recouvrement',
        '/immobilier',
        '/nettoyage',
        '/impression',
        '/marketplace',
        '/livraison',
      ]),
    );
  });

  it('propose « Se connecter » sans session, y compris sur téléphone (icône nommée)', () => {
    render(<SiteHeader />);
    const loginLinks = screen.getAllByRole('link', { name: 'Se connecter', hidden: true });
    expect(loginLinks.length).toBeGreaterThanOrEqual(3);
    loginLinks.forEach((link) => expect(link).toHaveAttribute('href', '/connexion'));
  });

  it('donne accès à « Mon espace KSP » une fois connecté', () => {
    render(<SiteHeader />);
    act(() => session.set(SESSION));
    const accountLinks = screen.getAllByRole('link', { name: 'Mon espace KSP', hidden: true });
    expect(accountLinks.length).toBeGreaterThanOrEqual(3);
    accountLinks.forEach((link) => expect(link).toHaveAttribute('href', '/mon-espace'));
    expect(screen.queryByRole('link', { name: 'Se connecter', hidden: true })).toBeNull();
  });

  it('signale la page courante', () => {
    render(<SiteHeader />);
    const current = screen.getAllByRole('link', { name: 'À propos' });
    current.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'));
  });
});
