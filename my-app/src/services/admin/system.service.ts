import { getDashboardHealth } from "@/src/services/admin/dashboard.service";
import { countUsers } from "@/src/repositories/user.repository";
import { countAllWorkspaces } from "@/src/repositories/workspace.repository";
import { countAllNotes, countAllTasks } from "@/src/repositories/admin-stats.repository";
import { countActiveSessions } from "@/src/repositories/session.repository";

/**
 * System status: dependency health plus platform totals. Read-only —
 * no mutations exist here, so no audit entries are written.
 */

export async function getSystemStatus() {
  const [health, users, workspaces, notes, tasks, sessions] = await Promise.all([
    getDashboardHealth(),
    countUsers(),
    countAllWorkspaces(),
    countAllNotes(),
    countAllTasks(),
    countActiveSessions(),
  ]);
  return {
    status: health.status,
    checks: health.checks,
    totals: { users, workspaces, notes, tasks, sessions },
    time: new Date().toISOString(),
  };
}
