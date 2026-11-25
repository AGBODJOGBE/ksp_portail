/**
 * Second point d'entrée du Nettoyage, pour les pages rendues par le serveur sans écran client (conditions
 * générales) : il n'emporte pas le relais des écrans (`components/lazy.tsx`).
 */
export { TermsDocumentView } from './components/terms-document';
export { cleaningPaths } from './paths';
export { cleaningTerms, getCleaningTerms } from './terms';
