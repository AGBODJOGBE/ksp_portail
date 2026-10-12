import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Container } from '@/components/ui/container';
import { getDictionary } from '@/i18n';

export function SiteFooter() {
  const t = getDictionary();
  return (
    <footer className="border-line bg-surface-muted mt-16 border-t">
      <Container className="text-ink-muted grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="text-ink font-semibold">{siteConfig.name}</p>
          <p className="mt-2">{siteConfig.tagline}</p>
        </div>
        <nav aria-label={t.common.ecosystem}>
          <p className="text-ink font-semibold">{t.common.ecosystem}</p>
          <ul className="mt-2 space-y-1">
            {siteConfig.ecosystem.map((site) => (
              <li key={site.id}>
                <a href={site.href} className="hover:text-ink">
                  {site.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.common.legal}>
          <p className="text-ink font-semibold">{t.common.legal}</p>
          <ul className="mt-2 space-y-1">
            {siteConfig.legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="border-line text-ink-muted border-t py-4 text-xs">
        © {new Date().getFullYear()} Groupe KSP
      </Container>
    </footer>
  );
}
