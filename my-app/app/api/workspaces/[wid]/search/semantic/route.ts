import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import type { VectorEntityType } from "@/src/lib/vectors/types";
import { semanticSearch } from "@/src/services/semantic.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

const VALID: VectorEntityType[] = ["notes", "tasks", "projects", "goals"];

/**
 * GET /api/workspaces/[wid]/search/semantic — vector similarity search.
 * ?q= (required) & ?types= & ?topK= (default 10, max 50).
 */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json(
      { errors: { q: ["Search query is required."] } },
      { status: 400 },
    );
  }
  if (q.length > 500) {
    return NextResponse.json(
      { errors: { q: ["Query must be 500 characters or fewer."] } },
      { status: 400 },
    );
  }
  const rawTypes = (url.searchParams.get("types") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (rawTypes.some((t) => !VALID.includes(t as VectorEntityType))) {
    return NextResponse.json(
      { errors: { types: ["Invalid entity type filter."] } },
      { status: 400 },
    );
  }
  const topK = Number(url.searchParams.get("topK"));

  try {
    const hits = await semanticSearch(user.id, wid, q, {
      types: rawTypes as VectorEntityType[],
      topK: Number.isFinite(topK) && topK > 0 ? Math.min(topK, 50) : undefined,
    });
    return NextResponse.json({ hits, total: hits.length });
  } catch (err) {
    return toApiError(err);
  }
}
