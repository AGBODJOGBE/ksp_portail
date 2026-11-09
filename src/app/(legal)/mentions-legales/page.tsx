import { LegalPage } from '@/components/sections/legal-page';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata = pageMetadata({ title: 'Mentions légales', path: '/mentions-legales' });

export default function Page() {
  return <LegalPage title="Mentions légales" />;
}
