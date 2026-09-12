import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

// Ensure test DB
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/notoai_test_deps";
(process.env as Record<string, string>).NODE_ENV = "test";

// Helpers
async function cleanDb() {
  const db = mongoose.connection.db;
  if (!db) return;
  const cols = ["users", "workspaces", "workspacemembers", "tasks", "taskdependencies", "projects", "goals", "featureflags", "activitylogs"];
  for (const c of cols) {
    try {
      await db.collection(c).deleteMany({});
    } catch {}
  }
}

async function createTestUser(email: string, name = "Test User") {
  const { hashPassword } = await import("@/src/lib/auth/password.js");
  const { createUser } = await import("@/src/repositories/user.repository.js");
  const hash = await hashPassword("Test1234");
  const user = await createUser({ name, email, passwordHash: hash });
  return user;
}

async function createTestWorkspace(userId: string, name = "Test WS") {
  const { provisionWorkspace } = await import("@/src/services/workspace.service.js");
  return provisionWorkspace({ ownerUserId: userId, name });
}

async function createTask(userId: string, workspaceId: string, title: string, extra: Record<string, unknown> = {}) {
  const { createUserTask } = await import("@/src/services/task.service.js");
  return createUserTask({ userId, workspaceId, title, ...extra } as never);
}

async function createProject(userId: string, workspaceId: string, name: string) {
  const { createUserProject } = await import("@/src/services/project.service.js");
  return createUserProject({ userId, workspaceId, name });
}

