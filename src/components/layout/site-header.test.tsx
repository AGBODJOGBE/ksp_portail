import { render, screen, within } from '@testing-library/react';
import { SiteHeader } from './site-header';

vi.mock('next/navigation', () => ({ usePathname: () => '/a-propos' }));

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

  it('donne accès à « Mon espace KSP », y compris sur téléphone (icône nommée)', () => {
    render(<SiteHeader />);
    const accountLinks = screen.getAllByRole('link', { name: 'Mon espace KSP' });
    expect(accountLinks.length).toBeGreaterThanOrEqual(2);
    accountLinks.forEach((link) => expect(link).toHaveAttribute('href', '/mon-espace'));
  });

  it('signale la page courante', () => {
    render(<SiteHeader />);
    const current = screen.getAllByRole('link', { name: 'À propos' });
    current.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'));
  });
});
