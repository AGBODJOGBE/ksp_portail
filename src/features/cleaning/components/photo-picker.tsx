'use client';

import { IconImage } from '@/components/ui/icons';
import { FilePicker, type FilePickerTexts, PHOTO_TYPES, type PickedFile } from '@/features/file';
import { wizardTexts as t } from '@/features/cleaning/request-texts';

export type PickedPhoto = PickedFile;

const TEXTS: FilePickerTexts = {
  add: t.addPhoto,
  uploading: t.uploading,
  remove: t.removePhoto,
  refused: t.photoError,
  wrongType: t.photoType,
  tooLarge: t.photoType,
};

/**
 * Photos jointes (demande de devis, réclamation) : sélecteur de fichiers commun (`FilePicker`) avec la
 * finalité `cleaning_intervention_photo` et les formats du contrat (JPEG, PNG, WebP).
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
  return (
    <FilePicker
      purpose="cleaning_intervention_photo"
      accept={PHOTO_TYPES}
      files={photos}
      max={max}
      onChange={onChange}
      legend={legend}
      hint={hint}
      icon={<IconImage />}
      texts={TEXTS}
      error={error}
      disabled={disabled}
    />
  );
}
