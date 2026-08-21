# Emberhearth

A single-player fantasy auto-battler. Recruit minions in Brannick's tavern, battle seven AI rivals, climb the ranks.

**Original game** — no copyrighted Hearthstone/Blizzard assets, names, or art.

## Play

```bash
npm install
npm run dev
```

Open the local URL, press **PLAY**, pick a hero, and fight through a full match.

## What's included

- Full match loop: hero select → recruit → combat → elimination → MMR
- 20 original heroes with distinct hero powers
- 7 tribes (4 random per match), 100+ minions + tokens
- Keywords: Guard, Shield, Battlecry, Death Effect, Reborn, Windfury, Cleave, Start of Combat, End of Turn, After Attack, On Summon, Avenge
- Triples → Golden minions → Discover
- Shared finite minion pool
- Seeded RNG for reproducible matches
- AI opponents with personalities (aggressive, greedy, synergy, etc.)
- Local MMR, ranks, match history, statistics
- Collection browser (heroes, minions, tribes, keywords)
- Sound architecture with placeholder tones

## Architecture

```
src/
  config/balance.ts     # Tunable constants
  data/                 # Heroes, minions, tribes
  engine/               # Match, combat, shop, AI, abilities, pool, RNG
  persistence/          # Local profile (Supabase-ready adapter)
  store/gameStore.ts    # UI state
  components/           # Screens
```

## Smoke test

```bash
npx tsx scripts/smokeMatch.ts
```

Runs a headless full match to verify the engine.
