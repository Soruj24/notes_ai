import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { getVectorStore } from "@/src/lib/vectors/mongo-store";
import type { VectorEntityType } from "@/src/lib/vectors/types";
import { indexWorkspace } from "@/src/services/semantic.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/embeddings — index stats. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    const { requireMembership } = await import("@/src/repositories/base");
    await requireMembership(user.id, wid);
    const vectors = await getVectorStore().countByWorkspace(wid);
    return NextResponse.json({ workspaceId: wid, vectors });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/embeddings — rebuild the workspace index. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const rawTypes = parsed.body.types;
  const valid: VectorEntityType[] = ["notes", "tasks", "projects", "goals"];
  if (
    rawTypes !== undefined &&
    (!Array.isArray(rawTypes) || !rawTypes.every((t) => valid.includes(t as VectorEntityType)))
  ) {
    return NextResponse.json(
      { errors: { types: ["Invalid entity type filter."] } },
      { status: 400 },
    );
  }
  try {
    // Full rebuild keeps the index consistent; per-type filtering
    // happens at query time instead.
    const result = await indexWorkspace(user.id, wid);
    return NextResponse.json({ indexed: result });
  } catch (err) {
    return toApiError(err);
  }
}
