import { useState, useRef, useCallback } from 'react';
import { getMinionDef } from '../data/minions';
import { TRIBE_INFO } from '../data/tribes';
import { getMinionDescription } from '../engine/minionFactory';
import type { MinionInstance, Tribe } from '../engine/types';
import { FantasyArt } from '../art/FantasyArt';
import { tribeIconPath, UI_ASSETS } from '../art/paths';

export type CardSize = 'board' | 'shop' | 'hand' | 'preview';

interface Props {
  minion: MinionInstance;
  size?: CardSize;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  /** Shop: dim when unaffordable */
  unaffordable?: boolean;
  showHoverPreview?: boolean;
}

export function MinionCard({
  minion,
  size = 'board',
  onClick,
  selected,
  className = '',
  draggable,
  onDragStart,
  unaffordable,
  showHoverPreview = true,
}: Props) {
  const def = getMinionDef(minion.defId);
  const tribe = def.tribe as Tribe;
  const color =
    tribe !== 'neutral' ? TRIBE_INFO[tribe]?.color ?? '#888' : '#8a7a60';
  const desc = getMinionDescription(minion);
  const tribeName = tribe === 'neutral' ? 'Neutral' : TRIBE_INFO[tribe]?.name ?? tribe;

  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const onEnter = useCallback(() => {
    if (!showHoverPreview || size === 'preview') return;
    setHover(true);
  }, [showHoverPreview, size]);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!showHoverPreview) return;
      const pad = 16;
      let x = e.clientX + pad;
      let y = e.clientY - 40;
      if (x + 220 > window.innerWidth) x = e.clientX - 236;
      if (y + 320 > window.innerHeight) y = window.innerHeight - 330;
      if (y < 8) y = 8;
      setPos({ x, y });
    },
    [showHoverPreview],
  );

  const kwShort = minion.keywords
    .slice(0, 3)
    .map((k) => {
      if (k === 'deathEffect') return 'Death';
      if (k === 'startOfCombat') return 'SoC';
      if (k === 'endOfTurn') return 'EoT';
      if (k === 'afterAttack') return 'Atk';
      if (k === 'battlecry') return 'BC';
      return k.charAt(0).toUpperCase() + k.slice(1);
    });

  return (
    <>
      <div
        ref={ref}
        className={[
          'mcard',
          `mcard--${size}`,
          minion.golden ? 'mcard--golden' : '',
          selected ? 'mcard--selected' : '',
          unaffordable ? 'mcard--dim' : '',
          minion.hasShield ? 'mcard--shield' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ['--tribe' as string]: color }}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(false)}
      >
        <div className="mcard__frame">
          <div className="mcard__tier" title={`Tavern Tier ${def.tavernTier}`}>
            <img src={UI_ASSETS.tierGem} alt="" />
            <span>{def.tavernTier}</span>
          </div>

          <div className="mcard__art">
            <FantasyArt
              id={minion.defId}
              kind="minion"
              tribe={tribe}
              name={def.name}
              golden={minion.golden}
            />
          </div>

          <div className="mcard__nameplate">
            <span className="mcard__name">
              {minion.golden ? '✦ ' : ''}
              {def.name}
            </span>
          </div>

          <div className="mcard__meta">
            <img className="mcard__tribe-icon" src={tribeIconPath(tribe)} alt={tribeName} />
            <span className="mcard__tribe-label">{tribeName}</span>
            {kwShort.length > 0 && (
              <span className="mcard__kws">
                {kwShort.map((k) => (
                  <span key={k} className="mcard__kw">
                    {k}
                  </span>
                ))}
              </span>
            )}
          </div>

          {(size === 'shop' || size === 'hand' || size === 'preview') && (
            <div className="mcard__ability">{desc}</div>
          )}

          <div className="mcard__stats">
            <div className="mcard__stat mcard__stat--atk">
              <img src={UI_ASSETS.attack} alt="" />
              <span>{minion.attack}</span>
            </div>
            <div className="mcard__stat mcard__stat--hp">
              <img src={UI_ASSETS.health} alt="" />
              <span>{minion.health}</span>
            </div>
          </div>
        </div>
      </div>

      {hover && showHoverPreview && size !== 'preview' && (
        <div className="mcard-preview-portal" style={{ left: pos.x, top: pos.y }}>
          <MinionCard minion={minion} size="preview" showHoverPreview={false} />
          <p className="mcard-preview-portal__desc">{desc}</p>
        </div>
      )}
    </>
  );
}
