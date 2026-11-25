// @ts-check
/**
 * Couverture des routes de la gateway par le portail (`pnpm routes:coverage`).
 *
 * 1. Lit le contrat OpenAPI (`KSP_CONTRACT`, sinon `../ksp_back/contracts/openapi/ksp-api.v1.yaml` à côté
 *    du dépôt) : seules les clés de `paths` et leurs méthodes, par un petit lecteur ligne à ligne (aucune
 *    dépendance).
 * 2. Garde le périmètre du portail : tout sauf le back-office (`/admin/*`) et l'espace pro (F-021 :
 *    `/cleaning/agent/*`, `/recovery/partner/*`, routes de terrain des séances et des visites).
 * 3. Trouve les appels réellement écrits dans `src/features/<domaine>/api.ts` et `src/lib/api` (méthode
 *    et chemin ; constantes, objets de chemins et petites fonctions de chemin du même fichier résolus ;
 *    paramètres normalisés en `{}`).
 * 4. Affiche, par domaine : routes intégrées, non intégrées, exclues volontairement (raison lue dans
 *    `docs/routes-coverage.json`). Une route branchée qui répond « pas encore servie » (`BackendPending`)
 *    compte comme intégrée : l'appel existe.
 *
 * Pas dans la CI : le contrat n'y est pas disponible. Sortie en erreur (code 1) seulement si le contrat
 * est introuvable. `--json` : résultat brut.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT =
  process.env.KSP_CONTRACT ?? resolve(ROOT, '..', 'ksp_back', 'contracts', 'openapi', 'ksp-api.v1.yaml');
const EXCLUSIONS_FILE = join(ROOT, 'docs', 'routes-coverage.json');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
/** Une ligne du rapport sur la sortie standard. */
const print = (/** @type {string} */ line = '') =>
  process.stdout.write(`${line}
`);

/** Routes de l'espace pro (F-021) et du back-office : hors du portail. */
const OUT_OF_SCOPE = [
  { test: (/** @type {string} */ path) => path.startsWith('/api/v1/admin/'), reason: 'back-office' },
  {
    test: (/** @type {string} */ path) => path.startsWith('/api/v1/cleaning/agent/'),
    reason: 'ksp_pro (F-021)',
  },
  {
    test: (/** @type {string} */ path) => path.startsWith('/api/v1/recovery/partner/'),
    reason: 'ksp_pro (F-021)',
  },
  {
    test: (/** @type {string} */ path) =>
      /^\/api\/v1\/cleaning\/sessions\/\{[^}]+\}\/(arrive|start|complete|incident|missed|photos|checklist)(\/|$)/.test(
        path,
      ),
    reason: 'ksp_pro (F-021), terrain',
  },
  {
    test: (/** @type {string} */ path) => /^\/api\/v1\/cleaning\/visits\/\{[^}]+\}\//.test(path),
    reason: 'ksp_pro (F-021), terrain',
  },
];

/** `/api/v1/cleaning/places/{id}` → `/api/v1/cleaning/places/{}`. */
const normalize = (/** @type {string} */ path) => path.replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '');

/** Domaine d'une route : le segment après `/api/v1/` (`/.well-known/…` : `well-known`). */
function domainOf(/** @type {string} */ path) {
  const match = /^\/api\/v1\/([^/]+)/.exec(path);
  return match ? match[1] : path.split('/')[1]?.replace(/^\./, '') || 'autre';
}

/* ——— 1. Contrat ——— */

/** @returns {Array<{ method: string, path: string }>} */
function readContract(/** @type {string} */ file) {
  const routes = [];
  let inPaths = false;
  let current = null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    if (/^\S/.test(line)) break;
    const path = /^ {2}(\/[^\s:]*):\s*$/.exec(line) ?? /^ {2}'(\/[^']*)':\s*$/.exec(line);
    if (path) {
      current = path[1];
      continue;
    }
    const method = /^ {4}([a-z]+):\s*$/.exec(line);
    if (current && method && METHODS.includes(method[1]))
      routes.push({ method: method[1].toUpperCase(), path: current });
  }
  return routes;
}

/* ——— 3. Appels écrits dans le portail ——— */

