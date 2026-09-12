import { NextResponse } from "next/server";
import { dispatchAllDueReminders } from "@/src/services/reminder.service";

/**
 * Cron worker: GET /api/cron/reminders with `Authorization: Bearer <CRON_SECRET>`.
 * Refuses to run in production without an explicit secret.
 */
export async function GET(req: Request) {
  const configured = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !configured) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  const presented = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = configured ?? "dev-cron-secret";
  if (presented !== expected) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  try {
    const summary = await dispatchAllDueReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("reminder cron failed", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
