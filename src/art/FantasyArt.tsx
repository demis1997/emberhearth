import { paletteFor, silhouetteVariant } from './palette';
import { heroArtPath, minionArtPath } from './paths';
import { hasHeroArt, hasMinionArt } from './registry';

interface Props {
  id: string;
  kind: 'hero' | 'minion';
  tribe?: string;
  name?: string;
  className?: string;
  golden?: boolean;
}

/**
 * Displays real art if registered; otherwise a unique painterly
 * SVG silhouette matching tribe/identity — never emoji.
 */
export function FantasyArt({
  id,
  kind,
  tribe = 'neutral',
  name,
  className = '',
  golden,
}: Props) {
  const hasFile = kind === 'hero' ? hasHeroArt(id) : hasMinionArt(id);
  const src = kind === 'hero' ? heroArtPath(id) : minionArtPath(id);
  const pal = paletteFor(id, kind === 'hero' ? 'hero' : tribe);
  const variant = silhouetteVariant(id);
  const svgId = id.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      className={`fantasy-art ${golden ? 'fantasy-art--golden' : ''} ${className}`}
      style={
        {
          ['--art-primary' as string]: pal.primary,
          ['--art-secondary' as string]: pal.secondary,
          ['--art-accent' as string]: pal.accent,
          ['--art-glow' as string]: pal.glow,
          ['--art-shadow' as string]: pal.shadow,
        } as React.CSSProperties
      }
      aria-label={name ?? id}
    >
      {hasFile ? (
        <img src={src} alt="" className="fantasy-art__img" draggable={false} />
      ) : (
        <svg
          className="fantasy-art__svg"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id={`bg${svgId}`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor={pal.glow} stopOpacity="0.55" />
              <stop offset="55%" stopColor={pal.primary} />
              <stop offset="100%" stopColor={pal.shadow} />
            </radialGradient>
            <linearGradient id={`body${svgId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={pal.accent} stopOpacity="0.9" />
              <stop offset="100%" stopColor={pal.primary} />
            </linearGradient>
          </defs>
          <rect width="200" height="240" fill={`url(#bg${svgId})`} />
          <ellipse cx="100" cy="200" rx="90" ry="40" fill={pal.shadow} opacity="0.5" />
          <Silhouette variant={variant} fill={`url(#body${svgId})`} accent={pal.accent} />
          <ellipse cx="100" cy="88" rx="28" ry="34" fill={pal.glow} opacity="0.25" />
          <circle cx="88" cy="90" r="4" fill="#1a1008" opacity="0.85" />
          <circle cx="112" cy="90" r="4" fill="#1a1008" opacity="0.85" />
          <path
            d="M55 70 Q40 120 70 180"
            fill="none"
            stroke={pal.glow}
            strokeWidth="3"
            opacity="0.35"
          />
          {/* Texture grain */}
          <rect width="200" height="240" fill={pal.shadow} opacity="0.12" />
        </svg>
      )}
      <div className="fantasy-art__vignette" />
    </div>
  );
}

function Silhouette({
  variant,
  fill,
  accent,
}: {
  variant: number;
  fill: string;
  accent: string;
}) {
  switch (variant) {
    case 0:
      return (
        <g>
          <ellipse cx="100" cy="70" rx="32" ry="36" fill={fill} />
          <path d="M68 100 Q100 95 132 100 L145 210 L55 210 Z" fill={fill} />
          <path d="M70 120 L40 160 L55 165 L75 130" fill={accent} opacity="0.7" />
        </g>
      );
    case 1:
      return (
        <g>
          <ellipse cx="100" cy="75" rx="38" ry="34" fill={fill} />
          <path d="M50 105 Q100 90 150 105 L160 215 L40 215 Z" fill={fill} />
          <ellipse cx="100" cy="140" rx="50" ry="30" fill={accent} opacity="0.3" />
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M40 90 Q20 50 55 70 Q75 85 85 95" fill={accent} opacity="0.8" />
          <path d="M160 90 Q180 50 145 70 Q125 85 115 95" fill={accent} opacity="0.8" />
          <ellipse cx="100" cy="72" rx="30" ry="34" fill={fill} />
          <path d="M72 100 Q100 98 128 100 L140 205 L60 205 Z" fill={fill} />
          <path d="M85 48 L90 28 L100 48" fill={accent} />
          <path d="M115 48 L110 28 L100 48" fill={accent} />
        </g>
      );
    case 3:
      return (
        <g>
          <path d="M55 60 Q100 40 145 60 L155 220 L45 220 Z" fill={fill} />
          <ellipse cx="100" cy="85" rx="26" ry="30" fill={accent} opacity="0.5" />
          <path d="M70 70 Q100 55 130 70 L125 95 Q100 110 75 95 Z" fill={fill} />
        </g>
      );
    case 4:
      return (
        <g>
          <ellipse cx="100" cy="130" rx="55" ry="45" fill={fill} />
          <ellipse cx="100" cy="85" rx="40" ry="38" fill={fill} />
          <ellipse cx="70" cy="55" rx="12" ry="18" fill={accent} />
          <ellipse cx="130" cy="55" rx="12" ry="18" fill={accent} />
          <ellipse cx="55" cy="150" rx="18" ry="12" fill={accent} opacity="0.6" />
          <ellipse cx="145" cy="150" rx="18" ry="12" fill={accent} opacity="0.6" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="100" cy="68" rx="28" ry="32" fill={fill} />
          <path d="M75 95 Q100 100 125 95 L135 200 Q100 220 65 200 Z" fill={fill} />
          <circle cx="145" cy="120" r="14" fill={accent} opacity="0.7" />
          <circle cx="145" cy="120" r="6" fill="#fff" opacity="0.5" />
          <path
            d="M60 180 Q100 160 140 180"
            fill="none"
            stroke={accent}
            strokeWidth="4"
            opacity="0.5"
          />
        </g>
      );
  }
}
