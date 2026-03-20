import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/app/calendar?error=no_code", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  let projectId = "";
  try {
    const state = JSON.parse(Buffer.from(stateParam ?? "", "base64url").toString());
    projectId = state.projectId;
  } catch { /* ignore */ }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/app/calendar?error=token_failed", request.url));
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token } = tokens;

    // Create a dedicated "HOMI" calendar
    let calendarId = "";
    try {
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "HOMI - 프로젝트 일정",
          description: "HOMI 앱에서 동기화된 프로젝트 일정입니다",
          timeZone: "Asia/Seoul",
        }),
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        calendarId = calData.id;
      }
    } catch { /* ignore - will use primary */ }

    // Save to Supabase
    const supabase = createAdminClient();
    await supabase.from("google_calendar_connections").upsert(
      {
        project_id: projectId,
        access_token,
        refresh_token: refresh_token ?? null,
        calendar_id: calendarId || "primary",
        sync_meetings: true,
        sync_tasks: false,
        sync_schedules: false,
        sync_construction: false,
      },
      { onConflict: "project_id" }
    );

    return NextResponse.redirect(new URL("/app/calendar?connected=true", request.url));
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(new URL("/app/calendar?error=unknown", request.url));
  }
}
