import { LegalPage } from '@/components/sections/legal-page';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata = pageMetadata({ title: 'Politique de confidentialité', path: '/confidentialite' });

export default function Page() {
  return <LegalPage title="Politique de confidentialité" />;
}
