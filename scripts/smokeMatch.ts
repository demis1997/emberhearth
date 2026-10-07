/**
 * Headless smoke test: run a full AI-only match to verify engine stability.
 * Usage: npx tsx scripts/smokeMatch.ts
 */
import assert from 'node:assert/strict';
import { MatchManager } from '../src/engine/matchManager';
import { runAITurn } from '../src/engine/aiEngine';
import { resolveEndOfTurn } from '../src/engine/abilityEngine';

const m = new MatchManager('Tester', 4000, 12345);
console.log('Seed', m.state.seed);
console.log('Tribes', m.state.activeTribes);
m.selectHero(m.heroChoices[0]!);

let rounds = 0;
while (m.state.phase !== 'matchOver' && rounds < 40) {
  rounds++;
  // Human acts as AI for smoke test
  const human = m.getHuman();
  if (human.alive && m.state.phase === 'recruit') {
    runAITurn(human, m.pool, m.rng, m.state.activeTribes, m.state.round, 4000);
    resolveEndOfTurn(human, m.pool, m.rng);
  }
  if (m.state.phase === 'recruit') {
    m.endRecruit();
  }
  if (m.state.phase === 'combat') {
    m.finishCombatPhase();
  }
  console.log(
    `Round ${m.state.round} phase=${m.state.phase} alive=${m.state.players.filter((p) => p.alive).length} humanHP=${human.health}`,
  );
}

const human = m.getHuman();
console.log('Final placement', human.placement);
console.log(
  'All placements',
  m.state.players.map((p) => `${p.name}:${p.placement}`).join(', '),
);
assert.equal(m.state.phase, 'matchOver', 'Seeded match must terminate within 40 rounds');
assert.deepEqual(
  m.state.players.map((p) => p.placement).sort((a, b) => (a ?? 0) - (b ?? 0)),
  [1, 2, 3, 4, 5, 6, 7, 8],
  'Every player must receive a unique final placement',
);
console.log('OK');
