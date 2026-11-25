'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage, TextField, fieldIds, inputClasses } from '@/components/ui/field';
import { isBackendPending, session, useSession } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { useResource } from '@/lib/use-resource';
import { switchContext } from '@/features/identity/api';
import {
  type OrgRole,
  changeMemberRole,
  inviteMember,
  listMembers,
  removeMember,
} from '@/features/identity/members-api';
import { type MemberField, describeMemberError } from '@/features/identity/account-errors';
import type { Invitation, MemberView } from '@/features/identity/member-schemas';
import { ORG_ROLES, memberTexts as t } from '@/features/identity/member-texts';
import { DEFAULT_COUNTRY_CODE, readPhoneInput } from '@/features/identity/phone';
import type { Organization } from '@/features/identity/schemas';
import { Section } from './space-parts';

const ID = 'entreprise-membres';
const roleLabel = (role: string) => t.roles[role] ?? role;
const displayName = (member: Pick<MemberView, 'firstName' | 'lastName'>) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') || t.unnamed;

/** Liste déroulante des rôles d'organisation (`OrgRole`), avec son libellé et son erreur. */
function RoleSelect({
  id,
  label,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: OrgRole;
  onChange: (role: OrgRole) => void;
  error?: string | null;
  hint?: string;
}) {
  const ids = fieldIds(id);
  return (
    <div>
      <label htmlFor={id} className="text-ink block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as OrgRole)}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(' ') || undefined
        }
        className={inputClasses({ invalid: !!error, className: 'mt-2 pr-10' })}
      >
        {ORG_ROLES.map((role) => (
          <option key={role} value={role}>
            {roleLabel(role)}
          </option>
        ))}
      </select>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

/** Panneau de confirmation d'une action sensible : son titre reçoit le focus. */
function Confirm({
  title,
  text,
  confirm,
  busyLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirm: string;
  busyLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLParagraphElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="rounded-control border-line bg-surface-muted grid gap-3 border p-4">
      <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
        {title}
      </p>
      <p className="text-small text-ink-muted">{text}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
          {busy ? busyLabel : confirm}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </Button>
      </div>
      <FormMessage>{error}</FormMessage>
    </div>
  );
}

type RowMode = 'idle' | 'role' | 'remove';

/** Un membre ; l'administrateur change son rôle ou le retire (jamais lui-même ici). */
function MemberRow({
  organizationId,
  member,
  isSelf,
  manage,
  onChanged,
  onRemoved,
}: {
  organizationId: string;
  member: MemberView;
  isSelf: boolean;
  manage: boolean;
  onChanged: (member: MemberView, notice: string) => void;
  onRemoved: (member: MemberView, notice: string) => void;
}) {
  const [mode, setMode] = useState<RowMode>('idle');
  const [role, setRole] = useState<OrgRole>(member.role as OrgRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = displayName(member);
  const roleId = `membre-role-${member.userId}`;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode('idle');
    } catch (caught) {
      setError(describeMemberError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 gap-1">
          <p className="text-ink font-semibold break-words">
            {name}
            {isSelf ? <span className="text-ink-muted font-normal"> ({t.you})</span> : null}
          </p>
          <p className="text-small text-ink-muted tabular-nums">
            {[member.phoneMasked, t.joinedOn(formatShortDate(member.joinedAt))].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Badge tone={member.role === 'org_admin' ? 'brand' : 'neutral'}>{roleLabel(member.role)}</Badge>
      </div>

      {manage && !isSelf && mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setMode('role')}
            aria-label={`${t.changeRole} : ${name}`}
          >
            {t.changeRole}
          </Button>
          <Button variant="ghost" onClick={() => setMode('remove')} aria-label={t.removeOf(name)}>
            {t.remove}
          </Button>
        </div>
      ) : null}

      {mode === 'role' ? (
        <div className="rounded-control border-line bg-surface-muted grid gap-3 border p-4">
          <RoleSelect
            id={roleId}
            label={t.roleOf(name)}
            value={role}
            onChange={setRole}
            hint={t.roleHints[role]}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="action"
              disabled={busy || role === member.role}
              aria-busy={busy || undefined}
              onClick={() =>
                void run(async () => {
                  const updated = await changeMemberRole(organizationId, member.userId, role);
                  onChanged(updated, t.roleSaved(name, roleLabel(updated.role)));
                })
              }
            >
              {busy ? t.savingRole : t.saveRole}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setRole(member.role as OrgRole);
                setError(null);
                setMode('idle');
              }}
            >
              {t.cancel}
            </Button>
          </div>
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}

      {mode === 'remove' ? (
        <Confirm
          title={t.confirmRemoveTitle(name)}
          text={t.confirmRemoveText}
          confirm={t.confirmRemove}
          busyLabel={t.removing}
          busy={busy}
          error={error}
          onCancel={() => {
            setError(null);
            setMode('idle');
          }}
          onConfirm={() =>
            void run(async () => {
              await removeMember(organizationId, member.userId);
              onRemoved(member, t.removed(name));
            })
          }
        />
      ) : null}
    </li>
  );
}

