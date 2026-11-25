/**
 * Documents PDF et signature électronique simple par code (service document, ADR-044) : page publique
 * d'un lien de signature pour une personne sans compte, et document de « Mon espace KSP ».
 */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { DocumentDetail, DocumentSigning, PublicSigning } from './components/lazy';
export { documentTexts } from './texts';
