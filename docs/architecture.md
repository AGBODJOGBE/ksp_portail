# Architecture du front

Décision F-012 (`docs/decisions.md`). Ce document sert de modèle aux quatre fronts KSP (portail, shop, print, back-office). Chaque partie indique ce qui est **commun** aux quatre fronts et ce qui est **propre au portail**.

## Principes

1. **Les règles métier vivent dans `ksp_back`** (F-004). Le front affiche, recueille et transmet : pas de couches domaine ou application, pas de « repository » ni d'interface sans seconde implémentation réelle.
2. **Découpage vertical par fonctionnalité**, aligné sur les services du backend, plutôt que par type de fichier.
3. **Serveur d'abord** : composants serveur par défaut ; composants client petits, en feuille de l'arbre, pour l'interactivité réelle seulement. L'état partageable va dans l'URL (`searchParams`). Pas de bibliothèque d'état global ni de récupération de données.
4. **Rendu statique par défaut** : le serveur Next ne refait pas à chaque requête ce qui peut être construit une fois.
5. **Frontières vérifiées par ESLint**, sans dépendance ajoutée, et **poids mesuré** à chaque build (`pnpm size`).

## Dossiers

```
src/
├── app/                     routes : page, layout, error, not-found, metadata, sitemap ; compose, aucune logique
├── features/<domaine>/      une tranche verticale par domaine (voir ci-dessous)
├── components/
│   ├── ui/                  système de design, futur paquet ksp-ui (F-003)
│   │   ├── icons/           pictogrammes SVG
│   │   └── brand/           logo et motif tissé
│   ├── layout/              cadre du site : en-tête, pied de page, bouton WhatsApp
│   └── sections/            sections de page pilotées par des données (pages métiers, formulaire guidé)
├── lib/                     technique transverse : client de la gateway, SEO, cn, typographie, contrastes
├── config/                  environnement, identité du site, navigation, catalogue des métiers
└── i18n/                    textes de l'interface
```

| Dossier                     | Rôle                                                                                                                                                                                                                                                                                                             | Portée                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `app/`                      | Une route = un dossier. La page assemble des sections et des contenus importés ; elle ne calcule rien. Les tests de routes (`metiers.test.tsx`) y restent.                                                                                                                                                       | Commun                                            |
| `features/<domaine>/`       | Tout ce qui est propre à un domaine, de la page publique à l'espace connecté.                                                                                                                                                                                                                                    | Commun (la liste des domaines est propre au site) |
| `components/ui/`            | Briques sans connaissance du site : bouton, carte, section, titres, badge, emplacement « à venir », icônes, logo, motif, inspecteur de jetons de `/charte`. N'importe que `ui` et `lib`.                                                                                                                         | Commun, identique dans les quatre fronts          |
| `components/layout/`        | Cadre propre au site. Reçoit les éléments d'une fonctionnalité par ses propriétés (`children`, emplacements), ne les importe pas.                                                                                                                                                                                | Commun (le contenu est propre au site)            |
| `components/sections/`      | Sections génériques des pages métiers (bandeau d'ouverture, offres, étapes, FAQ, appel à l'action, galerie, emplacements « à venir »), boutons d'action (`PageAction`) et formulaire guidé.                                                                                                                      | Propre au portail                                 |
| `lib/`                      | Code technique sans interface propre au site : `api` (seul endroit où `fetch` est permis ; session en mémoire et son hook `useSession`), `format` (FCFA, dates à l'heure du Bénin), `use-resource` et `use-paged-list` (lectures et listes à curseur des espaces connectés), `seo`, `cn`, `typography`, `color`. | Commun                                            |
| `config/`                   | `env.ts` (zod), `site.ts`, `navigation.ts` ; pour le portail, `metiers.ts` (les six métiers : identifiants, adresses, libellés).                                                                                                                                                                                 | Commun (`metiers.ts` propre au portail)           |
| `i18n/`                     | Textes de l'interface (français ; anglais prévu).                                                                                                                                                                                                                                                                | Commun                                            |
| `app/fonts/`                | Chargement de la police des titres (`next/font/local`, F-014) ; reste à côté du layout racine qui l'utilise.                                                                                                                                                                                                     | Commun                                            |
| `scripts/first-load-js.mjs` | Mesure du poids JavaScript par page (`pnpm size`).                                                                                                                                                                                                                                                               | Commun                                            |

### Une fonctionnalité

```
features/<domaine>/
├── index.ts         API publique : seul point d'entrée depuis l'extérieur
├── content.ts       contenus statiques en attendant le CMS
├── types.ts         types partagés de la fonctionnalité, quand ils ne sont ni un contenu ni un schéma
├── schemas.ts       schémas zod des réponses de la gateway (validation à la frontière)
├── queries.ts       lectures côté serveur via serverApi() — fichier serveur uniquement
├── actions.ts       mutations (Server Actions), seulement quand un vrai envoi existe
├── server.ts        second point d'entrée, serveur uniquement, quand `queries.ts` doit être exposé
└── components/      interface propre au domaine, tests à côté
```

**Écrans client d'une fonctionnalité : relais paresseux.** Next embarque dans une page tous les composants client atteints par ses imports, même ceux qu'elle n'affiche pas. Une fonctionnalité qui a plusieurs écrans client les exporte donc par `components/lazy.tsx` (`next/dynamic`) : importer `@/features/cleaning` pour un texte ou une adresse ne télécharge aucun écran (mesure : `/mon-espace` passait de 204 à 226 Ko sans ce relais, 211 Ko avec).

**Un fichier n'existe que s'il a du contenu.** Aujourd'hui, les fonctionnalités du portail n'ont qu'un `content.ts` (et des composants pour l'accueil) : les autres fichiers apparaîtront avec les contrats de la gateway.

