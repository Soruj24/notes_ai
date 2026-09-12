import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  deleteUserProject,
  getProjectDetail,
  updateUserProject,
} from "@/src/services/project.service";

interface RouteParams {
  params: Promise<{ wid: string; pid: string }>;
}

/** GET — project + tasks + notes + computed progress. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, pid } = await params;
  try {
    return NextResponse.json(await getProjectDetail(user.id, wid, pid));
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — name/description/status/color/dueAt/goalId. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, pid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (b.status !== undefined) {
    const ok = ["active", "on_hold", "completed", "archived"].includes(b.status as string);
    if (!ok) {
      return NextResponse.json(
        { errors: { status: ["Invalid status."] } },
        { status: 400 },
      );
    }
  }
  let dueAt: Date | null | undefined;
  if (b.dueAt !== undefined) {
    if (b.dueAt === null || b.dueAt === "") dueAt = null;
    else {
      dueAt = new Date(b.dueAt as string);
      if (Number.isNaN(dueAt.getTime())) {
        return NextResponse.json(
          { errors: { dueAt: ["Invalid due date."] } },
          { status: 400 },
        );
      }
    }
  }
  try {
    const project = await updateUserProject({
      userId: user.id,
      workspaceId: wid,
      projectId: pid,
      name: typeof b.name === "string" ? b.name.trim() : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
      status: b.status as never,
      color: typeof b.color === "string" ? b.color : undefined,
      dueAt,
      goalId:
        b.goalId === undefined
          ? undefined
          : b.goalId === null || b.goalId === ""
            ? null
            : (b.goalId as string),
    });
    return NextResponse.json({ project });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — permanent delete with ownership check. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, pid } = await params;
  try {
    await deleteUserProject(user.id, wid, pid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
