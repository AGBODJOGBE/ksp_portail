import { fireEvent, render, screen, within } from '@testing-library/react';
import { immobilierContent } from '@/features/realestate';
import type { GuidedFormContent } from './guided-form-types';
import { GuidedForm } from './guided-form';
import { answerLabel, parseAmount, summaryMessage, validateStep } from './guided-form-logic';

/** Formulaire guidé à étapes fixes (premier simulateur du Nettoyage, avant son branchement sur la gateway). */
const simulator: GuidedFormContent = {
  id: 'nettoyage',
  label: 'Simulateur de prestation de nettoyage',
  steps: [
    {
      kind: 'choice',
      id: 'prestation',
      name: 'Prestation',
      title: 'Quelle prestation vous intéresse ?',
      options: [
        { value: 'bureaux', label: 'Nettoyage de bureaux' },
        { value: 'domicile', label: 'Nettoyage à domicile' },
        { value: 'fin-de-chantier', label: 'Nettoyage de fin de chantier' },
        { value: 'vidange', label: 'Vidange' },
        { value: 'desinsectisation', label: 'Désinsectisation' },
      ],
    },
    {
      kind: 'choice',
      id: 'locaux',
      name: 'Locaux',
      title: 'Quel type de locaux ?',
      hint: 'Pour les entreprises, une visite technique est prévue avant le devis.',
      options: [
        { value: 'appartement', label: 'Appartement' },
        { value: 'maison', label: 'Maison ou villa' },
        { value: 'bureau', label: 'Bureaux' },
        { value: 'commerce', label: 'Commerce ou local recevant du public' },
        { value: 'entrepot', label: 'Entrepôt ou local technique' },
        { value: 'autre', label: 'Autre' },
      ],
    },
    {
      kind: 'quantity',
      id: 'taille',
      name: 'Taille',
      title: 'Quelle est la taille des locaux ?',
      hint: 'Une valeur approximative suffit. Vous pourrez la préciser avec notre équipe.',
      modes: [
        {
          value: 'surface',
          label: 'Surface',
          inputLabel: 'Surface approximative',
          format: 'number',
          unit: 'm²',
          max: 100000,
        },
        {
          value: 'pieces',
          label: 'Nombre de pièces',
          inputLabel: 'Nombre de pièces',
          format: 'number',
          unit: 'pièces',
          max: 500,
        },
      ],
      unknownLabel: 'Je ne sais pas encore',
    },
    {
      kind: 'choice',
      id: 'frequence',
      name: 'Fréquence',
      title: 'À quelle fréquence ?',
      options: [
        { value: 'ponctuelle', label: 'Une seule fois' },
        { value: 'hebdomadaire', label: 'Chaque semaine' },
        { value: 'mensuelle', label: 'Chaque mois' },
        { value: 'a-definir', label: 'À définir ensemble' },
      ],
    },
  ],
  summaryName: 'Récapitulatif',
  summaryTitle: 'Votre demande',
  summaryHint: 'Vérifiez vos réponses : vous pouvez encore les modifier.',
  result: {
    title: 'Estimation bientôt disponible',
    text: 'Le calcul du prix en ligne arrive prochainement. En attendant, demandez un devis avec ces informations : notre équipe vous répond avec un prix adapté à vos locaux.',
    actions: [{ kind: 'contact', label: 'Demander un devis', subject: 'nettoyage-devis' }],
    whatsappIntro: 'Bonjour KSP, je souhaite un devis de nettoyage :',
  },
};

function renderSimulator(whatsappNumber?: string) {
  return render(
    <GuidedForm
      content={simulator}
      resultActions={<a href="/contact?sujet=nettoyage-devis">Demander un devis</a>}
      whatsappNumber={whatsappNumber}
    />,
  );
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /Continuer|Voir le récapitulatif/ }));
const title = () => screen.getByRole('heading', { level: 3 });

/** Parcourt tout le simulateur avec la première réponse de chaque étape et une surface de 120 m². */
function completeSimulator() {
  fireEvent.click(screen.getByLabelText('Nettoyage de bureaux'));
  next();
  fireEvent.click(screen.getByLabelText('Appartement'));
  next();
  fireEvent.click(screen.getByLabelText('Surface'));
  fireEvent.change(screen.getByLabelText('Surface approximative'), { target: { value: '120' } });
  next();
  fireEvent.click(screen.getByLabelText('Une seule fois'));
  next();
}

