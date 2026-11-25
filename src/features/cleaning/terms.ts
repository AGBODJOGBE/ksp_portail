/*
 * Conditions générales du Nettoyage, une entrée par version (`quote.termsVersion`). Texte proposé à partir
 * des seules règles du backend (ADR-054 à 056, contrat `ksp-api.v1.yaml` du Nettoyage) : aucune règle ni
 * aucun chiffre ajouté. Là où le backend ne fixe rien, le texte le dit de façon neutre. Les délais
 * réglables par KSP (paiement des frais de visite, validité d'un devis, paiement d'une séance) ne sont
 * pas écrits en chiffres : ils figurent sur la demande, le devis ou la séance. Version provisoire, à faire
 * relire avant toute mise en production.
 */

export interface TermsSection {
  id: string;
  title: string;
  paragraphs?: ReadonlyArray<string>;
  items?: ReadonlyArray<string>;
  /** Paragraphes après la liste. */
  after?: ReadonlyArray<string>;
  links?: ReadonlyArray<{ label: string; href: string }>;
}

export interface TermsDocument {
  version: string;
  title: string;
  /** Version proposée, en cours de validation : bandeau visible en tête. */
  provisional: boolean;
  intro: string;
  sections: ReadonlyArray<TermsSection>;
}

/** Version proposée aujourd'hui par les devis (`quote.termsVersion`). */
export const CURRENT_TERMS_VERSION = 'cg-2026-11';

