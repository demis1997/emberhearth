import type { Keyword, Tribe } from '../engine/types';

export const TRIBE_INFO: Record<
  Exclude<Tribe, 'neutral'>,
  { name: string; identity: string; color: string; icon: string }
> = {
  beast: {
    name: 'Beasts',
    identity: 'Summons, death triggers, board flooding',
    color: '#8B6914',
    icon: '/assets/tribes/beast.svg',
  },
  construct: {
    name: 'Constructs',
    identity: 'Shields, permanent upgrades, modular buffs',
    color: '#6B7B8C',
    icon: '/assets/tribes/construct.svg',
  },
  dragon: {
    name: 'Dragons',
    identity: 'Large stats, end-of-turn & start-of-combat scaling',
    color: '#C0392B',
    icon: '/assets/tribes/dragon.svg',
  },
  elemental: {
    name: 'Elementals',
    identity: 'Tavern buffs, economy, repeated purchases',
    color: '#2980B9',
    icon: '/assets/tribes/elemental.svg',
  },
  demon: {
    name: 'Demons',
    identity: 'Health for power, consume tavern, risk/reward',
    color: '#6C3483',
    icon: '/assets/tribes/demon.svg',
  },
  undead: {
    name: 'Undead',
    identity: 'Resurrection, death triggers, reborn',
    color: '#1ABC9C',
    icon: '/assets/tribes/undead.svg',
  },
  pirate: {
    name: 'Pirates',
    identity: 'Gold generation, buying/selling, attack scaling',
    color: '#D4AC0D',
    icon: '/assets/tribes/pirate.svg',
  },
};

export const ALL_TRIBES: Exclude<Tribe, 'neutral'>[] = [
  'beast',
  'construct',
  'dragon',
  'elemental',
  'demon',
  'undead',
  'pirate',
];

export const KEYWORD_INFO: Record<Keyword, { name: string; description: string }> = {
  guard: {
    name: 'Guard',
    description: 'Enemies must attack this minion before non-Guard minions.',
  },
  shield: {
    name: 'Shield',
    description: 'Prevents the next instance of damage.',
  },
  battlecry: {
    name: 'Battlecry',
    description: 'Triggers when this minion is played from hand.',
  },
  deathEffect: {
    name: 'Death Effect',
    description: 'Triggers when this minion dies.',
  },
  reborn: {
    name: 'Reborn',
    description: 'The first time this minion dies, return it with 1 Health.',
  },
  windfury: {
    name: 'Windfury',
    description: 'Can attack twice during its attack sequence.',
  },
  cleave: {
    name: 'Cleave',
    description: 'Also damages adjacent enemy minions when attacking.',
  },
  startOfCombat: {
    name: 'Start of Combat',
    description: 'Triggers immediately when combat begins.',
  },
  endOfTurn: {
    name: 'End of Turn',
    description: 'Triggers when the recruitment phase ends.',
  },
  afterAttack: {
    name: 'After Attack',
    description: 'Triggers after this minion attacks.',
  },
  onSummon: {
    name: 'On Summon',
    description: 'Triggers when another friendly minion is summoned.',
  },
  avenge: {
    name: 'Avenge',
    description: 'Triggers after a certain number of friendly minions die.',
  },
};