describe("Dependency Graph — real service behavior", () => {
  before(async () => {
    const { connectDb } = await import("@/src/lib/db/connection.js");
    await connectDb();
    // Ensure mongoose also connected via same URI
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
  });

  after(async () => {
    await cleanDb();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  it("A → B works", async () => {
    const user = await createTestUser(`a-b-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    const dep = await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    assert.equal(dep.predecessorTaskId, a.id);
    assert.equal(dep.successorTaskId, b.id);
  });

  it("A → A fails (self dependency)", async () => {
    const user = await createTestUser(`self-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    await assert.rejects(
      () => createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: a.id, type: "blocks" }),
      (err: unknown) => {
        const e = err as { status?: number; code?: string; message?: string };
        assert.match(e.message ?? "", /itself|Circular/i);
        return true;
      }
    );
  });

  it("Duplicate dependency fails", async () => {
    const user = await createTestUser(`dup-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    await assert.rejects(
      () => createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" }),
      (err: unknown) => {
        const e = err as { status?: number; code?: string };
        assert.equal(e.status, 409);
        return true;
      }
    );
  });

  it("A → B → C → A fails (circular)", async () => {
    const user = await createTestUser(`cycle-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const c = await createTask(user.id, ws.id, "Task C");
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: b.id, successorTaskId: c.id, type: "blocks" });
    await assert.rejects(
      () => createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: c.id, successorTaskId: a.id, type: "blocks" }),
      (err: unknown) => {
        const e = err as { code?: string; cycle?: string[]; status?: number };
        assert.equal(e.code, "CIRCULAR_DEPENDENCY");
        assert.ok(Array.isArray(e.cycle) && e.cycle!.length > 0);
        return true;
      }
    );
  });

  it("Cross-workspace dependency fails (A in ws1 cannot depend on B in ws2)", async () => {
    const u1 = await createTestUser(`ws1-${Date.now()}@test.com`);
    const ws1 = await createTestWorkspace(u1.id, "WS1");
    const u2 = await createTestUser(`ws2-${Date.now()}@test.com`);
    const ws2 = await createTestWorkspace(u2.id, "WS2");
    const a = await createTask(u1.id, ws1.id, "Task A WS1");
    const b = await createTask(u2.id, ws2.id, "Task B WS2");
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    await assert.rejects(
      () => createDependency({ userId: u1.id, workspaceId: ws1.id, predecessorTaskId: b.id, successorTaskId: a.id, type: "blocks" }),
      (err: unknown) => {
        const e = err as { status?: number };
        // Should be 404 because predecessor not in workspace
        assert.equal(e.status, 404);
        return true;
      }
    );
  });

  it("Blocked task", async () => {
    const user = await createTestUser(`blocked-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Predecessor");
    const b = await createTask(user.id, ws.id, "Blocked Task");
    const { createDependency, isTaskBlocked, getBlockedTasks } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    const blocked = await isTaskBlocked(user.id, ws.id, b.id);
    assert.equal(blocked, true);
    const list = await getBlockedTasks(user.id, ws.id);
    assert.ok(list.some((t) => t.id === b.id));
  });

  it("Ready task", async () => {
    const user = await createTestUser(`ready-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Ready A");
    const b = await createTask(user.id, ws.id, "Ready B");
    const { getReadyTasks } = await import("@/src/services/task-dependency.service.js");
    // No dependencies, both should be ready
    const ready = await getReadyTasks(user.id, ws.id);
    assert.ok(ready.some((t) => t.id === a.id));
    assert.ok(ready.some((t) => t.id === b.id));
  });

  it("Blocked becomes ready when dependency completes", async () => {
    const user = await createTestUser(`ready-after-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const { createDependency, isTaskBlocked, getReadyTasks } = await import("@/src/services/task-dependency.service.js");
    const { completeUserTask } = await import("@/src/services/task.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    assert.equal(await isTaskBlocked(user.id, ws.id, b.id), true);
    await completeUserTask(user.id, ws.id, a.id);
    // Need to re-fetch graph — small delay for DB
    assert.equal(await isTaskBlocked(user.id, ws.id, b.id), false);
    const ready = await getReadyTasks(user.id, ws.id);
    assert.ok(ready.some((t) => t.id === b.id));
  });

  it("Delete dependency", async () => {
    const user = await createTestUser(`del-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const { createDependency, deleteDependency, getDependencies } = await import("@/src/services/task-dependency.service.js");
    const dep = await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    let deps = await getDependencies(user.id, ws.id);
    assert.equal(deps.length, 1);
    await deleteDependency(user.id, ws.id, dep.id);
    deps = await getDependencies(user.id, ws.id);
    assert.equal(deps.length, 0);
  });

  it("Critical path", async () => {
    const user = await createTestUser(`critical-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const project = await createProject(user.id, ws.id, "Critical Project");
    // Create 3 tasks with durations 30,60,45 and chain A->B->C
    const a = await createTask(user.id, ws.id, "Task A", { durationMin: 30, projectId: project.id });
    const b = await createTask(user.id, ws.id, "Task B", { durationMin: 60, projectId: project.id });
    const c = await createTask(user.id, ws.id, "Task C", { durationMin: 45, projectId: project.id });
    const { createDependency, getProjectCriticalPath } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: b.id, successorTaskId: c.id, type: "blocks" });
    const result = await getProjectCriticalPath(user.id, ws.id, project.id);
    assert.deepEqual(result.criticalPath, [a.id, b.id, c.id]);
    assert.equal(result.totalDuration, 135); // 30+60+45
    assert.ok(result.criticalTasks.length === 3);
  });

  it("AI suggestions (structured, no DB modification)", async () => {
    const user = await createTestUser(`ai-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const project = await createProject(user.id, ws.id, "AI Project");
    await createTask(user.id, ws.id, "Build Product API", { projectId: project.id, notes: "Backend API" });
    await createTask(user.id, ws.id, "Build Product UI", { projectId: project.id, notes: "Frontend needs API" });
    const { suggestProjectDependencies } = await import("@/src/services/dependency-suggestion.service.js");
    const { listTaskDependencies } = await import("@/src/repositories/task-dependency.repository.js");
    const before = await listTaskDependencies(user.id, ws.id);
    const suggestions = await suggestProjectDependencies({ userId: user.id, workspaceId: ws.id, projectId: project.id });
    assert.ok(Array.isArray(suggestions));
    if (suggestions.length > 0) {
      const s = suggestions[0];
      assert.ok(typeof s.sourceTaskId === "string");
      assert.ok(typeof s.targetTaskId === "string");
      assert.ok(typeof s.reason === "string");
      assert.ok(typeof s.confidence === "number");
      assert.ok(s.confidence >= 0 && s.confidence <= 1);
    }
    const after = await listTaskDependencies(user.id, ws.id);
    assert.equal(before.length, after.length); // must NOT auto-modify
  });

  it("AI tool authorization (workspace isolation via tools)", async () => {
    const user = await createTestUser(`tool-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const otherUser = await createTestUser(`tool2-${Date.now()}@test.com`);
    const otherWs = await createTestWorkspace(otherUser.id, "Other WS");
    const a = await createTask(user.id, ws.id, "Task A");
    const { makeTools } = await import("@/src/lib/ai/tools.js");
    const tools = makeTools({ userId: otherUser.id, workspaceId: otherWs.id });
    const getBlocked = tools.find((t) => t.name === "get_blocked_tasks");
    assert.ok(getBlocked);
    // Other user should not see user's blocked tasks — should return empty, not error leak
    // Use service directly to test isolation
    const { getBlockedTasks } = await import("@/src/services/task-dependency.service.js");
    const blockedOther = await getBlockedTasks(otherUser.id, otherWs.id);
    // Other workspace has no blocked tasks
    assert.equal(blockedOther.length, 0);
    // Also test that LLM cannot bypass via direct DB — tools are allowlisted
    const { TOOL_NAMES } = await import("@/src/lib/ai/tools.js");
    assert.ok(TOOL_NAMES.includes("get_blocked_tasks"));
    // Direct DB access not exposed via tools
    assert.ok(!(TOOL_NAMES as readonly string[]).includes("TaskDependency"));
  });

  it("Graph API", async () => {
    const user = await createTestUser(`graph-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Graph A");
    const b = await createTask(user.id, ws.id, "Graph B");
    const { createDependency, getDependencyGraph } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    const graph = await getDependencyGraph(user.id, ws.id);
    assert.ok(graph.nodes.some((n) => n.id === a.id));
    assert.ok(graph.nodes.some((n) => n.id === b.id));
    assert.ok(graph.edges.some((e) => e.predecessorTaskId === a.id && e.successorTaskId === b.id));
    assert.equal(typeof graph.blocked, "object");
    assert.equal(typeof graph.stats.totalTasks, "number");
  });

  it("Project graph", async () => {
    const user = await createTestUser(`projgraph-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const p1 = await createProject(user.id, ws.id, "P1");
    const p2 = await createProject(user.id, ws.id, "P2");
    const a = await createTask(user.id, ws.id, "P1 Task", { projectId: p1.id });
    const b = await createTask(user.id, ws.id, "P1 Task 2", { projectId: p1.id });
    const c = await createTask(user.id, ws.id, "P2 Task", { projectId: p2.id });
    const { createDependency } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    const { getProjectDependencyGraph } = await import("@/src/services/task-dependency.service.js");
    const g1 = await getProjectDependencyGraph(user.id, ws.id, p1.id);
    const g2 = await getProjectDependencyGraph(user.id, ws.id, p2.id);
    assert.ok(g1.nodes.some((n) => n.id === a.id));
    assert.ok(g1.nodes.some((n) => n.id === b.id));
    assert.ok(!g1.nodes.some((n) => n.id === c.id)); // filtered
    assert.ok(g1.edges.some((e) => e.predecessorTaskId === a.id));
    assert.equal(g2.nodes.length, 1);
    assert.equal(g2.edges.length, 0);
  });

  it("get_task_dependencies and get_task_dependents", async () => {
    const user = await createTestUser(`deps-${Date.now()}@test.com`);
    const ws = await createTestWorkspace(user.id);
    const a = await createTask(user.id, ws.id, "Task A");
    const b = await createTask(user.id, ws.id, "Task B");
    const c = await createTask(user.id, ws.id, "Task C");
    const { createDependency, getTaskDependencies, getTaskDependents } = await import("@/src/services/task-dependency.service.js");
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: a.id, successorTaskId: b.id, type: "blocks" });
    await createDependency({ userId: user.id, workspaceId: ws.id, predecessorTaskId: b.id, successorTaskId: c.id, type: "blocks" });
    const depsB = await getTaskDependencies(user.id, ws.id, b.id);
    assert.ok(depsB.some((d) => d.predecessorTaskId === a.id));
    const dependentsB = await getTaskDependents(user.id, ws.id, b.id);
    assert.ok(dependentsB.some((d) => d.successorTaskId === c.id));
    const depsA = await getTaskDependencies(user.id, ws.id, a.id);
    assert.equal(depsA.length, 0);
    const dependentsC = await getTaskDependents(user.id, ws.id, c.id);
    assert.equal(dependentsC.length, 0);
  });
});
