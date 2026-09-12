import type { Metadata } from "next";
import { TemplatesExplorer } from "@/src/components/templates/TemplatesExplorer";
import { requireWorkspace } from "@/src/lib/workspace";
import { listUserTemplates } from "@/src/services/template.service";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesHome() {
  const { user, workspace } = await requireWorkspace("/templates");
  const templates = await listUserTemplates(user.id, workspace.id);
  return (
    <TemplatesExplorer wid={workspace.id} userId={user.id} initial={templates} />
  );
}
