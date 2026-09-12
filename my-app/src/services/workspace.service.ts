import type { MemberRole } from "@/src/lib/db/enums";

export type { WorkspaceRecord } from "@/src/repositories/workspace.repository";
import {
  addWorkspaceMember,
  createWorkspace,
  getWorkspace,
  listWorkspacesForUser,
  removeWorkspaceMember,
  setMemberRole,
  updateWorkspace,
  type WorkspaceRecord,
} from "@/src/repositories/workspace.repository";

/**
 * Workspace use-cases. Provisioning always creates the owner membership;
 * every other operation re-checks membership through the repository.
 */

export async function provisionWorkspace(input: {
  ownerUserId: string;
  name: string;
  description?: string;
}): Promise<WorkspaceRecord> {
  return createWorkspace(input);
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
  const workspaces = await listWorkspacesForUser(userId);
  if (workspaces.length) return workspaces;
  // First-run bootstrap: every user owns at least one workspace.
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const created = await createWorkspace({
    ownerUserId: userId,
    name: await getSettingValue("general.defaultWorkspaceName", "Personal"),
    description: "Default workspace.",
  });
  return [created];
}

export async function getUserWorkspace(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRecord> {
  return getWorkspace(userId, workspaceId);
}

export async function renameWorkspace(
  userId: string,
  workspaceId: string,
  input: { name?: string; description?: string },
): Promise<WorkspaceRecord> {
  return updateWorkspace(userId, workspaceId, input);
}

export async function inviteMember(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
}): Promise<void> {
  await addWorkspaceMember(input);
}

export async function kickMember(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await removeWorkspaceMember(input);
}

export async function changeMemberRole(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
}): Promise<void> {
  await setMemberRole(input);
}
