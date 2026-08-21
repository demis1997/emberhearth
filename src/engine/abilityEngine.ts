import { MAX_BOARD_SIZE } from '../config/balance';
import { getMinionDef } from '../data/minions';
import {
  addKeyword,
  applyStatBuff,
  createMinionInstance,
  getMinionAbilities,
} from './minionFactory';
import type { MinionPool } from './poolEngine';
import type { SeededRNG } from './rng';
import { forceRefreshShop } from './shopEngine';
import type {
  AbilityDef,
  AbilityEffect,
  AbilityTarget,
  MinionInstance,
  PlayerState,
  Tribe,
} from './types';
import { applyHeroDamage } from './shopEngine';

export interface AbilityRuntimeContext {
  player: PlayerState;
  source: MinionInstance;
  pool: MinionPool;
  rng: SeededRNG;
  /** For combat: boards */
  friendlyBoard?: MinionInstance[];
  enemyBoard?: MinionInstance[];
  summoned?: MinionInstance;
  /** Double consume for soulfeast */
  consumeMultiplier?: number;
}

export function resolveRecruitAbilities(
  player: PlayerState,
  source: MinionInstance,
  trigger: AbilityDef['trigger'],
  pool: MinionPool,
  rng: SeededRNG,
  _extra?: { activeTribes: Tribe[] },
): void {
  const abilities = getMinionAbilities(source).filter((a) => a.trigger === trigger);
  const ctx: AbilityRuntimeContext = { player, source, pool, rng, friendlyBoard: player.board };

  // Special: soulfeast doubles consume
  if (source.defId === 'demon_soulfeast') ctx.consumeMultiplier = 2;

  for (const ab of abilities) {
    for (const eff of ab.effects) {
      applyEffect(eff, ctx);
    }
  }
}

export function resolveEndOfTurn(player: PlayerState, pool: MinionPool, rng: SeededRNG): void {
  // Snapshot board to avoid infinite summon loops within same tick beyond board size
  const boardSnap = [...player.board];
  for (const source of boardSnap) {
    if (!player.board.includes(source)) continue;
    resolveRecruitAbilities(player, source, 'endOfTurn', pool, rng);
  }
}

function getTargets(
  target: AbilityTarget,
  ctx: AbilityRuntimeContext,
  tribe?: Tribe,
): MinionInstance[] {
  const board = ctx.friendlyBoard ?? ctx.player.board;
  const enemy = ctx.enemyBoard ?? [];

  switch (target) {
    case 'self':
      return [ctx.source];
    case 'allFriendly':
      return tribe
        ? board.filter((m) => getMinionDef(m.defId).tribe === tribe)
        : [...board];
    case 'allEnemy':
      return [...enemy];
    case 'randomFriendly': {
      let pool = board.filter((m) => m.instanceId !== ctx.source.instanceId);
      if (tribe) pool = pool.filter((m) => getMinionDef(m.defId).tribe === tribe);
      // For giveKeyword to construct, include constructs
      if (pool.length === 0) {
        pool = tribe
          ? board.filter((m) => getMinionDef(m.defId).tribe === tribe)
          : board.filter((m) => m.instanceId !== ctx.source.instanceId);
      }
      if (pool.length === 0) return [];
      return [ctx.rng.pick(pool)];
    }
    case 'randomEnemy':
      if (enemy.length === 0) return [];
      return [ctx.rng.pick(enemy)];
    case 'adjacent': {
      const idx = board.findIndex((m) => m.instanceId === ctx.source.instanceId);
      const adj: MinionInstance[] = [];
      if (idx > 0) adj.push(board[idx - 1]!);
      if (idx >= 0 && idx < board.length - 1) adj.push(board[idx + 1]!);
      return adj;
    }
    case 'friendlyTribe':
      return board.filter((m) => tribe && getMinionDef(m.defId).tribe === tribe);
    case 'leftmost':
      return board.length ? [board[0]!] : [];
    case 'summoned':
      return ctx.summoned ? [ctx.summoned] : [];
    case 'shop':
      return [...ctx.player.shop];
    default:
      return [];
  }
}

