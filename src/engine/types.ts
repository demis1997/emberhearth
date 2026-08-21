/** Core game types */

export type Tribe =
  | 'beast'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'demon'
  | 'undead'
  | 'pirate'
  | 'neutral';

export type Keyword =
  | 'guard'
  | 'shield'
  | 'battlecry'
  | 'deathEffect'
  | 'reborn'
  | 'windfury'
  | 'cleave'
  | 'startOfCombat'
  | 'endOfTurn'
  | 'afterAttack'
  | 'onSummon'
  | 'avenge';

export type AbilityTrigger =
  | 'battlecry'
  | 'deathEffect'
  | 'startOfCombat'
  | 'endOfTurn'
  | 'afterAttack'
  | 'onSummon'
  | 'avenge'
  | 'passive'
  | 'onSell'
  | 'onBuy';

export type AbilityEffect =
  | { type: 'buffStats'; attack?: number; health?: number; target: AbilityTarget; permanent?: boolean }
  | { type: 'summon'; minionId: string; count: number; stats?: { attack: number; health: number } }
  | { type: 'damage'; amount: number; target: AbilityTarget }
  | { type: 'heal'; amount: number; target: AbilityTarget }
  | { type: 'gainGold'; amount: number }
  | { type: 'gainArmor'; amount: number }
  | { type: 'refreshShop' }
  | { type: 'buffShop'; attack?: number; health?: number }
  | { type: 'giveKeyword'; keyword: Keyword; target: AbilityTarget }
  | { type: 'consumeTavern'; buffAttack?: number; buffHealth?: number }
  | { type: 'dealHeroDamage'; amount: number }
  | { type: 'rebornSummon' }
  | { type: 'buffTribe'; tribe: Tribe; attack?: number; health?: number; target: AbilityTarget }
  | { type: 'multiplyStats'; factor: number; target: AbilityTarget }
  | { type: 'copyStats'; from: AbilityTarget; to: AbilityTarget };

export type AbilityTarget =
  | 'self'
  | 'allFriendly'
  | 'allEnemy'
  | 'randomFriendly'
  | 'randomEnemy'
  | 'adjacent'
  | 'friendlyTribe'
  | 'hero'
  | 'enemyHero'
  | 'leftmost'
  | 'summoned'
  | 'shop';

export interface AbilityDef {
  trigger: AbilityTrigger;
  effects: AbilityEffect[];
  /** For avenge: deaths required */
  avengeCount?: number;
  /** Filter for tribe-specific triggers */
  tribeFilter?: Tribe;
  description: string;
}

export interface MinionDef {
  id: string;
  name: string;
  tribe: Tribe;
  tavernTier: 1 | 2 | 3 | 4 | 5 | 6;
  attack: number;
  health: number;
  abilities: AbilityDef[];
  keywords: Keyword[];
  description: string;
  artPrompt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** Golden upgrades */
  goldenAttack?: number;
  goldenHealth?: number;
  goldenDescription?: string;
  goldenAbilities?: AbilityDef[];
}

export interface MinionInstance {
  instanceId: string;
  defId: string;
  attack: number;
  health: number;
  maxHealth: number;
  golden: boolean;
  keywords: Keyword[];
  /** Permanent buffs beyond base */
  attackBuff: number;
  healthBuff: number;
  /** Reborn already used */
  rebornUsed: boolean;
  /** Avenge counter */
  avengeProgress: number;
  /** Shield active */
  hasShield: boolean;
  /** Temporary combat-only attack buff */
  tempAttack: number;
  /** Attacks remaining this combat (windfury) */
  attacksThisCombat: number;
}

export type HeroPowerType = 'active' | 'passive';

export interface HeroPowerDef {
  id: string;
  name: string;
  type: HeroPowerType;
  cost: number;
  description: string;
  /** Uses per turn; -1 = unlimited, 0 for passive */
  usesPerTurn: number;
  effect: HeroPowerEffect;
}

