import { combatDamage, MAX_BOARD_SIZE } from '../config/balance';
import {
  applyEffect,
  applyStartOfCombatSpecial,
  triggerOnSummon,
  type AbilityRuntimeContext,
} from './abilityEngine';
import {
  cloneMinion,
  createMinionInstance,
  dealDamageToMinion,
  getEffectiveAttack,
  getMinionAbilities,
  minionTier,
} from './minionFactory';
import type { MinionPool } from './poolEngine';
import type { SeededRNG } from './rng';
import type { CombatEvent, CombatState, MinionInstance, PlayerState } from './types';

const MAX_STEPS = 200;
const NO_POOL = null as unknown as MinionPool;

function living(board: MinionInstance[]): MinionInstance[] {
  return board.filter((m) => m.health > 0);
}

function selectTarget(enemies: MinionInstance[], rng: SeededRNG): MinionInstance {
  const live = living(enemies);
  const guards = live.filter((m) => m.keywords.includes('guard'));
  return rng.pick(guards.length > 0 ? guards : live);
}

function nextAttacker(
  board: MinionInstance[],
  startIdx: number,
): { minion: MinionInstance; index: number } | null {
  if (living(board).length === 0) return null;

  const tryFind = (): { minion: MinionInstance; index: number } | null => {
    for (let i = 0; i < board.length; i++) {
      const idx = (startIdx + i) % board.length;
      const m = board[idx]!;
      if (m.health <= 0) continue;
      const maxAtk = m.keywords.includes('windfury') ? 2 : 1;
      if (m.attacksThisCombat < maxAtk) return { minion: m, index: idx };
    }
    return null;
  };

  let found = tryFind();
  if (found) return found;
  for (const m of board) m.attacksThisCombat = 0;
  return tryFind();
}

function makeCtx(
  owner: PlayerState,
  source: MinionInstance,
  friendly: MinionInstance[],
  enemy: MinionInstance[],
  rng: SeededRNG,
): AbilityRuntimeContext {
  return {
    player: owner,
    source,
    pool: NO_POOL,
    rng,
    friendlyBoard: friendly,
    enemyBoard: enemy,
  };
}

function summonTokens(
  count: number,
  minionId: string,
  board: MinionInstance[],
  side: 'player' | 'opponent',
  owner: PlayerState,
  enemy: MinionInstance[],
  events: CombatEvent[],
  rng: SeededRNG,
): void {
  for (let i = 0; i < count; i++) {
    if (board.length >= MAX_BOARD_SIZE) break;
    const token = createMinionInstance(minionId, { rng });
    board.push(token);
    events.push({ type: 'summon', side, minion: cloneMinion(token), delayMs: 300 });
    triggerOnSummon(owner, token, board, NO_POOL, rng, enemy);
  }
}

function processDeaths(
  board: MinionInstance[],
  side: 'player' | 'opponent',
  otherBoard: MinionInstance[],
  player: PlayerState,
  opponent: PlayerState,
  events: CombatEvent[],
  rng: SeededRNG,
): void {
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 50) {
    changed = false;
    for (let i = 0; i < board.length; i++) {
      const m = board[i]!;
      if (m.health > 0) continue;
      changed = true;

      if (m.keywords.includes('reborn') && !m.rebornUsed) {
        m.rebornUsed = true;
        m.health = 1;
        events.push({
          type: 'reborn',
          actorId: m.instanceId,
          side,
          minion: cloneMinion(m),
          delayMs: 400,
        });
        continue;
      }

      const dead = board.splice(i, 1)[0]!;
      i--;
      events.push({
        type: 'death',
        actorId: dead.instanceId,
        side,
        minion: cloneMinion(dead),
        delayMs: 350,
      });

      const owner = side === 'player' ? player : opponent;
      const enemy = otherBoard;

      for (const ab of getMinionAbilities(dead)) {
        if (ab.trigger !== 'deathEffect') continue;
        const ctx = makeCtx(owner, dead, board, enemy, rng);
        for (const eff of ab.effects) {
          if (eff.type === 'summon') {
            summonTokens(eff.count, eff.minionId, board, side, owner, enemy, events, rng);
          } else if (eff.type === 'buffStats' || eff.type === 'buffTribe') {
            applyEffect(eff, ctx);
            events.push({
              type: 'ability',
              actorId: dead.instanceId,
              side,
              message: ab.description,
              delayMs: 200,
            });
          }
        }
      }

      for (const ally of [...board]) {
        if (ally.health <= 0) continue;
        for (const ab of getMinionAbilities(ally)) {
          if (ab.trigger !== 'avenge') continue;
          ally.avengeProgress += 1;
          if (ally.avengeProgress < (ab.avengeCount ?? 1)) continue;
          ally.avengeProgress = 0;
          const ctx = makeCtx(owner, ally, board, enemy, rng);
          for (const eff of ab.effects) {
            if (eff.type === 'summon') {
              summonTokens(eff.count, eff.minionId, board, side, owner, enemy, events, rng);
            } else {
              applyEffect(eff, ctx);
            }
          }
          events.push({
            type: 'ability',
            actorId: ally.instanceId,
            side,
            message: ab.description,
            delayMs: 250,
          });
        }
      }
    }
  }
}

