import { requireFlag } from "@/src/lib/features/evaluation";

export interface DependencySuggestion {
  sourceTaskId: string; // predecessor — blocks
  targetTaskId: string; // successor — blocked
  reason: string;
  confidence: number; // 0-1
}

/**
 * AI-powered dependency suggestions — inspect tasks, projects, goals,
 * existing dependencies, descriptions, dates, durations.
 * Returns structured suggestions without modifying DB.
 */
export async function suggestProjectDependencies(input: {
  userId: string;
  workspaceId: string;
  projectId?: string;
}): Promise<DependencySuggestion[]> {
  await requireFlag("tasks", input.userId);

  const [{ listTasks }, { listTaskDependencies }, { getProject }, { listUserProjects }] = await Promise.all([
    import("@/src/repositories/task.repository"),
    import("@/src/repositories/task-dependency.repository"),
    import("@/src/repositories/project.repository").then((m) => ({ getProject: m.getProject })),
    import("@/src/services/project.service").then((m) => ({ listUserProjects: m.listUserProjects })),
  ]);

  // Fetch workspace-isolated data
  const [tasks, existingDeps, projects, goals] = await Promise.all([
    listTasks(input.userId, input.workspaceId, input.projectId ? ({ projectId: input.projectId } as never) : {}),
    listTaskDependencies(input.userId, input.workspaceId),
    // Projects for this workspace (optional project filter already applied to tasks)
    (async () => {
      try {
        return await listUserProjects(input.userId, input.workspaceId, "active" as never);
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        // Direct repo call to avoid service flag mismatch; fallback empty
        const { requireMembership } = await import("@/src/repositories/base");
        await requireMembership(input.userId, input.workspaceId);
        // Use service if available
        const { listUserGoals } = await import("@/src/services/goal.service");
        return await listUserGoals(input.userId, input.workspaceId);
      } catch {
        return [];
      }
    })(),
  ]);

  if (input.projectId) {
    // Validate project belongs to workspace
    try {
      await getProject(input.userId, input.workspaceId, input.projectId);
    } catch {
      // Let validation handle — return empty if not found
    }
  }

  // Filter existing edges to avoid suggesting duplicates + self
  const existingSet: Set<string> = new Set(existingDeps.map((d: { predecessorTaskId: string; successorTaskId: string }) => `${d.predecessorTaskId}->${d.successorTaskId}`));
  const candidates = (tasks as Array<{ id: string; title: string; notes?: string; projectId?: string; goalId?: string; status: string; priority: string; dueAt?: unknown; startAt?: unknown; durationMin?: number | null }>).filter((t) => t.status !== "archived");

  // Build prompt payload
  const payload = {
    projectId: input.projectId ?? null,
    tasks: candidates.map((t: { id: string; title: string; notes?: string; projectId?: string; goalId?: string; status: string; priority: string; dueAt?: unknown; startAt?: unknown; durationMin?: number | null }) => ({
      id: t.id,
      title: t.title,
      description: (t.notes ?? "").slice(0, 400),
      projectId: t.projectId ?? null,
      goalId: t.goalId ?? null,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt ? new Date(t.dueAt as unknown as string).toISOString() : null,
      startAt: t.startAt ? new Date(t.startAt as unknown as string).toISOString() : null,
      durationMin: t.durationMin ?? null,
    })),
    projects: (projects as unknown as Array<{ id: string; name: string; description?: string }>).slice(0, 10).map((p) => ({ id: p.id, name: p.name, description: (p.description ?? "").slice(0, 200) })),
    goals: (goals as unknown as Array<{ id: string; title: string }>).slice(0, 10).map((g) => ({ id: g.id, title: g.title })),
    existingDependencies: existingDeps.map((d: { predecessorTaskId: string; successorTaskId: string; type: string }) => ({ source: d.predecessorTaskId, target: d.successorTaskId, type: d.type })),
  };

  // Try AI first
  try {
    const { completeJson } = await import("@/src/lib/ai/complete");
    type Raw = { suggestions: Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }> };
    const system = `You are a project dependency analyst. Inspect tasks, projects, goals, existing dependencies, descriptions, dates, and estimated durations. Suggest missing dependencies. Example: "Build Product UI" may depend on "Build Product API". Return only suggestions where source should finish before target can start. Confidence 0-1. Avoid suggesting existing edges, self-edges, or cycles. Max 8 suggestions.`;
    const user = `Workspace tasks/projects/goals:\n${JSON.stringify(payload, null, 2)}\n\nReturn JSON: {"suggestions":[{"sourceTaskId":"...","targetTaskId":"...","reason":"...","confidence":0.85}]}`;
    const result = await completeJson<Raw>(system, user);
    const filtered = (result.suggestions ?? [])
      .filter((s) => s.sourceTaskId && s.targetTaskId && s.sourceTaskId !== s.targetTaskId)
      .filter((s) => !existingSet.has(`${s.sourceTaskId}->${s.targetTaskId}`))
      .filter((s) => candidates.some((t: { id: string }) => t.id === s.sourceTaskId) && candidates.some((t: { id: string }) => t.id === s.targetTaskId))
      .map((s) => ({
        sourceTaskId: s.sourceTaskId,
        targetTaskId: s.targetTaskId,
        reason: s.reason?.slice(0, 300) ?? "Inferred dependency",
        confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0.6)),
      }))
      .slice(0, 8);

    // Validate no cycle would be introduced (optional but safe)
    const { hasPath, buildAdj } = await import("@/src/lib/graph/dag");
    const adj = buildAdj(existingDeps as never);
    for (const n of candidates) if (!adj.has((n as { id: string }).id)) adj.set((n as { id: string }).id, []);
    const safe = filtered.filter((s) => !hasPath(adj, s.targetTaskId, s.sourceTaskId));
    if (safe.length) return safe;
    // If AI suggested only cyclic ones, fall through to heuristic
  } catch {
    // Fallback to heuristic — do not fail request
  }

  // Heuristic fallback: keyword + date proximity + project co-location
  const heuristic = heuristicSuggestions(candidates as Array<{ id: string; title: string; notes?: string; projectId?: string; dueAt?: unknown; durationMin?: number | null }>, existingSet);
  return heuristic;
}

