import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, calendarAccounts, calendars, events } from "@/lib/db/schema";
import { sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  try {
    const [userCount, accountCount, calendarCount, eventCount] = await Promise.all([
      db.select({ count: count() }).from(user),
      db.select({ count: count() }).from(calendarAccounts),
      db.select({ count: count() }).from(calendars),
      db.select({ count: count() }).from(events),
    ]);

    return NextResponse.json({
      ok: true,
      duration: Date.now() - start,
      counts: {
        users: userCount[0].count,
        calendarAccounts: accountCount[0].count,
        calendars: calendarCount[0].count,
        events: eventCount[0].count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/keepalive] Database error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
