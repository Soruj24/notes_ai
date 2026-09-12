import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { createUserProject, listProjectsWithProgress, listUserProjects } from "@/src/services/project.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/projects — full list (?status, ?goalId, ?compact=1). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw === "active" || statusRaw === "on_hold" || statusRaw === "completed" || statusRaw === "archived"
      ? statusRaw
      : undefined;
  const goalId = url.searchParams.get("goalId");
  const compact = url.searchParams.get("compact") === "1";
  try {
    if (compact) {
      const projects = await listUserProjects(user.id, wid, status);
      const filtered = goalId ? projects.filter((p) => p.goalId === goalId) : projects;
      return NextResponse.json({
        projects: filtered.map((p) => ({ id: p.id, name: p.name })),
      });
    }
    const withProgress = await listProjectsWithProgress(user.id, wid, status);
    const filtered = goalId
      ? withProgress.filter((w) => w.project.goalId === goalId)
      : withProgress;
    return NextResponse.json({
      projects: filtered.map((w) => ({ ...w.project, progress: w.progress })),
    });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/projects — create. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json(
      { errors: { name: ["Name is required (max 120)."] } },
      { status: 400 },
    );
  }
  let dueAt: Date | undefined;
  if (b.dueAt) {
    dueAt = new Date(b.dueAt as string);
    if (Number.isNaN(dueAt.getTime())) {
      return NextResponse.json(
        { errors: { dueAt: ["Invalid due date."] } },
        { status: 400 },
      );
    }
  }
  try {
    const project = await createUserProject({
      userId: user.id,
      workspaceId: wid,
      name,
      description:
        typeof b.description === "string" && b.description.trim()
          ? b.description.trim().slice(0, 5000)
          : undefined,
      color: typeof b.color === "string" ? b.color.slice(0, 16) : undefined,
      dueAt,
      goalId: typeof b.goalId === "string" && b.goalId ? b.goalId : undefined,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
