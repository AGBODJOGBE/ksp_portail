'use client';

import { useState } from 'react';
import { ActionCardIcon } from '@/components/ui/action-card';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconBriefcase } from '@/components/ui/icons';
import { TodoItem, TodoPanel } from '@/components/ui/todo-panel';
import { isBackendPending, useSession } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { listMyInvitations, respondToInvitation } from '@/features/identity/members-api';
import { describeMemberError } from '@/features/identity/account-errors';
import type { Invitation } from '@/features/identity/member-schemas';
import { memberTexts as t } from '@/features/identity/member-texts';
import { identityPaths } from '@/features/identity/paths';
import type { Membership } from '@/features/identity/schemas';
import { useSwitchContext } from './use-switch-context';

/** Ancre du bloc « Invitations reçues » de « Mon entreprise » (lien de la rubrique « À faire »). */
export const INVITATIONS_ANCHOR = 'invitations-recues';

const roleLabel = (role: string) => t.roles[role] ?? role;

/** Invitation acceptée : proposer de passer tout de suite dans le contexte de l'entreprise. */
function Joined({ membership }: { membership: Membership }) {
  const { organization } = membership;
  const context = useSwitchContext();
  const inUse = useSession()?.activeContext.organizationId === organization.id;
  return (
    <div className="grid justify-items-start gap-3">
      <FormMessage tone="success">{t.accepted(organization.legalName)}</FormMessage>
      {organization.status === 'active' && !inUse ? (
        <>
          <Button
            variant="action"
            onClick={() => void context.switchTo(organization.id)}
            disabled={context.busy}
            aria-busy={context.busy || undefined}
          >
            {t.switchNow(organization.legalName)}
          </Button>
          <FormMessage>{context.error}</FormMessage>
        </>
      ) : null}
    </div>
  );
}

function InvitationCard({
  invitation,
  onResponded,
}: {
  invitation: Invitation;
  onResponded: (invitation: Invitation, membership: Membership | null) => void;
}) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = invitation.organizationName;

  async function respond(accept: boolean) {
    if (busy) return;
    setBusy(accept ? 'accept' : 'decline');
    setError(null);
    try {
      const result = await respondToInvitation(invitation.id, accept);
      onResponded(invitation, result.membership);
    } catch (caught) {
      setError(describeMemberError(caught).message);
      setBusy(null);
    }
  }

  return (
    <li className="rounded-card border-line bg-surface grid gap-3 border p-4 shadow-xs sm:p-5">
      <div className="grid gap-1">
        <p className="text-ink font-semibold break-words">{name}</p>
        <p className="text-small text-ink-muted">{t.invitedAs(roleLabel(invitation.role))}</p>
        <p className="text-small text-ink-muted">{t.expiresOn(formatShortDate(invitation.expiresAt))}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="action"
          onClick={() => void respond(true)}
          disabled={busy !== null}
          aria-busy={busy === 'accept' || undefined}
          aria-label={t.acceptOf(name)}
        >
          {busy === 'accept' ? t.responding : t.accept}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void respond(false)}
          disabled={busy !== null}
          aria-busy={busy === 'decline' || undefined}
          aria-label={t.declineOf(name)}
        >
          {busy === 'decline' ? t.responding : t.decline}
        </Button>
      </div>
      <FormMessage>{error}</FormMessage>
    </li>
  );
}

/**
 * « Invitations reçues » de « Mon entreprise » (R-CP-03) : accepter ou refuser ; après une acceptation,
 * l'entreprise rejoint la liste (`onAccepted`) et le passage dans son contexte est proposé. Rien quand il
 * n'y a pas d'invitation ; route pas encore servie : « Bientôt disponible ».
 */
export function ReceivedInvitations({ onAccepted }: { onAccepted: (membership: Membership) => void }) {
  const { state, reload, set } = useResource(listMyInvitations);
  const [joined, setJoined] = useState<Membership | null>(null);
  const [declined, setDeclined] = useState<string | null>(null);

  if (state.status === 'loading') return null;
  if (state.status === 'error') {
    if (isBackendPending(state.error)) {
      return (
        <BackendPending
          id={INVITATIONS_ANCHOR}
          title={t.receivedTitle}
          needs={[
            {
              method: 'GET',
              path: '/api/v1/identity/me/organization-invitations',
              purpose: 'Lire les invitations en attente adressées au compte connecté.',
            },
            {
              method: 'POST',
              path: '/api/v1/identity/organization-invitations/{id}/respond',
              purpose: 'Accepter ou refuser une invitation.',
            },
          ]}
        >
          {t.pendingReceived}
        </BackendPending>
      );
    }
    return (
      <section aria-labelledby={`${INVITATIONS_ANCHOR}-titre`} className="grid justify-items-start gap-3">
        <Heading as="h2" size="h3" id={`${INVITATIONS_ANCHOR}-titre`}>
          {t.receivedTitle}
        </Heading>
        <FormMessage>{describeMemberError(state.error).message}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </section>
    );
  }

  const invitations = state.data;
  if (!invitations.length && !joined && !declined) return null;
  return (
    <section
      id={INVITATIONS_ANCHOR}
      aria-labelledby={`${INVITATIONS_ANCHOR}-titre`}
      className="grid scroll-mt-[calc(var(--header-h)+1rem)] gap-4"
    >
      <div className="grid gap-1">
        <Heading as="h2" size="h3" id={`${INVITATIONS_ANCHOR}-titre`}>
          {t.receivedTitle}
        </Heading>
        {invitations.length ? <p className="text-ink-muted">{t.receivedLead}</p> : null}
      </div>
      {joined ? <Joined membership={joined} /> : null}
      <FormMessage tone="info">{declined}</FormMessage>
      {invitations.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              onResponded={(answered, membership) => {
                set(invitations.filter((item) => item.id !== answered.id));
                if (membership) {
                  setDeclined(null);
                  setJoined(membership);
                  onAccepted(membership);
                } else {
                  setDeclined(t.declined(answered.organizationName));
                }
              }}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Invitations en attente dans la rubrique « À faire » de Mon espace : une carte par invitation, qui mène
 * à « Mon entreprise ». Masquée quand il n'y en a pas, pendant la lecture, en cas d'erreur, et tant que la
 * route n'est pas servie (comme le panneau du Nettoyage).
 */
export function InvitationsTodo() {
  const { state } = useResource(listMyInvitations);
  if (state.status !== 'ready' || !state.data.length) return null;
  const href = `${identityPaths.organizations}#${INVITATIONS_ANCHOR}`;
  return (
    <TodoPanel
      id="todo-invitations"
      title={t.todoTitle}
      icon={<IconBriefcase className="size-5" />}
      link={{ href, label: t.receivedTitle }}
      count={state.data.length}
    >
      <ul className="grid gap-3">
        {state.data.map((invitation) => (
          <TodoItem
            key={invitation.id}
            media={
              <ActionCardIcon>
                <IconBriefcase />
              </ActionCardIcon>
            }
            title={t.todoItem(invitation.organizationName)}
            text={t.todoText(roleLabel(invitation.role), formatShortDate(invitation.expiresAt))}
            action={{ href, label: t.todoAction }}
          />
        ))}
      </ul>
    </TodoPanel>
  );
}
