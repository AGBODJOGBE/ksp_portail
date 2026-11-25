import { IconUser } from '@/components/ui/icons';
import { requestTexts as t } from '@/features/cleaning/request-texts';
import type { AssignedAgent } from '@/features/cleaning/schemas';

/**
 * Agents d'une visite ou d'une séance : photo (lien temporaire du stockage, lu directement), nom, chef
 * d'équipe, affectation à confirmer.
 */
export function AgentList({
  agents,
  title = t.agents,
}: {
  agents: ReadonlyArray<AssignedAgent>;
  title?: string;
}) {
  if (!agents.length) return null;
  return (
    <div>
      {title ? <p className="text-small text-ink-muted font-semibold">{title}</p> : null}
      <ul className="mt-2 flex flex-wrap gap-3">
        {agents.map((agent) => (
          <li
            key={agent.agentId}
            className="rounded-card border-line bg-surface flex items-center gap-3 border p-2 pr-4"
          >
            {agent.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- lien temporaire du stockage, hors du domaine du site
              <img
                src={agent.photoUrl}
                alt=""
                width={44}
                height={44}
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="bg-brand-soft text-brand-ink grid size-11 place-items-center rounded-full"
              >
                <IconUser className="size-5" />
              </span>
            )}
            <span className="grid">
              <span className="text-ink font-semibold">{`${agent.firstName} ${agent.lastName}`}</span>
              <span className="text-small text-ink-muted">
                {[agent.isLead ? t.lead : null, agent.confirmation !== 'confirmed' ? t.pendingAgent : null]
                  .filter(Boolean)
                  .join(' · ') || ' '}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
