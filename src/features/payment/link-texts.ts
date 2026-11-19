import type { BadgeTone } from '@/components/ui/badge';

/** Textes de la page publique d'un lien de paiement (`/payer/[token]`, ADR-040). Sans zod. */

type LinkStatusView = { label: string; tone: BadgeTone; title?: string; text?: string };

export const paymentLinkTexts = {
  metaTitle: 'Paiement sécurisé',
  eyebrow: 'Demande de paiement sécurisée',
  payTo: 'Paiement à l’ordre de',
  amount: 'Montant à payer',
  amountLabel: 'Montant',
  pendingBadge: 'En attente de validation',
  reference: 'Référence',
  dueDate: 'Date d’échéance',
  expiresAt: 'Lien valable jusqu’au',
  paidAt: 'Payé le',
  loading: 'Chargement de la demande de paiement…',
  retry: 'Réessayer',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',

  // Paiement.
  pay: (amount: string) => `Payer ${amount}`,
  payHint:
    'Vous validez le paiement sur votre téléphone (MTN ou Moov), sur la page sécurisée de notre prestataire de paiement. Aucun compte KSP n’est nécessaire.',
  opening: 'Ouverture de la page de paiement…',
  noCheckout: 'La page de paiement n’est pas encore prête. Réessayez dans quelques instants.',
  resume: 'Reprendre le paiement',
  pendingTitle: 'Paiement en attente de validation',
  pendingText:
    'Validez la demande sur votre téléphone, ou reprenez la page de paiement. Cette page se met à jour toute seule.',
  checking: 'Vérification auprès du prestataire…',
  stillPending:
    'Le prestataire n’a pas encore confirmé ce paiement. Si vous l’avez validé sur votre téléphone, il sera confirmé automatiquement : revenez sur cette page dans quelques minutes.',
  checkAgain: 'Vérifier à nouveau',
  lastAttempt: (status: string) => `Le dernier essai n’a pas abouti (${status.toLowerCase()}).`,
  lateSuccess:
    'Si votre compte Mobile Money a quand même été débité, le paiement sera confirmé automatiquement dans les 24 heures : revenez sur cette page avant de payer de nouveau.',
  payAgain: 'Réessayer le paiement',
  rateLimited: (seconds: number) =>
    `Trop de tentatives. Patientez ${seconds} seconde${seconds > 1 ? 's' : ''} avant de réessayer.`,

  // Aide.
  contactSupport: 'Contacter le support KSP',
  citeReference: (reference: string) => `Citez la référence ${reference}.`,
  trustTitle: 'Votre paiement est protégé',
  trust: [
    'Le paiement n’est confirmé que par le prestataire, jamais par cette page.',
    'KSP ne vous demande jamais votre code secret Mobile Money.',
    'Cette page n’enregistre aucune donnée personnelle.',
  ],

  // Lien introuvable.
  notFoundTitle: 'Lien de paiement introuvable',
  notFoundText:
    'Ce lien n’existe pas ou n’est pas complet. Ouvrez de nouveau le lien reçu par SMS ou WhatsApp, sans le modifier.',

  // Mode test (développement seulement).
  testTitle: 'Mode test',
  testLead:
    'Développement seulement : ces boutons remplacent la page du prestataire. Aucun argent ne circule.',
  testSuccess: 'Simuler un paiement réussi',
  testFailure: 'Simuler un échec',
  testSending: 'Envoi…',
} as const;

/** Statut du lien (`PublicPaymentLink.status`) : étiquette, et message quand il n'est plus payable. */
export const paymentLinkStatuses: Record<string, LinkStatusView> = {
  active: { label: 'À payer', tone: 'warning' },
  paid: {
    label: 'Payé',
    tone: 'success',
    title: 'Paiement reçu, merci',
    text: 'Votre paiement est confirmé par le prestataire et enregistré par KSP. Conservez la référence : elle permet de le retrouver.',
  },
  under_review: {
    label: 'En vérification',
    tone: 'warning',
    title: 'Paiement en cours de vérification',
    text: 'Un paiement reçu pour ce lien est vérifié par l’équipe KSP. Ne payez pas une seconde fois : contactez le support si vous avez une question.',
  },
  revoked: {
    label: 'Annulé',
    tone: 'neutral',
    title: 'Cette demande de paiement a été annulée',
    text: 'Elle ne peut plus être réglée ici. Contactez l’expéditeur du message pour savoir comment payer.',
  },
  expired: {
    label: 'Expiré',
    tone: 'neutral',
    title: 'Ce lien n’est plus valable',
    text: 'Sa date limite est passée. Contactez l’expéditeur du message pour recevoir un nouveau lien.',
  },
};

export function paymentLinkStatus(status: string): LinkStatusView {
  return (
    paymentLinkStatuses[status] ?? {
      label: status,
      tone: 'neutral',
      title: 'Ce lien ne peut pas être payé',
      text: 'Contactez le support KSP en citant la référence.',
    }
  );
}
