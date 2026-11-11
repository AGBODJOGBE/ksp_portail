import { act, render, screen } from '@testing-library/react';
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
    emailVerified: false,
    preferredLanguage: 'fr',
    createdAt: '2026-10-21T09:00:00Z',
  },
  profileIncomplete: false,
  activeContext: { type: 'individual', organizationId: null, organizationName: null },
};

afterEach(() => session.clear());

describe('en-tête du site', () => {
  it('ouvre le menu mobile avec l’API popover native', () => {
    const { container } = render(<SiteHeader />);
    const menuButton = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(menuButton).toHaveAttribute('popovertarget', 'menu-mobile');
    expect(container.querySelector('#menu-mobile')).toHaveAttribute('popover', 'auto');
  });

  it('mène à « Nos services » et à « Suivre ma demande », sans menu « Nos métiers » en double', () => {
    const { container } = render(<SiteHeader />);
    const services = screen.getAllByRole('link', { name: 'Nos services', hidden: true });
    expect(services.length).toBe(2);
    services.forEach((link) => expect(link).toHaveAttribute('href', '/services'));
    screen
      .getAllByRole('link', { name: 'Suivre ma demande', hidden: true })
      .forEach((link) => expect(link).toHaveAttribute('href', '/mon-espace/suivi'));
    // Les six métiers sont les catégories de « Nos services » : plus de menu dédié dans l'en-tête.
    expect(screen.queryByRole('button', { name: /Nos métiers/, hidden: true })).toBeNull();
    expect(container.querySelector('#menu-metiers')).toBeNull();
  });

  it('propose « Créer un compte » tant qu’aucune session n’est ouverte', () => {
    render(<SiteHeader />);
    const signup = screen.getAllByRole('link', { name: 'Créer un compte', hidden: true });
    expect(signup.length).toBeGreaterThanOrEqual(2);
    act(() => session.set(SESSION));
    expect(screen.queryByRole('link', { name: 'Créer un compte', hidden: true })).toBeNull();
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
    const current = screen.getAllByRole('link', { name: 'À propos', hidden: true });
    current.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'));
  });
});
