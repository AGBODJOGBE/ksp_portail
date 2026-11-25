/**
 * Point d'entrée de la facturation pour l'accueil de Mon espace : raccourci (adresse, textes) et panneau
 * « Mes factures », chargé à la demande par un relais à part (`components/todo-lazy.tsx`). Le relais des
 * écrans (`components/lazy.tsx`) n'y entre pas : chaque écran qu'il exporte coûterait quelques dizaines
 * d'octets à l'accueil.
 */
export { InvoiceTodo } from './components/todo-lazy';
export { billingPaths, billingTexts } from './texts';
