import { redirect } from "next/navigation";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Legacy path: the explorer lives at /admin/audit-logs. */
export default async function AdminAuditPage() {
  await requirePagePermission("audit.view", "/admin/audit");
  redirect("/admin/audit-logs");
}
