import { mission, QUOTE, quoteRequest } from './fake-gateway.test-utils';
import { groupStage, LIFECYCLE, missionStage, requestStage, STEP } from './lifecycle';
import { paymentDue, paymentExpected } from './payment-due';
import type { Mission } from './schemas';

const visit = (status: string) => ({
  id: 'v',
  status,
  scheduledAt: '2099-01-01T08:00:00Z',
  agentId: 'a',
  report: null,
  completedAt: null,
});

describe('frise d’une prestation', () => {
  it('place une demande sur la visite, le devis, puis la planification', () => {
    expect(requestStage(quoteRequest())).toEqual({ current: STEP.visit, stopped: false });
    expect(requestStage(quoteRequest({ status: 'visit_scheduled', visit: visit('completed') }))).toEqual({
      current: STEP.quote,
      stopped: false,
    });
    expect(requestStage(quoteRequest({ status: 'quote_sent', quote: QUOTE })).current).toBe(STEP.quote);
    expect(requestStage(quoteRequest({ status: 'accepted', quote: QUOTE })).current).toBe(STEP.planned);
    expect(requestStage(quoteRequest({ status: 'cancelled' }))).toEqual({
      current: STEP.visit,
      stopped: true,
    });
  });

  it('suit une mission jusqu’au règlement', () => {
    const base = mission() as Mission;
    expect(missionStage({ ...base, status: 'to_schedule' }).current).toBe(STEP.planned);
    expect(missionStage({ ...base, status: 'in_progress' }).current).toBe(STEP.running);
    expect(missionStage({ ...base, status: 'completed' }).current).toBe(STEP.settled);
    const paid = { ...base, status: 'completed', payment: { ...base.payment, status: 'paid' } };
    expect(missionStage(paid).current).toBe(LIFECYCLE.length);
    expect(missionStage({ ...base, status: 'cancelled' }).stopped).toBe(true);
  });

  it('fait avancer un groupe au rythme de sa demande ouverte la moins avancée', () => {
    expect(
      groupStage([
        quoteRequest({ status: 'quote_sent', quote: QUOTE }),
        quoteRequest({ status: 'received' }),
        quoteRequest({ status: 'cancelled' }),
      ]),
    ).toEqual({ current: STEP.visit, stopped: false });
    expect(groupStage([quoteRequest({ status: 'cancelled' })]).stopped).toBe(true);
  });
});

describe('paiement attendu d’une mission', () => {
  const base = mission() as Mission;
  const plan = (timing: string) => ({ option: 'deposit', timing, method: 'mobile_money_online' });

  it('l’acompte d’abord, montant lu sur la mission', () => {
    const due = {
      ...base,
      payment: {
        ...base.payment,
        status: 'due',
        plan: plan('before'),
        paid: { amount: 0, currency: 'XOF' as const },
      },
    };
    expect(paymentDue(due)).toEqual({
      part: 'deposit',
      amount: base.payment.depositAmount,
      nothingPaid: true,
    });
    expect(paymentExpected(due)).toBe(true);
  });

  it('un paiement « après » n’est réclamé qu’une fois la prestation faite ; rien pour une entreprise', () => {
    const after = { ...base, payment: { ...base.payment, plan: plan('after') } };
    expect(paymentExpected(after)).toBe(false);
    expect(paymentExpected({ ...after, status: 'completed' })).toBe(true);
    expect(paymentDue({ ...base, customerKind: 'business' })).toBeNull();
  });
});
