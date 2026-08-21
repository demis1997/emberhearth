import {
  AI_NAMES,
  HERO_CHOICES,
  PLAYER_COUNT,
  TRIBES_PER_MATCH,
  upgradeCost,
} from '../config/balance';
import { ALL_TRIBES } from '../data/tribes';
import { getHeroDef, HERO_DATABASE } from '../data/heroes';
import { createMatchSeed, SeededRNG } from './rng';
import { MinionPool } from './poolEngine';
import { simulateCombat } from './combatEngine';
import { runAITurn } from './aiEngine';
import {
  applyHeroDamage,
  forceRefreshShop,
  setPlayerGoldForRound,
} from './shopEngine';
import { resolveEndOfTurn } from './abilityEngine';
import { cloneMinion } from './minionFactory';
import type {
  AIPersonality,
  MatchState,
  PlayerState,
  Tribe,
} from './types';

const PERSONALITIES: AIPersonality[] = [
  'aggressive',
  'greedy',
  'synergy',
  'flexible',
  'economy',
  'highRoller',
];

const KEEPER_LINES = {
  idle: [
    'Plenty of strange faces tonight.',
    "That's a fine-looking warband.",
    'Looking for something stronger?',
    'Fortune favors the bold.',
    'The hearth is warm, the deals are warmer.',
  ],
  buy: [
    'A shrewd purchase.',
    'They look eager to fight.',
    "I'll wrap that up for you.",
  ],
  upgrade: [
    'Moving up in the world!',
    'Only the finest for a higher tier.',
    'The cellar has better stock now.',
  ],
  triple: [
    'Golden! Now that is rare.',
    'Three become one — magnificent!',
    "I've not seen that shine in years.",
  ],
  freeze: [
    'Holding the market, eh?',
    "They'll wait. For a price of patience.",
  ],
  win: [
    'Well fought!',
    'The tavern cheers for you.',
  ],
  lose: [
    'Shake it off. Next round.',
    'Even legends take a bruise.',
  ],
};

export class MatchManager {
  state: MatchState;
  pool: MinionPool;
  rng: SeededRNG;
  heroChoices: string[] = [];
  playerMmr: number;
  playerName: string;
  /** Final board snapshot for results (set before pool return) */
  finalBoards: Record<string, PlayerState['board']> = {};

  constructor(playerName: string, playerMmr: number, seed?: number) {
    this.playerName = playerName;
    this.playerMmr = playerMmr;
    const matchSeed = seed ?? createMatchSeed();
    this.rng = new SeededRNG(matchSeed);
    const activeTribes = this.rng.pickN(ALL_TRIBES, TRIBES_PER_MATCH) as Tribe[];
    this.pool = new MinionPool(activeTribes);

    this.state = {
      matchId: `match_${matchSeed}`,
      seed: matchSeed,
      round: 0,
      phase: 'heroSelect',
      activeTribes,
      players: [],
      humanPlayerId: 'human',
      combat: null,
      combatPairings: [],
      discoverOptions: null,
      discoverForPlayerId: null,
      tavernKeeperLine: this.rng.pick(KEEPER_LINES.idle),
      eliminatedOrder: [],
    };

    this.heroChoices = this.rng.pickN(
      HERO_DATABASE.map((h) => h.id),
      HERO_CHOICES,
    );
  }

  keeper(category: keyof typeof KEEPER_LINES): void {
    this.state.tavernKeeperLine = this.rng.pick(KEEPER_LINES[category]);
  }

  selectHero(heroId: string): void {
    if (this.state.phase !== 'heroSelect') return;
    if (!this.heroChoices.includes(heroId)) return;

    const usedHeroes = new Set<string>([heroId]);
    const remainingHeroes = HERO_DATABASE.map((h) => h.id).filter(
      (id) => !usedHeroes.has(id),
    );
    this.rng.shuffle(remainingHeroes);

    const names = this.rng.pickN(
      AI_NAMES.filter((n) => n !== 'YOU'),
      PLAYER_COUNT - 1,
    );

    const human = this.createPlayer('human', this.playerName || 'YOU', heroId, true);
    const ais: PlayerState[] = [];
    for (let i = 0; i < PLAYER_COUNT - 1; i++) {
      const hId = remainingHeroes[i]!;
      usedHeroes.add(hId);
      const p = this.createPlayer(
        `ai_${i}`,
        names[i]!,
        hId,
        false,
        PERSONALITIES[i % PERSONALITIES.length],
      );
      ais.push(p);
    }

    this.state.players = this.rng.shuffle([human, ...ais]);
    // Keep human id
    this.state.humanPlayerId = 'human';
    this.startRound();
  }

