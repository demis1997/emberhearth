import { getHeroDef } from '../data/heroes';
import { FantasyArt } from '../art/FantasyArt';
import { UI_ASSETS } from '../art/paths';
import { useGameStore } from '../store/gameStore';

export function HeroSelect() {
  const match = useGameStore((s) => s.match);
  const selectHero = useGameStore((s) => s.selectHero);

  if (!match) return null;
  const choices = match.heroChoices;

  return (
    <div className="page-screen hero-select-screen">
      <div className="page-header">
        <h2>Choose Your Hero</h2>
      </div>
      <div className="hero-pick-grid">
        {choices.map((id) => {
          const h = getHeroDef(id);
          return (
            <button key={id} type="button" className="hero-card" onClick={() => selectHero(id)}>
              <div className="hero-portrait-lg">
                <FantasyArt id={id} kind="hero" name={h.name} />
              </div>
              <div className="hero-card-body">
                <h3 style={{ fontSize: '1.05rem' }}>{h.name}</h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    margin: '0.4rem 0',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: '#ff6b6b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <img src={UI_ASSETS.health} alt="" width={18} height={18} />
                    {h.health}
                  </span>
                  <span style={{ color: '#7ec8e3', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <img src={UI_ASSETS.armor} alt="" width={18} height={18} />
                    {h.armor}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ember-hot)', marginBottom: '0.35rem' }}>
                  {h.heroPower.name}
                  {h.heroPower.type === 'active' ? (
                    <span style={{ marginLeft: 6, color: 'var(--gold)' }}>
                      ({h.heroPower.cost} gold)
                    </span>
                  ) : (
                    ' · Passive'
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                  {h.heroPower.description}
                </p>
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--brass)',
                    marginTop: '0.5rem',
                    fontStyle: 'italic',
                    fontFamily: 'var(--font-story)',
                  }}
                >
                  {h.playstyle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
