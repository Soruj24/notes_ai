import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { listUserWorkspaces, provisionWorkspace } from "@/src/services/workspace.service";

/** GET /api/workspaces — list (auto-bootstraps a Personal workspace). */
export async function GET(req: Request) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ workspaces: await listUserWorkspaces(user.id) });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces — create { name, description? }. */
export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const name = typeof parsed.body.name === "string" ? parsed.body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { errors: { name: ["Name is required."] } },
      { status: 400 },
    );
  }
  try {
    const workspace = await provisionWorkspace({
      ownerUserId: user.id,
      name,
      description:
        typeof parsed.body.description === "string"
          ? parsed.body.description
          : undefined,
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
