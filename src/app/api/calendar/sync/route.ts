import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function createOrUpdateEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
) {
  const startDateTime = event.startTime
    ? `${event.date}T${event.startTime}:00`
    : event.date;
  const endDateTime = event.endTime
    ? `${event.date}T${event.endTime}:00`
    : event.startTime
    ? `${event.date}T${event.startTime}:00`
    : event.date;

  const isAllDay = !event.startTime;

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
  };

  if (isAllDay) {
    body.start = { date: event.date };
    // Google API needs end date to be exclusive (next day for single-day)
    const endDate = new Date(event.date);
    endDate.setDate(endDate.getDate() + 1);
    body.end = { date: endDate.toISOString().slice(0, 10) };
  } else {
    body.start = { dateTime: startDateTime, timeZone: "Asia/Seoul" };
    body.end = { dateTime: endDateTime, timeZone: "Asia/Seoul" };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return res.ok;
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, events } = await request.json() as {
      projectId: string;
      events: CalendarEvent[];
    };

    if (!projectId || !events?.length) {
      return NextResponse.json({ error: "projectId와 events 필요" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: connection } = await supabase
      .from("google_calendar_connections")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (!connection) {
      return NextResponse.json({ error: "Google Calendar 연결이 필요합니다" }, { status: 401 });
    }

    // Try current token, refresh if needed
    let accessToken = connection.access_token;
    let testRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!testRes.ok && connection.refresh_token) {
      const newToken = await refreshAccessToken(connection.refresh_token);
      if (newToken) {
        accessToken = newToken;
        // Save refreshed token
        await supabase
          .from("google_calendar_connections")
          .update({ access_token: newToken })
          .eq("project_id", projectId);
      } else {
        return NextResponse.json({ error: "토큰 갱신 실패. 재연결이 필요합니다." }, { status: 401 });
      }
    }

    const calendarId = connection.calendar_id || "primary";
    let synced = 0;
    let failed = 0;

    for (const event of events) {
      const ok = await createOrUpdateEvent(accessToken, calendarId, event);
      if (ok) synced++;
      else failed++;
    }

    return NextResponse.json({ synced, failed, total: events.length });
  } catch (err) {
    console.error("Calendar sync error:", err);
    return NextResponse.json({ error: "동기화 실패" }, { status: 500 });
  }
}
