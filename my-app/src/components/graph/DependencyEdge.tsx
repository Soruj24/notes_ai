"use client";

interface Props {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  selected?: boolean;
  onSelect?: (id: string) => void;
  type?: string;
}

export function DependencyEdge({
  id,
  from,
  to,
  selected,
  highlighted,
  dimmed,
  onSelect,
  type,
}: Props & { highlighted?: boolean; dimmed?: boolean }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  return (
    <g onClick={() => onSelect?.(id)} className="cursor-pointer">
      <path
        d={d}
        fill="none"
        stroke={selected ? "#6366f1" : highlighted ? "#818cf8" : "#a1a1aa"}
        strokeWidth={selected ? 2.5 : highlighted ? 2 : 1.5}
        markerEnd="url(#arrow)"
        opacity={dimmed ? 0.25 : selected || highlighted ? 1 : 0.85}
        style={{ transition: "stroke 180ms ease, opacity 180ms ease, stroke-width 180ms ease" }}
      />
      {type ? (
        <text
          x={midX}
          y={midY - 4}
          textAnchor="middle"
          fontSize={10}
          fill={highlighted || selected ? "#6366f1" : "#71717a"}
          opacity={dimmed ? 0.3 : 1}
          style={{ transition: "opacity 180ms ease" }}
        >
          {type}
        </text>
      ) : null}
    </g>
  );
}
