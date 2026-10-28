import { database } from "../../../lib/db";
import { getCurrentUser, isConfigured } from "../../../lib/auth";
import { createWorkspaceAPI } from "../../../lib/workspace-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const api = createWorkspaceAPI({ db: database, getUser: getCurrentUser });
const unavailable = () =>
  Response.json(
    {
      authenticated: false,
      error:
        "Ton espace partagé est en cours de préparation. Tu peux explorer la démo.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );

export function GET(request: Request) {
  return isConfigured() ? api.GET(request) : unavailable();
}
export function POST(request: Request) {
  return isConfigured() ? api.POST(request) : unavailable();
}
