/** Asset path helpers — images can be swapped without touching UI logic */

export function heroArtPath(heroId: string): string {
  const slug = heroId.replace(/^hero_/, '').replace(/_/g, '-');
  return `/assets/heroes/${slug}.webp`;
}

export function minionArtPath(defId: string): string {
  const slug = defId.replace(/_/g, '-');
  return `/assets/minions/${slug}.webp`;
}

export function tribeIconPath(tribe: string): string {
  return `/assets/tribes/${tribe}.svg`;
}

export const UI_ASSETS = {
  goldCoin: '/assets/ui/gold-coin.webp',
  attack: '/assets/ui/attack.svg',
  health: '/assets/ui/health.svg',
  armor: '/assets/ui/armor.svg',
  tavernBg: '/assets/ui/tavern-bg.webp',
  brannick: '/assets/keepers/brannick.webp',
  tierGem: '/assets/ui/tier-gem.svg',
} as const;