Le nom d'une fonctionnalité est celui du service du backend, en anglais (le code est en anglais, les adresses en français) :

| Route                                                       | Fonctionnalité        | Service du backend | Contenu actuel                                                                                                    |
| ----------------------------------------------------------- | --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/`                                                         | `features/home`       | — (CMS)            | contenus et sections de l'accueil                                                                                 |
| `/recouvrement`                                             | `features/recovery`   | recovery           | page publique                                                                                                     |
| `/nettoyage`, `/nettoyage/devis`, `/mon-espace/nettoyage/…` | `features/cleaning`   | cleaning           | page publique, simulateur branché, demande de devis, « Mes prestations de nettoyage » (demandes, devis, missions) |
| `/immobilier`                                               | `features/realestate` | realestate         | page publique et questions de la demande de devis                                                                 |
| `/impression`                                               | `features/print`      | print              | page publique (renvoi vers KSP Print)                                                                             |
| `/marketplace`                                              | `features/catalog`    | catalog            | page publique (renvoi vers KSP Shop)                                                                              |
| `/livraison`                                                | `features/delivery`   | delivery           | page publique                                                                                                     |
| `/connexion`, `/mon-espace`                                 | `features/identity`   | identity           | connexion par téléphone, profil, garde et accueil de « Mon espace KSP », déconnexion                              |
| `/mon-espace/factures`                                      | `features/billing`    | billing            | « Mes factures » : liste et détail                                                                                |

À venir dans le portail : `contact`, `about`, `realisations`, `news` (contenus du CMS), puis pour « Mon espace KSP » la suite d'`identity` (sécurité, sessions, organisation), `billing` (factures), `payment`, `document` (documents à signer), `notification`, `order` (commandes et courses) — et les pages connectées de `recovery`, `cleaning`, `realestate`, `delivery` dans leur propre fonctionnalité.

## Règles de dépendance

```
                 app                         compose tout, rien ne l'importe
                  │
                  ▼
        features/<domaine>                   API publique (index.ts) entre fonctionnalités
                  │
                  ▼
  components/layout ◄─► components/sections  propres au site
                  │
                  ▼
           components/ui                     portable (ksp-ui) : n'importe que ui et lib
                  │
                  ▼
     lib  ──►  config, i18n                  aucun composant, aucune fonctionnalité
