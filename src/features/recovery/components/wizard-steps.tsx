'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { ChoicePill, Fieldset, SelectField, SummaryRow, TextAreaField } from '@/components/ui/form-fields';
import { IconClose, IconFileCheck } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatPhone } from '@/lib/phone';
import { formatXof } from '@/lib/format';
import { FilePicker, type FilePickerTexts } from '@/features/file';
import {
  type CaseDraft,
  type ClaimDraft,
  type DebtorDraft,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPES,
  MAX_CLAIMS,
  MAX_COMPLETION_NOTE,
  MAX_CONTACTS,
  MAX_DEBTORS,
  MAX_DESCRIPTION,
  MAX_EVIDENCE,
  MAX_PROMISES,
  type StepName,
  declaredAmount,
  emptyClaim,
  emptyDebtor,
  readDebtorPhone,
} from '@/features/recovery/draft';
import {
  CHANNELS,
  DEBTOR_KINDS,
  NATURES,
  channelLabel,
  natureLabel,
  roleLabel,
} from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';
import { EstimatePanel, useEstimate } from './estimate';
import { ScaleFields } from './scale-fields';

type Update = (patch: Partial<CaseDraft>) => void;

const CARD = 'rounded-card border-line bg-surface grid gap-5 border p-4 shadow-xs sm:p-5';
const LINK =
  'text-brand-ink inline-flex min-h-11 items-center gap-1.5 justify-self-start font-semibold underline underline-offset-4';

const PIECE_TEXTS: FilePickerTexts = {
  add: t.addEvidence,
  uploading: t.uploading,
  remove: t.removePiece,
  refused: t.pieceRefused,
  wrongType: t.pieceType,
  tooLarge: t.pieceSize,
};

/** Bouton discret qui retire une ligne (débiteur, créance, contact). */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-focus grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2"
    >
      <IconClose className="size-4" />
    </button>
  );
}

/* ——— 1. Type ——— */

/**
 * Type choisi : le barème, qui en dépend, est relu dans les préférences ; un premier débiteur encore vide
 * prend la forme attendue (société pour une entreprise, personne pour un particulier).
 */
function chooseKind(draft: CaseDraft, kind: 'b2b' | 'b2c'): Partial<CaseDraft> {
  const [first, ...others] = draft.debtors;
  const pristine =
    !!first &&
    !others.length &&
    JSON.stringify({ ...first, kind: 'company' }) === JSON.stringify(emptyDebtor());
  return {
    kind,
    scale: draft.kind === kind ? draft.scale : null,
    ...(pristine ? { debtors: [{ ...first, kind: kind === 'b2c' ? 'person' : 'company' }] } : {}),
  };
}

