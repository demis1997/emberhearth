import { useState, type ReactNode } from 'react';
import { KEYWORD_INFO } from '../data/tribes';
import type { Keyword } from '../engine/types';

export function KeywordTip({
  keyword,
  children,
}: {
  keyword: Keyword | string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const info = KEYWORD_INFO[keyword as Keyword];

  if (!info) return <>{children}</>;

  return (
    <span
      className="kw-chip"
      onMouseEnter={(e) => setPos({ x: e.clientX + 12, y: e.clientY + 12 })}
      onMouseMove={(e) => setPos({ x: e.clientX + 12, y: e.clientY + 12 })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span className="tooltip" style={{ left: pos.x, top: pos.y }}>
          <strong>{info.name}</strong>
          <br />
          {info.description}
        </span>
      )}
    </span>
  );
}