function sourceFiles() {
  const files = [];
  const features = join(ROOT, 'src', 'features');
  for (const entry of readdirSync(features, { withFileTypes: true })) {
    const file = join(features, entry.name, 'api.ts');
    if (entry.isDirectory() && existsSync(file)) files.push(file);
  }
  const lib = join(ROOT, 'src', 'lib', 'api');
  for (const name of readdirSync(lib)) {
    if (name.endsWith('.ts') && !name.endsWith('.test.ts')) files.push(join(lib, name));
  }
  return files;
}

/** Premier argument d'un appel, jusqu'à la première virgule ou parenthèse fermante de premier niveau. */
function firstArgument(/** @type {string} */ text, /** @type {number} */ start) {
  let depth = 0;
  let quote = null;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      else if (quote === '`' && char === '$' && text[index + 1] === '{') {
        // Expression d'un gabarit : parcourue comme du code jusqu'à son accolade fermante.
        let braces = 0;
        for (index += 1; index < text.length; index += 1) {
          if (text[index] === '{') braces += 1;
          else if (text[index] === '}' && --braces === 0) break;
        }
      }
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) {
      if (depth === 0) return text.slice(start, index).trim();
      depth -= 1;
    } else if (char === ',' && depth === 0) return text.slice(start, index).trim();
  }
  return null;
}

