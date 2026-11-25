'use client';

import dynamic from 'next/dynamic';

/**
 * Section Recouvrement de « Suivre ma demande », chargée à la demande, dans un relais à part : la page ne
 * télécharge pas le relais des écrans (`lazy.tsx`). Rien pendant le chargement : la section a son propre
 * état de chargement une fois arrivée.
 */
export const RecoveryTracking = dynamic(() =>
  import('./recovery-tracking').then((module_) => module_.RecoveryTracking),
);
