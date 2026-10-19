'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { Realisation } from '@/content/home';
import { getDictionary } from '@/i18n';
import { cn } from '@/lib/cn';

const ALL = '';

/**
 * Galerie de réalisations filtrable par catégorie. Les filtres sont déduits des réalisations fournies :
 * aucune catégorie n'est inventée, et sans catégorie la galerie s'affiche sans filtre.
 */
export function RealisationsGallery({ items }: { items: ReadonlyArray<Realisation> }) {
  const t = getDictionary();
  const statusId = useId();
  const [active, setActive] = useState(ALL);
  const categories = [...new Set(items.map((item) => item.category).filter((c): c is string => !!c))];
  const visible = active === ALL ? items : items.filter((item) => item.category === active);

  return (
    <div>
      {categories.length > 1 ? (
        <div role="group" aria-label={t.realisations.filterLabel} className="flex flex-wrap gap-2">
          {[ALL, ...categories].map((category) => (
            <button
              key={category || 'all'}
              type="button"
              aria-pressed={active === category}
              aria-controls={statusId}
              onClick={() => setActive(category)}
              className={cn(
                'hover-veil inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium',
                active === category
                  ? 'border-brand bg-brand text-on-brand before:hidden'
                  : 'border-line-strong text-ink',
              )}
            >
              {category || t.realisations.all}
            </button>
          ))}
        </div>
      ) : null}
      <p id={statusId} role="status" className="sr-only">
        {t.realisations.count(visible.length)}
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <Card as="li" key={item.id} interactive className="overflow-hidden p-0">
            <Image
              src={item.image.src}
              alt={item.image.alt}
              width={item.image.width}
              height={item.image.height}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-6">
              {item.category ? <Badge tone="accent">{item.category}</Badge> : null}
              <h3 className="font-display text-h3 text-ink mt-3 font-semibold">
                <Link href={item.href} className="stretched-link focus-visible:outline-none">
                  {item.title}
                </Link>
              </h3>
              {item.place ? <p className="text-small text-ink-muted mt-1">{item.place}</p> : null}
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}
