/**
 * Point d'entrée du Recouvrement pour l'accueil de Mon espace et « Suivre ma demande » : raccourci
 * (adresse, textes), panneau « À faire » et section du suivi, chargés à la demande par des relais à part
 * (`components/todo-lazy.tsx`, `components/tracking-lazy.tsx`). Ni le relais des écrans
 * (`components/lazy.tsx`, +0,4 Ko mesurés sur `/mon-espace`), ni ces relais dans `server.ts` (la page
 * publique `/recouvrement` et l'annuaire des services les téléchargeraient : +1,1 Ko et +0,1 Ko mesurés).
 */
export { RecoveryTodo } from './components/todo-lazy';
export { RecoveryTracking } from './components/tracking-lazy';
export { recoveryPaths } from './paths';
export { recoveryTexts } from './texts';
