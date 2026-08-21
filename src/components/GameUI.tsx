import { UI_ASSETS } from '../art/paths';

interface GoldDisplayProps {
  amount: number;
  size?: 'lg' | 'md';
}

export function GoldDisplay({ amount, size = 'lg' }: GoldDisplayProps) {
  return (
    <div className={`gold-pill gold-pill--${size}`}>
      <img src={UI_ASSETS.goldCoin} alt="" className="gold-pill__coin" />
      <span className="gold-pill__num">{amount}</span>
    </div>
  );
}

interface GameBtnProps {
  variant: 'refresh' | 'freeze' | 'upgrade' | 'ready' | 'power' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
}

export function GameBtn({
  variant,
  children,
  onClick,
  disabled,
  active,
  title,
  className = '',
}: GameBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`gbtn gbtn--${variant} ${active ? 'gbtn--active' : ''} ${className}`}
    >
      <span className="gbtn__inner">{children}</span>
    </button>
  );
}
