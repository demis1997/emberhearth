/** Deterministic colors/shapes from id for placeholder fantasy art */

export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hsl(h: number, s: number, l: number): string {
  return `hsl(${h % 360} ${s}% ${l}%)`;
}

export interface ArtPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  shadow: string;
  seed: number;
}

const TRIBE_HUE: Record<string, number> = {
  beast: 35,
  construct: 200,
  dragon: 8,
  elemental: 195,
  demon: 280,
  undead: 165,
  pirate: 45,
  neutral: 25,
  hero: 20,
};

export function paletteFor(id: string, tribe = 'neutral'): ArtPalette {
  const seed = hashId(id);
  const base = TRIBE_HUE[tribe] ?? 30;
  const h = (base + (seed % 40) - 20 + 360) % 360;
  return {
    primary: hsl(h, 55 + (seed % 20), 28 + (seed % 12)),
    secondary: hsl((h + 40) % 360, 45, 18),
    accent: hsl((h + 180) % 360, 70, 55),
    glow: hsl(h, 80, 60),
    shadow: hsl(h, 40, 8),
    seed,
  };
}

/** Silhouette variant 0-5 for variety */
export function silhouetteVariant(id: string): number {
  return hashId(id) % 6;
}
