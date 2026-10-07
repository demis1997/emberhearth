import {
  BUY_COST,
  MAX_BOARD_SIZE,
  REFRESH_COST,
  upgradeCost,
} from '../config/balance';
import { getHeroDef } from '../data/heroes';
import { getMinionDef } from '../data/minions';
import { boardPower, countTribe } from './minionFactory';
import type { MinionPool } from './poolEngine';
import type { SeededRNG } from './rng';
import {
  buyMinion,
  playMinion,
  refreshShop,
  sellMinion,
  upgradeTavern,
  activateHeroPower,
} from './shopEngine';
import type { AIPersonality, PlayerState, Tribe } from './types';

function minionScore(
  defId: string,
  player: PlayerState,
  personality: AIPersonality,
  preferredTribe: Tribe | null,
): number {
  const def = getMinionDef(defId);
  let score = def.attack + def.health + def.tavernTier * 2;

  if (def.abilities.length) score += 3;
  if (def.keywords.includes('guard')) score += 2;
  if (def.keywords.includes('reborn')) score += 3;
  if (def.keywords.includes('shield')) score += 2;

  // Synergy
  if (preferredTribe && def.tribe === preferredTribe) {
    score += personality === 'synergy' ? 12 : 6;
    score += countTribe(player.board, preferredTribe) * 2;
  }

  // Triple hunting
  const owned = [...player.board, ...player.hand].filter(
    (m) => m.defId === defId && !m.golden,
  ).length;
  if (owned >= 1) score += personality === 'highRoller' ? 10 : 5;
  if (owned >= 2) score += 15;

  if (personality === 'economy' && (def.tribe === 'pirate' || def.tribe === 'elemental')) {
    score += 5;
  }
  if (personality === 'aggressive') {
    score += def.attack * 1.5;
  }

  return score;
}