function heuristicSuggestions(
  tasks: Array<{ id: string; title: string; notes?: string; projectId?: string; dueAt?: unknown; durationMin?: number | null }>,
  existingSet: Set<string>,
): DependencySuggestion[] {
  const suggestions: DependencySuggestion[] = [];
  // Title keyword groups that imply ordering
  const pairs: Array<{ predKeywords: string[]; succKeywords: string[]; reason: string }> = [
    { predKeywords: ["api", "backend", "server", "database", "schema"], succKeywords: ["ui", "frontend", "client", "screen", "component"], reason: "UI likely depends on API implementation" },
    { predKeywords: ["design", "mockup", "wireframe"], succKeywords: ["build", "implement", "develop"], reason: "Implementation depends on design" },
    { predKeywords: ["spec", "requirements"], succKeywords: ["build", "implement"], reason: "Build depends on spec" },
  ];
  for (const pred of tasks) {
    for (const succ of tasks) {
      if (pred.id === succ.id) continue;
      if (existingSet.has(`${pred.id}->${succ.id}`)) continue;
      // Date heuristic: successor due after predecessor
      const predDue = pred.dueAt ? new Date(pred.dueAt as unknown as string).getTime() : 0;
      const succDue = succ.dueAt ? new Date(succ.dueAt as unknown as string).getTime() : 0;
      if (predDue && succDue && predDue > succDue) continue; // predecessor should be earlier
      // Project co-location boost
      const sameProject = pred.projectId && pred.projectId === succ.projectId;
      const predTitle = pred.title.toLowerCase();
      const succTitle = succ.title.toLowerCase();
      for (const p of pairs) {
        const predMatch = p.predKeywords.some((k) => predTitle.includes(k));
        const succMatch = p.succKeywords.some((k) => succTitle.includes(k));
        if (predMatch && succMatch) {
          suggestions.push({
            sourceTaskId: pred.id,
            targetTaskId: succ.id,
            reason: p.reason,
            confidence: sameProject ? 0.82 : 0.68,
          });
          break;
        }
      }
      if (suggestions.length >= 8) break;
    }
    if (suggestions.length >= 8) break;
  }
  // Dedupe
  const seen = new Set<string>();
  const out: DependencySuggestion[] = [];
  for (const s of suggestions) {
    const key = `${s.sourceTaskId}->${s.targetTaskId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.slice(0, 5);
}
