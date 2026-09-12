"use client";

import { memo } from "react";

interface Props {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  selected?: boolean;
  onSelect?: (id: string) => void;
  type?: string;
  highlighted?: boolean;
  dimmed?: boolean;
}

function DependencyEdgeInner({ id, from, to, selected, highlighted, dimmed, onSelect, type }: Props) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  return (
    <g onClick={() => onSelect?.(id)} className="cursor-pointer">
      {/* hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={d}
        fill="none"
        stroke={selected ? "#18181b" : highlighted ? "#3f3f46" : "#d4d4d8"}
        strokeWidth={selected ? 1.6 : highlighted ? 1.25 : 1}
        strokeLinecap="round"
        opacity={dimmed ? 0.22 : 1}
        style={{ transition: "stroke 150ms ease, opacity 150ms ease" }}
      />
      {/* dot at end for minimal arrow */}
      <circle cx={to.x} cy={to.y} r={2.2} fill={selected || highlighted ? "#18181b" : "#a1a1aa"} opacity={dimmed ? 0.3 : 1} />
      {type && (selected || highlighted) ? (
        <text x={midX} y={midY - 6} textAnchor="middle" fontSize={9} fontWeight={500} letterSpacing={0.3} fill="#52525b" opacity={dimmed ? 0 : 1}>
          {type}
        </text>
      ) : null}
    </g>
  );
}

export const DependencyEdge = memo(DependencyEdgeInner);
