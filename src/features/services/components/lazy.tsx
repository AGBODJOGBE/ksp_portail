'use client';

import dynamic from 'next/dynamic';

/*
 * Points d'entrée client de l'annuaire, chargés à la demande. Next embarque dans une page tous les
 * composants client atteints par ses imports : sans ce relais, l'accueil (qui importe la fonctionnalité
 * pour la recherche du premier écran) téléchargerait aussi l'annuaire de `/services`, et inversement.
 * Les deux restent rendus par le serveur (`ssr` par défaut) : aucun contenu n'attend le JavaScript.
 */

export const ServicesDirectory = dynamic(() =>
  import('./services-directory').then((module_) => module_.ServicesDirectory),
);

export const ServiceSearchBox = dynamic(() =>
  import('./service-search-box').then((module_) => module_.ServiceSearchBox),
);
