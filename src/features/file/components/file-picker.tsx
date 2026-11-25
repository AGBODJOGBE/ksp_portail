'use client';

import { type ReactNode, useCallback, useState } from 'react';
import { FormMessage } from '@/components/ui/field';
import { IconClose } from '@/components/ui/icons';
import { ApiError } from '@/lib/api';
import { type FilePurpose, uploadFile } from '@/features/file/api';

export interface PickedFile {
  /** Identifiant du fichier déposé (service file), transmis ensuite au service métier. */
  id: string;
  name: string;
}

export interface FilePickerTexts {
  /** Bouton d'ajout (« Ajouter des photos »). */
  add: string;
  /** « Envoi de facture.pdf… ». */
  uploading: (name: string) => string;
  /** Nom accessible du bouton qui retire un fichier. */
  remove: (name: string) => string;
  /** Refus d'un fichier, avec la raison. */
  refused: (name: string, reason: string) => string;
  /** Type de fichier non accepté. */
  wrongType: string;
  /** Fichier trop lourd. */
  tooLarge: string;
}

const GENERIC = 'Une erreur est survenue. Réessayez dans quelques instants.';

/**
 * Fichiers joints à un formulaire (photos du Nettoyage, pièces du Recouvrement) : chaque fichier est déposé
 * aussitôt par le service file (déclaration, envoi direct au stockage, confirmation, ADR-038) ; seul son
 * identifiant part ensuite avec le formulaire. Types et poids du contrat de la finalité vérifiés avant
 * l'envoi ; un refus est affiché par fichier, les autres sont gardés. `locked` : fichiers déjà rattachés,
 * montrés sans bouton pour les retirer.
 */
export function FilePicker({
  purpose,
  accept,
  maxBytes,
  files,
  locked = [],
  max,
  onChange,
  legend,
  hint,
  icon,
  texts: t,
  error,
  disabled,
}: {
  purpose: FilePurpose;
  /** Types MIME acceptés. */
  accept: ReadonlyArray<string>;
  /** Poids maximal d'un fichier, en octets. */
  maxBytes?: number;
  files: ReadonlyArray<PickedFile>;
  locked?: ReadonlyArray<PickedFile>;
  /** Nombre total de fichiers (déjà rattachés compris). */
  max: number;
  onChange: (files: PickedFile[]) => void;
  legend: ReactNode;
  hint: ReactNode;
  icon: ReactNode;
  texts: FilePickerTexts;
  error?: string | null;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const count = locked.length + files.length;

  const add = useCallback(
    async (picked: FileList | null) => {
      if (!picked?.length) return;
      const room = max - count;
      const added: PickedFile[] = [];
      const refused: string[] = [];
      for (const file of [...picked].slice(0, room)) {
        if (!accept.includes(file.type)) {
          refused.push(t.refused(file.name, t.wrongType));
          continue;
        }
        if (maxBytes !== undefined && file.size > maxBytes) {
          refused.push(t.refused(file.name, t.tooLarge));
          continue;
        }
        setUploading(file.name);
        try {
          const stored = await uploadFile(file, purpose);
          added.push({ id: stored.id, name: file.name });
        } catch (caught) {
          refused.push(t.refused(file.name, caught instanceof ApiError ? caught.message : GENERIC));
        }
      }
      setUploading(null);
      setProblems(refused);
      if (added.length) onChange([...files, ...added]);
    },
    [accept, count, files, max, maxBytes, onChange, purpose, t],
  );

  const chip = (file: PickedFile, removable: boolean) => (
    <li
      key={file.id}
      className="bg-surface-muted ring-line inline-flex min-h-11 max-w-full items-center gap-2 rounded-full pl-4 text-sm ring-1 ring-inset"
    >
      <span aria-hidden="true" className="text-brand-ink shrink-0 [&>svg]:size-4">
        {icon}
      </span>
      <span className={removable ? 'max-w-48 truncate' : 'max-w-56 truncate pr-4'}>{file.name}</span>
      {removable ? (
        <button
          type="button"
          aria-label={t.remove(file.name)}
          disabled={disabled}
          onClick={() => onChange(files.filter((item) => item.id !== file.id))}
          className="hover:bg-surface-sunken focus-visible:outline-focus grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2"
        >
          <IconClose className="size-4" />
        </button>
      ) : null}
    </li>
  );

  return (
    <div className="grid gap-3">
      <p className="text-ink text-lg font-semibold">{legend}</p>
      <p className="text-small text-ink-muted">{hint}</p>
      {count ? (
        <ul className="flex flex-wrap gap-2">
          {locked.map((file) => chip(file, false))}
          {files.map((file) => chip(file, true))}
        </ul>
      ) : null}
      {count < max ? (
        <label className="rounded-control border-line-strong text-ink hover:bg-surface-sunken has-[:focus-visible]:outline-focus inline-flex min-h-11 cursor-pointer items-center gap-2 justify-self-start border border-dashed px-5 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
          <span aria-hidden="true" className="shrink-0 [&>svg]:size-5">
            {icon}
          </span>
          {t.add}
          <input
            type="file"
            accept={accept.join(',')}
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
