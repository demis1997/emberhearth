import {
  BUY_COST,
  MAX_BOARD_SIZE,
  MAX_HAND_SIZE,
  REFRESH_COST,
  SELL_VALUE,
  SHOP_SIZE,
  upgradeCost,
} from '../config/balance';
import { getHeroDef } from '../data/heroes';
import { getMinionDef } from '../data/minions';
import {
  applyStatBuff,
  createGoldenFromCopies,
  createMinionInstance,
  findTripleDefId,
  getMinionAbilities,
} from './minionFactory';
import type { MinionPool } from './poolEngine';
import type { SeededRNG } from './rng';
import type { MinionInstance, PlayerState, Tribe } from './types';
import { resolveRecruitAbilities } from './abilityEngine';

export function refreshShop(
  player: PlayerState,
  pool: MinionPool,
  rng: SeededRNG,
  free = false,
): boolean {
  if (!free && player.gold < REFRESH_COST) return false;
  if (!free) player.gold -= REFRESH_COST;

  // Return non-frozen shop to pool
  if (!player.shopFrozen) {
    for (const m of player.shop) {
      pool.return(m.defId);
    }
    const size = SHOP_SIZE[player.tavernTier] ?? 3;
    const ids = pool.rollShop(player.tavernTier, size, rng);
    player.shop = ids.map((id) => {
      const inst = createMinionInstance(id, {
        rng,
        attackBuff: player.shopAttackBuff,
        healthBuff: player.shopHealthBuff,
      });
      return inst;
    });
  }
  // Frozen shop stays
  player.shopFrozen = false;
  return true;
}

export function forceRefreshShop(
  player: PlayerState,
  pool: MinionPool,
  rng: SeededRNG,
): void {
  for (const m of player.shop) pool.return(m.defId);
  const size = SHOP_SIZE[player.tavernTier] ?? 3;
  const ids = pool.rollShop(player.tavernTier, size, rng);
  player.shop = ids.map((id) =>
    createMinionInstance(id, {
      rng,
      attackBuff: player.shopAttackBuff,
      healthBuff: player.shopHealthBuff,
    }),
  );
  player.shopFrozen = false;
}

export function toggleFreeze(player: PlayerState): void {
  player.shopFrozen = !player.shopFrozen;
}

export function buyMinion(
  player: PlayerState,
  shopIndex: number,
  _pool: MinionPool,
  rng: SeededRNG,
): { ok: boolean; triple?: MinionInstance; discoverTier?: number } {
  if (shopIndex < 0 || shopIndex >= player.shop.length) return { ok: false };
  if (player.gold < BUY_COST) return { ok: false };
  if (player.hand.length >= MAX_HAND_SIZE) return { ok: false };

  const minion = player.shop[shopIndex]!;
  player.gold -= BUY_COST;
  player.shop.splice(shopIndex, 1);
  player.hand.push(minion);
  player.minionsPurchased += 1;

  // Check triples
  const tripleId = findTripleDefId(player.board, player.hand);
  if (tripleId) {
    const result = combineTriple(player, tripleId, rng);
    return {
      ok: true,
      triple: result.golden,
      discoverTier: Math.min(6, player.tavernTier + 1),
    };
  }
  return { ok: true };
}

export function combineTriple(
  player: PlayerState,
  defId: string,
  rng: SeededRNG,
): { golden: MinionInstance } {
  const copies: MinionInstance[] = [];
  const takeFrom = (arr: MinionInstance[]) => {
    for (let i = arr.length - 1; i >= 0 && copies.length < 3; i--) {
      if (arr[i]!.defId === defId && !arr[i]!.golden) {
        copies.push(arr[i]!);
        arr.splice(i, 1);
      }
    }
  };
  takeFrom(player.hand);
  takeFrom(player.board);
  const golden = createGoldenFromCopies(copies, rng);
  if (player.hand.length < MAX_HAND_SIZE) {
    player.hand.push(golden);
  } else if (player.board.length < MAX_BOARD_SIZE) {
    player.board.push(golden);
  } else {
    player.hand.push(golden); // overflow allowed briefly
  }
  player.triplesCreated += 1;
  return { golden };
}

export function sellMinion(
  player: PlayerState,
  from: 'board' | 'hand',
  index: number,
  pool: MinionPool,
): boolean {
  const arr = from === 'board' ? player.board : player.hand;
  if (index < 0 || index >= arr.length) return false;
  const minion = arr[index]!;
  arr.splice(index, 1);

  // onSell abilities
  const abilities = getMinionAbilities(minion);
  for (const ab of abilities) {
    if (ab.trigger === 'onSell') {
      for (const eff of ab.effects) {
        if (eff.type === 'gainGold') player.gold += eff.amount;
      }
    }
  }

  player.gold += SELL_VALUE + (minion.golden ? 1 : 0);
  // Golden returns as 3 base copies conceptually — return 1 for simplicity of pool
  pool.return(minion.defId);
  if (minion.golden) {
    pool.return(minion.defId);
    pool.return(minion.defId);
  }
  return true;
}

