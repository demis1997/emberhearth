import { useMemo, useState } from 'react';
import { BUY_COST, MAX_BOARD_SIZE, REFRESH_COST } from '../config/balance';
import { getHeroDef } from '../data/heroes';
import { useGameStore } from '../store/gameStore';
import { FantasyArt } from '../art/FantasyArt';
import { UI_ASSETS } from '../art/paths';
import { MinionCard } from './MinionCard';
import { GameBtn, GoldDisplay } from './GameUI';

type DragPayload =
  | { from: 'shop'; index: number }
  | { from: 'hand'; index: number }
  | { from: 'board'; index: number };

export function TavernView() {
  const match = useGameStore((s) => s.match);
  const matchState = useGameStore((s) => s.matchState);
  const buy = useGameStore((s) => s.buy);
  const sell = useGameStore((s) => s.sell);
  const refresh = useGameStore((s) => s.refresh);
  const freeze = useGameStore((s) => s.freeze);
  const upgrade = useGameStore((s) => s.upgrade);
  const heroPower = useGameStore((s) => s.heroPower);
  const playFromHand = useGameStore((s) => s.playFromHand);
  const moveBoard = useGameStore((s) => s.moveBoard);
  const ready = useGameStore((s) => s.ready);
  const selectedOpponentId = useGameStore((s) => s.selectedOpponentId);
  const setSelectedOpponent = useGameStore((s) => s.setSelectedOpponent);
  const pendingDiscover = useGameStore((s) => s.pendingDiscover);
  const chooseDiscover = useGameStore((s) => s.chooseDiscover);

  const [sellHot, setSellHot] = useState(false);

  const human = useMemo(() => {
    if (!matchState) return null;
    return matchState.players.find((p) => p.id === matchState.humanPlayerId) ?? null;
  }, [matchState]);

  if (!match || !matchState || !human) return null;

  const hero = getHeroDef(human.heroId);
  const upgradeCost = match.getUpgradeCost();
  const hp = hero.heroPower;
  const canHP =
    hp.type === 'active' &&
    human.heroPowerUsedThisTurn < hp.usesPerTurn &&
    human.gold >= hp.cost;

  const onDragStart = (payload: DragPayload) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const parseDrop = (e: React.DragEvent): DragPayload | null => {
    try {
      return JSON.parse(e.dataTransfer.getData('text/plain')) as DragPayload;
    } catch {
      return null;
    }
  };

  const onDropBoard = (boardIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const payload = parseDrop(e);
    if (!payload) return;
    if (payload.from === 'hand') playFromHand(payload.index, boardIndex);
    if (payload.from === 'board') moveBoard(payload.index, boardIndex);
    if (payload.from === 'shop') buy(payload.index);
  };

  const onDropSell = (e: React.DragEvent) => {
    e.preventDefault();
    setSellHot(false);
    const payload = parseDrop(e);
    if (payload && (payload.from === 'board' || payload.from === 'hand')) {
      sell(payload.from, payload.index);
    }
  };

  const scout = selectedOpponentId
    ? matchState.players.find((p) => p.id === selectedOpponentId)
    : null;

  const lobby = [...matchState.players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.health + b.armor - (a.health + a.armor);
  });

  return (
    <div className="tavern-game">
      <div
        className="tavern-game__bg"
        style={{ backgroundImage: `url(${UI_ASSETS.tavernBg})` }}
      />
      <div className="tavern-game__vignette" />

      {/* ── LEFT: Hero + Lobby ── */}
      <aside className="tg-left">
        <div className="hero-panel">
          <div className="hero-panel__portrait-wrap">
            <FantasyArt id={human.heroId} kind="hero" name={hero.name} className="hero-panel__art" />
            <div className="hero-panel__frame-ring" />
          </div>
          <h2 className="hero-panel__name">{hero.name}</h2>
          <div className="hero-panel__vitals">
            <div className="vital vital--hp">
              <img src={UI_ASSETS.health} alt="" />
              <span>{human.health}</span>
            </div>
            {human.armor > 0 && (
              <div className="vital vital--armor">
                <img src={UI_ASSETS.armor} alt="" />
                <span>{human.armor}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`hero-power ${!canHP && hp.type === 'active' ? 'hero-power--disabled' : ''} ${hp.type === 'passive' ? 'hero-power--passive' : ''}`}
            disabled={hp.type === 'active' && !canHP}
            onClick={heroPower}
            title={hp.description}
          >
            <div className="hero-power__icon">
              <FantasyArt id={human.heroId} kind="hero" />
            </div>
            <div className="hero-power__body">
              <div className="hero-power__title">
                {hp.name}
                {hp.type === 'active' && (
                  <span className="hero-power__cost">
                    <img src={UI_ASSETS.goldCoin} alt="" />
                    {hp.cost}
                  </span>
                )}
                {hp.type === 'passive' && <span className="hero-power__passive">Passive</span>}
              </div>
              <p className="hero-power__desc">{hp.description}</p>
            </div>
          </button>
        </div>

        <div className="lobby-list">
          <div className="lobby-list__title">Warbands</div>
          {lobby.map((p) => (
            <button
              key={p.id}
              type="button"
              className={[
                'lobby-row',
                !p.alive ? 'lobby-row--dead' : '',
                p.isHuman ? 'lobby-row--you' : '',
                selectedOpponentId === p.id ? 'lobby-row--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedOpponent(p.isHuman ? null : p.id)}
            >
              <div className="lobby-row__port">
                <FantasyArt id={p.heroId} kind="hero" />
              </div>
              <div className="lobby-row__info">
                <span className="lobby-row__name">{p.isHuman ? 'YOU' : p.name}</span>
                <span className="lobby-row__meta">
                  T{p.tavernTier}
                  {p.lastCombatResult === 'win' ? ' · Won' : ''}
                  {p.lastCombatResult === 'loss' ? ' · Lost' : ''}
                </span>
              </div>
              <div className="lobby-row__hp">
                {p.alive ? (
                  <>
                    {p.health}
                    {p.armor > 0 ? (
                      <span className="lobby-row__armor">+{p.armor}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="lobby-row__place">#{p.placement}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── CENTER: Keeper + Shop + Board ── */}
      <main className="tg-center">
        <div className="keeper-stage">
          <div className="keeper-stage__figure">
            <img src={UI_ASSETS.brannick} alt="Brannick the Innkeeper" className="keeper-stage__img" />
            <div className="keeper-stage__bubble">
              <strong>Brannick</strong>
              <p>{matchState.tavernKeeperLine}</p>
            </div>
          </div>
        </div>

        <section className={`shop-stage ${human.shopFrozen ? 'shop-stage--frozen' : ''}`}>
          <div className="shop-stage__counter" />
          <div className="shop-stage__label">Tavern Offerings</div>
          <div className="shop-stage__cards">
            {human.shop.map((m, i) => (
              <MinionCard
                key={m.instanceId}
                minion={m}
                size="shop"
                unaffordable={human.gold < BUY_COST}
                draggable={human.gold >= BUY_COST}
                onDragStart={onDragStart({ from: 'shop', index: i })}
                onClick={() => {
                  if (human.gold >= BUY_COST) buy(i);
                }}
                className={human.gold >= BUY_COST ? 'mcard--buyable' : ''}
              />
            ))}
            {human.shop.length === 0 && (
              <div className="shop-stage__empty">The shelves are bare…</div>
            )}
          </div>
        </section>

        <section
          className="board-stage"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropBoard(human.board.length)}
        >
          <div className="board-stage__label">
            Your Warband
            <span>
              {human.board.length}/{MAX_BOARD_SIZE}
            </span>
          </div>
          <div className="board-stage__table">
            {human.board.map((m, i) => (
              <div
                key={m.instanceId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropBoard(i)}
              >
                <MinionCard
                  minion={m}
                  size="board"
                  draggable
                  onDragStart={onDragStart({ from: 'board', index: i })}
                />
              </div>
            ))}
            {Array.from({ length: Math.max(0, MAX_BOARD_SIZE - human.board.length) }).map(
              (_, i) => (
                <div key={`slot-${i}`} className="board-slot" />
              ),
            )}
          </div>
        </section>

        {scout && !scout.isHuman && (
          <div className="scout-strip">
            <span className="scout-strip__label">Last seen — {scout.name}</span>
            <div className="scout-strip__cards">
              {scout.lastSeenBoard.length === 0 && (
                <span className="scout-strip__empty">No board observed</span>
              )}
              {scout.lastSeenBoard.map((m) => (
                <MinionCard key={m.instanceId} minion={m} size="board" showHoverPreview={false} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── RIGHT: Resources + Controls ── */}
      <aside className="tg-right">
        <div className="res-stack">
          <div className="res-chip">
            <span className="res-chip__label">Round</span>
            <span className="res-chip__value">{matchState.round}</span>
          </div>
          <div className="res-chip res-chip--tier">
            <span className="res-chip__label">Tavern Tier</span>
            <span className="res-chip__value">
              <img src={UI_ASSETS.tierGem} alt="" />
              {human.tavernTier}
            </span>
          </div>
          <GoldDisplay amount={human.gold} />
        </div>

        <div className="ctrl-stack">
          <GameBtn
            variant="refresh"
            disabled={human.gold < REFRESH_COST}
            onClick={refresh}
            title={`Refresh shop (${REFRESH_COST} gold)`}
          >
            Refresh
            <span className="gbtn__cost">
              <img src={UI_ASSETS.goldCoin} alt="" />
              {REFRESH_COST}
            </span>
          </GameBtn>

          <GameBtn
            variant="freeze"
            active={human.shopFrozen}
            onClick={freeze}
            title="Freeze shop for next turn"
          >
            {human.shopFrozen ? 'Frozen' : 'Freeze'}
          </GameBtn>

          <GameBtn
            variant="upgrade"
            disabled={human.tavernTier >= 6 || human.gold < upgradeCost}
            onClick={upgrade}
            title="Upgrade tavern tier"
          >
            Upgrade
            <span className="gbtn__cost">
              <img src={UI_ASSETS.goldCoin} alt="" />
              {upgradeCost}
            </span>
          </GameBtn>

          <div
            className={`sell-well ${sellHot ? 'sell-well--hot' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setSellHot(true);
            }}
            onDragLeave={() => setSellHot(false)}
            onDrop={onDropSell}
          >
            Sell
            <small>+1</small>
          </div>

          <GameBtn variant="ready" onClick={ready} className="ctrl-stack__ready">
            READY
          </GameBtn>
        </div>
      </aside>

      {/* ── BOTTOM: Hand ── */}
      {human.hand.length > 0 && (
        <footer className="tg-hand">
          <div className="tg-hand__rail">
            {human.hand.map((m, i) => (
              <MinionCard
                key={m.instanceId}
                minion={m}
                size="hand"
                draggable
                onDragStart={onDragStart({ from: 'hand', index: i })}
                onClick={() => {
                  if (human.board.length < MAX_BOARD_SIZE) {
                    playFromHand(i, human.board.length);
                  }
                }}
              />
            ))}
          </div>
        </footer>
      )}

      {pendingDiscover && (
        <div className="overlay">
          <div className="modal discover-modal">
            <h2>Discover</h2>
            <p>Your triple grants a higher-tier recruit. Choose one:</p>
            <div className="discover-modal__row">
              {pendingDiscover.map((m, i) => (
                <MinionCard
                  key={m.instanceId}
                  minion={m}
                  size="hand"
                  onClick={() => chooseDiscover(i)}
                  showHoverPreview={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
