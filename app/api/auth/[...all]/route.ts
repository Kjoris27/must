import { getAuth, isConfigured } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handler(request: Request) {
  if (!isConfigured()) {
    return Response.json(
      {
        message:
          "La connexion à Happen est en cours de préparation. La démo reste accessible.",
      },
      { status: 503 },
    );
  }
  return getAuth().handler(request);
}

export const GET = handler;
export const POST = handler;
