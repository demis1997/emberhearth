import { getMinionDef } from '../data/minions';
import type {
  Keyword,
  MinionDef,
  MinionInstance,
} from './types';
import type { SeededRNG } from './rng';

let instanceCounter = 0;

export function createInstanceId(rng?: SeededRNG): string {
  instanceCounter += 1;
  const r = rng ? rng.int(1000, 9999) : Math.floor(Math.random() * 9000) + 1000;
  return `m_${instanceCounter}_${r}`;
}

export function createMinionInstance(
  defId: string,
  opts: {
    golden?: boolean;
    rng?: SeededRNG;
    attackBuff?: number;
    healthBuff?: number;
  } = {},
): MinionInstance {
  const def = getMinionDef(defId);
  const golden = opts.golden ?? false;
  const atkBuff = opts.attackBuff ?? 0;
  const hpBuff = opts.healthBuff ?? 0;
  const baseAtk = golden ? (def.goldenAttack ?? def.attack * 2) : def.attack;
  const baseHp = golden ? (def.goldenHealth ?? def.health * 2) : def.health;
  const keywords = [...def.keywords];
  if (golden && !keywords.includes('shield') && def.rarity === 'legendary') {
    // golden legendaries keep keywords as-is
  }

  return {
    instanceId: createInstanceId(opts.rng),
    defId,
    attack: baseAtk + atkBuff,
    health: baseHp + hpBuff,
    maxHealth: baseHp + hpBuff,
    golden,
    keywords: [...keywords],
    attackBuff: atkBuff,
    healthBuff: hpBuff,
    rebornUsed: false,
    avengeProgress: 0,
    hasShield: keywords.includes('shield'),
    tempAttack: 0,
    attacksThisCombat: 0,
  };
}

export function cloneMinion(m: MinionInstance): MinionInstance {
  return {
    ...m,
    keywords: [...m.keywords],
  };
}

export function getEffectiveAttack(m: MinionInstance): number {
  return m.attack + m.tempAttack;
}

export function getMinionAbilities(m: MinionInstance) {
  const def = getMinionDef(m.defId);
  if (m.golden && def.goldenAbilities) return def.goldenAbilities;
  return def.abilities;
}

export function getMinionDescription(m: MinionInstance): string {
  const def = getMinionDef(m.defId);
  if (m.golden && def.goldenDescription) return def.goldenDescription;
  return def.description;
}

export function applyStatBuff(
  m: MinionInstance,
  attack: number,
  health: number,
  permanent = true,
): void {
  if (attack) {
    if (permanent) {
      m.attack += attack;
      m.attackBuff += attack;
    } else {
      m.tempAttack += attack;
    }
  }
  if (health) {
    m.health += health;
    m.maxHealth += health;
    if (permanent) m.healthBuff += health;
  }
}

export function addKeyword(m: MinionInstance, kw: Keyword): void {
  if (!m.keywords.includes(kw)) m.keywords.push(kw);
  if (kw === 'shield') m.hasShield = true;
}

export function dealDamageToMinion(
  m: MinionInstance,
  amount: number,
): { shielded: boolean; killed: boolean; damageTaken: number } {
  if (amount <= 0) return { shielded: false, killed: false, damageTaken: 0 };
  if (m.hasShield) {
    m.hasShield = false;
    m.keywords = m.keywords.filter((k) => k !== 'shield');
    return { shielded: true, killed: false, damageTaken: 0 };
  }
  m.health -= amount;
  return { shielded: false, killed: m.health <= 0, damageTaken: amount };
}

export function boardPower(board: MinionInstance[]): number {
  return board.reduce((s, m) => s + getEffectiveAttack(m) + m.health, 0);
}

export function countTribe(board: MinionInstance[], tribe: string): number {
  return board.filter((m) => getMinionDef(m.defId).tribe === tribe).length;
}

export function minionTier(m: MinionInstance): number {
  return getMinionDef(m.defId).tavernTier;
}

export function isSameDef(a: MinionInstance, b: MinionInstance): boolean {
  return a.defId === b.defId && !a.golden && !b.golden;
}

/** Find triple candidates across board + hand (non-golden) */
export function findTripleDefId(
  board: MinionInstance[],
  hand: MinionInstance[],
): string | null {
  const counts = new Map<string, number>();
  for (const m of [...board, ...hand]) {
    if (m.golden) continue;
    counts.set(m.defId, (counts.get(m.defId) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    if (count >= 3) return id;
  }
  return null;
}

export function createGoldenFromCopies(
  copies: MinionInstance[],
  rng?: SeededRNG,
): MinionInstance {
  const defId = copies[0]!.defId;
  const golden = createMinionInstance(defId, { golden: true, rng });
  // Carry over average buffs
  const atkBuff = Math.floor(
    copies.reduce((s, c) => s + c.attackBuff, 0) / copies.length,
  );
  const hpBuff = Math.floor(
    copies.reduce((s, c) => s + c.healthBuff, 0) / copies.length,
  );
  if (atkBuff || hpBuff) applyStatBuff(golden, atkBuff, hpBuff, true);
  // Merge keywords
  for (const c of copies) {
    for (const kw of c.keywords) addKeyword(golden, kw);
  }
  return golden;
}

export function defToShopPreview(def: MinionDef): string {
  return `${def.name} ${def.attack}/${def.health}`;
}