```

Une flèche signifie « peut importer ». Les règles sont dans `eslint.config.mjs` (`no-restricted-imports`) :

| Règle                                                                                           | Où                                                             |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Imports relatifs limités au dossier courant (`./`) ; ailleurs, alias `@/`                       | tout `src/`                                                    |
| Une fonctionnalité s'importe par `@/features/<domaine>` (ou `@/features/<domaine>/server`)      | tout `src/`                                                    |
| Dans sa propre fonctionnalité : `./…` ou `@/features/<domaine>/…`, jamais son propre `index.ts` | `features/<domaine>/`                                          |
| Rien n'importe `@/app`                                                                          | `features`, `components`, `lib`, `config`, `i18n` (hors tests) |
| Aucune fonctionnalité                                                                           | `components`, `lib`, `config`, `i18n` (hors tests)             |
| Aucun composant                                                                                 | `lib`, `config`, `i18n`                                        |
| `components/ui` n'importe que `components/ui` et `lib` (ni `config`, ni `i18n`, ni le reste)    | `components/ui`                                                |
| `fetch` interdit hors de `src/lib/api` (F-004)                                                  | tout le dépôt sauf tests et `e2e`                              |

Les tests peuvent importer une route ou une vraie fonctionnalité (par son API publique) pour vérifier un rendu réel. Les fonctionnalités sont lues dans `src/features` au lancement d'ESLint : une nouvelle fonctionnalité reçoit ses règles sans modifier la configuration. Limite connue : un `import()` dynamique n'est pas contrôlé.

## Stratégie de rendu

Cache Components (`cacheComponents`) n'est pas activé : c'est le modèle de cache « précédent » de Next 16 qui s'applique (`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`).

| Type de route          | Exemples                                                | Rendu                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page vitrine           | accueil, six métiers, pages légales, À propos           | **Statique** (○), construite au build                                                                                                                                                                                   |
| Contenu du CMS         | Actualités, Réalisations, demain les textes des métiers | **Statique et revalidé** : `queries.ts` lit `serverApi().get(chemin, { next: { revalidate, tags } })` ; `generateStaticParams` pour les fiches ; revalidation à la demande par étiquette (**à valider**, voir plus bas) |
| Page qui lit l'URL     | Contact (`?sujet=`), filtres partageables d'une galerie | **Statique**, avec un petit composant client qui lit `useSearchParams()` sous `<Suspense>` : lire `searchParams` dans la page la rendrait dynamique                                                                     |
| Envoi d'un formulaire  | Contact, demande de devis                               | Server Action (`actions.ts`) ou appel `api` depuis le composant client : choix **à valider** au premier formulaire réel                                                                                                 |
| Espace connecté        | « Mon espace KSP »                                      | **Coque statique** + composants client qui appellent `api` (F-005), `noindex`                                                                                                                                           |
| Technique              | `/api/health`                                           | Dynamique (ƒ)                                                                                                                                                                                                           |
| Outil de développement | `/charte`                                               | `notFound()` en production                                                                                                                                                                                              |

Interdits : `export const dynamic = 'force-dynamic'` sur une page publique ; données personnelles dans un cache partagé (`next.revalidate`, `tags`) ; `cookies()` ou `headers()` dans un layout commun (toutes les pages deviendraient dynamiques).

**À valider — revalidation des contenus du CMS.** Recommandation : revalidation par étiquette (`cms:actualites`, `cms:realisations`…) déclenchée par un appel du CMS sur une route protégée par un secret (`app/api/revalidate/route.ts`), avec une revalidation horaire en filet de sécurité. Cache Components (`'use cache'`, `cacheLife`, `cacheTag`) est l'alternative de Next 16 ; elle demande de modifier `next.config.ts` et de vérifier toutes les pages : à étudier au premier contenu du CMS, pas avant.

## Budget de poids

« First Load JS » : JavaScript téléchargé à la première visite d'une page, compressé (gzip). Next 16 ne l'affiche plus à la fin de `pnpm build` : `pnpm build && pnpm size` le recalcule à partir des pages construites.

Mesure du 19 octobre 2026 (identique avant et après la réorganisation F-012) :

| Page                                         | First Load JS |
| -------------------------------------------- | ------------- |
| pages légales, `/mon-espace`, 404            | 174,8 Ko      |
| `/marketplace`                               | 174,8 Ko      |
| `/nettoyage` (simulateur)                    | 180,1 Ko      |
| `/` (accueil)                                | 180,3 Ko      |
| `/recouvrement`, `/impression`, `/livraison` | 182,6 Ko      |
| `/immobilier` (demande de devis)             | 186,2 Ko      |

Le socle commun (React, Next, routeur, menus de l'en-tête) pèse 174,8 Ko : chaque page n'ajoute que ses composants client.

Mesure du 21 octobre 2026, après la connexion par téléphone : socle 177,1 Ko (+2,3 Ko : lien de compte de l'en-tête, magasin de session, textes de la connexion) ; `/` 182,6 Ko ; `/recouvrement`, `/impression`, `/livraison` 185,8 Ko ; `/nettoyage` 182,3 Ko ; `/immobilier` 188,5 Ko ; `/connexion` et `/mon-espace` 204,2 Ko (budget « espace connecté » : 215 Ko).

Mesure du 27 octobre 2026, après le parcours du Nettoyage et « Mes factures » : socle inchangé (177,1 Ko) ; `/nettoyage` 183,3 Ko (simulateur branché ; l'estimation est chargée à la dernière étape) ; `/nettoyage/devis` et `/mon-espace/nettoyage/demandes` 210,0 Ko ; `/mon-espace` 211,1 Ko ; `/mon-espace/factures` 206,6 Ko. Les détails (`…/[id]`) sont rendus à la demande et ne figurent pas dans la mesure : ils chargent les mêmes briques.

Budgets par type de page (validés le 19 octobre 2026) :

| Type de page                                             | Budget   |
| -------------------------------------------------------- | -------- |
| Page de contenu sans interaction (légales, À propos)     | ≤ 180 Ko |
| Page vitrine avec composants client (galerie, FAQ, menu) | ≤ 190 Ko |
| Page avec formulaire ou simulateur                       | ≤ 200 Ko |
| Écran d'un espace connecté                               | ≤ 215 Ko |

Règle : une page qui dépasse son budget, ou un socle qui grossit, se justifie dans la demande de fusion (mesure avant et après). Pas de nouvelle dépendance sans cette mesure et sans validation.

## Ajouter une fonctionnalité

1. Nommer le domaine comme le service du backend : `src/features/<domaine>/`.
2. Créer seulement les fichiers utiles : `content.ts` pour un contenu statique, `schemas.ts` + `queries.ts` pour une lecture de la gateway, `actions.ts` pour un envoi, `components/` pour l'interface.
3. Valider chaque réponse de la gateway avec son schéma zod dans `queries.ts` (`schema.parse(await serverApi().get(…))`) ; les types dérivent des schémas (`z.infer`). Pour une réponse lue dans le navigateur : schéma `zod/mini` et `parseResponse` de `@/lib/api`.
4. Exporter dans `index.ts` ce dont les routes ont besoin, et rien d'autre.
5. Créer la route dans `src/app/` : elle importe la fonctionnalité et les sections, et les assemble.
6. Composant serveur par défaut ; `'use client'` seulement sur la feuille interactive, qui reçoit ses données en propriétés.
7. Tests à côté du code (`*.test.tsx`), parcours dans `e2e/`.
8. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`, puis `pnpm build && pnpm size` et comparaison avec le budget.