export type HeroPowerEffect =
  | { kind: 'refreshFree' }
  | { kind: 'damageSelfRefresh'; damage: number }
  | { kind: 'buffShopMinion'; attack: number; health: number }
  | { kind: 'sellRandomShop'; goldGain: number }
  | { kind: 'gainGold'; amount: number }
  | { kind: 'buffBoard'; attack: number; health: number }
  | { kind: 'summonToken'; attack: number; health: number; tribe: Tribe }
  | { kind: 'firstBeastBuff'; attack: number; health: number }
  | { kind: 'afterUpgradeBuff'; attack: number; health: number }
  | { kind: 'discoverHigherTier' }
  | { kind: 'gainArmor'; amount: number };

export interface HeroDef {
  id: string;
  name: string;
  health: number;
  armor: number;
  heroPower: HeroPowerDef;
  description: string;
  playstyle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  artPrompt: string;
  preferredTribes?: Tribe[];
}

export type AIPersonality =
  | 'aggressive'
  | 'greedy'
  | 'synergy'
  | 'flexible'
  | 'economy'
  | 'highRoller';

export type GamePhase =
  | 'menu'
  | 'heroSelect'
  | 'recruit'
  | 'combat'
  | 'results'
  | 'matchOver';

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  heroId: string;
  health: number;
  armor: number;
  gold: number;
  maxGold: number;
  tavernTier: number;
  roundsAtTier: number;
  board: MinionInstance[];
  hand: MinionInstance[];
  shop: MinionInstance[];
  shopFrozen: boolean;
  /** Shop buffs from elementals etc. */
  shopAttackBuff: number;
  shopHealthBuff: number;
  heroPowerUsedThisTurn: number;
  /** Passive tracking */
  firstBeastSummonedThisTurn: boolean;
  alive: boolean;
  placement: number | null;
  lastCombatResult: 'win' | 'loss' | 'tie' | null;
  lastOpponentId: string | null;
  /** Observed board snapshot for scout */
  lastSeenBoard: MinionInstance[];
  aiPersonality?: AIPersonality;
  triplesCreated: number;
  minionsPurchased: number;
}

export interface CombatEvent {
  type:
    | 'startOfCombat'
    | 'attack'
    | 'damage'
    | 'shieldBreak'
    | 'death'
    | 'summon'
    | 'reborn'
    | 'ability'
    | 'heroDamage'
    | 'combatEnd';
  actorId?: string;
  targetId?: string;
  side?: 'player' | 'opponent';
  amount?: number;
  minion?: MinionInstance;
  message?: string;
  delayMs?: number;
}

export interface CombatState {
  playerBoard: MinionInstance[];
  opponentBoard: MinionInstance[];
  playerId: string;
  opponentId: string;
  events: CombatEvent[];
  winner: 'player' | 'opponent' | 'tie' | null;
  damageDealt: number;
  currentEventIndex: number;
}

export interface MatchState {
  matchId: string;
  seed: number;
  round: number;
  phase: GamePhase;
  activeTribes: Tribe[];
  players: PlayerState[];
  humanPlayerId: string;
  combat: CombatState | null;
  combatPairings: [string, string][];
  discoverOptions: MinionInstance[] | null;
  discoverForPlayerId: string | null;
  tavernKeeperLine: string;
  eliminatedOrder: string[];
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  heroId: string;
  placement: number;
  mmrChange: number;
  mmrBefore: number;
  mmrAfter: number;
  activeTribes: Tribe[];
  finalBoard: { defId: string; attack: number; health: number; golden: boolean }[];
  turnsSurvived: number;
}

export interface PlayerProfile {
  name: string;
  mmr: number;
  peakMmr: number;
  matchHistory: MatchHistoryEntry[];
  stats: PlayerStats;
  settings: GameSettings;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  top4s: number;
  totalPlacement: number;
  heroPlayCounts: Record<string, number>;
  heroWins: Record<string, number>;
  tribePlayCounts: Record<string, number>;
  totalMinionsPurchased: number;
  totalTriplesCreated: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  combatSpeed: 1 | 2 | 4;
  recruitTimer: boolean;
}
