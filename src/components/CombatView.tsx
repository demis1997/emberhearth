import { useEffect, useMemo, useRef, useState } from 'react';
import { getHeroDef } from '../data/heroes';
import { cloneMinion, dealDamageToMinion } from '../engine/minionFactory';
import type { CombatEvent, MinionInstance } from '../engine/types';
import { soundManager } from '../audio/soundManager';
import { useGameStore } from '../store/gameStore';
import { FantasyArt } from '../art/FantasyArt';
import { UI_ASSETS } from '../art/paths';
import { MinionCard } from './MinionCard';
import { GameBtn } from './GameUI';

export function CombatView() {
  const matchState = useGameStore((s) => s.matchState);
  const finishCombat = useGameStore((s) => s.finishCombat);
  const combatSpeed = useGameStore((s) => s.profile.settings.combatSpeed);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const combat = matchState?.combat ?? null;
  const [eventIdx, setEventIdx] = useState(0);
  const [playerBoard, setPlayerBoard] = useState<MinionInstance[]>([]);
  const [oppBoard, setOppBoard] = useState<MinionInstance[]>([]);
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: string; text: string; key: number }[]>([]);
  const [log, setLog] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [done, setDone] = useState(false);
  const floatKey = useRef(0);
  const started = useRef(false);

  const opponent = useMemo(() => {
    if (!matchState || !combat) return null;
    return matchState.players.find((p) => p.id === combat.opponentId) ?? null;
  }, [matchState, combat]);

  const human = useMemo(() => {
    if (!matchState) return null;
    return matchState.players.find((p) => p.id === matchState.humanPlayerId) ?? null;
  }, [matchState]);

  useEffect(() => {
    if (!combat || started.current) return;
    started.current = true;
    setPlayerBoard(combat.playerBoard.map(cloneMinion));
    setOppBoard(combat.opponentBoard.map(cloneMinion));
    setEventIdx(0);
    setDone(false);
    setCanSkip(false);
    const t = window.setTimeout(() => setCanSkip(true), 2500);
    return () => clearTimeout(t);
  }, [combat]);

  useEffect(() => {
    if (!combat || done) return;
    if (eventIdx >= combat.events.length) {
      setDone(true);
      return;
    }

    const ev = combat.events[eventIdx]!;
    applyEvent(ev);
    const delay = (ev.delayMs ?? 400) / combatSpeed;
    const t = window.setTimeout(() => setEventIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdx, combat, combatSpeed, done]);

  function applyEvent(ev: CombatEvent) {
    if (ev.message) setLog(ev.message);

    if (ev.type === 'attack' && ev.actorId) {
      setAttackingId(ev.actorId);
      soundManager.play('attack');
      window.setTimeout(() => setAttackingId(null), 400);
    }

    if ((ev.type === 'damage' || ev.type === 'shieldBreak') && ev.targetId) {
      setHitId(ev.targetId);
      window.setTimeout(() => setHitId(null), 300);
      if (ev.type === 'shieldBreak') soundManager.play('shield');
      else soundManager.play('attack');

      const applyTo = (board: MinionInstance[]) => {
        const m = board.find((x) => x.instanceId === ev.targetId);
        if (!m) return;
        if (ev.type === 'shieldBreak') {
          m.hasShield = false;
          m.keywords = m.keywords.filter((k) => k !== 'shield');
        } else if (ev.amount) {
          dealDamageToMinion(m, ev.amount);
          floatKey.current += 1;
          setFloats((f) => [
            ...f,
            { id: m.instanceId, text: `-${ev.amount}`, key: floatKey.current },
          ]);
        }
      };
      setPlayerBoard((b) => {
        const n = b.map(cloneMinion);
        applyTo(n);
        return n;
      });
      setOppBoard((b) => {
        const n = b.map(cloneMinion);
        applyTo(n);
        return n;
      });
    }

    if (ev.type === 'death') {
      soundManager.play('death');
      if (ev.actorId) {
        setPlayerBoard((b) => b.filter((m) => m.instanceId !== ev.actorId));
        setOppBoard((b) => b.filter((m) => m.instanceId !== ev.actorId));
      }
    }

    if (ev.type === 'summon' && ev.minion) {
      soundManager.play('summon');
      const m = cloneMinion(ev.minion);
      if (ev.side === 'player') setPlayerBoard((b) => [...b, m]);
      else setOppBoard((b) => [...b, m]);
    }

    if (ev.type === 'reborn' && ev.minion && ev.actorId) {
      const revive = (board: MinionInstance[]) =>
        board.map((m) =>
          m.instanceId === ev.actorId ? { ...cloneMinion(ev.minion!), health: 1 } : m,
        );
      setPlayerBoard(revive);
      setOppBoard(revive);
    }

    if (ev.type === 'heroDamage') {
      setLog(`Hero takes ${ev.amount} damage!`);
    }

    if (ev.type === 'combatEnd') {
      setLog(
        ev.message === 'player'
          ? 'Victory!'
          : ev.message === 'opponent'
            ? 'Defeat…'
            : 'Tie!',
      );
    }
  }

  if (!combat || !human || !opponent) {
    return (
      <div className="combat-screen">
        <p>No combat this round.</p>
        <button type="button" className="btn btn-primary" onClick={finishCombat}>
          Continue
        </button>
      </div>
    );
  }

  const renderBoard = (board: MinionInstance[], side: 'player' | 'opponent') => (
    <div
      className="combat-row"
      style={{ ['--lunge' as string]: side === 'player' ? '-50px' : '50px' }}
    >
      {board
        .filter((m) => m.health > 0)
        .map((m) => (
          <div key={m.instanceId} style={{ position: 'relative' }}>
            <MinionCard
              minion={m}
              size="board"
              showHoverPreview={false}
              className={`${attackingId === m.instanceId ? 'attacking' : ''} ${hitId === m.instanceId ? 'hit' : ''}`}
            />
            {floats
              .filter((f) => f.id === m.instanceId)
              .map((f) => (
                <span key={f.key} className="dmg-float">
                  {f.text}
                </span>
              ))}
          </div>
        ))}
      {board.filter((m) => m.health > 0).length === 0 && (
        <span style={{ color: 'var(--text-dim)' }}>Empty</span>
      )}
    </div>
  );

  return (
    <div className="combat-screen">
      <div className="combat-hud">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              overflow: 'hidden',
              border: '2px solid var(--brass-dim)',
            }}
          >
            <FantasyArt id={opponent.heroId} kind="hero" />
          </div>
          <div>
            <strong>{opponent.name}</strong>
            <div style={{ color: '#ff7a7a', fontWeight: 700 }}>
              <img
                src={UI_ASSETS.health}
                alt=""
                width={16}
                height={16}
                style={{ verticalAlign: 'middle', marginRight: 4 }}
              />
              {opponent.health}
              {opponent.armor ? ` +${opponent.armor}` : ''}
              <span
                style={{
                  color: 'var(--text-dim)',
                  fontWeight: 500,
                  marginLeft: 8,
                  fontSize: '0.85rem',
                }}
              >
                {getHeroDef(opponent.heroId).name}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span
            style={{
              color: 'var(--parchment)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-story)',
            }}
          >
            {log}
          </span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${combatSpeed === s ? 'btn-magic' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.6rem' }}
              onClick={() => updateSettings({ combatSpeed: s as 1 | 2 | 4 })}
            >
              {s}x
            </button>
          ))}
          {(canSkip || done) && (
            <GameBtn variant="ready" onClick={finishCombat}>
              {done ? 'Continue' : 'Skip'}
            </GameBtn>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexDirection: 'row-reverse',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              overflow: 'hidden',
              border: '2px solid var(--brass)',
            }}
          >
            <FantasyArt id={human.heroId} kind="hero" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>YOU</strong>
            <div style={{ color: '#ff7a7a', fontWeight: 700 }}>
              {human.health}
              {human.armor ? ` +${human.armor}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="combat-boards">
        {renderBoard(oppBoard, 'opponent')}
        <div
          style={{
            textAlign: 'center',
            color: 'var(--brass)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.2em',
            fontSize: '1.1rem',
          }}
        >
          VS
        </div>
        {renderBoard(playerBoard, 'player')}
      </div>
    </div>
  );
}