const PHONE_ID = 'invitation-numero';
const ROLE_ID = 'invitation-role';

/** Invitation d'un numéro avec un rôle (administrateur d'une entreprise validée). */
function InviteForm({
  organizationId,
  onInvited,
}: {
  organizationId: string;
  onInvited: (invitation: Invitation, notice: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrgRole>('org_member');
  const [errors, setErrors] = useState<Partial<Record<MemberField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const read = readPhoneInput(DEFAULT_COUNTRY_CODE, phone);
  const shown = read.phone ? formatPhone(read.phone) : null;

  function show(found: Partial<Record<MemberField, string>>) {
    setErrors(found);
    const first = (['phone', 'role'] as const).find((field) => found[field]);
    if (first)
      form.current?.querySelector<HTMLElement>(`#${first === 'phone' ? PHONE_ID : ROLE_ID}`)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!phone.trim()) return show({ phone: t.phoneRequired });
    if (!read.phone) return show({ phone: t.phoneInvalid });
    show({});
    setBusy(true);
    try {
      const invitation = await inviteMember(organizationId, { phone: read.phone, role });
      onInvited(invitation, t.invited(formatPhone(read.phone)));
      setPhone('');
    } catch (caught) {
      const view = describeMemberError(caught);
      if (view.field) show({ [view.field]: view.message });
      else setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={form} onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-1">
        <TextField
          id={PHONE_ID}
          label={t.phone}
          hint={t.phoneHint}
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setErrors((previous) => ({ ...previous, phone: undefined }));
          }}
          className="max-w-sm"
          inputClassName="tabular-nums"
        />
        <p aria-live="polite" className="text-small text-ink-muted empty:hidden">
          {shown && shown !== phone.trim() ? t.phoneUsed(shown) : null}
        </p>
      </div>
      <div className="max-w-sm">
        <RoleSelect
          id={ROLE_ID}
          label={t.role}
          value={role}
          onChange={(value) => {
            setRole(value);
            setErrors((previous) => ({ ...previous, role: undefined }));
          }}
          error={errors.role}
          hint={t.roleHints[role]}
        />
      </div>
      <FormMessage>{error}</FormMessage>
      <Button type="submit" className="justify-self-start" disabled={busy} aria-busy={busy || undefined}>
        {busy ? t.inviting : t.invite}
      </Button>
    </form>
  );
}

/**
 * Section « Membres » de la fiche d'un compte entreprise (R-CP-03). Tout membre voit la liste ;
 * l'administrateur voit les invitations en attente, invite, change un rôle et retire un membre ; les autres
 * peuvent quitter l'entreprise (quitter l'entreprise active ramène au compte personnel). Routes pas encore
 * servies : « Bientôt disponible ».
 */
