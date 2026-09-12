import { getProjectSuggestionsController } from "@/src/controllers/dependencies.controller";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  return getProjectSuggestionsController(req, projectId);
}

export async function POST(req: Request, { params }: Params) {
  const { projectId } = await params;
  return getProjectSuggestionsController(req, projectId);
}
