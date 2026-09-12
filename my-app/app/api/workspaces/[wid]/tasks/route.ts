import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import type { TaskView } from "@/src/repositories/task.repository";
import { createUserTask, listUserTasks } from "@/src/services/task.service";
import { validateTaskCreate } from "@/src/lib/validation/tasks";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

const VIEWS: TaskView[] = ["all", "today", "upcoming", "completed", "overdue"];

function listFilters(url: URL) {
  const view = url.searchParams.get("view");
  return {
    view: VIEWS.includes(view as TaskView) ? (view as TaskView) : undefined,
    status: url.searchParams.get("status") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    projectId: url.searchParams.get("projectId") ?? undefined,
    goalId: url.searchParams.get("goalId") ?? undefined,
    tagId: url.searchParams.get("tagId") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
  };
}

/** GET /api/workspaces/[wid]/tasks — list with view + filters. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    const tasks = await listUserTasks(user.id, wid, listFilters(new URL(req.url)) as never);
    return NextResponse.json({ tasks });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/tasks — create. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const result = validateTaskCreate(parsed.body);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  try {
    const task = await createUserTask({
      userId: user.id,
      workspaceId: wid,
      ...result.data,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
