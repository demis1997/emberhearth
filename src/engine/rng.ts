/**
 * Seeded PRNG (mulberry32) for reproducible matches.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Cannot pick from empty array');
    return arr[this.int(0, arr.length - 1)]!;
  }

  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    this.shuffle(copy);
    return copy.slice(0, Math.min(n, copy.length));
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  getSeed(): number {
    return this.state;
  }
}

export function createMatchSeed(): number {
  return (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
}
