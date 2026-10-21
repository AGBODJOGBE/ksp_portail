'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { getDictionary } from '@/i18n';
import { session } from '@/lib/api';
import { updateProfile } from '@/features/identity/api';
import { describeError, type LoginField } from '@/features/identity/errors';

type NameField = Extract<LoginField, 'firstName' | 'lastName'>;

/**
 * « Compléter mon profil » : prénom et nom, demandés après la première connexion (`profileIncomplete`)
 * et avant d'entrer dans l'espace. Le nom est obligatoire avant tout paiement (contrat).
 */
export function ProfileForm({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const t = getDictionary();
  const current = session.get();
  const [firstName, setFirstName] = useState(current?.user.firstName ?? '');
  const [lastName, setLastName] = useState(current?.user.lastName ?? '');
  const [fieldError, setFieldError] = useState<{ field: NameField; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) firstNameRef.current?.focus();
  }, [autoFocus]);

  function showFieldError(field: NameField, message: string) {
    setFieldError({ field, message });
    (field === 'firstName' ? firstNameRef : lastNameRef).current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setFieldError(null);
    const values = { firstName: firstName.trim(), lastName: lastName.trim() };
    if (!values.firstName) return showFieldError('firstName', t.profile.firstNameRequired);
    if (!values.lastName) return showFieldError('lastName', t.profile.lastNameRequired);

    setPending(true);
    try {
      const profile = await updateProfile(values);
      session.updateProfile(profile);
      onDone?.();
    } catch (caught) {
      const view = describeError(caught);
      if (view.field === 'firstName' || view.field === 'lastName') showFieldError(view.field, view.message);
      else setError(view.message);
    } finally {
      setPending(false);
    }
  }

  const errorOf = (field: NameField) => (fieldError?.field === field ? fieldError.message : null);

  return (
    <section aria-labelledby="profil-titre">
      <Heading as="h1" size="h2" id="profil-titre">
        {t.profile.title}
      </Heading>
      <p className="text-ink-muted mt-3">{t.profile.intro}</p>
      <form noValidate onSubmit={submit} className="mt-8 grid gap-5">
        <TextField
          id="profil-prenom"
          inputRef={firstNameRef}
          label={t.profile.firstName}
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={100}
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          error={errorOf('firstName')}
        />
        <TextField
          id="profil-nom"
          inputRef={lastNameRef}
          label={t.profile.lastName}
          autoComplete="family-name"
          autoCapitalize="words"
          maxLength={100}
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          error={errorOf('lastName')}
        />
        <FormMessage>{error}</FormMessage>
        <Button type="submit" size="lg" className="w-full sm:w-auto" aria-busy={pending || undefined}>
          {pending ? t.profile.saving : t.profile.submit}
        </Button>
      </form>
    </section>
  );
}
