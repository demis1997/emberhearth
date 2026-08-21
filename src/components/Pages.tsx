import { useMemo, useState } from 'react';
import { HERO_DATABASE } from '../data/heroes';
import { MINION_DATABASE, TOKEN_IDS } from '../data/minions';
import { KEYWORD_INFO, TRIBE_INFO, ALL_TRIBES } from '../data/tribes';
import type { Keyword, Tribe } from '../engine/types';
import { createMinionInstance } from '../engine/minionFactory';
import { useGameStore } from '../store/gameStore';
import { MinionCard } from './MinionCard';
import { getHeroDef } from '../data/heroes';
import { FantasyArt } from '../art/FantasyArt';

function BackBtn() {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <button type="button" className="btn btn-ghost" onClick={() => setScreen('menu')}>
      ← Menu
    </button>
  );
}

export function CollectionPage() {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Collection</h2>
        <BackBtn />
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setScreen('heroes')}>
          Heroes ({HERO_DATABASE.length})
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setScreen('minions')}>
          Minions ({MINION_DATABASE.filter((m) => !TOKEN_IDS.has(m.id)).length})
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setScreen('collection')}>
          Tribes & Keywords
        </button>
      </div>
      <h3 style={{ marginTop: '2rem' }}>Tribes</h3>
      <div className="card-grid" style={{ marginTop: '1rem' }}>
        {ALL_TRIBES.map((t) => {
          const info = TRIBE_INFO[t];
          return (
            <div key={t} className="hero-card" style={{ cursor: 'default' }}>
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <img src={info.icon} alt="" width={48} height={48} />
                <h3>{info.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{info.identity}</p>
              </div>
            </div>
          );
        })}
      </div>
      <h3 style={{ marginTop: '2rem' }}>Keywords</h3>
      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
        {(Object.keys(KEYWORD_INFO) as Keyword[]).map((k) => (
          <div
            key={k}
            style={{
              padding: '0.6rem 0.8rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
              border: '1px solid var(--wood-light)',
            }}
          >
            <strong style={{ color: 'var(--magic)' }}>{KEYWORD_INFO[k].name}</strong>
            <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
              {KEYWORD_INFO[k].description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroesPage() {
  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Heroes</h2>
        <BackBtn />
      </div>
      <div className="hero-pick-grid">
        {HERO_DATABASE.map((h) => (
          <div key={h.id} className="hero-card" style={{ cursor: 'default' }}>
            <div className="hero-portrait-lg">
              <FantasyArt id={h.id} kind="hero" name={h.name} />
            </div>
            <div className="hero-card-body">
              <h3 style={{ fontSize: '1rem' }}>{h.name}</h3>
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>
                {h.health} HP · {h.armor} Armor · {h.difficulty}
              </div>
              <div style={{ color: 'var(--magic)', fontSize: '0.8rem', margin: '0.4rem 0' }}>
                {h.heroPower.name}
                {h.heroPower.type === 'active' ? ` (${h.heroPower.cost} gold)` : ' · Passive'}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                {h.heroPower.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MinionsPage() {
  const [query, setQuery] = useState('');
  const [tribe, setTribe] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [kw, setKw] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    return MINION_DATABASE.filter((m) => {
      if (TOKEN_IDS.has(m.id)) return false;
      if (query && !m.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (tribe !== 'all' && m.tribe !== tribe) return false;
      if (tier !== 'all' && m.tavernTier !== Number(tier)) return false;
      if (kw !== 'all' && !m.keywords.includes(kw as Keyword)) return false;
      return true;
    });
  }, [query, tribe, tier, kw]);

  const selectedDef = selected ? MINION_DATABASE.find((m) => m.id === selected) : null;

  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Minions ({list.length})</h2>
        <BackBtn />
      </div>
      <div className="filters">
        <input
          placeholder="Search name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={tribe} onChange={(e) => setTribe(e.target.value)}>
          <option value="all">All tribes</option>
          {ALL_TRIBES.map((t) => (
            <option key={t} value={t}>
              {TRIBE_INFO[t].name}
            </option>
          ))}
          <option value="neutral">Neutral</option>
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All tiers</option>
          {[1, 2, 3, 4, 5, 6].map((t) => (
            <option key={t} value={t}>
              Tier {t}
            </option>
          ))}
        </select>
        <select value={kw} onChange={(e) => setKw(e.target.value)}>
          <option value="all">All keywords</option>
          {(Object.keys(KEYWORD_INFO) as Keyword[]).map((k) => (
            <option key={k} value={k}>
              {KEYWORD_INFO[k].name}
            </option>
          ))}
        </select>
      </div>
      <div className="card-grid">
        {list.map((def) => {
          const inst = createMinionInstance(def.id);
          return (
            <MinionCard
              key={def.id}
              minion={inst}
              onClick={() => setSelected(def.id)}
              selected={selected === def.id}
            />
          );
        })}
      </div>
      {selectedDef && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedDef.name}</h2>
            <p style={{ color: 'var(--brass)' }}>
              {selectedDef.tribe} · Tier {selectedDef.tavernTier} · {selectedDef.rarity}
            </p>
            <p>
              {selectedDef.attack}/{selectedDef.health}
            </p>
            <p>{selectedDef.description}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '1rem' }}>
              Art prompt: {selectedDef.artPrompt}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const history = useGameStore((s) => s.profile.matchHistory);
  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Match History</h2>
        <BackBtn />
      </div>
      {history.length === 0 && (
        <p style={{ color: 'var(--text-dim)' }}>No matches yet. Press PLAY!</p>
      )}
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {history.map((h) => {
          let heroName = h.heroId;
          try {
            heroName = getHeroDef(h.heroId).name;
          } catch {
            /* */
          }
          return (
            <div
              key={h.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 100px 100px',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 6,
                border: '1px solid var(--wood-light)',
                alignItems: 'center',
              }}
            >
              <strong style={{ color: 'var(--gold)' }}>#{h.placement}</strong>
              <div>
                <div>{heroName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {new Date(h.date).toLocaleString()} · Round {h.turnsSurvived} ·{' '}
                  {h.activeTribes.join(', ')}
                </div>
              </div>
              <div style={{ color: h.mmrChange >= 0 ? '#4ade80' : '#f87171' }}>
                {h.mmrChange >= 0 ? '+' : ''}
                {h.mmrChange}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {h.mmrAfter} MMR
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatsPage() {
  const profile = useGameStore((s) => s.profile);
  const s = profile.stats;
  const avg = s.gamesPlayed ? (s.totalPlacement / s.gamesPlayed).toFixed(2) : '—';

  let mostPlayed = '—';
  let bestHero = '—';
  let favTribe = '—';
  try {
    const topHero = Object.entries(s.heroPlayCounts).sort((a, b) => b[1] - a[1])[0];
    if (topHero) mostPlayed = getHeroDef(topHero[0]).name;
    const winHero = Object.entries(s.heroWins).sort((a, b) => b[1] - a[1])[0];
    if (winHero) bestHero = getHeroDef(winHero[0]).name;
    const topTribe = Object.entries(s.tribePlayCounts).sort((a, b) => b[1] - a[1])[0];
    if (topTribe) favTribe = TRIBE_INFO[topTribe[0] as Exclude<Tribe, 'neutral'>]?.name ?? topTribe[0];
  } catch {
    /* */
  }

  const rows = [
    ['Games Played', s.gamesPlayed],
    ['Wins', s.wins],
    ['Top 4s', s.top4s],
    ['Average Placement', avg],
    ['Current MMR', profile.mmr],
    ['Highest MMR', profile.peakMmr],
    ['Most Played Hero', mostPlayed],
    ['Best Hero', bestHero],
    ['Favorite Tribe', favTribe],
    ['Minions Purchased', s.totalMinionsPurchased],
    ['Triples Created', s.totalTriplesCreated],
  ];

  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Statistics</h2>
        <BackBtn />
      </div>
      <div style={{ maxWidth: 480, display: 'grid', gap: '0.5rem' }}>
        {rows.map(([label, val]) => (
          <div
            key={String(label)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.6rem 0.8rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
            }}
          >
            <span style={{ color: 'var(--text-dim)' }}>{label}</span>
            <strong>{val}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const settings = useGameStore((s) => s.profile.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  return (
    <div className="page-screen">
      <div className="page-header">
        <h2>Settings</h2>
        <BackBtn />
      </div>
      <div style={{ maxWidth: 400, display: 'grid', gap: '1rem' }}>
        {(
          [
            ['masterVolume', 'Master Volume'],
            ['musicVolume', 'Music Volume'],
            ['effectsVolume', 'Effects Volume'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: 'grid', gap: '0.35rem' }}>
            <span>
              {label}: {Math.round(settings[key] * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings[key]}
              onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.recruitTimer}
            onChange={(e) => updateSettings({ recruitTimer: e.target.checked })}
          />
          Recruit timer (UI ready — timer optional)
        </label>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Sound uses placeholder tones until real audio assets are added. Music channel is
          reserved for future tavern ambience.
        </p>
      </div>
    </div>
  );
}