describe('simulateur de nettoyage (formulaire guidé)', () => {
  it('commence à la première étape, sans bouton retour', () => {
    renderSimulator();
    expect(screen.getByRole('form', { name: simulator.label })).toBeInTheDocument();
    expect(title()).toHaveTextContent('Quelle prestation vous intéresse');
    expect(screen.getAllByText(/Étape 1 sur 5/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Retour/ })).toBeNull();
  });

  it('refuse d’avancer sans réponse et l’explique près des choix', () => {
    renderSimulator();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Choisissez une réponse pour continuer.');
    expect(title()).toHaveTextContent('Quelle prestation vous intéresse');
  });

  it('avance, revient en arrière en gardant la réponse, et met le focus sur le titre de l’étape', () => {
    renderSimulator();
    fireEvent.click(screen.getByLabelText('Vidange'));
    next();
    expect(title()).toHaveTextContent('Quel type de locaux');
    expect(title()).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }));
    expect(title()).toHaveTextContent('Quelle prestation vous intéresse');
    expect(screen.getByLabelText('Vidange')).toBeChecked();
  });

  it('vérifie la quantité saisie, et accepte « je ne sais pas encore »', () => {
    renderSimulator();
    fireEvent.click(screen.getByLabelText('Nettoyage à domicile'));
    next();
    fireEvent.click(screen.getByLabelText('Maison ou villa'));
    next();
    fireEvent.click(screen.getByLabelText('Nombre de pièces'));
    fireEvent.change(screen.getByLabelText('Nombre de pièces', { selector: 'input[type=text]' }), {
      target: { value: 'trois' },
    });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Indiquez un nombre entier entre 1 et 500.');
    fireEvent.click(screen.getByLabelText('Je ne sais pas encore'));
    next();
    expect(title()).toHaveTextContent('À quelle fréquence');
  });

  it('récapitule les réponses, permet de les modifier, et n’affiche aucun prix', () => {
    renderSimulator();
    completeSimulator();
    expect(title()).toHaveTextContent('Votre demande');
    const summary = screen.getByRole('form');
    expect(summary).toHaveTextContent('Nettoyage de bureaux');
    expect(summary).toHaveTextContent('Surface : 120 m²');
    expect(summary).toHaveTextContent('Estimation bientôt disponible');
    expect(summary.textContent).not.toMatch(/FCFA|F\s?CFA|XOF|€/);
    expect(screen.getByRole('link', { name: 'Demander un devis' })).toHaveAttribute(
      'href',
      '/contact?sujet=nettoyage-devis',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Modifier : Locaux' }));
    expect(title()).toHaveTextContent('Quel type de locaux');
    expect(screen.getByLabelText('Appartement')).toBeChecked();
  });

  it('n’envoie rien : aucun appel réseau pendant tout le parcours', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderSimulator('22990000000');
    completeSimulator();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('propose WhatsApp avec le récapitulatif seulement si le numéro est configuré', () => {
    const { unmount } = renderSimulator();
    completeSimulator();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull();
    unmount();

    renderSimulator('22990000000');
    completeSimulator();
    const link = screen.getByRole('link', { name: /WhatsApp/ });
    const href = decodeURIComponent(link.getAttribute('href') ?? '');
    expect(href).toContain('https://wa.me/22990000000?text=');
    expect(href).toContain('- Prestation : Nettoyage de bureaux');
  });

  it('recommence à zéro', () => {
    renderSimulator();
    completeSimulator();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(title()).toHaveTextContent('Quelle prestation vous intéresse');
    expect(screen.getByLabelText('Nettoyage de bureaux')).not.toBeChecked();
  });
});

describe('demande de devis immobilier (même composant)', () => {
  it('formate le budget saisi en francs CFA dans le récapitulatif', () => {
    const budget = immobilierContent.quote.form.steps.find((step) => step.id === 'budget');
    expect(budget).toBeDefined();
    const label = answerLabel(budget!, { kind: 'quantity', mode: 'montant', amount: '25 000 000' });
    expect(label.replace(/\s/g, ' ')).toMatch(/^Oui, environ : 25 000 000 F CFA$/);
  });

  it('liste les étapes du devis guidé sur ordinateur', () => {
    render(<GuidedForm content={immobilierContent.quote.form} resultActions={null} />);
    const steps = screen.getByRole('list', { name: 'Étapes' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(
      immobilierContent.quote.form.steps.length + 1,
    );
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
  });
});

describe('logique du formulaire guidé', () => {
  it('lit les entiers saisis avec ou sans séparateur de milliers', () => {
    expect(parseAmount('1500')).toBe(1500);
    expect(parseAmount('1 500')).toBe(1500);
    expect(parseAmount('1 500')).toBe(1500);
    expect(parseAmount('1.5')).toBeNull();
    expect(parseAmount('-3')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('valide une réponse à choix et une quantité bornée', () => {
    const [prestation, , taille] = simulator.steps;
    expect(validateStep(prestation!, undefined)).not.toBeNull();
    expect(validateStep(prestation!, { kind: 'choice', value: 'vidange' })).toBeNull();
    expect(validateStep(prestation!, { kind: 'choice', value: 'inconnue' })).not.toBeNull();
    expect(validateStep(taille!, { kind: 'quantity', mode: 'surface', amount: '0' })).not.toBeNull();
    expect(validateStep(taille!, { kind: 'quantity', mode: 'surface', amount: '80' })).toBeNull();
    expect(validateStep(taille!, { kind: 'quantity', mode: 'unknown', amount: '' })).toBeNull();
  });

  it('compose le message WhatsApp : introduction puis une ligne par étape', () => {
    const message = summaryMessage('Bonjour', simulator.steps, {
      prestation: { kind: 'choice', value: 'vidange' },
    });
    expect(message.split('\n')).toEqual([
      'Bonjour',
      '- Prestation : Vidange',
      '- Locaux : Sans réponse',
      '- Taille : Sans réponse',
      '- Fréquence : Sans réponse',
    ]);
  });
});
