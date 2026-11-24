# ksp_portail

Site **KSP** (ksp.bj) de l'écosystème KSP : porte d'entrée du groupe : présentation de KSP et de ses six métiers, parcours Recouvrement, Immobilier et Nettoyage, et « Mon espace KSP » commun à tous les sites.

Le site n'appelle qu'un seul serveur : la gateway du backend (`ksp_back`), sous `/api/v1`. Il ne contient aucune règle métier.

## Pile technique

| Besoin            | Choix                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Cadre             | Next.js 16 (App Router), React 19, TypeScript strict                                      |
| Styles            | Tailwind CSS 4, jetons de la charte KSP dans `src/app/globals.css`                        |
| Appels au backend | Client unique `src/lib/api` (corrélation, renouvellement de session, erreurs en français) |
| Configuration     | Variables validées au démarrage (`src/config/env.ts`)                                     |
| Tests             | Vitest + Testing Library (unitaires), Playwright (bout en bout, téléphone et ordinateur)  |
| Qualité           | ESLint, Prettier, commitlint, husky                                                       |
| Livraison         | Image Docker autonome (`output: 'standalone'`), GitHub Actions                            |

## Démarrer

Prérequis : Node.js 22 (`.nvmrc`), pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local
pnpm dev                       # http://localhost:3010
```

La gateway locale (`ksp_back`) répond sur http://localhost:3000. Ports des sites en local : portail 3010, shop 3020, print 3030.

### Se connecter contre la gateway locale

La connexion par téléphone (`/connexion`) et « Mon espace KSP » (`/mon-espace`) appellent la gateway depuis le navigateur. Dans `ksp_back` :

1. **Origine autorisée.** Dans `services/gateway/.env`, ajouter l'adresse du portail aux origines des sites : `CORS_WEB_ORIGINS=http://localhost:3010` (liste séparée par des virgules). Sans elle, le navigateur bloque les réponses (message « Connexion impossible ») et la gateway refuse les routes de connexion (`GATEWAY_CLIENT_UNKNOWN`).
2. **Cookie de renouvellement.** Sur `http://localhost`, les navigateurs Chrome et Firefox acceptent le cookie `__Secure-ksp_rt` (Secure) : rien à changer. Pour un portail servi en HTTP sur une autre adresse (adresse IP du réseau local, téléphone de test), mettre `REFRESH_COOKIE_INSECURE=true` côté gateway (développement uniquement : refusé en production).
3. **Lancer les services** : identity, notification et gateway (voir le README de `services/gateway`).
4. **Code de connexion.** En développement, le service notification utilise le prestataire WhatsApp « console » : le code est écrit dans **le terminal du service notification** (`[notification · développement] WhatsApp vers +229********45 …`), aucun message ne part.
5. **Numéros du Bénin.** Ils ont 10 chiffres (`01` devant les 8 chiffres d'origine, ADR-063). Un ancien numéro à 8 chiffres saisi à la connexion est complété comme le fait le backend, et le portail montre la forme envoyée (`src/lib/phone.ts`, miroir de `tryNormalizePhone`).

Puis `pnpm dev` et ouvrir http://localhost:3010/mon-espace : sans session, le portail renvoie vers la connexion, puis revient à la page demandée. Le jeton d'accès reste en mémoire (perdu au rechargement, aussitôt repris grâce au cookie) ; aucun jeton n'est écrit dans le stockage du navigateur.

### Nettoyage : nouvelle version en préparation

Le Nettoyage v1 est retiré du backend (refonte v2, ADR-054 à 063 de `ksp_back`) : le portail n'appelle plus aucune route `/api/v1/cleaning/*`. En attendant les écrans de la v2 :

- `/nettoyage` est une page statique (prestations, « Nouvelle version en préparation », « Nous contacter » vers `/contact?sujet=nettoyage`) ; `/nettoyage/demande` et `/nettoyage/devis` y redirigent (307) ;
- tout `/mon-espace/nettoyage/…` (liens des notifications : demandes, programmes, réclamations, et anciens liens de la v1) affiche « Bientôt disponible » ;
- « Suivre mes demandes » (`/mon-espace/suivi`) est vide, et la carte du Nettoyage de Mon espace est marquée « Bientôt ».

### Routes pas encore servies par le backend

Une section dont la route figure au contrat mais n'est pas encore servie (404 `GATEWAY_ROUTE_NOT_FOUND`, 501 ou code `*_NOT_IMPLEMENTED` ; `isBackendPending` de `src/lib/api`) affiche `BackendPending` (`src/components/ui/backend-pending.tsx`) : « Bientôt disponible » pour le client, et, hors production seulement, les routes que le backend doit fournir. Elle s'active seule dès que la route est livrée.

### Tests de bout en bout sous Windows

`pnpm build` puis `pnpm test:e2e` joue les parcours contre une gateway simulée (`e2e/support/gateway.ts`). Sous Windows, si le serveur lancé par Playwright ne démarre pas (`PORT=… pnpm start` est une commande POSIX), lancer le site construit à la main sur un port libre puis `PORT=3110 pnpm test:e2e` (le serveur déjà lancé est réutilisé) :

```bash
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
PORT=3110 node .next/standalone/server.js
```

## Commandes

| Commande                                             | Rôle                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                                           | Serveur de développement                                      |
| `pnpm lint` · `pnpm format:check` · `pnpm typecheck` | Contrôles de qualité                                          |
| `pnpm test`                                          | Tests unitaires                                               |
| `pnpm build` puis `pnpm test:e2e`                    | Tests de bout en bout sur le site construit (gateway simulée) |
| `pnpm build` puis `pnpm size`                        | Poids JavaScript de chaque page                               |

## Architecture du front

Le code est découpé par fonctionnalité (`src/features/<domaine>`, aligné sur les services du backend) autour d'un système de design portable (`src/components/ui`, futur `ksp-ui`), avec des frontières vérifiées par ESLint et un rendu statique par défaut. Le détail (dossiers, règles de dépendance, rendu, budget de poids) est dans [docs/architecture.md](docs/architecture.md).

## Variables d'environnement

Voir `.env.example`. Les variables `NEXT_PUBLIC_*` sont figées au build : l'image Docker est construite par environnement (préproduction, production).

Adresses de préproduction utilisées par défaut en CI (`*.staging.ksp.bj`) : **à valider** lors du choix de l'hébergeur.

## Documentation

- [Règles de travail](CONTRIBUTING.md)
- [Architecture du front](docs/architecture.md)
- [Décisions des fronts](docs/decisions.md)
- Architecture et ADR de l'écosystème : dépôt `ksp_back`, dossier `docs/`.