## Données des espaces connectés (décision : option A)

« Mon espace KSP », l'espace vendeur et le back-office lisent des données personnelles. Deux options :

**A. Jeton en mémoire dans le navigateur (F-005, en vigueur).** La page est une coque statique ; un composant client renouvelle la session (cookie de renouvellement posé par la gateway), puis appelle la gateway avec `api`.

- Poids : chaque écran embarque son code de lecture, ses états de chargement et d'erreur, son rendu : environ 10 à 40 Ko de plus par écran.
- Charge du serveur Next : nulle, il sert des fichiers statiques ; toute la charge va à la gateway, déjà dimensionnée pour.
- Sécurité : aucun jeton persistant lisible par le JavaScript ; une faille XSS peut utiliser le jeton tant que la page est ouverte (d'où la CSP à durcir). Protection CSRF du renouvellement à la charge de la gateway (`SameSite`, contrôle de l'origine).
- Temps d'affichage : HTML, puis JavaScript, puis renouvellement, puis données : deux allers-retours de plus que le rendu serveur, sensibles en 3G.
- F-010 : dépend seulement de la route de renouvellement.

**B. Le serveur Next lit le cookie et appelle la gateway.** La page est rendue à la demande avec les données.

- Poids : le plus faible, les listes et tableaux restent des composants serveur.
- Charge du serveur Next : chaque page connectée est rendue à chaque requête, avec ses appels à la gateway ; les pods Next doivent être dimensionnés et surveillés.
- Sécurité : aucun jeton dans le navigateur, mais le serveur Next devient un client authentifié : renouvellement et rotation du jeton côté serveur (un composant serveur ne peut pas poser de cookie : passage obligé par `proxy.ts` ou une Server Action), risque de mettre des données personnelles en cache partagé, transmission de l'IP du visiteur à la gateway pour la limitation de débit.
- F-010 : dépendance plus forte (échange de jeton de serveur à serveur, comportement de la rotation, en-têtes transmis).

