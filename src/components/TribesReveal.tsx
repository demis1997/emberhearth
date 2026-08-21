import { TRIBE_INFO } from '../data/tribes';
import { tribeIconPath } from '../art/paths';
import type { Tribe } from '../engine/types';
import { useGameStore } from '../store/gameStore';

export function TribesReveal() {
  const matchState = useGameStore((s) => s.matchState);
  const confirmTribes = useGameStore((s) => s.confirmTribes);

  if (!matchState) return null;

  return (
    <div className="page-screen" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 640 }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Minion Types This Game</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '0.5rem', fontFamily: 'var(--font-story)' }}>
          Four tribes walk Brannick&apos;s halls tonight.
        </p>
        <div className="tribe-icons">
          {matchState.activeTribes.map((t, i) => {
            const info = TRIBE_INFO[t as Exclude<Tribe, 'neutral'>];
            return (
              <div
                key={t}
                className="tribe-icon-lg"
                style={{
                  background: `radial-gradient(circle, ${info.color}66, #1a120b)`,
                  animationDelay: `${i * 0.12}s`,
                }}
              >
                <img src={tribeIconPath(t)} alt={info.name} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-display)' }}>
                  {info.name}
                </span>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn-primary" onClick={confirmTribes}>
          Choose Hero
        </button>
      </div>
    </div>
  );
}
