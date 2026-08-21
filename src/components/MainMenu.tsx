import { getRankInfo } from '../persistence/storage';
import { useGameStore } from '../store/gameStore';
import { UI_ASSETS } from '../art/paths';

const RANK_MARKS: Record<string, string> = {
  Bronze: 'B',
  Silver: 'S',
  Gold: 'G',
  Platinum: 'P',
  Diamond: 'D',
  Master: 'M',
  Grandmaster: 'GM',
};

export function MainMenu() {
  const profile = useGameStore((s) => s.profile);
  const setScreen = useGameStore((s) => s.setScreen);
  const setName = useGameStore((s) => s.setName);
  const startMatch = useGameStore((s) => s.startMatch);
  const rank = getRankInfo(profile.mmr);

  return (
    <div
      className="menu-screen"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(12,8,4,0.82), rgba(12,8,4,0.92)), url(${UI_ASSETS.tavernBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="menu-hero">
        <h1 className="menu-brand">Emberhearth</h1>
        <p className="menu-tagline">
          Recruit your warband in Brannick&apos;s tavern. Outwit seven rivals. Claim the
          hearth.
        </p>
        <div className="menu-cta">
          <button type="button" className="btn btn-primary" onClick={startMatch}>
            PLAY
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScreen('collection')}
          >
            Collection
          </button>
        </div>
      </div>

      <aside className="menu-panel">
        <div className="rank-row">
          <div
            className="rank-emblem"
            style={{
              background: `radial-gradient(circle, ${rank.color}66, #1a120b)`,
              color: rank.color,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: rank.name === 'Grandmaster' ? '1.1rem' : '1.6rem',
            }}
          >
            {RANK_MARKS[rank.name] ?? '?'}
          </div>
          <div>
            <div className="rank-name" style={{ color: rank.color }}>
              {rank.name}
            </div>
            <div className="mmr-value">{profile.mmr.toLocaleString()} MMR</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Peak: {profile.peakMmr.toLocaleString()}
            </div>
          </div>
        </div>

        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Player Name
          <input
            className="player-name-input"
            value={profile.name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
          />
        </label>

        <nav className="menu-nav" style={{ marginTop: '1.25rem' }}>
          <button type="button" onClick={() => setScreen('heroes')}>
            Heroes
          </button>
          <button type="button" onClick={() => setScreen('minions')}>
            Minions
          </button>
          <button type="button" onClick={() => setScreen('history')}>
            Match History
          </button>
          <button type="button" onClick={() => setScreen('stats')}>
            Statistics
          </button>
          <button type="button" onClick={() => setScreen('settings')}>
            Settings
          </button>
        </nav>
      </aside>
    </div>
  );
}
