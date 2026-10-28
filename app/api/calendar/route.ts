import { calendarText } from "../../calendar";
export function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams;
  const title = (q.get("title") || "Session Happen").slice(0, 150);
  const start = q.get("start") || "";
  const minutes = Number(q.get("minutes"));
  const id = (q.get("id") || "session")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 80);
  if (
    !Number.isFinite(new Date(start).getTime()) ||
    !Number.isInteger(minutes) ||
    minutes < 5 ||
    minutes > 240
  )
    return Response.json({ error: "Créneau invalide." }, { status: 400 });
  return new Response(
    calendarText(
      { id, title, start, minutes, demo: q.get("demo") === "true" },
      u.origin,
    ),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="happen-session.ics"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
