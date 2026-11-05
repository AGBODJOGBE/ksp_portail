'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { IconArrowRight } from '@/components/ui/icons';
import { getPlaceCatalog } from '@/features/cleaning/api';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { PlaceCatalog, RequestGroup } from '@/features/cleaning/schemas';
import { requestStatuses, statusOf } from '@/features/cleaning/texts';

const t = journeyTexts.group;

/** Catalogue par lieu pour nommer un lieu et ses prestations ; une panne n'empêche rien (codes affichés). */
export function usePlaceCatalog(initial: PlaceCatalog | null = null): PlaceCatalog | null {
  const [catalog, setCatalog] = useState<PlaceCatalog | null>(initial);
  useEffect(() => {
    if (initial) return;
    let active = true;
    getPlaceCatalog()
      .then((value) => active && setCatalog(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initial]);
  return catalog;
}

const serviceLabel = (catalog: PlaceCatalog | null, code: string) =>
  catalog?.services.find((service) => service.code === code)?.name ?? code;

export const placeLabel = (catalog: PlaceCatalog | null, code: string) =>
  catalog?.placeTypes.find((place) => place.code === code)?.label ?? code;

/** Demandes d'un groupe (une par prestation), avec leur état et le lien vers chacune. */
export function GroupRequests({ group, catalog }: { group: RequestGroup; catalog: PlaceCatalog | null }) {
  return (
    <ul className="divide-line border-line divide-y border-y">
      {group.items.map((request) => {
        const status = statusOf(requestStatuses, request.status);
        return (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <div className="grid min-w-0 gap-1">
              <p className="text-ink font-semibold">{serviceLabel(catalog, request.serviceCode)}</p>
              <Badge tone={status.tone} dot className="justify-self-start">
                {status.label}
              </Badge>
            </div>
            <Link
              href={cleaningPaths.request(request.id)}
              className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.seeRequest}
              <span className="sr-only"> : {serviceLabel(catalog, request.serviceCode)}</span>
              <IconArrowRight className="size-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
