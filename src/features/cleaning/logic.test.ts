import { ApiError } from '@/lib/api';
import { describeCleaningError } from './errors';
import { ZONES } from './fake-gateway.test-utils';
import { idempotentSubmission } from './idempotency';
import { missionSchema, suspensionCauses } from './schemas';
import { mission } from './fake-gateway.test-utils';
import { suspendedStatus, suspensionText } from './texts';
import { zoneFor, zonesSentence } from './zones';

const zones = ZONES.data;

describe('zones desservies', () => {
  it('retrouve une zone par son nom ou sa clé', () => {
    expect(zoneFor(zones, 'Porto-Novo')?.code).toBe('porto-novo');
    expect(zoneFor(zones, 'porto-novo')?.commune).toBe('Porto-Novo');
    expect(zoneFor(zones, 'Parakou')).toBeNull();
  });

  it('met les zones en phrase, dans l’ordre de la gateway', () => {
    expect(zonesSentence(zones)).toBe('Abomey-Calavi, Cotonou et Porto-Novo');
    expect(zonesSentence([])).toBeNull();
  });
});

describe('clé d’idempotence', () => {
  it('reprend la même clé pour un même envoi, une clé neuve après un changement ou un succès', () => {
    let count = 0;
    const submission = idempotentSubmission(() => `cle-${++count}-abcdef`);
    const first = submission.keyFor({ a: 1 });
    expect(submission.keyFor({ a: 1 })).toBe(first);
    expect(submission.keyFor({ a: 2 })).not.toBe(first);
    const third = submission.keyFor({ a: 2 });
    submission.done();
    expect(submission.keyFor({ a: 2 })).not.toBe(third);
  });
});

describe('erreurs du Nettoyage', () => {
  const error = (status: number, code: string) => new ApiError(status, code, `Message ${code}.`);

  it('garde le message de la gateway et en tire la conséquence', () => {
    expect(describeCleaningError(error(422, 'CLEANING_QUOTE_EXPIRED'))).toEqual({
      message: 'Message CLEANING_QUOTE_EXPIRED.',
      kind: 'expired',
    });
    expect(describeCleaningError(error(422, 'CLEANING_ZONE_NOT_COVERED')).kind).toBe('zone');
    expect(describeCleaningError(error(422, 'IDENTITY_PROFILE_INCOMPLETE')).kind).toBe('profile');
    expect(describeCleaningError(error(422, 'CLEANING_LEAD_TIME_TOO_SHORT')).kind).toBe('slots');
    expect(describeCleaningError(error(409, 'CLEANING_CONCURRENT_UPDATE')).kind).toBe('stale');
    expect(describeCleaningError(error(404, 'CLEANING_REQUEST_NOT_FOUND')).kind).toBe('notFound');
    expect(describeCleaningError(error(422, 'CLEANING_ORGANIZATION_SUSPENDED')).kind).toBe(
      'organizationSuspended',
    );
    expect(describeCleaningError(new Error('x')).kind).toBe('other');
  });
});

describe('erreurs de la gateway pour les écrans du Nettoyage', () => {
  it('renvoie le champ en cause d’un refus de validation, sans indice de tableau', () => {
    const error = new ApiError(400, 'CLEANING_VALIDATION_FAILED', 'Date attendue.', {
      field: 'preferredSlots[0].start',
    });
    expect(describeCleaningError(error)).toEqual({
      message: 'Date attendue.',
      kind: 'field',
      field: 'preferredSlots',
      path: 'preferredSlots[0].start',
    });
  });

  it('reconnaît « trop de demandes en cours »', () => {
    const error = new ApiError(422, 'CLEANING_TOO_MANY_OPEN_REQUESTS', 'Trop de demandes.', { maximum: 3 });
    expect(describeCleaningError(error).kind).toBe('tooManyOpen');
  });
});

describe('suspension d’une mission (ADR-030)', () => {
  const since = '11 décembre 2026';

  it('exige `causes`, obligatoire au contrat (au moins une cause)', () => {
    const base = { cause: 'unpaid_interventions', since: '2026-12-11T09:00:00Z', unpaidCount: 1 };
    expect(missionSchema.safeParse(mission({ suspension: base })).success).toBe(false);
    expect(missionSchema.safeParse(mission({ suspension: { ...base, causes: [] } })).success).toBe(false);
    // Les textes, eux, se contentent de `cause` quand la liste manque.
    expect(suspensionCauses({ cause: 'unpaid_interventions' })).toEqual(['unpaid_interventions']);
  });

  it('accepte une mission sans `customerKind` ni `organizationId` (facultatifs au contrat)', () => {
    const {
      customerKind: _kind,
      organizationId: _organization,
      ...rest
    } = mission({}) as Record<string, unknown>;
    const parsed = missionSchema.parse(rest);
    expect(parsed.customerKind).toBeUndefined();
    expect(parsed.organizationId).toBeUndefined();
  });

  it('accepte la nouvelle cause et 0 impayé', () => {
    const suspension = {
      cause: 'organization_suspended',
      causes: ['organization_suspended'],
      since: '2026-12-11T09:00:00Z',
      unpaidCount: 0,
    };
    expect(missionSchema.parse(mission({ suspension })).suspension).toEqual(suspension);
  });

  it('écrit chaque cas sans jamais citer « 0 » impayé', () => {
    const organization = { cause: 'organization_suspended', unpaidCount: 0 };
    expect(suspensionText(organization, since)).toContain(
      'Votre compte entreprise est suspendu par KSP : le service reprendra à sa réactivation.',
    );
    expect(suspensionText(organization, since)).not.toMatch(/0|impayé/);
    expect(suspendedStatus(organization).label).toBe('Suspendue (compte entreprise)');

    const invoices = { cause: 'unpaid_invoices', unpaidCount: 2 };
    expect(suspensionText(invoices, since)).toContain('2 factures impayées');
    expect(suspendedStatus(invoices).label).toBe('Suspendue (impayés)');

    const both = {
      cause: 'organization_suspended',
      causes: ['organization_suspended', 'unpaid_invoices'],
      unpaidCount: 0,
    };
    expect(suspensionText(both, since)).toContain('il reste des factures impayées');
    expect(suspensionText(both, since)).not.toMatch(/0/);
    expect(suspendedStatus(both).label).toBe('Suspendue (compte entreprise et impayés)');

    const interventions = {
      cause: 'unpaid_interventions',
      causes: ['unpaid_interventions', 'organization_suspended'],
      unpaidCount: 3,
    };
    expect(suspensionText(interventions, since)).toContain('il reste 3 passages impayés');
    expect(suspensionText(interventions, since)).toContain('la régularisation des passages');

    expect(suspensionText({ cause: 'nouvelle_cause', unpaidCount: 0 }, since)).toBe(
      'Service suspendu depuis le 11 décembre 2026. Les passages à venir sont annulés ; ils seront reprogrammés automatiquement à la reprise du service. Contactez KSP pour en savoir plus.',
    );
    expect(suspendedStatus({ cause: 'nouvelle_cause' }).label).toBe('Suspendue');
  });
});
