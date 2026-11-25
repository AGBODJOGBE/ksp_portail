import Link from 'next/link';
import { cn } from '@/lib/cn';

const CHIP =
  'rounded-full border px-4 text-sm font-semibold inline-flex min-h-11 items-center focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2';

/**
 * Filtre d'une liste par état, dans l'adresse (`?statut=<état en français>`) : liens en pastilles, l'état
 * choisi marqué `aria-current`. « Tous » retire le filtre.
 */
export function StatusFilters({
  basePath,
  label,
  allLabel,
  choices,
  current,
}: {
  basePath: string;
  /** Nom accessible de la navigation (« Filtrer par état »). */
  label: string;
  allLabel: string;
  /** États proposés, dans l'ordre : valeur de la gateway, libellé, valeur dans l'adresse. */
  choices: ReadonlyArray<{ status: string; label: string; param: string }>;
  current: string | undefined;
}) {
  const all = [{ status: undefined as string | undefined, label: allLabel, param: '' }, ...choices];
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {all.map(({ status, label: text, param }) => {
          const active = status === current;
          return (
            <li key={text}>
              <Link
                href={status ? `${basePath}?statut=${param}` : basePath}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  CHIP,
                  active
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line-strong bg-surface text-ink hover:border-brand',
                )}
              >
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
