import { create } from 'zustand';
import { MatchManager } from '../engine/matchManager';
import type { MatchState, MinionInstance, PlayerProfile } from '../engine/types';
import {
  applyMatchResult,
  loadProfile,
  saveProfile,
} from '../persistence/storage';
import {
  buyMinion,
  playMinion,
  refreshShop,
  reposition,
  sellMinion,
  toggleFreeze,
  upgradeTavern,
  useHeroPower,
} from '../engine/shopEngine';
import { createMinionInstance } from '../engine/minionFactory';
import { soundManager } from '../audio/soundManager';

export type AppScreen =
  | 'menu'
  | 'heroSelect'
  | 'tribes'
  | 'recruit'
  | 'combat'
  | 'results'
  | 'collection'
  | 'heroes'
  | 'minions'
  | 'history'
  | 'settings'
  | 'stats';

interface GameStore {
  screen: AppScreen;
  profile: PlayerProfile;
  match: MatchManager | null;
  matchState: MatchState | null;
  selectedOpponentId: string | null;
  lastResult: {
    placement: number;
    mmrBefore: number;
    mmrAfter: number;
    mmrChange: number;
  } | null;
  pendingDiscover: MinionInstance[] | null;

  setScreen: (s: AppScreen) => void;
  setName: (name: string) => void;
  updateSettings: (partial: Partial<PlayerProfile['settings']>) => void;
  startMatch: () => void;
  selectHero: (heroId: string) => void;
  confirmTribes: () => void;
  sync: () => void;

  // Recruit actions
  buy: (shopIndex: number) => void;
  sell: (from: 'board' | 'hand', index: number) => void;
  refresh: () => void;
  freeze: () => void;
  upgrade: () => void;
  heroPower: () => void;
  playFromHand: (handIndex: number, boardIndex: number) => void;
  moveBoard: (from: number, to: number) => void;
  ready: () => void;
  finishCombat: () => void;
  chooseDiscover: (index: number) => void;
  setSelectedOpponent: (id: string | null) => void;
}

