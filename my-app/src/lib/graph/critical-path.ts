/**
 * Critical path (longest path in DAG by duration).
 * Pure, no I/O.
 */
import type { Adj } from "./dag";

export interface CriticalPathResult {
  path: string[];
  totalMin: number;
}

export function computeCriticalPath(
  forwardAdj: Adj, // predecessor -> successors
  durations: Map<string, number>, // node id -> durationMin (fallback handled by caller)
  topo: string[],
): CriticalPathResult {
  // DP over topological order: dist[v] = weight(v) + max(dist[u]) where u->v
  // Need reverse adjacency for DP
  const rev = new Map<string, string[]>();
  for (const [u, vs] of forwardAdj) {
    for (const v of vs) {
      const arr = rev.get(v) ?? [];
      arr.push(u);
      rev.set(v, arr);
    }
    if (!rev.has(u)) rev.set(u, rev.get(u) ?? []);
  }
  for (const n of topo) if (!rev.has(n)) rev.set(n, []);

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const node of topo) {
    const w = durations.get(node) ?? 30; // fallback 30 min
    let best = 0;
    let bestPred: string | null = null;
    for (const p of rev.get(node) ?? []) {
      const d = dist.get(p) ?? 0;
      if (d > best) {
        best = d;
        bestPred = p;
      }
    }
    dist.set(node, best + w);
    prev.set(node, bestPred);
  }

  // Find max dist node (end of critical path)
  let maxNode: string | null = null;
  let maxDist = -1;
  for (const [n, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      maxNode = n;
    }
  }
  if (!maxNode) return { path: [], totalMin: 0 };

  // Reconstruct
  const path: string[] = [];
  let cur: string | null = maxNode;
  while (cur) {
    path.push(cur);
    cur = prev.get(cur) ?? null;
  }
  path.reverse();
  return { path, totalMin: maxDist };
}
