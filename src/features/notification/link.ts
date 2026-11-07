/**
 * Lien d'une notification vers la page concernée. Le service enregistre une adresse complète
 * (`https://ksp.bj/mon-espace/…`) : seul le chemin de « Mon espace KSP » est gardé, pour rester sur le
 * site affiché (préproduction comprise) ; toute autre adresse est ignorée.
 */
export function internalLink(link: string | null): string | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link, 'https://ksp.bj');
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.pathname !== '/mon-espace' && !url.pathname.startsWith('/mon-espace/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
