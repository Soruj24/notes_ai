import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { db, requireMembership } from "@/src/repositories/base";
import { WorkspaceMember } from "@/src/models/workspace-member.model";
import { User } from "@/src/models/user.model";

interface Params { params: Promise<{ wid: string }> }

/** GET /api/workspaces/[wid]/members — list members for reassignment (workspace-isolated). */
export async function GET(req: Request, { params }: Params) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    const member = await requireMembership(user.id, wid);
    await db();
    const members = await WorkspaceMember.find({ workspaceId: member.workspaceId }).lean();
    const userIds = members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select({ name: 1, email: 1 }).lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const result = members.map((m) => {
      const u = userMap.get(String(m.userId)) as { name?: string; email?: string } | undefined;
      return { userId: String(m.userId), role: m.role, name: u?.name ?? "Unknown", email: u?.email ?? "" };
    });
    return NextResponse.json({ members: result });
  } catch (err) {
    return toApiError(err);
  }
}
