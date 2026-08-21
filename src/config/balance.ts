/** Central balance configuration — edit here, not scattered through code */

export const BUY_COST = 3;
export const SELL_VALUE = 1;
export const REFRESH_COST = 1;
export const FREEZE_COST = 0;
export const MAX_GOLD = 10;
export const STARTING_GOLD = 3;
export const MAX_BOARD_SIZE = 7;
export const MAX_HAND_SIZE = 10;
export const STARTING_HEALTH = 30;
export const PLAYER_COUNT = 8;
export const HERO_CHOICES = 4;
export const TRIBES_PER_MATCH = 4;
export const TOTAL_TRIBES = 7;
export const RECRUIT_TIMER_SECONDS = 75;
export const MAX_TAVERN_TIER = 6;

/** Gold available each round (round 1 = 3, caps at 10) */
export function goldForRound(round: number): number {
  return Math.min(MAX_GOLD, STARTING_GOLD + round - 1);
}

/**
 * Base upgrade cost by target tier (cost to go FROM current TO next).
 * Index 0 unused; index 1 = cost to reach tier 2, etc.
 * Cost decreases by 1 each round after unlock opportunity.
 */
export const BASE_UPGRADE_COSTS: Record<number, number> = {
  2: 5,
  3: 7,
  4: 8,
  5: 9,
  6: 10,
};

export function upgradeCost(currentTier: number, roundsAtTier: number): number {
  const next = currentTier + 1;
  if (next > MAX_TAVERN_TIER) return 999;
  const base = BASE_UPGRADE_COSTS[next] ?? 10;
  return Math.max(0, base - roundsAtTier);
}

/** Shop size by tavern tier */
export const SHOP_SIZE: Record<number, number> = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
  5: 5,
  6: 6,
};

/** Copies in shared pool by tavern tier */
export const POOL_COPIES: Record<number, number> = {
  1: 16,
  2: 15,
  3: 13,
  4: 11,
  5: 9,
  6: 7,
};

/** Hero damage: tavernTier + sum of surviving minion tiers (golden count as +1) */
export function combatDamage(
  survivingMinions: { tavernTier: number; golden: boolean }[],
  winnerTavernTier: number,
): number {
  if (survivingMinions.length === 0) return 0;
  const minionDamage = survivingMinions.reduce(
    (sum, m) => sum + m.tavernTier + (m.golden ? 1 : 0),
    0,
  );
  return winnerTavernTier + minionDamage;
}

export const MMR_START = 4000;
export const MMR_BY_PLACEMENT: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
  4: 15,
  5: -15,
  6: -40,
  7: -70,
  8: -100,
};

export const RANK_THRESHOLDS = [
  { name: 'Bronze', min: 0, max: 1999, color: '#cd7f32' },
  { name: 'Silver', min: 2000, max: 2999, color: '#c0c0c0' },
  { name: 'Gold', min: 3000, max: 3999, color: '#ffd700' },
  { name: 'Platinum', min: 4000, max: 4999, color: '#7ec8e3' },
  { name: 'Diamond', min: 5000, max: 5999, color: '#b9f2ff' },
  { name: 'Master', min: 6000, max: 6999, color: '#9b59b6' },
  { name: 'Grandmaster', min: 7000, max: 99999, color: '#e74c3c' },
] as const;

export function rankForMmr(mmr: number) {
  return (
    RANK_THRESHOLDS.find((r) => mmr >= r.min && mmr <= r.max) ??
    RANK_THRESHOLDS[0]
  );
}

export const AI_NAMES = [
  'IronMaw',
  'Nova',
  'Hex',
  'Ashveil',
  'Thornwick',
  'Cinder',
  'Vesper',
  'Grimholt',
  'Skarn',
  'Lumen',
  'Rook',
  'Nyx',
];
