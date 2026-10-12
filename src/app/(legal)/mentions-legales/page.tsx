import { Container } from '@/components/ui/container';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata = pageMetadata({ title: 'Mentions légales', path: '/mentions-legales' });

export default function Page() {
  const t = getDictionary();
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold">Mentions légales</h1>
      <p className="text-ink-muted mt-4">{t.legal.pending}</p>
    </Container>
  );
}
