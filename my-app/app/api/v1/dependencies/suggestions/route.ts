import { getWorkspaceSuggestionsController } from "@/src/controllers/dependencies.controller";

export async function GET(req: Request) {
  return getWorkspaceSuggestionsController(req);
}

export async function POST(req: Request) {
  return getWorkspaceSuggestionsController(req);
}
