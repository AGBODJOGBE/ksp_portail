/**
 * Point d'entrée du Recouvrement pour l'accueil de Mon espace : raccourci (adresse, textes) et panneau
 * « À faire », chargé à la demande par un relais à part (`components/todo-lazy.tsx`). Ni le relais des
 * écrans (`components/lazy.tsx`, +0,4 Ko mesurés sur `/mon-espace`), ni ce relais dans `server.ts` (la page
 * publique `/recouvrement` et l'annuaire des services le téléchargeraient : +1,1 Ko et +0,1 Ko mesurés).
 */
export { RecoveryTodo } from './components/todo-lazy';
export { recoveryPaths } from './paths';
export { recoveryTexts } from './texts';
