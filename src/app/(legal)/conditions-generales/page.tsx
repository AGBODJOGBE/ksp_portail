import { LegalPage } from '@/components/sections/legal-page';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata = pageMetadata({ title: 'Conditions générales', path: '/conditions-generales' });

export default function Page() {
  return <LegalPage title="Conditions générales" />;
}
