import { Suspense } from "react";
import { PageHeader } from "@/src/components/admin/PageHeader";
import { UsersManager } from "@/src/components/admin/users/UsersManager";
import { UserTableSkeleton } from "@/src/components/admin/users/UserTable";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Staff user directory: search, filter, sort, paginate, inspect, mutate. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await requirePagePermission("users.view", "/admin/users");
  const params = await searchParams;

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Manage"
        title="Users"
        description="Search, inspect, and operate accounts. Every mutation is audited; suspension reasons stay staff-only."
      />
      <Suspense fallback={<UserTableSkeleton />}>
        <UsersManager role={staff.role} initialQuery={params.q ?? ""} />
      </Suspense>
    </div>
  );
}
