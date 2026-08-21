import {
  MMR_BY_PLACEMENT,
  MMR_START,
  rankForMmr,
} from '../config/balance';
import type {
  GameSettings,
  MatchHistoryEntry,
  PlayerProfile,
  PlayerStats,
  Tribe,
} from '../engine/types';

const STORAGE_KEY = 'emberhearth_profile_v1';

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  top4s: 0,
  totalPlacement: 0,
  heroPlayCounts: {},
  heroWins: {},
  tribePlayCounts: {},
  totalMinionsPurchased: 0,
  totalTriplesCreated: 0,
};

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  musicVolume: 0.4,
  effectsVolume: 0.7,
  combatSpeed: 1,
  recruitTimer: true,
};

export function createDefaultProfile(): PlayerProfile {
  return {
    name: 'Adventurer',
    mmr: MMR_START,
    peakMmr: MMR_START,
    matchHistory: [],
    stats: { ...DEFAULT_STATS, heroPlayCounts: {}, heroWins: {}, tribePlayCounts: {} },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as PlayerProfile;
    return {
      ...createDefaultProfile(),
      ...parsed,
      stats: { ...DEFAULT_STATS, ...parsed.stats },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function mmrChangeForPlacement(placement: number): number {
  return MMR_BY_PLACEMENT[placement] ?? 0;
}

export function applyMatchResult(
  profile: PlayerProfile,
  result: {
    heroId: string;
    placement: number;
    activeTribes: Tribe[];
    finalBoard: MatchHistoryEntry['finalBoard'];
    turnsSurvived: number;
    minionsPurchased: number;
    triplesCreated: number;
  },
): PlayerProfile {
  const delta = mmrChangeForPlacement(result.placement);
  const mmrBefore = profile.mmr;
  const mmrAfter = Math.max(0, mmrBefore + delta);
  const peakMmr = Math.max(profile.peakMmr, mmrAfter);

  const entry: MatchHistoryEntry = {
    id: `hist_${Date.now()}`,
    date: new Date().toISOString(),
    heroId: result.heroId,
    placement: result.placement,
    mmrChange: delta,
    mmrBefore,
    mmrAfter,
    activeTribes: result.activeTribes,
    finalBoard: result.finalBoard,
    turnsSurvived: result.turnsSurvived,
  };

  const stats = { ...profile.stats };
  stats.gamesPlayed += 1;
  stats.totalPlacement += result.placement;
  if (result.placement === 1) stats.wins += 1;
  if (result.placement <= 4) stats.top4s += 1;
  stats.heroPlayCounts[result.heroId] =
    (stats.heroPlayCounts[result.heroId] ?? 0) + 1;
  if (result.placement === 1) {
    stats.heroWins[result.heroId] = (stats.heroWins[result.heroId] ?? 0) + 1;
  }
  for (const t of result.activeTribes) {
    stats.tribePlayCounts[t] = (stats.tribePlayCounts[t] ?? 0) + 1;
  }
  stats.totalMinionsPurchased += result.minionsPurchased;
  stats.totalTriplesCreated += result.triplesCreated;

  const next: PlayerProfile = {
    ...profile,
    mmr: mmrAfter,
    peakMmr,
    matchHistory: [entry, ...profile.matchHistory].slice(0, 50),
    stats,
  };
  saveProfile(next);
  return next;
}

export function getRankInfo(mmr: number) {
  return rankForMmr(mmr);
}

/** Persistence adapter — swap for Supabase later */
export interface PersistenceAdapter {
  load(): Promise<PlayerProfile>;
  save(profile: PlayerProfile): Promise<void>;
}

export const localPersistence: PersistenceAdapter = {
  async load() {
    return loadProfile();
  },
  async save(profile) {
    saveProfile(profile);
  },
};
