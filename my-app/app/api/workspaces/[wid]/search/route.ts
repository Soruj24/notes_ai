import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { SEARCH_ENTITY_TYPES, type SearchEntityType } from "@/src/lib/search/types";
import { searchWorkspace } from "@/src/services/search.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/**
 * GET /api/workspaces/[wid]/search — grouped multi-entity search.
 * ?q= (required, max 200) & ?types=notes,tasks & ?from/?to=ISO & ?limit=N.
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
  if (q.length > 200) {
    return NextResponse.json(
      { errors: { q: ["Query must be 200 characters or fewer."] } },
      { status: 400 },
    );
  }

  const rawTypes = (url.searchParams.get("types") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (rawTypes.some((t) => !(SEARCH_ENTITY_TYPES as string[]).includes(t))) {
    return NextResponse.json(
      { errors: { types: ["Invalid entity type filter."] } },
      { status: 400 },
    );
  }

  const parseDate = (raw: string | null): Date | undefined | "invalid" => {
    if (!raw) return undefined;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "invalid" : d;
  };
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  if (from === "invalid" || to === "invalid") {
    return NextResponse.json(
      { errors: { date: ["Invalid date filter."] } },
      { status: 400 },
    );
  }
  const limit = Number(url.searchParams.get("limit"));

  try {
    const result = await searchWorkspace(user.id, wid, q, {
      types: rawTypes as SearchEntityType[],
      from,
      to,
      perType: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return toApiError(err);
  }
}
