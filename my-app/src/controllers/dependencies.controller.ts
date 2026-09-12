import { NextResponse } from "next/server";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { requireApiUser } from "@/src/lib/api/request";
import {
  validateTaskDependencyCreate,
  zDependencyGraphQuery,
  zDependencyListQuery,
  zProjectDependencyGraphParams,
  zTaskDependencyCreate,
} from "@/src/lib/validation/dependencies";
import {
  createUserTaskDependency,
  deleteUserTaskDependency,
  getProjectCriticalPath,
  getProjectDependencyGraph,
  getTaskDependencyGraph,
  listUserTaskDependencies,
} from "@/src/services/task-dependency.service";
import { suggestProjectDependencies } from "@/src/services/dependency-suggestion.service";

/**
 * Dependencies controller — Route → Validation → Authorization → Service → Repository → MongoDB
 * Authorization via workspace isolation in service/repository (requireMembership).
 * Validation via Zod + manual validators. No direct MongoDB access.
 */

export async function listDependencies(req: Request): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  // Validation (Zod)
  const url = new URL(req.url);
  const parsed = zDependencyListQuery.safeParse({
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
    taskId: url.searchParams.get("taskId") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Authorization + Service (workspace isolation inside service → repository → requireMembership)
  try {
    const deps = await listUserTaskDependencies(user.id, parsed.data.workspaceId, {
      taskId: parsed.data.taskId,
      type: parsed.data.type as never,
    });
    return NextResponse.json({ dependencies: deps });
  } catch (err) {
    return toApiError(err);
  }
}

export async function createDependency(req: Request): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  const body = await parseJsonBody(req);
  if (body instanceof NextResponse) return body;

  // Validation — Zod first (strict), then manual for FieldErrors shape fallback
  const zParsed = zTaskDependencyCreate.safeParse(body.body);
  if (!zParsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of zParsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  const manual = validateTaskDependencyCreate(body.body);
  if (!manual.ok) return NextResponse.json({ errors: manual.errors }, { status: 400 });

  // Authorization + Service
  try {
    const dep = await createUserTaskDependency({
      userId: user.id,
      workspaceId: zParsed.data.workspaceId,
      predecessorTaskId: zParsed.data.predecessorTaskId,
      successorTaskId: zParsed.data.successorTaskId,
      type: zParsed.data.type,
    });
    return NextResponse.json({ dependency: dep }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}

export async function deleteDependency(req: Request, id: string): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  // Validation — workspaceId required as query param
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
  if (!workspaceId) {
    return NextResponse.json({ errors: { workspaceId: ["workspaceId is required."] } }, { status: 400 });
  }

  // Authorization + Service
  try {
    await deleteUserTaskDependency(user.id, workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getDependencyGraph(req: Request): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const parsed = zDependencyGraphQuery.safeParse({
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    const graph = await getTaskDependencyGraph(user.id, parsed.data.workspaceId);
    return NextResponse.json(graph);
  } catch (err) {
    return toApiError(err);
  }
}

export async function getProjectDependencyGraphController(
  req: Request,
  projectId: string,
): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const parsed = zProjectDependencyGraphParams.safeParse({
    projectId,
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    const graph = await getProjectDependencyGraph(
      user.id,
      parsed.data.workspaceId,
      parsed.data.projectId,
    );
    return NextResponse.json(graph);
  } catch (err) {
    return toApiError(err);
  }
}

export async function getProjectCriticalPathController(
  req: Request,
  projectId: string,
): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const parsed = zProjectDependencyGraphParams.safeParse({
    projectId,
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    const result = await getProjectCriticalPath(user.id, parsed.data.workspaceId, parsed.data.projectId);
    return NextResponse.json(result);
  } catch (err) {
    return toApiError(err);
  }
}

export async function getProjectSuggestionsController(req: Request, projectId: string): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  // Support workspaceId via query or JSON body (POST)
  let workspaceId = url.searchParams.get("workspaceId") ?? undefined;
  if (!workspaceId && req.method === "POST") {
    try {
      const body = (await req.clone().json()) as Record<string, unknown>;
      if (typeof body.workspaceId === "string") workspaceId = body.workspaceId;
    } catch {
      // ignore
    }
  }
  const parsed = zProjectDependencyGraphParams.safeParse({ projectId, workspaceId });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return NextResponse.json({ errors }, { status: 400 });
  }
  try {
    const suggestions = await suggestProjectDependencies({
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      projectId: parsed.data.projectId,
    });
    return NextResponse.json({ suggestions });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getWorkspaceSuggestionsController(req: Request): Promise<Response> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  let workspaceId = url.searchParams.get("workspaceId") ?? undefined;
  if (!workspaceId && req.method === "POST") {
    try {
      const body = (await req.clone().json()) as Record<string, unknown>;
      if (typeof body.workspaceId === "string") workspaceId = body.workspaceId;
    } catch {
      // ignore
    }
  }
  if (!workspaceId) return NextResponse.json({ errors: { workspaceId: ["workspaceId is required."] } }, { status: 400 });
  try {
    const suggestions = await suggestProjectDependencies({ userId: user.id, workspaceId });
    return NextResponse.json({ suggestions });
  } catch (err) {
    return toApiError(err);
  }
}