function detectPreferredTribe(player: PlayerState, activeTribes: Tribe[]): Tribe | null {
  const counts: Partial<Record<Tribe, number>> = {};
  for (const m of [...player.board, ...player.hand]) {
    const t = getMinionDef(m.defId).tribe;
    if (t === 'neutral') continue;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  let best: Tribe | null = null;
  let bestN = 0;
  for (const t of activeTribes) {
    const n = counts[t] ?? 0;
    if (n > bestN) {
      bestN = n;
      best = t;
    }
  }
  if (bestN >= 2) return best;

  const hero = getHeroDef(player.heroId);
  if (hero.preferredTribes) {
    for (const t of hero.preferredTribes) {
      if (activeTribes.includes(t)) return t;
    }
  }
  return best;
}

function shouldUpgrade(player: PlayerState, personality: AIPersonality, round: number): boolean {
  if (player.tavernTier >= 6) return false;
  const cost = upgradeCost(player.tavernTier, player.roundsAtTier);
  if (player.gold < cost) return false;

  const boardSize = player.board.length;
  switch (personality) {
    case 'greedy':
      return boardSize >= 2 || round >= 2;
    case 'aggressive':
      return boardSize >= 5 && player.gold >= cost + BUY_COST;
    case 'economy':
      return round >= player.tavernTier + 2 && boardSize >= 4;
    case 'highRoller':
      return player.gold >= cost;
    case 'synergy':
      return boardSize >= 4 && player.gold >= cost + 3;
    default:
      return boardSize >= 3 && player.gold >= cost + BUY_COST;
  }
}

function weakestBoardIndex(player: PlayerState): number {
  let worst = 0;
  let worstScore = Infinity;
  player.board.forEach((m, i) => {
    const s = m.attack + m.health + (m.golden ? 10 : 0);
    if (s < worstScore) {
      worstScore = s;
      worst = i;
    }
  });
  return worst;
}

function positionBoard(player: PlayerState): void {
  // Guards first, then high attack, then deathrattle-ish in back
  player.board.sort((a, b) => {
    const ag = a.keywords.includes('guard') ? 1 : 0;
    const bg = b.keywords.includes('guard') ? 1 : 0;
    if (ag !== bg) return bg - ag;
    const ad = a.keywords.includes('deathEffect') || a.keywords.includes('reborn') ? 1 : 0;
    const bd = b.keywords.includes('deathEffect') || b.keywords.includes('reborn') ? 1 : 0;
    if (ad !== bd) return ad - bd; // death effects toward back (higher index)
    return b.attack - a.attack;
  });
}

/**
 * Run a full AI recruitment turn.
 * Higher MMR → better decisions (fewer random mistakes, smarter sells).
 */
export function runAITurn(
  player: PlayerState,
  pool: MinionPool,
  rng: SeededRNG,
  activeTribes: Tribe[],
  round: number,
  playerMmr: number,
): void {
  const personality = player.aiPersonality ?? 'flexible';
  const skill = Math.min(1, Math.max(0, (playerMmr - 3000) / 4000)); // 0..1
  const preferred = detectPreferredTribe(player, activeTribes);
  let actions = 0;
  const maxActions = 20 + Math.floor(skill * 10);

  // Use hero power if useful
  const hero = getHeroDef(player.heroId);
  if (hero.heroPower.type === 'active' && rng.chance(0.4 + skill * 0.4)) {
    activateHeroPower(player, pool, rng);
  }

  while (actions++ < maxActions) {
    // Upgrade?
    if (shouldUpgrade(player, personality, round) && rng.chance(0.5 + skill * 0.4)) {
      if (upgradeTavern(player)) continue;
    }

    // Play hand to board
    while (player.hand.length > 0 && player.board.length < MAX_BOARD_SIZE) {
      const played = playMinion(player, 0, player.board.length, pool, rng, {
        activeTribes,
      });
      if (!played) break;
    }

    // Buy best shop minion
    if (player.gold >= BUY_COST && player.hand.length < 10 && player.shop.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      player.shop.forEach((m, i) => {
        let s = minionScore(m.defId, player, personality, preferred);
        // Mistake chance at low skill
        if (rng.chance(0.25 * (1 - skill))) s += rng.float(-8, 8);
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      });

      // Maybe sell weak to make room / gold for better
      if (
        player.board.length >= MAX_BOARD_SIZE &&
        player.hand.length >= 1 &&
        bestScore > 8
      ) {
        const wi = weakestBoardIndex(player);
        const weak = player.board[wi]!;
        const weakScore = weak.attack + weak.health;
        if (bestScore > weakScore + 4) {
          sellMinion(player, 'board', wi, pool);
        }
      }

      if (bestIdx >= 0 && bestScore > 3) {
        const result = buyMinion(player, bestIdx, pool, rng);
        if (result.ok) {
          while (player.hand.length > 0 && player.board.length < MAX_BOARD_SIZE) {
            playMinion(player, 0, player.board.length, pool, rng, { activeTribes });
          }
          continue;
        }
      }
    }

    // Refresh if gold and looking for synergies
    const wantRefresh =
      player.gold >= REFRESH_COST + (personality === 'highRoller' ? 0 : BUY_COST) &&
      (personality === 'highRoller' ||
        personality === 'synergy' ||
        player.shop.every(
          (m) => minionScore(m.defId, player, personality, preferred) < 8,
        ));

    if (wantRefresh && rng.chance(0.35 + skill * 0.3)) {
      refreshShop(player, pool, rng);
      continue;
    }

    break;
  }

  // Spend leftover: buy anything reasonable
  while (player.gold >= BUY_COST && player.shop.length > 0 && player.hand.length < 10) {
    const idx = player.shop.reduce(
      (best, m, i, arr) => {
        const s = minionScore(m.defId, player, personality, preferred);
        return s > minionScore(arr[best]!.defId, player, personality, preferred) ? i : best;
      },
      0,
    );
    if (minionScore(player.shop[idx]!.defId, player, personality, preferred) < 4) break;
    if (!buyMinion(player, idx, pool, rng).ok) break;
  }

  while (player.hand.length > 0 && player.board.length < MAX_BOARD_SIZE) {
    playMinion(player, 0, player.board.length, pool, rng, { activeTribes });
  }

  // Freeze if shop has good pieces for next turn
  if (player.shop.some((m) => minionScore(m.defId, player, personality, preferred) >= 12)) {
    player.shopFrozen = true;
  }

  positionBoard(player);
  void boardPower;
}
