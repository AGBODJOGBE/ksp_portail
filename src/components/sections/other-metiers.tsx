import { MetierIcon } from '@/components/sections/metier-icon';
import { LinkCard } from '@/components/ui/link-card';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { metiers, type MetierId } from '@/config/metiers';
import { getDictionary } from '@/i18n';

/**
 * Renvoi vers les cinq autres métiers, dans l'ordre de mise en avant (`metiers.ts`) : cartes-liens de la
 * direction « Signature » (tuile bleu nuit, fil qui se déploie au survol).
 */
export function OtherMetiers({ current }: { current: MetierId }) {
  const t = getDictionary();
  const others = metiers.filter((metier) => metier.id !== current);
  return (
    <Section id="autres-metiers" labelledBy="autres-metiers-titre" tone="muted" spacing="small">
      <SectionHeader
        id="autres-metiers-titre"
        eyebrow={t.metier.otherMetiersEyebrow}
        title={t.metier.otherMetiersTitle}
      />
      <ul className="reveal-stagger mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-5">
        {others.map((metier) => (
          <LinkCard
            key={metier.id}
            href={metier.href}
            title={metier.label}
            text={metier.summary}
            icon={<MetierIcon id={metier.id} className="size-5" />}
          />
        ))}
      </ul>
    </Section>
  );
}
