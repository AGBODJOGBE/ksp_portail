import { ApiError } from './errors';
import { isBackendPending } from './pending';

describe('route pas encore servie par le backend', () => {
  it.each([
    [404, 'GATEWAY_ROUTE_NOT_FOUND'],
    [501, 'BILLING_NOT_IMPLEMENTED'],
    [501, 'HTTP_501'],
    [500, 'IDENTITY_NOT_IMPLEMENTED'],
  ])('en attente : %i %s', (status, code) => {
    expect(isBackendPending(new ApiError(status, code, 'message'))).toBe(true);
  });

  it.each([
    [404, 'BILLING_INVOICE_NOT_FOUND'],
    [404, 'HTTP_404'],
    [403, 'AUTH_FORBIDDEN'],
    [500, 'GATEWAY_INTERNAL_ERROR'],
    [0, 'NETWORK_ERROR'],
  ])('vraie erreur : %i %s', (status, code) => {
    expect(isBackendPending(new ApiError(status, code, 'message'))).toBe(false);
  });

  it('ignore ce qui n’est pas une erreur de la gateway', () => {
    expect(isBackendPending(new Error('GATEWAY_ROUTE_NOT_FOUND'))).toBe(false);
    expect(isBackendPending(null)).toBe(false);
  });
});
