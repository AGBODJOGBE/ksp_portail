import { render, screen } from '@testing-library/react';

async function renderButton(number: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', number);
  const { WhatsAppButton } = await import('./whatsapp-button');
  return render(<WhatsAppButton message="Bonjour KSP" />);
}

describe('bouton WhatsApp', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('ouvre la conversation avec le numéro et le message prérempli', async () => {
    await renderButton('22990000000');
    const link = screen.getByRole('link', { name: 'Nous écrire sur WhatsApp' });
    expect(link).toHaveAttribute('href', 'https://wa.me/22990000000?text=Bonjour%20KSP');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('reste masqué tant que le numéro n’est pas configuré', async () => {
    const { container } = await renderButton('');
    expect(container).toBeEmptyDOMElement();
  });

  it('propose aussi un bouton intégré au contenu, avec le même message prérempli', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '22990000000');
    const { WhatsAppLink } = await import('./whatsapp-button');
    render(<WhatsAppLink message="Bonjour KSP" />);
    expect(screen.getByRole('link', { name: 'Nous écrire sur WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/22990000000?text=Bonjour%20KSP',
    );
  });

  it('n’affiche pas le bouton intégré sans numéro', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '');
    const { WhatsAppLink } = await import('./whatsapp-button');
    const { container } = render(<WhatsAppLink message="Bonjour KSP" />);
    expect(container).toBeEmptyDOMElement();
  });
});