  private createPlayer(
    id: string,
    name: string,
    heroId: string,
    isHuman: boolean,
    aiPersonality?: AIPersonality,
  ): PlayerState {
    const hero = getHeroDef(heroId);
    return {
      id,
      name,
      isHuman,
      heroId,
      health: hero.health,
      armor: hero.armor,
      gold: 0,
      maxGold: 0,
      tavernTier: 1,
      roundsAtTier: 0,
      board: [],
      hand: [],
      shop: [],
      shopFrozen: false,
      shopAttackBuff: 0,
      shopHealthBuff: 0,
      heroPowerUsedThisTurn: 0,
      firstBeastSummonedThisTurn: false,
      alive: true,
      placement: null,
      lastCombatResult: null,
      lastOpponentId: null,
      lastSeenBoard: [],
      aiPersonality,
      triplesCreated: 0,
      minionsPurchased: 0,
    };
  }

  startRound(): void {
    this.state.round += 1;
    this.state.phase = 'recruit';
    this.state.combat = null;
    this.state.discoverOptions = null;
    this.keeper('idle');

    for (const p of this.state.players) {
      if (!p.alive) continue;
      setPlayerGoldForRound(p, this.state.round);
      if (p.shopFrozen && p.shop.length > 0) {
        // Carry frozen shop into this turn, then clear freeze flag
        p.shopFrozen = false;
      } else {
        forceRefreshShop(p, this.pool, this.rng);
      }
    }

    for (const p of this.state.players) {
      if (!p.alive || p.isHuman) continue;
      runAITurn(
        p,
        this.pool,
        this.rng,
        this.state.activeTribes,
        this.state.round,
        this.playerMmr,
      );
    }
  }

  getHuman(): PlayerState {
    return this.state.players.find((p) => p.id === this.state.humanPlayerId)!;
  }

  getPlayer(id: string): PlayerState {
    return this.state.players.find((p) => p.id === id)!;
  }

  endRecruit(): void {
    if (this.state.phase !== 'recruit') return;
    const human = this.getHuman();
    if (human.alive) {
      resolveEndOfTurn(human, this.pool, this.rng);
      // Clear freeze after turn if they didn't re-freeze — freeze means hold for NEXT shop
      // Actually: freeze holds current shop INTO next round. So we set a flag.
      // At start of next round we already handled frozen shop.
    }

    for (const p of this.state.players) {
      if (!p.alive || p.isHuman) continue;
      resolveEndOfTurn(p, this.pool, this.rng);
    }

    this.beginCombat();
  }

