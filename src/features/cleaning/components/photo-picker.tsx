'use client';

import { useCallback, useState } from 'react';
import { FormMessage } from '@/components/ui/field';
import { IconClose, IconImage } from '@/components/ui/icons';
import { PHOTO_TYPES, uploadFile } from '@/features/file';
import { describeCleaningError } from '@/features/cleaning/errors';
import { wizardTexts as t } from '@/features/cleaning/request-texts';

export interface PickedPhoto {
  /** Identifiant du fichier déposé (service file), transmis ensuite au Nettoyage. */
  id: string;
  name: string;
}

/**
 * Photos jointes (demande de devis, réclamation) : chaque photo est déposée aussitôt par le service file
 * (`cleaning_intervention_photo` : déclaration, envoi direct au stockage, confirmation) ; seul son
 * identifiant part ensuite avec le formulaire. Formats et plafond du contrat ; un refus est affiché par
 * photo, les autres sont gardées.
 */
export function PhotoPicker({
  photos,
  max,
  onChange,
  legend,
  hint,
  error,
  disabled,
}: {
  photos: ReadonlyArray<PickedPhoto>;
  max: number;
  onChange: (photos: PickedPhoto[]) => void;
  legend: string;
  hint: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const add = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const room = max - photos.length;
      const added: PickedPhoto[] = [];
      const refused: string[] = [];
      for (const file of [...files].slice(0, room)) {
        if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number])) {
          refused.push(t.photoError(file.name, t.photoType));
          continue;
        }
        setUploading(file.name);
        try {
          const stored = await uploadFile(file, 'cleaning_intervention_photo');
          added.push({ id: stored.id, name: file.name });
        } catch (caught) {
          refused.push(t.photoError(file.name, describeCleaningError(caught).message));
        }
      }
      setUploading(null);
      setProblems(refused);
      if (added.length) onChange([...photos, ...added]);
    },
    [max, photos, onChange],
  );

  return (
    <div className="grid gap-3">
      <p className="text-ink text-lg font-semibold">{legend}</p>
      <p className="text-small text-ink-muted">{hint}</p>
      {photos.length ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="bg-surface-muted ring-line inline-flex min-h-11 items-center gap-2 rounded-full pl-4 text-sm ring-1 ring-inset"
            >
              <IconImage className="text-brand-ink size-4" />
              <span className="max-w-48 truncate">{photo.name}</span>
              <button
                type="button"
                aria-label={t.removePhoto(photo.name)}
                disabled={disabled}
                onClick={() => onChange(photos.filter((item) => item.id !== photo.id))}
                className="hover:bg-surface-sunken focus-visible:outline-focus grid size-11 place-items-center rounded-full focus-visible:outline-2"
              >
                <IconClose className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {photos.length < max ? (
        <label className="rounded-control border-line-strong text-ink hover:bg-surface-sunken has-[:focus-visible]:outline-focus inline-flex min-h-11 cursor-pointer items-center gap-2 justify-self-start border border-dashed px-5 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
          <IconImage className="size-5" />
          {t.addPhoto}
          <input
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            className="sr-only"
            disabled={disabled || uploading !== null}
            onChange={(event) => {
              void add(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      ) : null}
      <div aria-live="polite">
        {uploading ? <p className="text-small text-ink-muted">{t.uploading(uploading)}</p> : null}
      </div>
      {problems.length ? <FormMessage>{problems.join(' ')}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
