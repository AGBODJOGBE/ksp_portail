'use client';

import { useEffect, useState } from 'react';
import { listServices } from './api';
import { formatNumber } from '@/lib/format';
import type { ServiceOffer } from './schemas';
import { units } from './texts';

/**
 * Catalogue des prestations pour nommer une prestation et son unité dans les écrans de suivi. Une panne
 * du catalogue n'empêche rien : le code de la prestation s'affiche à la place de son nom.
 */
export function useServices(): ReadonlyArray<ServiceOffer> {
  const [services, setServices] = useState<ReadonlyArray<ServiceOffer>>([]);
  useEffect(() => {
    let active = true;
    listServices()
      .then((list) => {
        if (active) setServices(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return services;
}

export function serviceName(services: ReadonlyArray<ServiceOffer>, code: string): string {
  return services.find((service) => service.code === code)?.name ?? code;
}

/** « 6 pièces », « 120 m² » ; le nombre seul si l'unité est inconnue. */
export function quantityLabel(services: ReadonlyArray<ServiceOffer>, code: string, quantity: number): string {
  const unit = units[services.find((service) => service.code === code)?.unit ?? ''];
  return unit ? `${formatNumber(quantity)} ${unit.unit}` : formatNumber(quantity);
}

/** Libellés des options choisies, dans l'ordre du catalogue ; le code pour une option inconnue. */
export function optionLabels(
  services: ReadonlyArray<ServiceOffer>,
  code: string,
  options: ReadonlyArray<string>,
): string[] {
  const known = services.find((service) => service.code === code)?.options ?? [];
  return options.map((option) => known.find((item) => item.code === option)?.label ?? option);
}