export function OrganizationMembers({
  organization,
  myRole,
  onLeft,
}: {
  organization: Organization;
  /** Mon rôle dans l'organisation (fiche lue par la page). */
  myRole: string;
  /** Départ enregistré ; `personal` : le contexte actif est revenu au compte personnel. */
  onLeft: (personal: boolean) => void;
}) {
  const id = organization.id;
  const { state, reload, set } = useResource(useCallback(() => listMembers(id), [id]));
  const current = useSession();
  const me = current?.user.id ?? null;
  const isAdmin = myRole === 'org_admin';
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<'idle' | 'confirm'>('idle');
  const [busy, setBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  if (state.status === 'loading') {
    return (
      <Section id={`${ID}-titre`} title={t.title} lead={t.lead}>
        <p role="status" className="text-ink-muted">
          {t.loading}
        </p>
      </Section>
    );
  }
  if (state.status === 'error') {
    if (isBackendPending(state.error)) {
      return (
        <BackendPending
          id={ID}
          title={t.title}
          needs={[
            {
              method: 'GET',
              path: '/api/v1/identity/organizations/{id}/members',
              purpose: 'Lire les membres et, pour un administrateur, les invitations en attente.',
            },
            {
              method: 'POST',
              path: '/api/v1/identity/organizations/{id}/invitations',
              purpose: 'Inviter un numéro avec un rôle (administrateur).',
            },
            {
              method: 'PATCH',
              path: '/api/v1/identity/organizations/{id}/members/{userId}',
              purpose: 'Changer le rôle d’un membre (administrateur).',
            },
            {
              method: 'POST',
              path: '/api/v1/identity/organizations/{id}/members/{userId}/remove',
              purpose: 'Retirer un membre, ou quitter l’entreprise.',
            },
          ]}
        >
          {t.pendingMembers}
        </BackendPending>
      );
    }
    const view = describeMemberError(state.error);
    return (
      <Section id={`${ID}-titre`} title={t.title} lead={t.lead}>
        <div className="grid justify-items-start gap-3">
          <FormMessage>{view.message}</FormMessage>
          {view.notFound ? null : (
            <Button variant="secondary" onClick={reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </Section>
    );
  }

  const list = state.data;

  async function leave() {
    if (busy || !me) return;
    setBusy(true);
    setLeaveError(null);
    try {
      await removeMember(id, me);
      // Quitter l'entreprise active : retour au compte personnel (nouveau jeton d'accès).
      let personal = false;
      if (session.get()?.activeContext.organizationId === id) {
        try {
          session.switchContext(await switchContext(null));
          personal = true;
        } catch {
          // Le contexte reviendra au compte personnel au prochain renouvellement de la session.
        }
      }
      onLeft(personal);
    } catch (caught) {
      setLeaveError(describeMemberError(caught).message);
      setBusy(false);
    }
  }

  return (
    <Section id={`${ID}-titre`} title={t.title} lead={t.lead}>
      <FormMessage tone="success">{notice}</FormMessage>
      <ul className="divide-line border-line grid divide-y border-y">
        {list.data.map((member) => (
          <MemberRow
            key={member.userId}
            organizationId={id}
            member={member}
            isSelf={member.userId === me}
            manage={isAdmin}
            onChanged={(updated, text) => {
              set({
                ...list,
                data: list.data.map((item) => (item.userId === updated.userId ? updated : item)),
              });
              setNotice(text);
            }}
            onRemoved={(removed, text) => {
              set({ ...list, data: list.data.filter((item) => item.userId !== removed.userId) });
              setNotice(text);
            }}
          />
        ))}
      </ul>

      {isAdmin ? (
        <>
          <div className="grid gap-2">
            <h3 className="text-ink font-semibold">{t.pendingTitle}</h3>
            {list.pendingInvitations.length ? (
              <ul className="grid gap-2">
                {list.pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="rounded-control border-line flex flex-wrap items-center justify-between gap-2 border p-3"
                  >
                    <span className="grid gap-0.5">
                      <span className="text-ink font-medium tabular-nums">{invitation.phoneMasked}</span>
                      <span className="text-small text-ink-muted">
                        {t.invitedOn(
                          formatShortDate(invitation.invitedAt),
                          formatShortDate(invitation.expiresAt),
                        )}
                      </span>
                    </span>
                    <Badge tone="neutral">{roleLabel(invitation.role)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-muted">{t.pendingNone}</p>
            )}
          </div>
          <div className="grid gap-3">
            <h3 className="text-ink font-semibold">{t.inviteTitle}</h3>
            {organization.status === 'active' ? (
              <>
                <p className="text-small text-ink-muted">{t.inviteLead}</p>
                <InviteForm
                  organizationId={id}
                  onInvited={(invitation, text) => {
                    set({ ...list, pendingInvitations: [invitation, ...list.pendingInvitations] });
                    setNotice(text);
                  }}
                />
              </>
            ) : (
              <FormMessage tone="info">{t.inactive}</FormMessage>
            )}
          </div>
        </>
      ) : me ? (
        <div className="grid justify-items-start gap-3">
          {leaving === 'confirm' ? (
            <Confirm
              title={t.confirmLeaveTitle}
              text={t.confirmLeaveText}
              confirm={t.confirmLeave}
              busyLabel={t.leaving}
              busy={busy}
              error={leaveError}
              onConfirm={() => void leave()}
              onCancel={() => {
                setLeaveError(null);
                setLeaving('idle');
              }}
            />
          ) : (
            <>
              <p className="text-small text-ink-muted">{t.leaveLead}</p>
              <Button variant="secondary" onClick={() => setLeaving('confirm')}>
                {t.leave}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </Section>
  );
}
