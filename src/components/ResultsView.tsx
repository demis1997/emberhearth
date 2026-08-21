import { getHeroDef } from '../data/heroes';
import { useGameStore } from '../store/gameStore';

const PLACE_LABELS = [
  '',
  '1st Place',
  '2nd Place',
  '3rd Place',
  '4th Place',
  '5th Place',
  '6th Place',
  '7th Place',
  '8th Place',
];

export function ResultsView() {
  const lastResult = useGameStore((s) => s.lastResult);
  const matchState = useGameStore((s) => s.matchState);
  const setScreen = useGameStore((s) => s.setScreen);
  const startMatch = useGameStore((s) => s.startMatch);

  if (!lastResult || !matchState) return null;

  const human = matchState.players.find((p) => p.id === matchState.humanPlayerId);
  const hero = human ? getHeroDef(human.heroId) : null;
  const positive = lastResult.mmrChange >= 0;

  return (
    <div className="page-screen" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="modal" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
          {lastResult.placement === 1 ? 'Victory' : 'Match Complete'}
        </div>
        <div className="results-place">{PLACE_LABELS[lastResult.placement]}</div>
        {hero && (
          <div style={{ margin: '0.75rem 0', color: 'var(--parchment)' }}>{hero.name}</div>
        )}
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: positive ? '#4ade80' : '#f87171',
            margin: '1rem 0',
          }}
        >
          {positive ? '+' : ''}
          {lastResult.mmrChange} MMR
        </div>
        <div style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
          {lastResult.mmrBefore.toLocaleString()} → {lastResult.mmrAfter.toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={startMatch}>
            Play Again
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setScreen('menu')}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
