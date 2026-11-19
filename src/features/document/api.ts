'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type CodeDelivery,
  type DownloadUrl,
  type KspDocument,
  type SigningSession,
  codeDeliverySchema,
  documentSchema,
  downloadUrlSchema,
  signingSessionSchema,
} from './schemas';

/*
 * Service document (ADR-044). Le code saisi et le jeton du lien ne sont jamais journalisés ni gardés : ils
 * ne vivent que dans la requête (et, pour le jeton, dans l'adresse de la page).
 */

/** Accord explicite du signataire, toujours envoyé avec le code (`DOCUMENT_CONSENT_REQUIRED` sinon). */
const signBody = (code: string) => ({ code, consent: true });

// Signataire sans compte, par son lien personnel : routes publiques, aucun jeton de session envoyé.
const SIGN = '/api/v1/document/sign';
const linkPath = (token: string) => `${SIGN}/${encodeURIComponent(token)}`;

export async function getSigningSession(token: string): Promise<SigningSession> {
  return parseResponse(signingSessionSchema, await api.get(linkPath(token), { auth: false }));
}

export async function sendSigningCode(token: string): Promise<CodeDelivery> {
  return parseResponse(
    codeDeliverySchema,
    await api.post(`${linkPath(token)}/otp`, undefined, { auth: false }),
  );
}

export async function signWithLink(token: string, code: string): Promise<SigningSession> {
  return parseResponse(
    signingSessionSchema,
    await api.post(`${linkPath(token)}/sign`, signBody(code), { auth: false }),
  );
}

// Titulaire ou signataire connecté (« Mon espace KSP ») : session requise.
const DOCUMENTS = '/api/v1/document/documents';
const SIGNATURES = '/api/v1/document/signatures';

export async function getDocument(id: string): Promise<KspDocument> {
  return parseResponse(documentSchema, await api.get(`${DOCUMENTS}/${encodeURIComponent(id)}`));
}

/** Adresse de lecture de 5 minutes : à demander à chaque ouverture du PDF. */
export async function getDownloadUrl(id: string): Promise<DownloadUrl> {
  return parseResponse(
    downloadUrlSchema,
    await api.get(`${DOCUMENTS}/${encodeURIComponent(id)}/download-url`),
  );
}

export async function sendSignatureCode(signatureId: string): Promise<CodeDelivery> {
  return parseResponse(
    codeDeliverySchema,
    await api.post(`${SIGNATURES}/${encodeURIComponent(signatureId)}/otp`),
  );
}

export async function signDocument(signatureId: string, code: string): Promise<KspDocument> {
  return parseResponse(
    documentSchema,
    await api.post(`${SIGNATURES}/${encodeURIComponent(signatureId)}/sign`, signBody(code)),
  );
}