**Décision (19 octobre 2026) : option A** pour « Mon espace KSP » et le back-office, en limitant chaque écran à un composant client en feuille qui reçoit une coque déjà rendue, en lançant le renouvellement dès le chargement de l'espace et les lectures en parallèle. Mesurer le premier écran réel (liste des dossiers de recouvrement) en 3G simulée ; si le budget « espace connecté » ou le temps d'affichage n'est pas tenu, rouvrir B pour cet écran.

**Mise en œuvre (lot 1, connexion par téléphone).**

| Élément                     | Où                                     | Règle                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session en mémoire          | `lib/api/session.ts`                   | Jeton d'accès et utilisateur en mémoire ; renouvellement unique (`POST /api/v1/identity/token/refresh`, cookie `__Secure-ksp_rt` posé par la gateway) chargé au premier besoin. Ce module n'importe ni la configuration ni zod : l'en-tête l'importe directement (`@/lib/api/session`). |
| Lien de compte de l'en-tête | `components/layout/account-link.tsx`   | « Se connecter » ou « Mon espace KSP » selon la session **en mémoire**, sans appel à la gateway sur les pages publiques.                                                                                                                                                                |
| Garde des pages connectées  | `features/identity` (`RequireSession`) | Mémoire, sinon renouvellement silencieux ; sans session, `/connexion?retour=<chemin>` ; panne de la gateway, message et « Réessayer » ; profil incomplet, « Compléter mon profil » d'abord.                                                                                             |
| Retour après connexion      | `features/identity/return-path.ts`     | Chemin interne uniquement (`/…`), jamais `//`, `\`, schéma ou caractère de contrôle : pas de redirection ouverte.                                                                                                                                                                       |
| Validation des réponses     | `zod/mini`                             | Dans le navigateur, `zod/mini` (quelques Ko) et non `zod` (environ 90 Ko compressés). `config/env.ts`, lu aussi par le navigateur, l'utilise pour la même raison.                                                                                                                       |
| En-têtes envoyés            | `lib/api/client.ts`                    | Seulement ceux qu'autorise la politique CORS de la gateway (`Content-Type`, `Authorization`, `Idempotency-Key`). L'identifiant de corrélation est créé par la gateway et relu dans la réponse (`X-Correlation-Id`).                                                                     |

## Volontairement exclu

| Exclu                                                                   | Pourquoi                                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Couches domaine, application, infrastructure ; repositories ; injection | Les règles sont dans le backend ; ces couches seraient vides et ralentiraient chaque changement.          |
| Bibliothèque d'état global (Redux, Zustand…)                            | L'état partageable va dans l'URL, l'état local dans le composant ; la session a son propre magasin.       |
| Bibliothèque de récupération de données (React Query, SWR…)             | Lectures côté serveur pour le public ; le client `api` suffit pour l'espace connecté. Poids non justifié. |
| Dossiers globaux `hooks/`, `utils/`, `types/`, `services/`              | Ils séparent par type de fichier : un hook ou un type vit dans la fonctionnalité qui l'utilise.           |
| `index.ts` dans `components/`                                           | Import par fichier (`@/components/ui/button`) : pas de barillet à maintenir, pas de cycle.                |
| Dossiers ou fichiers vides « pour plus tard »                           | Un fichier n'existe que s'il a du contenu.                                                                |
| Paquet `ksp-ui` et dépôt partagé                                        | F-003 : seulement quand un deuxième site réutilise réellement les composants.                             |
| Greffon ESLint de frontières (`eslint-plugin-boundaries`)               | `no-restricted-imports` suffit, sans dépendance ajoutée.                                                  |
| Cache Components                                                        | Pas de contenu du CMS à mettre en cache aujourd'hui ; à étudier au premier besoin.                        |