function snapshot(m: MatchManager | null): MatchState | null {
  if (!m) return null;
  // Deep-ish clone for React
  return JSON.parse(JSON.stringify(m.state)) as MatchState;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  profile: loadProfile(),
  match: null,
  matchState: null,
  selectedOpponentId: null,
  lastResult: null,
  pendingDiscover: null,

  setScreen: (s) => set({ screen: s }),

  setName: (name) => {
    const profile = { ...get().profile, name };
    saveProfile(profile);
    set({ profile });
  },

  updateSettings: (partial) => {
    const profile = {
      ...get().profile,
      settings: { ...get().profile.settings, ...partial },
    };
    saveProfile(profile);
    soundManager.setVolumes(
      profile.settings.masterVolume,
      profile.settings.musicVolume,
      profile.settings.effectsVolume,
    );
    set({ profile });
  },

  startMatch: () => {
    const m = new MatchManager(get().profile.name, get().profile.mmr);
    set({
      match: m,
      matchState: snapshot(m),
      screen: 'tribes',
      lastResult: null,
      pendingDiscover: null,
      selectedOpponentId: null,
    });
  },

  confirmTribes: () => set({ screen: 'heroSelect' }),

  selectHero: (heroId) => {
    const m = get().match;
    if (!m) return;
    m.selectHero(heroId);
    set({ matchState: snapshot(m), screen: 'recruit' });
  },

  sync: () => set({ matchState: snapshot(get().match) }),

  buy: (shopIndex) => {
    const m = get().match;
    if (!m || m.state.phase !== 'recruit') return;
    const human = m.getHuman();
    const result = buyMinion(human, shopIndex, m.pool, m.rng);
    if (result.ok) {
      soundManager.play('buy');
      soundManager.play('coin');
      m.keeper('buy');
      if (result.triple) {
        soundManager.play('triple');
        m.keeper('triple');
        // Discover
        const tier = result.discoverTier ?? Math.min(6, human.tavernTier + 1);
        const ids = m.pool.discoverOptions(tier, 3, m.rng);
        const options = ids.map((id) => createMinionInstance(id, { rng: m.rng }));
        // Don't take from pool until chosen
        set({ pendingDiscover: options, matchState: snapshot(m) });
        return;
      }
    }
    set({ matchState: snapshot(m) });
  },

  chooseDiscover: (index) => {
    const m = get().match;
    const options = get().pendingDiscover;
    if (!m || !options || !options[index]) return;
    const human = m.getHuman();
    const chosen = options[index]!;
    // Take from pool
    m.pool.take(chosen.defId);
    human.hand.push(chosen);
    set({ pendingDiscover: null, matchState: snapshot(m) });
  },

  sell: (from, index) => {
    const m = get().match;
    if (!m) return;
    if (sellMinion(m.getHuman(), from, index, m.pool)) {
      soundManager.play('sell');
      set({ matchState: snapshot(m) });
    }
  },

  refresh: () => {
    const m = get().match;
    if (!m) return;
    if (refreshShop(m.getHuman(), m.pool, m.rng)) {
      soundManager.play('refresh');
      set({ matchState: snapshot(m) });
    }
  },

  freeze: () => {
    const m = get().match;
    if (!m) return;
    toggleFreeze(m.getHuman());
    soundManager.play('freeze');
    m.keeper('freeze');
    set({ matchState: snapshot(m) });
  },

  upgrade: () => {
    const m = get().match;
    if (!m) return;
    if (upgradeTavern(m.getHuman())) {
      soundManager.play('upgrade');
      m.keeper('upgrade');
      set({ matchState: snapshot(m) });
    }
  },

  heroPower: () => {
    const m = get().match;
    if (!m) return;
    if (useHeroPower(m.getHuman(), m.pool, m.rng)) {
      soundManager.play('click');
      set({ matchState: snapshot(m) });
    }
  },

  playFromHand: (handIndex, boardIndex) => {
    const m = get().match;
    if (!m) return;
    if (
      playMinion(m.getHuman(), handIndex, boardIndex, m.pool, m.rng, {
        activeTribes: m.state.activeTribes,
      })
    ) {
      soundManager.play('summon');
      set({ matchState: snapshot(m) });
    }
  },

  moveBoard: (from, to) => {
    const m = get().match;
    if (!m) return;
    if (reposition(m.getHuman(), from, to)) {
      set({ matchState: snapshot(m) });
    }
  },

  ready: () => {
    const m = get().match;
    if (!m) return;
    m.endRecruit();
    const human = m.getHuman();
    if (human.lastCombatResult === 'win') m.keeper('win');
    if (human.lastCombatResult === 'loss') m.keeper('lose');
    set({ matchState: snapshot(m), screen: 'combat' });
  },

  finishCombat: () => {
    const m = get().match;
    if (!m) return;
    m.finishCombatPhase();
    if (m.state.phase === 'matchOver') {
      const human = m.getHuman();
      const placement = human.placement ?? 8;
      const mmrBefore = get().profile.mmr;
      const finalBoardSrc =
        m.finalBoards[human.id] ?? human.board;
      const profile = applyMatchResult(get().profile, {
        heroId: human.heroId,
        placement,
        activeTribes: m.state.activeTribes,
        finalBoard: finalBoardSrc.map((x) => ({
          defId: x.defId,
          attack: x.attack,
          health: x.health,
          golden: x.golden,
        })),
        turnsSurvived: m.state.round,
        minionsPurchased: human.minionsPurchased,
        triplesCreated: human.triplesCreated,
      });
      soundManager.play(placement <= 4 ? 'victory' : 'defeat');
      set({
        profile,
        matchState: snapshot(m),
        screen: 'results',
        lastResult: {
          placement,
          mmrBefore,
          mmrAfter: profile.mmr,
          mmrChange: profile.mmr - mmrBefore,
        },
      });
    } else {
      set({ matchState: snapshot(m), screen: 'recruit' });
    }
  },

  setSelectedOpponent: (id) => set({ selectedOpponentId: id }),
}));
