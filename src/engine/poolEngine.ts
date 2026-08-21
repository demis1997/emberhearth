import { POOL_COPIES } from '../config/balance';
import { getPoolMinions, TOKEN_IDS } from '../data/minions';
import type { MinionDef, Tribe } from './types';
import type { SeededRNG } from './rng';

/** Shared finite minion pool for a match */
export class MinionPool {
  /** defId -> remaining copies */
  private copies: Map<string, number> = new Map();
  private activeTribes: Tribe[];

  constructor(activeTribes: Tribe[]) {
    this.activeTribes = activeTribes;
    this.reset();
  }

  reset(): void {
    this.copies.clear();
    for (const def of getPoolMinions(this.activeTribes)) {
      this.copies.set(def.id, POOL_COPIES[def.tavernTier] ?? 10);
    }
  }

  available(defId: string): number {
    return this.copies.get(defId) ?? 0;
  }

  take(defId: string): boolean {
    const n = this.copies.get(defId) ?? 0;
    if (n <= 0) return false;
    this.copies.set(defId, n - 1);
    return true;
  }

  return(defId: string): void {
    if (TOKEN_IDS.has(defId)) return;
    if (!this.copies.has(defId)) return;
    this.copies.set(defId, (this.copies.get(defId) ?? 0) + 1);
  }

  /** Return multiple copies (e.g. from eliminated player) */
  returnMany(defIds: string[]): void {
    for (const id of defIds) this.return(id);
  }

  getDefsUpToTier(tier: number): MinionDef[] {
    return getPoolMinions(this.activeTribes).filter(
      (d) => d.tavernTier <= tier && (this.copies.get(d.id) ?? 0) > 0,
    );
  }

  rollShop(tier: number, count: number, rng: SeededRNG): string[] {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const available = this.getDefsUpToTier(tier);
      if (available.length === 0) break;
      // Weight higher tiers slightly less for lower tavern tiers (natural via pool)
      const weights = available.map((d) => {
        const remaining = this.copies.get(d.id) ?? 0;
        // Prefer same-tier-ish
        const tierWeight = d.tavernTier === tier ? 3 : d.tavernTier === tier - 1 ? 2 : 1;
        return remaining * tierWeight;
      });
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) break;
      let roll = rng.float(0, total);
      let chosen = available[0]!;
      for (let j = 0; j < available.length; j++) {
        roll -= weights[j]!;
        if (roll <= 0) {
          chosen = available[j]!;
          break;
        }
      }
      if (this.take(chosen.id)) {
        result.push(chosen.id);
      }
    }
    return result;
  }

  discoverOptions(
    tier: number,
    count: number,
    rng: SeededRNG,
  ): string[] {
    const defs = this.getDefsUpToTier(tier);
    if (defs.length === 0) return [];
    const picked = rng.pickN(defs, Math.min(count, defs.length));
    return picked.map((d) => d.id);
  }
}
