import { render, screen } from '@testing-library/react';
import { CONTACT_EXAMPLES, type ContactDetails } from '@/config/contact';
import { subjectFromParam } from '@/features/contact/content';
import { ContactChannels } from './contact-channels';
import { ContactWithSubject } from './contact-with-subject';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

/** Coordonnées non configurées : valeurs d'exemple. */
const examples: ContactDetails = {
  whatsappNumber: { value: CONTACT_EXAMPLES.whatsappNumber, example: true },
  phone: { value: CONTACT_EXAMPLES.phone, example: true },
  email: { value: CONTACT_EXAMPLES.email, example: true },
  address: { value: CONTACT_EXAMPLES.address, example: true },
  hours: 'Du lundi au vendredi.',
};

beforeEach(() => {
  search = '';
});

describe('page Contact', () => {
  it('sujet connu lu dans l’adresse, sujet inconnu ignoré', () => {
    expect(subjectFromParam('paiement')).toEqual({
      code: 'paiement',
      label: 'Paiement en ligne — vérification par le support',
    });
    expect(subjectFromParam('toString')).toBeNull();
    expect(subjectFromParam('inconnu')).toBeNull();
    expect(subjectFromParam(null)).toBeNull();
  });

  it('sujet annoncé et repris dans le message WhatsApp et l’objet de l’e-mail', () => {
    search = 'sujet=paiement';
    render(<ContactWithSubject contact={examples} />);
    expect(screen.getByText('Paiement en ligne — vérification par le support')).toBeInTheDocument();
    const whatsapp = screen.getByRole('link', { name: /Écrire sur WhatsApp/ });
    const href = new URL(whatsapp.getAttribute('href')!);
    expect(href.hostname).toBe('wa.me');
    expect(href.searchParams.get('text')).toBe(
      'Bonjour KSP, je vous écris au sujet de : Paiement en ligne — vérification par le support.',
    );
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    const mail = screen.getByRole('link', { name: 'Écrire un e-mail' }).getAttribute('href')!;
    expect(decodeURIComponent(mail)).toContain('subject=[KSP] Paiement en ligne');
  });

  it('coordonnées non configurées : valeurs d’exemple signalées, liens directs', () => {
    render(<ContactChannels contact={examples} subject={null} />);
    expect(screen.getAllByText('Exemple, à remplacer').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', 'tel:+22900000000');
    expect(screen.getByText('Adresse à compléter, Cotonou, Bénin')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
