/**
 * Pure DAG helpers — no DB, no I/O, no React.
 * Mirrors src/lib/scheduling/range.ts and planning/scheduler.ts style.
 */

export type Adj = Map<string, string[]>; // predecessor -> successors? Actually blockedBy edge: successor → predecessor

export function buildAdj(
  deps: Array<{ predecessorTaskId: string; successorTaskId: string }>,
): Adj {
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    const from = d.predecessorTaskId;
    const to = d.successorTaskId;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    // Edge: successor depends on predecessor → for cycle/toposort we need predecessor → successor
    // But for blocked check we need successor → predecessor. We store both directions via two maps.
    // Here store dependsOn graph: successor -> predecessor list is handled separately; this map is predecessor -> [successors] for forward traversal
    adj.get(from)!.push(to);
  }
  return adj;
}

export function buildBlockedAdj(
  deps: Array<{ predecessorTaskId: string; successorTaskId: string }>,
): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const d of deps) {
    const preds = m.get(d.successorTaskId) ?? [];
    preds.push(d.predecessorTaskId);
    m.set(d.successorTaskId, preds);
    if (!m.has(d.predecessorTaskId)) m.set(d.predecessorTaskId, m.get(d.predecessorTaskId) ?? []);
  }
  return m;
}

export function detectCycle(adj: Adj): string[] | null {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];
  let cycle: string[] | null = null;

  const dfs = (node: string): boolean => {
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const nb of adj.get(node) ?? []) {
      if (!visited.has(nb)) {
        if (dfs(nb)) return true;
      } else if (stack.has(nb)) {
        // found cycle — slice path from nb to end
        const idx = path.indexOf(nb);
        cycle = path.slice(idx);
        cycle.push(nb); // close loop
        return true;
      }
    }
    stack.delete(node);
    path.pop();
    return false;
  };

  for (const n of adj.keys()) {
    if (!visited.has(n) && dfs(n)) break;
  }
  return cycle;
}

export function topologicalSort(adj: Adj): string[] | null {
  // Kahn's algorithm
  const indeg = new Map<string, number>();
  for (const [u, vs] of adj) {
    if (!indeg.has(u)) indeg.set(u, 0);
    for (const v of vs) indeg.set(v, (indeg.get(v) ?? 0) + 1);
  }
  const q: string[] = [];
  for (const [n, d] of indeg) if (d === 0) q.push(n);
  const out: string[] = [];
  let qi = 0;
  while (qi < q.length) {
    const u = q[qi++];
    out.push(u);
    for (const v of adj.get(u) ?? []) {
      const nd = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, nd);
      if (nd === 0) q.push(v);
    }
  }
  return out.length === indeg.size ? out : null; // null means cycle
}

export function hasPath(adj: Adj, from: string, to: string): boolean {
  if (from === to) return true;
  const visited = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const u = stack.pop()!;
    if (visited.has(u)) continue;
    visited.add(u);
    for (const v of adj.get(u) ?? []) {
      if (v === to) return true;
      if (!visited.has(v)) stack.push(v);
    }
  }
  return false;
}

export function blockedClosure(
  blockedAdj: Map<string, string[]>,
  done: Set<string>,
): Map<string, boolean> {
  const memo = new Map<string, boolean>();
  const visiting = new Set<string>();

  const isBlocked = (id: string): boolean => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return false; // cycle break — treat as not blocked to avoid infinite loop
    visiting.add(id);
    const preds = blockedAdj.get(id) ?? [];
    let blocked = false;
    for (const p of preds) {
      if (!done.has(p) || isBlocked(p)) {
        blocked = true;
        break;
      }
    }
    visiting.delete(id);
    memo.set(id, blocked);
    return blocked;
  };

  for (const id of blockedAdj.keys()) isBlocked(id);
  return memo;
}
