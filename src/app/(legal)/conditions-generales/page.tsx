import { Container } from '@/components/ui/container';
import { getDictionary } from '@/i18n';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata = pageMetadata({ title: 'Conditions générales', path: '/conditions-generales' });

export default function Page() {
  const t = getDictionary();
  return (
    <Container className="py-14">
      <h1 className="font-display text-h1 text-ink font-semibold">Conditions générales</h1>
      <p className="text-ink-muted mt-4">{t.legal.pending}</p>
    </Container>
  );
}