export function applyEffect(eff: AbilityEffect, ctx: AbilityRuntimeContext): void {
  const { player, rng, pool } = ctx;

  switch (eff.type) {
    case 'buffStats': {
      const targets = getTargets(eff.target, ctx);
      for (const t of targets) {
        applyStatBuff(t, eff.attack ?? 0, eff.health ?? 0, eff.permanent !== false);
      }
      break;
    }
    case 'buffTribe': {
      const targets = getTargets(eff.target, ctx, eff.tribe);
      for (const t of targets) {
        applyStatBuff(t, eff.attack ?? 0, eff.health ?? 0, true);
      }
      break;
    }
    case 'summon': {
      const board = ctx.friendlyBoard ?? player.board;
      for (let i = 0; i < eff.count; i++) {
        if (board.length >= MAX_BOARD_SIZE) break;
        const token = createMinionInstance(eff.minionId, { rng });
        if (eff.stats) {
          token.attack = eff.stats.attack;
          token.health = eff.stats.health;
          token.maxHealth = eff.stats.health;
        }
        board.push(token);
        // Trigger onSummon on existing board (excluding the new one)
        triggerOnSummon(player, token, board, pool, rng, ctx.enemyBoard);
      }
      break;
    }
    case 'damage': {
      const targets = getTargets(eff.target, ctx);
      for (const t of targets) {
        if (t.hasShield) {
          t.hasShield = false;
          t.keywords = t.keywords.filter((k) => k !== 'shield');
        } else {
          t.health -= eff.amount;
        }
      }
      break;
    }
    case 'gainGold': {
      let amount = eff.amount;
      // Goldtooth: gold = tavern tier
      if (ctx.source.defId === 'pirate_goldtooth' && amount === 0) {
        amount = player.tavernTier;
      }
      player.gold += amount;
      break;
    }
    case 'gainArmor':
      player.armor += eff.amount;
      break;
    case 'refreshShop':
      forceRefreshShop(player, pool, rng);
      break;
    case 'buffShop': {
      player.shopAttackBuff += eff.attack ?? 0;
      player.shopHealthBuff += eff.health ?? 0;
      for (const m of player.shop) {
        applyStatBuff(m, eff.attack ?? 0, eff.health ?? 0, true);
      }
      break;
    }
    case 'giveKeyword': {
      let targets = getTargets(eff.target, ctx);
      // Riveter: prefer constructs
      if (ctx.source.defId === 'construct_riveter') {
        const constructs = player.board.filter(
          (m) =>
            m.instanceId !== ctx.source.instanceId &&
            getMinionDef(m.defId).tribe === 'construct',
        );
        if (constructs.length) targets = [rng.pick(constructs)];
      }
      for (const t of targets) addKeyword(t, eff.keyword);
      break;
    }
    case 'consumeTavern': {
      if (player.shop.length === 0) break;
      const idx = rng.int(0, player.shop.length - 1);
      const eaten = player.shop.splice(idx, 1)[0]!;
      pool.return(eaten.defId);
      const mult = ctx.consumeMultiplier ?? 1;
      applyStatBuff(ctx.source, eaten.attack * mult, eaten.health * mult, true);
      break;
    }
    case 'dealHeroDamage':
      applyHeroDamage(player, eff.amount);
      break;
    default:
      break;
  }
}

export function triggerOnSummon(
  player: PlayerState,
  summoned: MinionInstance,
  board: MinionInstance[],
  pool: MinionPool,
  rng: SeededRNG,
  enemyBoard?: MinionInstance[],
): void {
  const tribe = getMinionDef(summoned.defId).tribe;
  for (const m of [...board]) {
    if (m.instanceId === summoned.instanceId) continue;
    const abs = getMinionAbilities(m).filter((a) => a.trigger === 'onSummon');
    for (const ab of abs) {
      if (ab.tribeFilter && ab.tribeFilter !== tribe) continue;
      const ctx: AbilityRuntimeContext = {
        player,
        source: m,
        pool,
        rng,
        friendlyBoard: board,
        enemyBoard,
        summoned,
      };
      for (const eff of ab.effects) applyEffect(eff, ctx);
    }
  }
}

/** Special start-of-combat scaling that counts tribe */
export function applyStartOfCombatSpecial(
  source: MinionInstance,
  board: MinionInstance[],
): void {
  if (source.defId === 'beast_primalforce') {
    const count = board.filter((m) => getMinionDef(m.defId).tribe === 'beast').length;
    applyStatBuff(source, count, 0, false);
  }
  if (source.defId === 'demon_pactlord') {
    const count = board.filter((m) => getMinionDef(m.defId).tribe === 'demon').length;
    applyStatBuff(source, count, count, false);
  }
}
