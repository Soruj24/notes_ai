import { requireUser, type CurrentUser } from "@/src/lib/auth/session";
import {
  listUserWorkspaces,
  type WorkspaceRecord,
} from "@/src/services/workspace.service";

/**
 * Server-page helper: authenticated user + default workspace
 * (auto-bootstraps "Personal" on first run).
 */
export async function requireWorkspace(loginNext = "/notes"): Promise<{
  user: CurrentUser;
  workspace: WorkspaceRecord;
}> {
  const user = await requireUser(loginNext);
  const workspaces = await listUserWorkspaces(user.id);
  const workspace = workspaces[0];
  if (!workspace) throw new Error("No workspace available.");
  return { user, workspace };
}
