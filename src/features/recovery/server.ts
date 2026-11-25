/**
 * Second point d'entrée du Recouvrement, pour les pages rendues par le serveur qui n'affichent aucun de ses
 * écrans (page publique `/recouvrement`, annuaire des services) : contenus, adresses et textes, sans aucun
 * module client (ni le relais des écrans, ni celui du panneau de Mon espace, qui passe par `home.ts`).
 */
export { recouvrementContent } from './content';
export { recoveryPaths } from './paths';
export { recoveryTexts } from './texts';