/** Constantes de chemin d'un fichier : chaînes, gabarits, objets de chaînes, fonctions qui rendent un gabarit. */
function pathDefinitions(/** @type {string} */ text) {
  /** @type {Map<string, string>} */
  const values = new Map();
  /** @type {Map<string, string>} */
  const functions = new Map();
  for (const match of text.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(['`])((?:\\.|(?!\2).)*)\2/g)) {
    values.set(match[1], match[3]);
  }
  for (const match of text.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\{([^}]*)\}/g)) {
    for (const entry of match[2].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(['`])((?:\\.|(?!\2).)*)\2/g)) {
      values.set(`${match[1]}.${entry[1]}`, entry[3]);
    }
  }
  for (const match of text.matchAll(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*(?::[^=]+)?=>\s*`([^`]*)`/g,
  )) {
    functions.set(match[1], match[2]);
  }
  return { values, functions };
}

/** Chemin écrit (expression du premier argument) → chemin normalisé, ou null s'il n'est pas lisible. */
function resolvePath(
  /** @type {string} */ expression,
  /** @type {ReturnType<typeof pathDefinitions>} */ defs,
  depth = 0,
) {
  if (depth > 5) return null;
  const template = (/** @type {string} */ body) =>
    body.replace(/\$\{([^}]*(?:\([^)]*\))?[^}]*)\}/g, (_, inner) => {
      const resolved = resolvePath(inner.trim(), defs, depth + 1);
      return resolved ?? '{}';
    });
  const literal = /^(['"`])([\s\S]*)\1$/.exec(expression);
  if (literal) return template(literal[2]);
  if (defs.values.has(expression)) return template(defs.values.get(expression) ?? '');
  const call = /^([A-Za-z_$][\w$]*)\(/.exec(expression);
  if (call && defs.functions.has(call[1])) return template(defs.functions.get(call[1]) ?? '');
  return null;
}

/** @returns {Array<{ method: string, path: string, file: string }>} */
function readCalls() {
  const calls = [];
  for (const file of sourceFiles()) {
    const text = readFileSync(file, 'utf8');
    const defs = pathDefinitions(text);
    for (const match of text.matchAll(/\b(?:api|client|serverApi\(\))\.(get|post|put|patch|delete)\(/g)) {
      const argument = firstArgument(text, (match.index ?? 0) + match[0].length);
      const path = argument ? resolvePath(argument, defs) : null;
      if (path && path.startsWith('/')) {
        calls.push({
          method: match[1].toUpperCase(),
          path: normalize(path),
          file: relative(ROOT, file).split(sep).join('/'),
        });
      }
    }
  }
  return calls;
}

/* ——— 4. Rapport ——— */

function readExclusions() {
  if (!existsSync(EXCLUSIONS_FILE)) return [];
  /** @type {{ exclusions: Array<{ method?: string, path: string, reason: string }> }} */
  const data = JSON.parse(readFileSync(EXCLUSIONS_FILE, 'utf8'));
  return data.exclusions.map((item) => ({
    ...item,
    method: item.method?.toUpperCase(),
    // `*` en fin de chemin : toutes les routes qui commencent ainsi.
    matches: (/** @type {string} */ method, /** @type {string} */ path) =>
      (!item.method || item.method.toUpperCase() === method) &&
      (item.path.endsWith('*')
        ? path.startsWith(item.path.slice(0, -1))
        : normalize(item.path) === normalize(path)),
  }));
}

function main() {
  if (!existsSync(CONTRACT)) {
    console.error(`Contrat introuvable : ${CONTRACT}\nIndiquez son chemin avec KSP_CONTRACT=…`);
    process.exit(1);
  }
  const contract = readContract(CONTRACT);
  const calls = readCalls();
  const written = new Set(calls.map((call) => `${call.method} ${call.path}`));
  const exclusions = readExclusions();

  /** @type {Record<string, { integrated: string[], missing: string[], excluded: Array<{ route: string, reason: string }>, outOfScope: number }>} */
  const domains = {};
  const contractKeys = new Set();
  for (const { method, path } of contract) {
    const domain = domainOf(path);
    const entry = (domains[domain] ??= { integrated: [], missing: [], excluded: [], outOfScope: 0 });
    const route = `${method} ${path}`;
    contractKeys.add(`${method} ${normalize(path)}`);
    if (OUT_OF_SCOPE.some((rule) => rule.test(path))) {
      entry.outOfScope += 1;
      continue;
    }
    if (written.has(`${method} ${normalize(path)}`)) {
      entry.integrated.push(route);
      continue;
    }
    const exclusion = exclusions.find((item) => item.matches(method, path));
    if (exclusion) entry.excluded.push({ route, reason: exclusion.reason });
    else entry.missing.push(route);
  }
  const unknown = calls.filter((call) => !contractKeys.has(`${call.method} ${call.path}`));

  if (process.argv.includes('--json')) {
    print(JSON.stringify({ contract: CONTRACT, domains, unknown }, null, 2));
    return;
  }

  const percent = (/** @type {number} */ part, /** @type {number} */ total) =>
    total ? `${Math.round((part / total) * 1000) / 10} %` : '—';
  print(`Contrat : ${CONTRACT}`);
  print(`Routes du contrat : ${contract.length} ; appels trouvés dans le portail : ${calls.length}\n`);
  print(
    'Domaine        Intégrées  Non intégrées  Exclues  Hors portail  Couverture (intégrées / à intégrer)',
  );
  let totals = { integrated: 0, missing: 0, excluded: 0, outOfScope: 0 };
  for (const [domain, entry] of Object.entries(domains).sort(([a], [b]) => a.localeCompare(b))) {
    const toDo = entry.integrated.length + entry.missing.length;
    totals = {
      integrated: totals.integrated + entry.integrated.length,
      missing: totals.missing + entry.missing.length,
      excluded: totals.excluded + entry.excluded.length,
      outOfScope: totals.outOfScope + entry.outOfScope,
    };
    print(
      `${domain.padEnd(14)} ${String(entry.integrated.length).padStart(9)}  ${String(entry.missing.length).padStart(13)}  ${String(entry.excluded.length).padStart(7)}  ${String(entry.outOfScope).padStart(12)}  ${percent(entry.integrated.length, toDo)}`,
    );
  }
  print(
    `${'Total'.padEnd(14)} ${String(totals.integrated).padStart(9)}  ${String(totals.missing).padStart(13)}  ${String(totals.excluded).padStart(7)}  ${String(totals.outOfScope).padStart(12)}  ${percent(totals.integrated, totals.integrated + totals.missing)}`,
  );

  const missing = Object.values(domains).flatMap((entry) => entry.missing);
  print(`\nNon intégrées (${missing.length}) :`);
  for (const route of missing) print(`  ${route}`);
  const excluded = Object.values(domains).flatMap((entry) => entry.excluded);
  print(`\nExclues volontairement (${excluded.length}) :`);
  for (const item of excluded) print(`  ${item.route} — ${item.reason}`);
  if (unknown.length) {
    print(`\nAppels absents du contrat (${unknown.length}) :`);
    for (const call of unknown) print(`  ${call.method} ${call.path} (${call.file})`);
  }
}

main();