  private beginCombat(): void {
    this.state.phase = 'combat';
    const alive = this.state.players.filter((p) => p.alive);
    const shuffled = this.rng.shuffle([...alive]);
    const pairings: [string, string][] = [];

    // Pair adjacent; if odd, one fights a ghost (previous opponent board clone — simplify: bye = fight random dead last board or skip damage)
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairings.push([shuffled[i]!.id, shuffled[i + 1]!.id]);
      } else {
        // Odd one out: fight a copy of a random other alive player's last seen / board
        const foe = this.rng.pick(shuffled.filter((p) => p.id !== shuffled[i]!.id));
        pairings.push([shuffled[i]!.id, foe.id]);
        // Mark as ghost fight by duplicating — both take real combat against same board snapshot
        // Simpler: pair with foe but foe already paired — for odd, create ghost opponent
      }
    }

    // Fix odd player: combat against ghost of random opponent
    if (alive.length % 2 === 1) {
      // last pairing might be duplicate foe — handle in resolve
    }

    this.state.combatPairings = pairings;

    // Resolve all AI vs AI immediately; store human combat for animation
    const humanId = this.state.humanPlayerId;
    let humanCombat = null;

    const results = new Map<
      string,
      { result: 'win' | 'loss' | 'tie'; damage: number; opponentId: string }
    >();

    // Track who already fought to handle odd duplicate
    const fought = new Set<string>();

    for (const [aId, bId] of pairings) {
      const a = this.getPlayer(aId);
      const b = this.getPlayer(bId);

      // Ghost fight for odd: if b already fought, a fights ghost clone
      const bIsGhost = fought.has(bId);
      fought.add(aId);
      if (!bIsGhost) fought.add(bId);

      if (aId === humanId || bId === humanId) {
        const humanIsA = aId === humanId;
        const combat = simulateCombat(humanIsA ? a : b, humanIsA ? b : a, this.rng);
        // Normalize so playerBoard is always human
        if (!humanIsA) {
          // flip
          const flipped = simulateCombat(b, a, this.rng);
          humanCombat = flipped;
          this.applyCombatResult(b, a, flipped.winner, flipped.damageDealt, bIsGhost);
        } else {
          humanCombat = combat;
          this.applyCombatResult(a, b, combat.winner, combat.damageDealt, bIsGhost);
        }
      } else if (!bIsGhost) {
        const combat = simulateCombat(a, b, this.rng);
        this.applyCombatResult(a, b, combat.winner, combat.damageDealt, false);
      } else {
        // Ghost: only A takes result vs snapshot of B
        const ghost = {
          ...b,
          board: b.board.map(cloneMinion),
          id: b.id + '_ghost',
        };
        const combat = simulateCombat(a, ghost as PlayerState, this.rng);
        if (combat.winner === 'opponent') {
          applyHeroDamage(a, combat.damageDealt);
          a.lastCombatResult = 'loss';
        } else if (combat.winner === 'player') {
          a.lastCombatResult = 'win';
          // no damage to real B
        } else {
          a.lastCombatResult = 'tie';
        }
        a.lastOpponentId = b.id;
        a.lastSeenBoard = b.board.map(cloneMinion);
      }
      void results;
    }

    this.state.combat = humanCombat;

    // If human dead or no human combat (human already dead), skip to next
    if (!this.getHuman().alive || !humanCombat) {
      this.finishCombatPhase();
    }
  }

  private applyCombatResult(
    a: PlayerState,
    b: PlayerState,
    winner: 'player' | 'opponent' | 'tie' | null,
    damage: number,
    ghostB: boolean,
  ): void {
    a.lastOpponentId = b.id;
    b.lastOpponentId = a.id;
    a.lastSeenBoard = b.board.map(cloneMinion);
    if (!ghostB) b.lastSeenBoard = a.board.map(cloneMinion);

    if (winner === 'tie' || winner === null) {
      a.lastCombatResult = 'tie';
      if (!ghostB) b.lastCombatResult = 'tie';
      return;
    }
    if (winner === 'player') {
      a.lastCombatResult = 'win';
      if (!ghostB) {
        b.lastCombatResult = 'loss';
        applyHeroDamage(b, damage);
      }
    } else {
      a.lastCombatResult = 'loss';
      applyHeroDamage(a, damage);
      if (!ghostB) b.lastCombatResult = 'win';
    }
  }

  /** Called when combat animation finishes (or skip) */
  finishCombatPhase(): void {
    this.checkEliminations();
    const human = this.getHuman();
    const alive = this.state.players.filter((p) => p.alive);

    if (!human.alive || alive.length <= 1) {
      this.endMatch();
      return;
    }
    this.startRound();
  }

  private checkEliminations(): void {
    for (const p of this.state.players) {
      if (p.health <= 0 && p.alive) {
        p.alive = false;
      }
    }

    const toPlace = this.state.players.filter((p) => !p.alive && p.placement === null);
    for (const p of toPlace) {
      this.finalBoards[p.id] = p.board.map(cloneMinion);
      const place = PLAYER_COUNT - this.state.eliminatedOrder.length;
      p.placement = place;
      this.state.eliminatedOrder.push(p.id);
      for (const m of [...p.board, ...p.hand, ...p.shop]) {
        this.pool.return(m.defId);
      }
      p.board = [];
      p.hand = [];
      p.shop = [];
    }
  }

  private endMatch(): void {
    const alive = this.state.players.filter((p) => p.alive);
    // Rank remaining alive by health+armor (highest = best remaining place)
    alive.sort(
      (a, b) => b.health + b.armor - (a.health + a.armor) || a.name.localeCompare(b.name),
    );
    let nextPlace = 1;
    for (const p of alive) {
      if (!this.finalBoards[p.id]) {
        this.finalBoards[p.id] = p.board.map(cloneMinion);
      }
      p.placement = nextPlace++;
      p.alive = false;
      this.state.eliminatedOrder.push(p.id);
    }
    for (const p of this.state.players) {
      if (p.placement === null) {
        this.finalBoards[p.id] = p.board.map(cloneMinion);
        p.placement = nextPlace++;
        this.state.eliminatedOrder.push(p.id);
      }
    }
    this.state.phase = 'matchOver';
  }

  getUpgradeCost(player?: PlayerState): number {
    const p = player ?? this.getHuman();
    return upgradeCost(p.tavernTier, p.roundsAtTier);
  }
}
