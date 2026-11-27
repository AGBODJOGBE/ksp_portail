import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
/**
 * Stockage des fichiers (service file, ADR-038) : les photos y sont envoyées directement, à une adresse
 * présignée. Origine fixée au build, facultative : sans elle, l'envoi des photos est refusé par la CSP.
 */
const fileStorageOrigin = process.env.NEXT_PUBLIC_FILE_STORAGE_ORIGIN?.trim() ?? '';

/**
 * Politique de sécurité du contenu : le navigateur ne parle qu'au site lui-même et à la gateway.
 * À durcir (nonce sur les scripts) quand les pages définitives seront en place.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Le stockage des fichiers (photos, pièces) ; en local il est en http (MinIO), d'où sa mention explicite.
  `img-src 'self' data: blob: https:${fileStorageOrigin ? ` ${fileStorageOrigin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl}${fileStorageOrigin ? ` ${fileStorageOrigin}` : ''}${isDev ? ' ws:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
];

const nextConfig: NextConfig = {
  // Image Docker minimale : seul le serveur autonome et ses dépendances sont copiés.
  output: 'standalone',
  poweredByHeader: false,
  // Empêche `next dev` d'ajouter des blocs générés aux fichiers de documentation locaux.
  agentRules: false,
  reactStrictMode: true,
  images: {
    // Images servies par le stockage S3 (service file) et le CMS : domaines à compléter au déploiement.
    remotePatterns: [{ protocol: 'https', hostname: '**.ksp.bj' }],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Pages ouvertes par un lien personnel (paiement, signature, débiteur du Recouvrement) : le jeton est
      // dans l'adresse. Il ne part vers aucun autre site (prestataire, stockage du PDF) et la page n'est
      // jamais indexée. La page est rendue à chaque requête : Next la sert déjà en `no-store`. La vitrine
      // `/recouvrement` (sans jeton) n'est pas concernée.
      ...['/payer/:token', '/signer/:token', '/recouvrement/:token'].map((source) => ({
        source,
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      })),
    ];
  },
  async redirects() {
    // Ancien formulaire de devis du Nettoyage v1 : la demande v2 est sur `/nettoyage/demande`
    // (redirection temporaire, 307).
    return [{ source: '/nettoyage/devis', destination: '/nettoyage/demande', permanent: false }];
  },
};

export default nextConfig;