export function TypeStep({
  draft,
  onChange,
  errors,
}: {
  draft: CaseDraft;
  onChange: Update;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-8">
      <Fieldset id="dossier-type" legend={t.kindLegend} error={errors['kind']} legendClassName="text-lg">
        <div className="grid gap-3 sm:grid-cols-3">
          {(['b2b', 'b2c'] as const).map((kind) => (
            <ChoicePill
              key={kind}
              name="dossier-type"
              label={t.kinds[kind].label}
              hint={t.kinds[kind].hint}
              checked={draft.kind === kind}
              onChange={() => onChange(chooseKind(draft, kind))}
            />
          ))}
          <ChoicePill
            name="dossier-type"
            disabled
            label={
              <span className="flex flex-wrap items-center gap-2">
                {t.kinds.rent.label}
                <Badge tone="accent">{t.soon}</Badge>
              </span>
            }
            hint={t.kinds.rent.hint}
          />
        </div>
      </Fieldset>
      <SelectField
        id="dossier-nature"
        label={t.natureLabel}
        value={draft.nature}
        onChange={(event) => onChange({ nature: event.target.value })}
        error={errors['nature']}
        className="max-w-md"
      >
        <option value="">{t.naturePlaceholder}</option>
        {NATURES.map((nature) => (
          <option key={nature} value={nature}>
            {natureLabel(nature)}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

/* ——— 2. Débiteurs ——— */

function ContactList({
  idPrefix,
  values,
  errorPrefix,
  errors,
  label,
  addLabel,
  type,
  hint,
  onChange,
}: {
  idPrefix: string;
  values: string[];
  errorPrefix: string;
  errors: Record<string, string>;
  label: (index: number) => string;
  addLabel: string;
  type: 'tel' | 'email';
  hint?: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-3">
      {values.map((value, index) => {
        const phone = type === 'tel' ? readDebtorPhone(value) : null;
        return (
          <div key={index} className="flex items-end gap-2">
            <TextField
              id={`${idPrefix}-${index}`}
              className="min-w-0 flex-1"
              label={label(index)}
              hint={
                phone?.shown && phone.phone
                  ? t.phoneUsed(formatPhone(phone.phone))
                  : index === 0
                    ? hint
                    : undefined
              }
              type={type}
              inputMode={type === 'tel' ? 'tel' : 'email'}
              autoComplete="off"
              value={value}
              onChange={(event) =>
                onChange(values.map((item, i) => (i === index ? event.target.value : item)))
              }
              error={errors[`${errorPrefix}.${index}`]}
            />
            {values.length > 1 ? (
              <RemoveButton
                label={t.removeContact(label(index))}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              />
            ) : null}
          </div>
        );
      })}
      {values.length < MAX_CONTACTS ? (
        <button type="button" className={LINK} onClick={() => onChange([...values, ''])}>
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function DebtorCard({
  debtor,
  index,
  count,
  errors,
  onChange,
  onRemove,
}: {
  debtor: DebtorDraft;
  index: number;
  count: number;
  errors: Record<string, string>;
  onChange: (debtor: DebtorDraft) => void;
  onRemove: () => void;
}) {
  const at = `debtors.${index}`;
  const id = `debiteur-${index}`;
  const set = (patch: Partial<DebtorDraft>) => onChange({ ...debtor, ...patch });
  const text = (name: keyof DebtorDraft, label: string, autoComplete = 'off') => (
    <TextField
      id={`${id}-${name}`}
      label={label}
      autoComplete={autoComplete}
      value={String(debtor[name])}
      onChange={(event) => set({ [name]: event.target.value })}
      error={errors[`${at}.${name}`]}
    />
  );
  return (
    <li className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-ink text-lg font-semibold">{t.debtorTitle(index)}</h3>
        {count > 1 ? <RemoveButton label={t.removeDebtor(index)} onClick={onRemove} /> : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Fieldset id={`${id}-nature`} legend={t.debtorKindLegend}>
          <div className="flex flex-wrap gap-2">
            {(['company', 'person'] as const).map((kind) => (
              <ChoicePill
                key={kind}
                name={`${id}-nature`}
                label={DEBTOR_KINDS[kind]}
                checked={debtor.kind === kind}
                onChange={() => set({ kind })}
              />
            ))}
          </div>
        </Fieldset>
        <SelectField
          id={`${id}-role`}
          label={t.roleLabel}
          hint={t.roleHint}
          value={debtor.role}
          onChange={(event) => set({ role: event.target.value as DebtorDraft['role'] })}
          error={errors[`${at}.role`]}
        >
          {(['main', 'co_debtor', 'guarantor'] as const).map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </SelectField>
      </div>
      {debtor.kind === 'person' ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {text('lastName', t.lastName, 'family-name')}
          {text('firstNames', t.firstNames, 'given-name')}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">{text('legalName', t.legalName, 'organization')}</div>
          {text('ifu', t.ifu)}
          {text('rccm', t.rccm)}
          <div className="sm:col-span-2">{text('representativeName', t.representativeName)}</div>
        </div>
      )}
      <p className="text-small text-ink-muted">{t.contactHint}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <ContactList
          idPrefix={`${id}-telephone`}
          values={debtor.phones}
          errorPrefix={`${at}.phones`}
          errors={errors}
          label={t.phone}
          addLabel={t.addPhone}
          type="tel"
          hint={t.phoneHint}
          onChange={(phones) => set({ phones })}
        />
        <ContactList
          idPrefix={`${id}-email`}
          values={debtor.emails}
          errorPrefix={`${at}.emails`}
          errors={errors}
          label={t.email}
          addLabel={t.addEmail}
          type="email"
          onChange={(emails) => set({ emails })}
        />
      </div>
      {text('address', t.address, 'street-address')}
    </li>
  );
}

export function DebtorsStep({
  draft,
  onChange,
  errors,
}: {
  draft: CaseDraft;
  onChange: Update;
  errors: Record<string, string>;
}) {
  const debtors = draft.debtors;
  const update = (index: number, debtor: DebtorDraft) =>
    onChange({ debtors: debtors.map((item, i) => (i === index ? debtor : item)) });
  return (
    <div className="grid gap-5">
      {errors['debtors'] ? <FormMessage>{errors['debtors']}</FormMessage> : null}
      <ol className="grid gap-4">
        {debtors.map((debtor, index) => (
          <DebtorCard
            key={index}
            debtor={debtor}
            index={index}
            count={debtors.length}
            errors={errors}
            onChange={(value) => update(index, value)}
            onRemove={() => onChange({ debtors: debtors.filter((_, i) => i !== index) })}
          />
        ))}
      </ol>
      {debtors.length < MAX_DEBTORS ? (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => onChange({ debtors: [...debtors, emptyDebtor('co_debtor')] })}
        >
          {t.addDebtor}
        </Button>
      ) : null}
    </div>
  );
}

/* ——— 3. Créances ——— */

function ClaimCard({
  claim,
  index,
  count,
  today,
  errors,
  onChange,
  onRemove,
}: {
  claim: ClaimDraft;
  index: number;
  count: number;
  today: string;
  errors: Record<string, string>;
  onChange: (claim: ClaimDraft) => void;
  onRemove: () => void;
}) {
  const at = `claims.${index}`;
  const id = `creance-${index}`;
  return (
    <li className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-ink text-lg font-semibold">{t.claimTitle(index)}</h3>
        {count > 1 ? <RemoveButton label={t.removeClaim(index)} onClick={onRemove} /> : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${id}-reference`}
          className="sm:col-span-2"
          label={t.reference}
          hint={t.referenceHint}
          maxLength={60}
          value={claim.reference}
          onChange={(event) => onChange({ ...claim, reference: event.target.value })}
          error={errors[`${at}.reference`]}
        />
        <TextField
          id={`${id}-montant`}
          label={t.amount}
          inputMode="numeric"
          value={claim.amount}
          onChange={(event) => onChange({ ...claim, amount: event.target.value })}
          error={errors[`${at}.amount`]}
        />
        <TextField
          id={`${id}-echeance`}
          label={t.dueDate}
          hint={t.dueDateHint}
          type="date"
          max={today}
          value={claim.dueDate}
          onChange={(event) => onChange({ ...claim, dueDate: event.target.value })}
          error={errors[`${at}.dueDate`]}
        />
      </div>
      <TextField
        id={`${id}-precision`}
        label={t.description}
        maxLength={MAX_DESCRIPTION}
        value={claim.description}
        onChange={(event) => onChange({ ...claim, description: event.target.value })}
        error={errors[`${at}.description`]}
      />
    </li>
  );
}

export function ClaimsStep({
  draft,
  onChange,
  errors,
  today,
}: {
  draft: CaseDraft;
  onChange: Update;
  errors: Record<string, string>;
  today: string;
}) {
  const declared = declaredAmount(draft);
  const estimate = useEstimate(draft.kind, declared);
  const claims = draft.claims;
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="grid content-start gap-5 lg:col-span-7">
        <ol className="grid gap-4">
          {claims.map((claim, index) => (
            <ClaimCard
              key={index}
              claim={claim}
              index={index}
              count={claims.length}
              today={today}
              errors={errors}
              onChange={(value) =>
                onChange({ claims: claims.map((item, i) => (i === index ? value : item)) })
              }
              onRemove={() => onChange({ claims: claims.filter((_, i) => i !== index) })}
            />
          ))}
        </ol>
        {claims.length < MAX_CLAIMS ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => onChange({ claims: [...claims, emptyClaim()] })}
          >
            {t.addClaim}
          </Button>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="dossier-interets"
            label={t.interests}
            inputMode="numeric"
            value={draft.interests}
            onChange={(event) => onChange({ interests: event.target.value })}
            error={errors['interests']}
          />
          <TextField
            id="dossier-deja-paye"
            label={t.alreadyPaid}
            inputMode="numeric"
            value={draft.alreadyPaid}
            onChange={(event) => onChange({ alreadyPaid: event.target.value })}
            error={errors['alreadyPaid']}
          />
        </div>
      </div>
      <div className="lg:col-span-5">
        <EstimatePanel state={estimate} declared={declared} className="lg:sticky lg:top-24" />
      </div>
    </div>
  );
}

/* ——— 4. Pièces ——— */

export function EvidenceStep({
  draft,
  onChange,
  errors,
}: {
  draft: CaseDraft;
  onChange: Update;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-3">
      <FilePicker
        purpose="recovery_evidence"
        accept={EVIDENCE_TYPES}
        maxBytes={EVIDENCE_MAX_BYTES}
        files={draft.evidence}
        locked={draft.lockedEvidence}
        max={MAX_EVIDENCE}
        onChange={(evidence) => onChange({ evidence })}
        legend={t.evidenceLegend}
        hint={t.evidenceHint}
        icon={<IconFileCheck />}
        texts={PIECE_TEXTS}
        error={errors['evidenceFileIds']}
      />
      {draft.lockedEvidence.length ? <p className="text-small text-ink-muted">{t.lockedHint}</p> : null}
    </div>
  );
}

/* ——— 5. Démarches et échéancier ——— */

export function EffortStep({
  draft,
  onChange,
  errors,
  today,
  scaleState,
}: {
  draft: CaseDraft;
  onChange: Update;
  errors: Record<string, string>;
  today: string;
  /** Lecture des préférences (barème prérempli). */
  scaleState: 'loading' | 'ready' | 'error';
}) {
  const effort = draft.effort;
  const set = (patch: Partial<CaseDraft['effort']>) => onChange({ effort: { ...effort, ...patch } });
  return (
    <div className="grid gap-10">
      <section aria-labelledby="demarches-titre" className="grid gap-5">
        <h3 id="demarches-titre" className="font-display text-ink text-lg font-semibold">
          {t.effortTitle}
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="demarches-relances"
            label={t.remindersCount}
            inputMode="numeric"
            value={effort.remindersCount}
            onChange={(event) => set({ remindersCount: event.target.value })}
            error={errors['priorEffort.remindersCount']}
          />
          <TextField
            id="demarches-derniere"
            label={t.lastReminderDate}
            type="date"
            max={today}
            value={effort.lastReminderDate}
            onChange={(event) => set({ lastReminderDate: event.target.value })}
            error={errors['priorEffort.lastReminderDate']}
          />
        </div>
        <Fieldset id="demarches-canaux" legend={t.channelsLegend} error={errors['priorEffort.channels']}>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <ChoicePill
                key={channel}
                type="checkbox"
                label={channelLabel(channel)}
                checked={effort.channels.includes(channel)}
                onChange={(event) =>
                  set({
                    channels: event.target.checked
                      ? [...effort.channels, channel]
                      : effort.channels.filter((item) => item !== channel),
                  })
                }
              />
            ))}
          </div>
        </Fieldset>
        <ChoicePill
          type="checkbox"
          className="justify-self-start"
          label={t.debtAcknowledged}
          checked={effort.debtAcknowledged}
          onChange={(event) => set({ debtAcknowledged: event.target.checked })}
        />
        {effort.debtAcknowledged ? (
          <FilePicker
            purpose="recovery_evidence"
            accept={EVIDENCE_TYPES}
            maxBytes={EVIDENCE_MAX_BYTES}
            files={effort.acknowledgment}
            max={1}
            onChange={(acknowledgment) => set({ acknowledgment })}
            legend={t.acknowledgmentLegend}
            hint={t.acknowledgmentHint}
            icon={<IconFileCheck />}
            texts={{ ...PIECE_TEXTS, add: t.addAcknowledgment }}
            error={errors['priorEffort.acknowledgmentFileId']}
          />
        ) : null}
        <TextAreaField
          id="demarches-promesses"
          label={t.promisesReceived}
          hint={t.promisesHint}
          rows={3}
          maxLength={MAX_PROMISES}
          value={effort.promisesReceived}
          onChange={(event) => set({ promisesReceived: event.target.value })}
          counter={t.counter(effort.promisesReceived.length, MAX_PROMISES)}
          error={errors['priorEffort.promisesReceived']}
        />
        <ChoicePill
          type="checkbox"
          className="justify-self-start"
          label={t.preserveRelationship}
          checked={effort.preserveRelationship}
          onChange={(event) => set({ preserveRelationship: event.target.checked })}
        />
      </section>
      <section aria-labelledby="bareme-titre" className="border-line grid gap-5 border-t pt-8">
        <div className="grid gap-1">
          <h3 id="bareme-titre" className="font-display text-ink text-lg font-semibold">
            {t.scaleTitle}
          </h3>
          <p className="text-small text-ink-muted">{t.scaleLead}</p>
        </div>
        {draft.scale ? (
          <ScaleFields
            idPrefix="bareme"
            prefix="planScale"
            value={draft.scale}
            onChange={(scale) => onChange({ scale })}
            errors={errors}
          />
        ) : scaleState === 'loading' ? (
          <div role="status" className="grid gap-3">
            <span className="sr-only">{t.loading}</span>
            <Skeleton className="h-11 w-2/3" />
            <Skeleton className="h-11 w-1/2" />
          </div>
        ) : (
          <FormMessage tone="info">{t.scaleUnavailable}</FormMessage>
        )}
      </section>
    </div>
  );
}

/* ——— 6. Récapitulatif ——— */

function ReviewBlock({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepName;
  onEdit: (step: StepName) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-line grid gap-2 border-b pb-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-ink font-semibold">{title}</h3>
        <button type="button" className={LINK} onClick={() => onEdit(step)}>
          {t.edit}
          <span className="sr-only">{` : ${title}`}</span>
        </button>
      </div>
      <div className="text-small text-ink-muted grid gap-1">{children}</div>
    </div>
  );
}

export function ReviewStep({
  draft,
  onEdit,
  completion,
}: {
  draft: CaseDraft;
  onEdit: (step: StepName) => void;
  /** Réponse au complément demandé (dossier `info_requested`). */
  completion?: { value: string; onChange: (value: string) => void; error?: string | null };
}) {
  const declared = declaredAmount(draft);
  const estimate = useEstimate(draft.kind, declared);
  const pieces = draft.evidence.length + draft.lockedEvidence.length;
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="grid content-start gap-4 lg:col-span-7">
        <ReviewBlock title={t.reviewKind} step="type" onEdit={onEdit}>
          <p className="text-ink">
            {draft.kind ? t.kinds[draft.kind].label : '—'} · {natureLabel(draft.nature)}
          </p>
        </ReviewBlock>
        <ReviewBlock title={t.reviewDebtors} step="debtors" onEdit={onEdit}>
          <ul className="grid gap-1">
            {draft.debtors.map((debtor, index) => (
              <li key={index} className="text-ink">
                {`${
                  debtor.kind === 'person'
                    ? [debtor.firstNames, debtor.lastName].filter(Boolean).join(' ')
                    : debtor.legalName
                } · ${roleLabel(debtor.role)}`}
              </li>
            ))}
          </ul>
        </ReviewBlock>
        <ReviewBlock title={t.reviewClaims} step="claims" onEdit={onEdit}>
          <p className="text-ink">{t.claims(draft.claims.length)}</p>
          {declared !== null ? (
            <dl>
              <SummaryRow label={t.reviewDeclared} strong>
                {formatXof(declared)}
              </SummaryRow>
            </dl>
          ) : null}
        </ReviewBlock>
        <ReviewBlock title={t.reviewEvidence} step="evidence" onEdit={onEdit}>
          <p className="text-ink">{t.pieces(pieces)}</p>
        </ReviewBlock>
        <ReviewBlock title={t.reviewEffort} step="effort" onEdit={onEdit}>
          <p className="text-ink">
            {`${draft.effort.remindersCount || '0'} · ${t.reviewScale.toLowerCase()} : ${
              draft.scale
                ? draft.scale.acceptsPaymentPlan
                  ? t.scaleSummary(draft.scale.maxDurationMonths)
                  : t.scaleRefused
                : t.scaleDefault
            }`}
          </p>
        </ReviewBlock>
        {completion ? (
          <TextAreaField
            id="dossier-complement"
            label={t.completionNote}
            hint={t.completionHint}
            rows={4}
            maxLength={MAX_COMPLETION_NOTE}
            value={completion.value}
            onChange={(event) => completion.onChange(event.target.value)}
            counter={t.counter(completion.value.length, MAX_COMPLETION_NOTE)}
            error={completion.error}
          />
        ) : null}
      </div>
      <div className={cn('lg:col-span-5')}>
        <EstimatePanel state={estimate} declared={declared} className="lg:sticky lg:top-24" />
      </div>
    </div>
  );
}
