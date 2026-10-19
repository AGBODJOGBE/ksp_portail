import Link from 'next/link';
import { cn } from '@/lib/cn';
import { WeaveMark } from './weave';

/**
 * Logo provisoire : emblème tissé + mot « KSP » dans la police de titres.
 * À remplacer par le logo officiel du groupe dès qu'il est fourni.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="KSP, accueil"
      className={cn(
        'group/logo text-ink inline-flex min-h-11 items-center gap-2.5 rounded-md pr-1',
        'font-display text-[1.375rem] leading-none font-bold tracking-tight',
        className,
      )}
    >
      <WeaveMark className="ease-soft size-8 transition-transform duration-(--motion-slow) group-hover/logo:rotate-90" />
      <span aria-hidden="true">KSP</span>
      <span aria-hidden="true" className="text-eyebrow text-ink-subtle font-sans font-semibold uppercase">
        Groupe
      </span>
    </Link>
  );
}