export function simulateCombat(
  player: PlayerState,
  opponent: PlayerState,
  rng: SeededRNG,
): CombatState {
  const playerBoard = player.board.map(cloneMinion);
  const opponentBoard = opponent.board.map(cloneMinion);
  for (const m of [...playerBoard, ...opponentBoard]) {
    m.attacksThisCombat = 0;
    m.tempAttack = 0;
    m.avengeProgress = 0;
  }

  const events: CombatEvent[] = [];

  const runSoC = (
    board: MinionInstance[],
    other: MinionInstance[],
    side: 'player' | 'opponent',
    owner: PlayerState,
  ) => {
    for (const m of [...board]) {
      if (m.health <= 0) continue;
      applyStartOfCombatSpecial(m, board);
      for (const ab of getMinionAbilities(m)) {
        if (ab.trigger !== 'startOfCombat') continue;
        const ctx = makeCtx(owner, m, board, other, rng);
        for (const eff of ab.effects) {
          if (
            (m.defId === 'beast_primalforce' || m.defId === 'demon_pactlord') &&
            eff.type === 'buffStats'
          ) {
            continue;
          }
          applyEffect(eff, ctx);
        }
        events.push({
          type: 'startOfCombat',
          actorId: m.instanceId,
          side,
          message: ab.description,
          delayMs: 400,
        });
      }
    }
  };

  runSoC(playerBoard, opponentBoard, 'player', player);
  runSoC(opponentBoard, playerBoard, 'opponent', opponent);
  processDeaths(playerBoard, 'player', opponentBoard, player, opponent, events, rng);
  processDeaths(opponentBoard, 'opponent', playerBoard, player, opponent, events, rng);

  let playerTurn =
    living(playerBoard).length !== living(opponentBoard).length
      ? living(playerBoard).length > living(opponentBoard).length
      : rng.chance(0.5);

  let pIdx = 0;
  let oIdx = 0;
  let steps = 0;

  while (
    living(playerBoard).length > 0 &&
    living(opponentBoard).length > 0 &&
    steps++ < MAX_STEPS
  ) {
    const atkBoard = playerTurn ? playerBoard : opponentBoard;
    const defBoard = playerTurn ? opponentBoard : playerBoard;
    const atkSide: 'player' | 'opponent' = playerTurn ? 'player' : 'opponent';
    const startIdx = playerTurn ? pIdx : oIdx;

    const next = nextAttacker(atkBoard, startIdx);
    if (!next) {
      playerTurn = !playerTurn;
      continue;
    }

    if (playerTurn) pIdx = next.index + 1;
    else oIdx = next.index + 1;

    const attacker = next.minion;
    if (living(defBoard).length === 0) break;

    const target = selectTarget(defBoard, rng);
    attacker.attacksThisCombat += 1;

    const atkDmg = getEffectiveAttack(attacker);
    const defDmg = getEffectiveAttack(target);

    events.push({
      type: 'attack',
      actorId: attacker.instanceId,
      targetId: target.instanceId,
      side: atkSide,
      amount: atkDmg,
      delayMs: 500,
    });

    const hitT = dealDamageToMinion(target, atkDmg);
    events.push({
      type: hitT.shielded ? 'shieldBreak' : 'damage',
      targetId: target.instanceId,
      amount: hitT.damageTaken,
      side: playerTurn ? 'opponent' : 'player',
      delayMs: 200,
    });

    const hitA = dealDamageToMinion(attacker, defDmg);
    if (hitA.shielded || hitA.damageTaken > 0) {
      events.push({
        type: hitA.shielded ? 'shieldBreak' : 'damage',
        targetId: attacker.instanceId,
        amount: hitA.damageTaken,
        side: atkSide,
        delayMs: 200,
      });
    }

    if (attacker.keywords.includes('cleave') && atkDmg > 0) {
      const tIdx = defBoard.findIndex((m) => m.instanceId === target.instanceId);
      for (const adjIdx of [tIdx - 1, tIdx + 1]) {
        const adj = defBoard[adjIdx];
        if (!adj || adj.health <= 0 || adj.instanceId === target.instanceId) continue;
        const h = dealDamageToMinion(adj, atkDmg);
        events.push({
          type: h.shielded ? 'shieldBreak' : 'damage',
          targetId: adj.instanceId,
          amount: h.damageTaken,
          side: playerTurn ? 'opponent' : 'player',
          delayMs: 150,
        });
      }
    }

    if (attacker.health > 0) {
      const owner = playerTurn ? player : opponent;
      for (const ab of getMinionAbilities(attacker)) {
        if (ab.trigger !== 'afterAttack') continue;
        const ctx = makeCtx(owner, attacker, atkBoard, defBoard, rng);
        for (const eff of ab.effects) applyEffect(eff, ctx);
      }
    }

    processDeaths(playerBoard, 'player', opponentBoard, player, opponent, events, rng);
    processDeaths(opponentBoard, 'opponent', playerBoard, player, opponent, events, rng);

    playerTurn = !playerTurn;
  }

  const pAlive = living(playerBoard);
  const oAlive = living(opponentBoard);
  let winner: CombatState['winner'] = 'tie';
  let damageDealt = 0;

  if (pAlive.length > 0 && oAlive.length === 0) {
    winner = 'player';
    damageDealt = combatDamage(
      pAlive.map((m) => ({ tavernTier: minionTier(m), golden: m.golden })),
      player.tavernTier,
    );
  } else if (oAlive.length > 0 && pAlive.length === 0) {
    winner = 'opponent';
    damageDealt = combatDamage(
      oAlive.map((m) => ({ tavernTier: minionTier(m), golden: m.golden })),
      opponent.tavernTier,
    );
  }

  events.push({
    type: 'combatEnd',
    message: winner ?? 'tie',
    amount: damageDealt,
    delayMs: 600,
  });
  if (damageDealt > 0) {
    events.push({
      type: 'heroDamage',
      side: winner === 'player' ? 'opponent' : 'player',
      amount: damageDealt,
      delayMs: 700,
    });
  }

  return {
    playerBoard: player.board.map(cloneMinion),
    opponentBoard: opponent.board.map(cloneMinion),
    playerId: player.id,
    opponentId: opponent.id,
    events,
    winner,
    damageDealt,
    currentEventIndex: 0,
  };
}
