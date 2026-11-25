'use client';

import dynamic from 'next/dynamic';

/**
 * Panneau « Recouvrement » de l'accueil de Mon espace, chargé à la demande, dans un relais à part : la page
 * d'accueil ne télécharge pas le relais des écrans (`lazy.tsx`). Rien pendant le chargement : le panneau
 * n'apparaît que s'il y a quelque chose à faire.
 */
export const RecoveryTodo = dynamic(() => import('./recovery-todo').then((module_) => module_.RecoveryTodo));