export function playMinion(
  player: PlayerState,
  handIndex: number,
  boardIndex: number,
  pool: MinionPool,
  rng: SeededRNG,
  ctx: AbilityContextLite,
): boolean {
  if (handIndex < 0 || handIndex >= player.hand.length) return false;
  if (player.board.length >= MAX_BOARD_SIZE) return false;
  const minion = player.hand[handIndex]!;
  player.hand.splice(handIndex, 1);
  const idx = Math.max(0, Math.min(boardIndex, player.board.length));
  player.board.splice(idx, 0, minion);

  resolveRecruitAbilities(player, minion, 'battlecry', pool, rng, ctx);

  // Passive: first beast buff
  const hero = getHeroDef(player.heroId);
  if (
    hero.heroPower.effect.kind === 'firstBeastBuff' &&
    !player.firstBeastSummonedThisTurn &&
    getMinionDef(minion.defId).tribe === 'beast'
  ) {
    const eff = hero.heroPower.effect;
    applyStatBuff(minion, eff.attack, eff.health, true);
    player.firstBeastSummonedThisTurn = true;
  }

  // Check triples again (golden might have been played)
  const tripleId = findTripleDefId(player.board, player.hand);
  if (tripleId) combineTriple(player, tripleId, rng);

  return true;
}

export function reposition(
  player: PlayerState,
  fromIndex: number,
  toIndex: number,
): boolean {
  if (
    fromIndex < 0 ||
    fromIndex >= player.board.length ||
    toIndex < 0 ||
    toIndex >= player.board.length
  )
    return false;
  const [m] = player.board.splice(fromIndex, 1);
  player.board.splice(toIndex, 0, m!);
  return true;
}

export function upgradeTavern(player: PlayerState): boolean {
  if (player.tavernTier >= 6) return false;
  const cost = upgradeCost(player.tavernTier, player.roundsAtTier);
  if (player.gold < cost) return false;
  player.gold -= cost;
  player.tavernTier += 1;
  player.roundsAtTier = 0;

  const hero = getHeroDef(player.heroId);
  if (hero.heroPower.effect.kind === 'afterUpgradeBuff') {
    const eff = hero.heroPower.effect;
    for (const m of player.board) {
      applyStatBuff(m, eff.attack, eff.health, true);
    }
  }
  return true;
}

export function activateHeroPower(
  player: PlayerState,
  pool: MinionPool,
  rng: SeededRNG,
): boolean {
  const hero = getHeroDef(player.heroId);
  const hp = hero.heroPower;
  if (hp.type === 'passive') return false;
  if (player.heroPowerUsedThisTurn >= hp.usesPerTurn) return false;
  if (player.gold < hp.cost) return false;

  player.gold -= hp.cost;
  player.heroPowerUsedThisTurn += 1;
  const eff = hp.effect;

  switch (eff.kind) {
    case 'refreshFree':
      forceRefreshShop(player, pool, rng);
      break;
    case 'damageSelfRefresh': {
      applyHeroDamage(player, eff.damage);
      forceRefreshShop(player, pool, rng);
      // voidpawn special: also buff attack
      if (player.heroId === 'hero_voidpawn') {
        for (const m of player.board) applyStatBuff(m, 1, 0, true);
      }
      break;
    }
    case 'buffShopMinion': {
      if (player.heroId === 'hero_tidewitch') {
        for (const m of player.shop) applyStatBuff(m, eff.attack, eff.health, true);
        player.shopAttackBuff += eff.attack;
        player.shopHealthBuff += eff.health;
      } else if (player.shop.length > 0) {
        const target = rng.pick(player.shop);
        applyStatBuff(target, eff.attack, eff.health, true);
      }
      break;
    }
    case 'sellRandomShop': {
      if (player.shop.length === 0) {
        player.gold += hp.cost; // refund
        player.heroPowerUsedThisTurn -= 1;
        return false;
      }
      const idx = rng.int(0, player.shop.length - 1);
      const sold = player.shop.splice(idx, 1)[0]!;
      pool.return(sold.defId);
      player.gold += eff.goldGain;
      break;
    }
    case 'gainGold':
      player.gold += eff.amount;
      if (player.heroId === 'hero_nightfang') {
        forceRefreshShop(player, pool, rng);
      }
      break;
    case 'buffBoard': {
      if (player.heroId === 'hero_ironjaw' && player.board.length > 0) {
        applyStatBuff(player.board[0]!, eff.attack, eff.health, true);
      } else if (player.heroId === 'hero_gearborn' && player.board.length > 0) {
        const t = rng.pick(player.board);
        applyStatBuff(t, 0, 1, true);
        if (!t.hasShield) {
          t.hasShield = true;
          if (!t.keywords.includes('shield')) t.keywords.push('shield');
        }
      } else {
        for (const m of player.board) applyStatBuff(m, eff.attack, eff.health, true);
      }
      break;
    }
    case 'summonToken': {
      if (player.board.length >= MAX_BOARD_SIZE) {
        player.gold += hp.cost;
        player.heroPowerUsedThisTurn -= 1;
        return false;
      }
      const tokenId =
        eff.tribe === 'undead' ? 'token_skeleton' : 'token_generic';
      const token = createMinionInstance(tokenId, { rng });
      token.attack = eff.attack;
      token.health = eff.health;
      token.maxHealth = eff.health;
      player.board.push(token);
      break;
    }
    case 'gainArmor':
      player.armor += eff.amount;
      break;
    default:
      break;
  }
  return true;
}

export function applyHeroDamage(player: PlayerState, amount: number): void {
  let dmg = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, dmg);
    player.armor -= absorbed;
    dmg -= absorbed;
  }
  player.health -= dmg;
  if (player.health <= 0) {
    player.health = 0;
    player.alive = false;
  }
}

export function setPlayerGoldForRound(player: PlayerState, round: number): void {
  const gold = Math.min(10, 3 + round - 1);
  player.gold = gold;
  player.maxGold = gold;
  player.heroPowerUsedThisTurn = 0;
  player.firstBeastSummonedThisTurn = false;
  player.roundsAtTier += 1;
}

export interface AbilityContextLite {
  activeTribes: Tribe[];
  keeperLine?: (line: string) => void;
}
