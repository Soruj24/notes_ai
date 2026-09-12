import type { Metadata } from "next";
import { requireWorkspace } from "@/src/lib/workspace";
import { DependencyGraphPage } from "@/src/components/graph/DependencyGraphPage";

export const metadata: Metadata = { title: "Dependencies" };

export default async function DependenciesPage() {
  const { workspace } = await requireWorkspace("/dependencies");
  return <DependencyGraphPage wid={workspace.id} />;
}
