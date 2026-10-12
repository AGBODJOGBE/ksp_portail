import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Container } from '@/components/ui/container';

export function SiteHeader() {
  return (
    <header className="border-line bg-surface/95 sticky top-0 z-40 border-b backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-brand-700 text-lg font-bold tracking-tight">
          {siteConfig.name}
        </Link>
        <nav aria-label="Sites KSP" className="flex items-center gap-1 text-sm">
          {siteConfig.ecosystem
            .filter((site) => site.id !== siteConfig.id)
            .map((site) => (
              <a
                key={site.id}
                href={site.href}
                className="text-ink-muted hover:bg-surface-muted hover:text-ink rounded-md px-3 py-2"
              >
                {site.label}
              </a>
            ))}
        </nav>
      </Container>
    </header>
  );
}