const cg202611: TermsDocument = {
  version: 'cg-2026-11',
  title: 'Conditions générales du Nettoyage et de l’assainissement',
  provisional: true,
  intro:
    'Ces conditions s’appliquent aux prestations de nettoyage et d’assainissement du Groupe KSP commandées en ligne, sur ksp.bj et dans Mon espace KSP, par un particulier ou par une entreprise. Elles sont acceptées avec le devis, dans la version que ce devis indique.',
  sections: [
    {
      id: 'objet',
      title: '1. Objet',
      paragraphs: [
        'Elles encadrent tout le parcours : la demande de devis, la visite des lieux et ses frais, le devis, le programme de séances, le paiement, le report ou l’annulation d’une séance, l’arrêt et le renouvellement d’un programme, les réclamations et le portefeuille KSP.',
        'Un dossier porte sur un seul lieu : il regroupe tous les types de nettoyage demandés pour ce lieu, donne un devis puis, une fois le devis accepté, un programme de séances.',
      ],
    },
    {
      id: 'demande',
      title: '2. Demande de devis et visite des lieux',
      items: [
        'L’estimation affichée par le simulateur est non contractuelle. Le prix est confirmé par le devis, après la visite des lieux.',
        'La demande porte sur un lieu enregistré dans « Mes lieux ». Sa commune est déterminée par sa position sur la carte ; seul un lieu situé dans une commune desservie peut faire l’objet d’une demande.',
        'Pour un lieu qui n’entre dans aucune catégorie proposée (lieu « Autre »), le client décrit son besoin et le prix est fixé après la visite.',
        'Le nombre de demandes en cours en même temps est limité ; au-delà, une nouvelle demande est refusée.',
        'Le client propose un à trois créneaux de disponibilité ; KSP fixe le rendez-vous de visite parmi eux. Il peut changer ses créneaux jusqu’à 24 heures avant la visite : la visite prévue est alors annulée et un nouveau rendez-vous lui est proposé.',
        'Lors de la visite, l’agent constate les caractéristiques du lieu. Lorsque les informations retenues diffèrent de celles déclarées, le devis indique pour chaque élément la valeur déclarée, la valeur retenue, le motif et l’effet sur le prix d’une séance.',
        'KSP peut refuser une demande. Il le fait avant toute acceptation de devis.',
      ],
    },
    {
      id: 'frais-de-visite',
      title: '3. Frais de visite',
      paragraphs: [
        'La visite des lieux donne lieu à des frais de visite. Leur montant dépend de la catégorie du lieu et, le cas échéant, d’une majoration propre à sa commune. Il est indiqué avant l’envoi de la demande.',
      ],
      items: [
        'Débit : les frais sont débités à l’envoi de la demande, du portefeuille KSP du compte qui la fait (compte personnel ou compte de l’entreprise).',
        'Délai de paiement : si le solde ne suffit pas, la demande attend le paiement jusqu’à la date limite indiquée sur la demande ; passé ce délai, elle est annulée. Le paiement peut se faire par Mobile Money : seul ce qui manque au solde est payé, ce montant crédite le portefeuille, puis les frais sont débités.',
        'Reçu : un reçu est émis à chaque paiement de frais de visite, entreprise comprise.',
        'Remboursement en entier sur le portefeuille : annulation de la demande par le client avant la visite et plus de 24 heures avant celle-ci ; visite annulée par KSP ou absence de l’agent (la visite suivante est alors sans frais) ; demande refusée par KSP sans visite.',
        'Conservation : absence du client à la visite (une nouvelle visite donne lieu à de nouveaux frais) ; annulation de la demande moins de 24 heures avant la visite, ou après celle-ci ; devis refusé ou expiré.',
        'Déduction : les frais de visite déduits figurent sur le devis. Pour un particulier, ils sont imputés sur le paiement de la première séance, puis des suivantes s’ils dépassent le prix d’une séance ; pour une entreprise, ils figurent en déduction sur sa première facture mensuelle.',
      ],
    },
    {
      id: 'devis',
      title: '4. Devis et validité',
      items: [
        'Le devis indique les types de nettoyage et leur détail, le prix d’une séance, le nombre et les dates des séances, le total du programme (prix d’une séance multiplié par le nombre de séances), les frais de visite déduits, l’équipe et la durée prévues, les modalités de paiement, sa date de validité et la version des présentes conditions.',
        'Les montants sont exprimés en francs CFA (XOF), en nombres entiers.',
        'Le devis est valable jusqu’à la date de validité qu’il indique. Passé cette date, il expire ; le client peut demander sa réactivation, que KSP accepte (un nouveau devis est alors établi aux tarifs du jour) ou refuse.',
        'Un devis peut être révisé : la nouvelle version remplace la précédente, qui reste consultable.',
        'Le client accepte le devis dans Mon espace KSP, en acceptant les présentes conditions. Il peut décaler la date de début du programme dans la limite de la validité du devis. La première séance doit laisser à KSP un délai minimal, vérifié à l’envoi de la demande et à l’acceptation.',
        'Le client peut refuser le devis, avec un motif s’il le souhaite : la demande est close et les frais de visite sont conservés.',
        'Pour une entreprise, seul un administrateur du compte de l’entreprise accepte ou refuse un devis ; un membre peut le transmettre aux administrateurs. L’acceptation est refusée tant que les factures impayées de l’entreprise atteignent le seuil de suspension (article 7).',
      ],
    },
    {
      id: 'programme',
      title: '5. Programme et séances',
      items: [
        'À l’acceptation du devis, le programme est créé et toutes ses séances sont planifiées avec leur date et leur prix. Un programme est ponctuel (une ou quelques dates) ou régulier (chaque semaine ou chaque mois), à l’heure du Bénin ; les jours fériés en sont exclus si le client l’a demandé.',
        'Le client voit pour chaque séance les agents affectés (nom et photo), la liste des tâches et les photos prises avant et après la séance.',
        'Un incident peut interrompre une séance (matériel, accès, sécurité, demande hors devis). KSP décide alors de la reprise, du report ou de l’annulation. Une demande hors devis donne lieu à un avenant au devis, jamais à un paiement remis en main propre aux agents.',
      ],
    },
    {
      id: 'paiement',
      title: '6. Paiement après chaque séance (particuliers)',
      items: [
        'À la fin de chaque séance réalisée, son prix devient dû et est débité du portefeuille KSP du client.',
        'Si le solde ne suffit pas, la séance est à payer jusqu’à la date indiquée sur la séance. Passé cette date, elle est en retard : la séance suivante ne commence pas et le programme est suspendu jusqu’au paiement.',
        'Toute recharge du portefeuille relance les débits en attente, la plus ancienne séance d’abord. Le paiement du retard lève la suspension s’il en était la seule cause.',
        'Une facture est émise pour chaque séance payée.',
      ],
    },
    {
      id: 'entreprises',
      title: '7. Entreprises : facture mensuelle',
      items: [
        'Les séances d’une entreprise sont facturées une fois par mois : le 1er du mois, à l’heure du Bénin, une facture est émise pour le mois écoulé, avec les séances réalisées regroupées par programme et par lieu, et la date de chaque séance. Une séance non réalisée n’est pas facturée ; une séance manquée par absence de l’entreprise l’est pour la moitié de son prix (article 8).',
        'La facture est payable dans les 10 jours, depuis le portefeuille de l’entreprise, par Mobile Money ou par virement.',
        'Impayés : un avertissement est adressé dès qu’une facture reste impayée ; à partir de deux factures impayées, les programmes de l’entreprise sont suspendus et l’acceptation de nouveaux devis est refusée.',
        'Une facture émise ne change jamais : une erreur est corrigée par un avoir, crédité au portefeuille de l’entreprise.',
      ],
    },
    {
      id: 'report-annulation',
      title: '8. Report et annulation d’une séance, absence du client',
      items: [
        'Report : plus de 24 heures avant la séance, vers une nouvelle date elle-même à plus de 24 heures, sans chevauchement avec une autre séance du programme ; au plus deux reports par mois civil ; aucun report pendant une suspension du programme.',
        'Annulation : plus de 24 heures avant la séance, rien n’est dû. Moins de 24 heures avant, l’annulation se fait seulement par le support de KSP et la moitié du prix de la séance est due.',
        'Absence du client : après un temps d’attente et un appel, l’agent déclare la séance manquée ; la moitié de son prix est due.',
      ],
    },
    {
      id: 'arret-renouvellement',
      title: '9. Arrêt, suspension et renouvellement',
      items: [
        'Arrêt : le client (pour une entreprise, un administrateur) peut arrêter son programme. Les séances réalisées restent dues ; les séances à venir sont annulées, sauf celle qui a lieu dans moins de 24 heures, maintenue. Aucun remboursement n’est dû, chaque séance étant payée après coup.',
        'Suspension : un programme est suspendu en cas de séance en retard de paiement, de factures impayées d’une entreprise, de décision de KSP ou de suspension du compte de l’entreprise. Les causes se cumulent ; le programme reprend quand toutes sont levées.',
        'Renouvellement : dans ses 14 derniers jours, un programme régulier peut être renouvelé par un devis aux mêmes conditions (aux tarifs du jour s’ils ont changé), sans nouvelle visite si la dernière date de moins de 12 mois ; sinon, une nouvelle demande avec visite est créée. KSP peut aussi proposer le renouvellement.',
        'Nouvelle commande : après un programme ponctuel terminé, le client peut commander à nouveau pour le même lieu ; le devis est établi sans visite si les informations retenues datent de moins de 12 mois.',
      ],
    },
    {
      id: 'reclamations',
      title: '10. Réclamations et avis',
      items: [
        'Le client peut faire une réclamation dans les 48 heures qui suivent une séance réalisée, depuis Mon espace KSP : travail incomplet, dommage, comportement, objet manquant ou autre motif, avec des photos s’il le souhaite.',
        'Une réclamation ouverte ne suspend pas le paiement de la séance.',
        'La réclamation se suit par messages avec l’équipe de KSP. Elle se conclut par une nouvelle séance gratuite, un crédit sur le portefeuille (un avoir pour une entreprise) ou un rejet motivé.',
        'Chaque séance réalisée peut recevoir une note de une à cinq étoiles et un commentaire, une seule fois.',
      ],
    },
    {
      id: 'portefeuille',
      title: '11. Portefeuille KSP',
      items: [
        'Tout paiement passe par le portefeuille KSP du compte (personnel ou entreprise), rechargeable par Mobile Money. Le virement d’une entreprise et les espèces versées au guichet sont des crédits enregistrés par le service financier de KSP et validés par une deuxième personne.',
        'Un même objet (frais de visite, séance) n’est jamais débité deux fois. Un crédit arrivé alors que l’objet est déjà payé reste sur le portefeuille.',
        'Les remboursements, avoirs et gestes commerciaux sont crédités au portefeuille. Le client peut demander le retrait de son solde vers Mobile Money ; la demande est traitée par le service financier de KSP et validée par une deuxième personne.',
      ],
    },
    {
      id: 'donnees',
      title: '12. Données personnelles',
      paragraphs: [
        'La position, le repère et l’adresse des lieux servent à organiser les visites et les séances. Ils sont protégés, ne figurent jamais dans les messages échangés entre les services de KSP, et sont effacés avec le compte. Les photos prises pendant les visites et les séances servent au suivi de la prestation.',
        'Pour tout le reste (données collectées, durée de conservation, droits du client), la politique de confidentialité du Groupe KSP s’applique.',
      ],
      links: [{ label: 'Politique de confidentialité', href: '/confidentialite' }],
    },
    {
      id: 'contact',
      title: '13. Contact',
      paragraphs: [
        'Pour toute question sur une demande, un devis, une séance ou ces conditions, le client contacte KSP depuis la page Contact (WhatsApp, téléphone ou e-mail). Une réclamation sur une séance se fait depuis Mon espace KSP.',
      ],
      links: [{ label: 'Nous contacter', href: '/contact?sujet=nettoyage' }],
    },
  ],
};

export const cleaningTerms: Readonly<Record<string, TermsDocument>> = {
  [cg202611.version]: cg202611,
};

export function getCleaningTerms(version: string): TermsDocument | null {
  return cleaningTerms[version] ?? null;
}

export const termsTexts = {
  eyebrow: 'Nettoyage et assainissement',
  version: (version: string) => `Version ${version}`,
  provisionalTitle: 'Version provisoire, en cours de validation',
  provisionalText:
    'Ce texte est une proposition établie à partir des règles du service. Il peut encore changer avant sa validation.',
  back: 'Le Nettoyage',
  summary: 'Sommaire',
} as const;
