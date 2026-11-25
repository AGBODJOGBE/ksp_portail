import { formatShortDate } from '@/lib/format';
import type { Invoice, InvoiceLine } from './schemas';
import { billingTexts as t } from './texts';

/*
 * Lecture d'une facture pour l'écran, v1 (mois d'un contrat) ou v2 (Nettoyage, ADR-055) : rien n'est
 * calculé, les champs vides (renvoyés vides ou à 0 pour une facture v2) sont masqués.
 */

/** Texte renseigné, sinon `null` (absent, `null` ou vide). */
export function filled(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/** Nature de la facture v2 (`kind`), ou `null` pour une facture v1 ; nature inconnue : « Facture ». */
export function invoiceKind(invoice: Pick<Invoice, 'kind'>): string | null {
  const kind = filled(invoice.kind);
  if (!kind) return null;
  return t.kinds[kind] ?? 'Facture';
}

/** Période facturée (v1) : seulement si ses deux bornes sont renseignées. */
export function hasPeriod(invoice: Pick<Invoice, 'periodStart' | 'periodEnd'>): boolean {
  return !!filled(invoice.periodStart) && !!filled(invoice.periodEnd);
}

/** « Mois 2 du contrat » (v1) ; `null` quand le rang n'est pas donné (0 ou absent, facture v2). */
export function invoiceMonth(invoice: Pick<Invoice, 'periodIndex'>): string | null {
  return invoice.periodIndex ? t.month(invoice.periodIndex) : null;
}

/** Date AAAA-MM-JJ (heure du Bénin) → « 12 novembre 2026 » ; illisible : `null`. */
export function serviceDate(value: string | null | undefined): string | null {
  const date = filled(value);
  if (!date || Number.isNaN(new Date(date).getTime())) return null;
  return formatShortDate(date);
}

/**
 * Sous-titre d'une facture v2 : nature, séance, lieu, date de la prestation. Facture v1 : `null` (la
 * période est affichée à sa place).
 */
export function invoiceSummary(invoice: Invoice): string | null {
  const kind = invoiceKind(invoice);
  if (!kind) return null;
  const rank = filled(invoice.sessionRank);
  const date = serviceDate(invoice.serviceDate);
  return [
    kind,
    rank ? t.sessionRank(rank) : null,
    filled(invoice.placeLabel),
    date ? t.serviceOn(date) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Précisions d'une ligne v2 : nature (sauf si le libellé la dit déjà), date de la séance, lieu, programme.
 * Ligne v1 : `null`.
 */
export function lineDetails(line: InvoiceLine): string | null {
  const kind = filled(line.kind);
  const kindLabel = kind ? (t.lineKinds[kind] ?? null) : null;
  const date = serviceDate(line.serviceDate);
  const parts = [
    kindLabel && !line.label.toLowerCase().includes(kindLabel.toLowerCase()) ? kindLabel : null,
    date,
    filled(line.placeLabel),
    filled(line.programNumber),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
