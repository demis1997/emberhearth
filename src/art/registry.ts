/**
 * Registry of art files that exist under /public/assets.
 * Add entries when new artwork is dropped into the folders.
 */
export const AVAILABLE_HERO_ART = new Set<string>([
  'hero_packmother',
  'hero_stoneheart',
  'hero_goldwake',
  'hero_gravewhisper',
]);

export const AVAILABLE_MINION_ART = new Set<string>([
  'dragon_whelp',
  'undead_skeleton',
  'pirate_deckhand',
]);

export function hasHeroArt(id: string): boolean {
  return AVAILABLE_HERO_ART.has(id);
}

export function hasMinionArt(id: string): boolean {
  return AVAILABLE_MINION_ART.has(id);
}
